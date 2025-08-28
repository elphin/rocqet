import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: List all members
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspace_id');

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
    }

    // Check user has access to workspace
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get all members with user details
    const { data: members, error } = await supabase
      .from('workspace_members')
      .select(`
        id,
        role,
        joined_at,
        user_id,
        invited_by,
        invite_accepted_at,
        users:user_id (
          id,
          email,
          created_at
        )
      `)
      .eq('workspace_id', workspaceId)
      .order('joined_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(members || []);

  } catch (error: any) {
    console.error('Error fetching members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH: Update member role
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { memberId, role, workspaceId } = await request.json();

    // Validate inputs
    if (!memberId || !role || !workspaceId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate role
    if (!['owner', 'admin', 'member', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Check if user has permission (must be owner or admin)
    const { data: userMembership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!userMembership || !['owner', 'admin'].includes(userMembership.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Prevent changing owner role (business logic)
    const { data: targetMember } = await supabase
      .from('workspace_members')
      .select('role, user_id')
      .eq('id', memberId)
      .single();

    if (targetMember?.role === 'owner') {
      return NextResponse.json({ error: 'Cannot change owner role' }, { status: 400 });
    }

    // Prevent demoting yourself if you're the only admin/owner
    if (targetMember?.user_id === user.id) {
      const { data: adminCount } = await supabase
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', workspaceId)
        .in('role', ['owner', 'admin'])
        .neq('id', memberId);

      if (!adminCount || adminCount.length === 0) {
        return NextResponse.json({ error: 'Cannot remove the last admin' }, { status: 400 });
      }
    }

    // Update the role
    const { data: updated, error } = await supabase
      .from('workspace_members')
      .update({ role })
      .eq('id', memberId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log activity
    await supabase
      .from('activity_logs')
      .insert({
        workspace_id: workspaceId,
        user_id: user.id,
        action: 'member_role_updated',
        entity_type: 'workspace_member',
        entity_id: memberId,
        metadata: { 
          old_role: targetMember?.role,
          new_role: role 
        }
      });

    return NextResponse.json(updated);

  } catch (error: any) {
    console.error('Error updating member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Remove member
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('id');
    const workspaceId = searchParams.get('workspace_id');

    if (!memberId || !workspaceId) {
      return NextResponse.json({ error: 'Member ID and Workspace ID required' }, { status: 400 });
    }

    // Check if user has permission (must be owner or admin)
    const { data: userMembership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!userMembership || !['owner', 'admin'].includes(userMembership.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get member details before deletion
    const { data: targetMember } = await supabase
      .from('workspace_members')
      .select('role, user_id, users:user_id(email)')
      .eq('id', memberId)
      .single();

    // Prevent removing owner
    if (targetMember?.role === 'owner') {
      return NextResponse.json({ error: 'Cannot remove workspace owner' }, { status: 400 });
    }

    // Prevent removing yourself if you're the only admin
    if (targetMember?.user_id === user.id) {
      const { data: adminCount } = await supabase
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', workspaceId)
        .in('role', ['owner', 'admin'])
        .neq('id', memberId);

      if (!adminCount || adminCount.length === 0) {
        return NextResponse.json({ error: 'Cannot remove the last admin' }, { status: 400 });
      }
    }

    // Remove the member
    const { error } = await supabase
      .from('workspace_members')
      .delete()
      .eq('id', memberId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log activity
    await supabase
      .from('activity_logs')
      .insert({
        workspace_id: workspaceId,
        user_id: user.id,
        action: 'member_removed',
        entity_type: 'workspace_member',
        entity_id: memberId,
        metadata: { 
          removed_user_email: targetMember?.users?.email,
          removed_user_role: targetMember?.role
        }
      });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error removing member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}