import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: Fetch activity feed for a workspace
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspace_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspace_id required' },
        { status: 400 }
      );
    }

    // Check if user is a member of the workspace
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'Not a member of this workspace' },
        { status: 403 }
      );
    }

    // Fetch activity feed
    const { data: activities, error } = await supabase
      .from('activity_feed')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching activity:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ activities: activities || [] });

  } catch (error: any) {
    console.error('Activity fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch activity' },
      { status: 500 }
    );
  }
}

// POST: Create activity entry
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      workspaceId,
      action,
      entityType,
      entityId,
      entityName,
      metadata = {}
    } = body;

    // Validate required fields
    if (!workspaceId || !action || !entityType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user is a member of the workspace
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'Not a member of this workspace' },
        { status: 403 }
      );
    }

    // Get user info for activity feed
    const { data: userData } = await supabase
      .from('users')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .single();

    // Create activity entry
    const { data, error } = await supabase
      .from('activity_feed')
      .insert({
        workspace_id: workspaceId,
        actor_id: user.id,
        actor_name: userData?.full_name || user.email?.split('@')[0] || 'Unknown',
        actor_avatar: userData?.avatar_url,
        action,
        entity_type: entityType,
        entity_id: entityId,
        entity_name: entityName,
        metadata,
        is_public: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating activity:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Create notifications for relevant workspace members
    if (shouldNotifyMembers(action, entityType)) {
      await createActivityNotifications(
        supabase,
        workspaceId,
        user.id,
        action,
        entityType,
        entityName,
        metadata
      );
    }

    return NextResponse.json({ activity: data });

  } catch (error: any) {
    console.error('Activity creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create activity' },
      { status: 500 }
    );
  }
}

// Helper function to determine if members should be notified
function shouldNotifyMembers(action: string, entityType: string): boolean {
  const notifiableActions = ['created', 'updated', 'shared', 'commented'];
  const notifiableEntities = ['prompt', 'chain', 'folder'];
  
  return notifiableActions.includes(action) && notifiableEntities.includes(entityType);
}

// Helper function to create notifications for workspace members
async function createActivityNotifications(
  supabase: any,
  workspaceId: string,
  actorId: string,
  action: string,
  entityType: string,
  entityName: string | null,
  metadata: any
) {
  try {
    // Get all workspace members except the actor
    const { data: members } = await supabase
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', workspaceId)
      .neq('user_id', actorId);

    if (!members || members.length === 0) return;

    // Get actor info
    const { data: actor } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', actorId)
      .single();

    const actorName = actor?.full_name || 'A team member';
    const title = `New ${entityType} activity`;
    const message = `${actorName} ${action} ${entityType} "${entityName || 'untitled'}"`;

    // Create notifications for each member
    const notifications = members.map(member => ({
      user_id: member.user_id,
      workspace_id: workspaceId,
      type: 'workspace_update',
      title,
      message,
      entity_type: entityType,
      entity_id: metadata.entity_id,
      action_url: metadata.action_url || `/${workspaceId}/${entityType}s`,
      metadata
    }));

    await supabase
      .from('notifications')
      .insert(notifications);

  } catch (error) {
    console.error('Error creating activity notifications:', error);
    // Don't throw - notifications are not critical
  }
}