import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    const query = searchParams.get('q')?.toLowerCase() || '';
    const workspaceId = searchParams.get('workspace_id');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const mode = searchParams.get('mode') || 'all'; // all, documentation, related
    const promptId = searchParams.get('prompt_id'); // For related prompts
    
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

    let results = [];
    let totalCount = 0;

    if (mode === 'related' && promptId) {
      // Find related prompts based on current prompt
      const { data: currentPrompt } = await supabase
        .from('prompts')
        .select('*')
        .eq('id', promptId)
        .eq('workspace_id', workspaceId)
        .single();

      if (currentPrompt) {
        // Get prompts with similar tags
        const { data: promptTags } = await supabase
          .from('prompt_tags')
          .select('tag_id')
          .eq('prompt_id', promptId);

        const tagIds = promptTags?.map(pt => pt.tag_id) || [];

        if (tagIds.length > 0) {
          // Find other prompts with same tags
          const { data: relatedByTags } = await supabase
            .from('prompt_tags')
            .select('prompt_id')
            .in('tag_id', tagIds)
            .neq('prompt_id', promptId);

          const relatedPromptIds = [...new Set(relatedByTags?.map(pt => pt.prompt_id) || [])];

          if (relatedPromptIds.length > 0) {
            const { data: relatedPrompts, count } = await supabase
              .from('prompts')
              .select('*, folders(name), users!prompts_created_by_fkey(email, full_name)', { count: 'exact' })
              .in('id', relatedPromptIds)
              .eq('workspace_id', workspaceId)
              .is('deleted_at', null)
              .limit(limit)
              .offset(offset);

            results = relatedPrompts || [];
            totalCount = count || 0;
          }
        }

        // If no tag-based results, find by similar content/keywords
        if (results.length === 0 && currentPrompt.description) {
          const keywords = currentPrompt.description.split(' ')
            .filter((word: string) => word.length > 3)
            .slice(0, 5);

          const searchConditions = keywords.map((keyword: string) => 
            `description.ilike.%${keyword}%,name.ilike.%${keyword}%,when_to_use.ilike.%${keyword}%`
          ).join(',');

          const { data: similarPrompts, count } = await supabase
            .from('prompts')
            .select('*, folders(name), users!prompts_created_by_fkey(email, full_name)', { count: 'exact' })
            .eq('workspace_id', workspaceId)
            .neq('id', promptId)
            .is('deleted_at', null)
            .or(searchConditions)
            .range(offset, offset + limit - 1);

          results = similarPrompts || [];
          totalCount = count || 0;
        }
      }
    } else if (mode === 'documentation' || (mode === 'all' && query)) {
      // Search specifically in documentation fields
      const searchConditions = [
        `when_to_use.ilike.%${query}%`,
        `name.ilike.%${query}%`,
        `description.ilike.%${query}%`,
        `content.ilike.%${query}%`
      ];

      // For JSONB fields, we need to search differently
      // We'll search in the main fields and also check JSONB content
      const { data: searchResults, count } = await supabase
        .from('prompts')
        .select('*, folders(name), users!prompts_created_by_fkey(email, full_name)', { count: 'exact' })
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .or(searchConditions.join(','))
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      // Additionally search in JSONB fields with raw SQL for better matching
      if (query.length > 2) {
        const { data: jsonbResults } = await supabase.rpc('search_prompt_documentation', {
          search_query: query,
          workspace_uuid: workspaceId,
          result_limit: limit,
          result_offset: offset
        }).select('*');

        // Merge results, avoiding duplicates
        const mergedResults = [...(searchResults || [])];
        const existingIds = new Set(mergedResults.map(r => r.id));
        
        (jsonbResults || []).forEach(result => {
          if (!existingIds.has(result.id)) {
            mergedResults.push(result);
          }
        });

        results = mergedResults.slice(0, limit);
        totalCount = mergedResults.length;
      } else {
        results = searchResults || [];
        totalCount = count || 0;
      }
    } else {
      // Default: get all prompts
      const { data: allPrompts, count } = await supabase
        .from('prompts')
        .select('*, folders(name), users!prompts_created_by_fkey(email, full_name)', { count: 'exact' })
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .limit(limit)
        .offset(offset)
        .order('created_at', { ascending: false });

      results = allPrompts || [];
      totalCount = count || 0;
    }

    // Enrich results with usage stats and tag counts
    const enrichedResults = await Promise.all(results.map(async (prompt) => {
      // Get tag count
      const { count: tagCount } = await supabase
        .from('prompt_tags')
        .select('*', { count: 'exact', head: true })
        .eq('prompt_id', prompt.id);

      // Get recent runs count
      const { count: runCount } = await supabase
        .from('prompt_runs')
        .select('*', { count: 'exact', head: true })
        .eq('prompt_id', prompt.id);

      // Calculate relevance score for search
      let relevanceScore = 0;
      if (query) {
        const lowerName = prompt.name?.toLowerCase() || '';
        const lowerDesc = prompt.description?.toLowerCase() || '';
        const lowerWhenToUse = prompt.when_to_use?.toLowerCase() || '';
        
        // Higher score for title matches
        if (lowerName.includes(query)) relevanceScore += 10;
        // Medium score for description matches
        if (lowerDesc.includes(query)) relevanceScore += 5;
        // Lower score for documentation matches
        if (lowerWhenToUse.includes(query)) relevanceScore += 3;
        
        // Boost score based on usage
        relevanceScore += Math.min(runCount || 0, 10) / 10;
      }

      return {
        ...prompt,
        tag_count: tagCount || 0,
        run_count: runCount || 0,
        relevance_score: relevanceScore
      };
    }));

    // Sort by relevance if searching
    if (query) {
      enrichedResults.sort((a, b) => b.relevance_score - a.relevance_score);
    }

    return NextResponse.json({
      results: enrichedResults,
      total: totalCount,
      limit,
      offset,
      mode,
      query
    });
  } catch (error) {
    console.error('Error in discover API:', error);
    return NextResponse.json(
      { error: 'Failed to discover prompts' },
      { status: 500 }
    );
  }
}

// Create prompt recommendation based on usage patterns
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { workspaceId, userId } = await request.json();

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Workspace ID is required' },
        { status: 400 }
      );
    }

    // Get user's recent prompt usage
    const { data: recentRuns } = await supabase
      .from('prompt_runs')
      .select('prompt_id, executed_at')
      .eq('executed_by', userId)
      .order('executed_at', { ascending: false })
      .limit(20);

    const recentPromptIds = [...new Set(recentRuns?.map(r => r.prompt_id) || [])];

    // Get frequently used prompts by the team
    const { data: teamFavorites } = await supabase
      .from('prompts')
      .select('*, users!prompts_created_by_fkey(email, full_name)')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .order('uses', { ascending: false })
      .limit(10);

    // Get prompts with high success rates (placeholder for future implementation)
    const { data: highQualityPrompts } = await supabase
      .from('prompts')
      .select('*, users!prompts_created_by_fkey(email, full_name)')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .gte('version', 3) // Prompts that have been refined multiple times
      .order('updated_at', { ascending: false })
      .limit(10);

    // Combine and deduplicate recommendations
    const recommendations = new Map();
    
    // Add team favorites
    (teamFavorites || []).forEach(prompt => {
      if (!recentPromptIds.includes(prompt.id)) {
        recommendations.set(prompt.id, {
          ...prompt,
          recommendation_reason: 'Popular in your team',
          recommendation_score: prompt.uses || 0
        });
      }
    });

    // Add high quality prompts
    (highQualityPrompts || []).forEach(prompt => {
      if (!recommendations.has(prompt.id) && !recentPromptIds.includes(prompt.id)) {
        recommendations.set(prompt.id, {
          ...prompt,
          recommendation_reason: 'Recently refined',
          recommendation_score: prompt.version || 0
        });
      }
    });

    const recommendationList = Array.from(recommendations.values())
      .sort((a, b) => b.recommendation_score - a.recommendation_score)
      .slice(0, 6);

    return NextResponse.json({
      recommendations: recommendationList,
      based_on: {
        recent_usage: recentPromptIds.length,
        team_patterns: teamFavorites?.length || 0
      }
    });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}