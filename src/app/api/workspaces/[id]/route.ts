import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = await createClient();
  
  try {
    const body = await request.json();
    const { display_name, seats } = body;

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin/owner of workspace
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', id)
      .eq('user_id', user.id)
      .single();

    if (!membership || (membership.role !== 'admin' && membership.role !== 'owner')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Build update object
    const updateData: any = {};
    
    if (display_name !== undefined) {
      updateData.display_name = display_name;
    }
    
    if (seats !== undefined) {
      // Validate seats against tier limits
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('subscription_tier, max_seats')
        .eq('id', id)
        .single();

      if (!workspace) {
        return NextResponse.json(
          { error: 'Workspace not found' },
          { status: 404 }
        );
      }

      const maxSeats = workspace.max_seats || 1;
      if (seats > maxSeats) {
        return NextResponse.json(
          { error: `Cannot exceed maximum seats (${maxSeats}) for current tier` },
          { status: 400 }
        );
      }

      // Check current member count
      const { count: memberCount } = await supabase
        .from('workspace_members')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', id);

      if (seats < (memberCount || 1)) {
        return NextResponse.json(
          { error: `Cannot set seats below current member count (${memberCount})` },
          { status: 400 }
        );
      }

      updateData.seats = seats;
    }

    // Update workspace
    const { data, error } = await supabase
      .from('workspaces')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating workspace:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error in PATCH /api/workspaces/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update workspace' },
      { status: 500 }
    );
  }
}