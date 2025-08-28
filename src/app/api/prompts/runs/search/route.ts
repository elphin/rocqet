import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    const query = searchParams.get('q')?.toLowerCase() || '';
    const workspaceId = searchParams.get('workspace_id');
    const promptId = searchParams.get('prompt_id');
    const status = searchParams.get('status'); // success, error, all
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Workspace ID is required' },
        { status: 400 }
      );
    }

    // Verify user has access to workspace
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: member } = await supabase
      .from('workspace_members')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!member) {
      return NextResponse.json(
        { error: 'Not a member of this workspace' },
        { status: 403 }
      );
    }

    // Build the query
    let runsQuery = supabase
      .from('prompt_runs')
      .select(`
        *,
        prompts (
          id,
          name,
          slug
        )
      `, { count: 'exact' })
      .eq('workspace_id', workspaceId)
      .order('executed_at', { ascending: false });

    // Apply filters
    if (promptId) {
      runsQuery = runsQuery.eq('prompt_id', promptId);
    }

    if (status && status !== 'all') {
      runsQuery = runsQuery.eq('status', status);
    }

    if (startDate) {
      runsQuery = runsQuery.gte('executed_at', startDate);
    }

    if (endDate) {
      runsQuery = runsQuery.lte('executed_at', endDate);
    }

    // Search in output and input
    if (query) {
      runsQuery = runsQuery.or(
        `output.ilike.%${query}%,input.cs.${JSON.stringify({search: query})}`
      );
    }

    // Apply pagination
    runsQuery = runsQuery.limit(limit).range(offset, offset + limit - 1);

    const { data: runs, error, count } = await runsQuery;

    if (error) {
      console.error('Error searching runs:', error);
      return NextResponse.json(
        { error: 'Failed to search runs' },
        { status: 500 }
      );
    }

    // Calculate statistics
    const stats = {
      total: count || 0,
      successful: 0,
      failed: 0,
      avgDuration: 0,
      totalCost: 0,
      totalTokens: 0
    };

    if (runs && runs.length > 0) {
      // Get aggregated stats for the current filter
      const { data: statsData } = await supabase
        .from('prompt_runs')
        .select('status, duration_ms, cost, tokens_used')
        .eq('workspace_id', workspaceId)
        .eq('prompt_id', promptId || runs[0].prompt_id);

      if (statsData) {
        stats.successful = statsData.filter(r => r.status === 'success').length;
        stats.failed = statsData.filter(r => r.status === 'error').length;
        
        const durations = statsData
          .filter(r => r.duration_ms)
          .map(r => r.duration_ms);
        
        if (durations.length > 0) {
          stats.avgDuration = Math.round(
            durations.reduce((a, b) => a + b, 0) / durations.length
          );
        }

        stats.totalCost = statsData
          .filter(r => r.cost)
          .reduce((sum, r) => sum + parseFloat(r.cost), 0);

        stats.totalTokens = statsData
          .filter(r => r.tokens_used)
          .reduce((sum, r) => sum + r.tokens_used, 0);
      }
    }

    // Format runs for display
    const formattedRuns = (runs || []).map(run => ({
      ...run,
      // Truncate long outputs for list view
      output_preview: run.output ? 
        (run.output.length > 200 ? 
          run.output.substring(0, 200) + '...' : 
          run.output
        ) : null,
      // Parse input if it's JSON
      input_parsed: typeof run.input === 'string' ? 
        tryParseJSON(run.input) : 
        run.input
    }));

    return NextResponse.json({
      runs: formattedRuns,
      total: count || 0,
      limit,
      offset,
      stats,
      filters: {
        query,
        status,
        promptId,
        startDate,
        endDate
      }
    });
  } catch (error) {
    console.error('Error in runs search API:', error);
    return NextResponse.json(
      { error: 'Failed to search runs' },
      { status: 500 }
    );
  }
}

// Helper function to safely parse JSON
function tryParseJSON(str: string) {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}

// Export run data
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { workspaceId, promptId, format, filters } = await request.json();

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Workspace ID is required' },
        { status: 400 }
      );
    }

    // Verify access
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Build query for export
    let exportQuery = supabase
      .from('prompt_runs')
      .select(`
        *,
        prompts (
          name,
          slug
        ),
        users!prompt_runs_executed_by_fkey (
          email,
          full_name
        )
      `)
      .eq('workspace_id', workspaceId)
      .order('executed_at', { ascending: false });

    // Apply filters
    if (promptId) {
      exportQuery = exportQuery.eq('prompt_id', promptId);
    }

    if (filters?.status && filters.status !== 'all') {
      exportQuery = exportQuery.eq('status', filters.status);
    }

    if (filters?.startDate) {
      exportQuery = exportQuery.gte('executed_at', filters.startDate);
    }

    if (filters?.endDate) {
      exportQuery = exportQuery.lte('executed_at', filters.endDate);
    }

    const { data: runs, error } = await exportQuery;

    if (error) {
      console.error('Error exporting runs:', error);
      return NextResponse.json(
        { error: 'Failed to export runs' },
        { status: 500 }
      );
    }

    // Format data based on requested format
    let exportData;
    let contentType;
    let filename;

    if (format === 'csv') {
      // Convert to CSV
      const csv = convertToCSV(runs || []);
      exportData = csv;
      contentType = 'text/csv';
      filename = `prompt-runs-${Date.now()}.csv`;
    } else {
      // Default to JSON
      exportData = JSON.stringify(runs || [], null, 2);
      contentType = 'application/json';
      filename = `prompt-runs-${Date.now()}.json`;
    }

    return new NextResponse(exportData, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting runs:', error);
    return NextResponse.json(
      { error: 'Failed to export runs' },
      { status: 500 }
    );
  }
}

// Convert runs to CSV format
function convertToCSV(runs: any[]): string {
  if (runs.length === 0) return '';

  // Define headers
  const headers = [
    'Date',
    'Prompt Name',
    'Status',
    'Model',
    'Duration (ms)',
    'Tokens',
    'Cost',
    'Executed By',
    'Input',
    'Output'
  ];

  // Create CSV rows
  const rows = runs.map(run => [
    run.executed_at,
    run.prompts?.name || 'Unknown',
    run.status,
    run.model || 'N/A',
    run.duration_ms || '0',
    run.tokens_used || '0',
    run.cost || '0',
    run.users?.email || 'Unknown',
    JSON.stringify(run.input || {}),
    run.output || ''
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => 
      row.map(cell => 
        // Escape commas and quotes in cells
        typeof cell === 'string' && (cell.includes(',') || cell.includes('"')) ?
          `"${cell.replace(/"/g, '""')}"` :
          cell
      ).join(',')
    )
  ].join('\n');

  return csvContent;
}