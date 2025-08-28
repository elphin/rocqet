import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { invite_id } = body;
    
    // Get the invite
    const { data: invite } = await supabase
      .from('workspace_invites')
      .select('*')
      .eq('id', invite_id)
      .eq('status', 'pending')
      .single();
    
    if (!invite) {
      return NextResponse.json({ 
        error: 'Invalid or expired invitation' 
      }, { status: 404 });
    }
    
    // Check if expired
    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ 
        error: 'This invitation has expired' 
      }, { status: 400 });
    }
    
    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', invite.workspace_id)
      .eq('user_id', user.id)
      .single();
    
    if (existingMember) {
      // Update invite status to accepted anyway
      await supabase
        .from('workspace_invites')
        .update({ 
          status: 'accepted',
          accepted_by: user.id,
          accepted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', invite_id);
      
      return NextResponse.json({ 
        message: 'You are already a member of this workspace' 
      });
    }
    
    // Start a transaction-like operation
    // First, add the user as a member
    const { data: newMember, error: memberError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: invite.workspace_id,
        user_id: user.id,
        role: invite.role,
        joined_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (memberError) {
      return NextResponse.json({ 
        error: 'Failed to add you to the workspace' 
      }, { status: 400 });
    }
    
    // Update the invite status
    const { error: inviteError } = await supabase
      .from('workspace_invites')
      .update({ 
        status: 'accepted',
        accepted_by: user.id,
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', invite_id);
    
    if (inviteError) {
      // Try to rollback by removing the member
      await supabase
        .from('workspace_members')
        .delete()
        .eq('id', newMember.id);
      
      return NextResponse.json({ 
        error: 'Failed to process invitation' 
      }, { status: 400 });
    }
    
    // Update user record if email was different
    if (user.email !== invite.email) {
      // Log this for tracking purposes
      console.log(`User ${user.id} accepted invite meant for ${invite.email}`);
    }
    
    // Get workspace details for notifications
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('name, slug')
      .eq('id', invite.workspace_id)
      .single();
    
    // Get user details
    const { data: userData } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', user.id)
      .single();
    
    const memberName = userData?.full_name || userData?.email || user.email;
    
    // Notify the inviter that their invitation was accepted
    await supabase
      .from('notifications')
      .insert({
        user_id: invite.invited_by,
        workspace_id: invite.workspace_id,
        type: 'invite_accepted',
        title: 'Invitation Accepted',
        message: `${memberName} has joined "${workspace?.name}"`,
        entity_type: 'workspace_member',
        entity_id: newMember.id,
        action_url: `/${workspace?.slug}/settings/team`,
        metadata: {
          member_name: memberName,
          workspace_name: workspace?.name,
          role: invite.role
        }
      });
    
    // Notify other team members about the new member
    const { data: otherMembers } = await supabase
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', invite.workspace_id)
      .neq('user_id', user.id)
      .neq('user_id', invite.invited_by);
    
    if (otherMembers && otherMembers.length > 0) {
      const notifications = otherMembers.map(member => ({
        user_id: member.user_id,
        workspace_id: invite.workspace_id,
        type: 'member_joined',
        title: 'New Team Member',
        message: `${memberName} has joined "${workspace?.name}" as ${invite.role}`,
        entity_type: 'workspace_member',
        entity_id: newMember.id,
        action_url: `/${workspace?.slug}/settings/team`,
        metadata: {
          member_name: memberName,
          workspace_name: workspace?.name,
          role: invite.role
        }
      }));
      
      await supabase
        .from('notifications')
        .insert(notifications);
    }
    
    // Log activity
    await supabase
      .from('activity_logs')
      .insert({
        workspace_id: invite.workspace_id,
        user_id: user.id,
        action: 'invite_accepted',
        entity_type: 'workspace_invite',
        entity_id: invite.id,
        metadata: {
          role: invite.role,
          invited_by: invite.invited_by
        }
      });
    
    // Add to activity feed
    await supabase
      .from('activity_feed')
      .insert({
        workspace_id: invite.workspace_id,
        actor_id: user.id,
        actor_name: memberName,
        action: 'joined',
        entity_type: 'workspace',
        entity_id: invite.workspace_id,
        entity_name: workspace?.name,
        metadata: {
          role: invite.role
        }
      });
    
    return NextResponse.json({ 
      message: 'Successfully joined workspace',
      member: newMember
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}