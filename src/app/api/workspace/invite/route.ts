import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { nanoid } from 'nanoid';
import { Resend } from 'resend';

// Only initialize Resend if API key is available
let resend: Resend | null = null;
try {
  if (process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
} catch (error) {
  console.log('Resend not available - email invitations will be disabled');
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, role, workspaceId } = await request.json();

    // Validate user has permission to invite
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get workspace details
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('name, slug')
      .eq('id', workspaceId)
      .single();

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('users.email', email)
      .single();

    if (existingMember) {
      return NextResponse.json({ error: 'User is already a member' }, { status: 400 });
    }

    // Check for existing pending invite
    const { data: existingInvite } = await supabase
      .from('workspace_invites')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('email', email)
      .eq('status', 'pending')
      .single();

    if (existingInvite) {
      return NextResponse.json({ error: 'Invite already sent to this email' }, { status: 400 });
    }

    // Create invite
    const inviteToken = nanoid(32);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

    const { data: invite, error: inviteError } = await supabase
      .from('workspace_invites')
      .insert({
        workspace_id: workspaceId,
        email,
        role,
        token: inviteToken,
        invited_by: user.id,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      })
      .select()
      .single();

    if (inviteError) {
      console.error('Error creating invite:', inviteError);
      return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
    }

    // Send email invitation
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${inviteToken}`;
    
    if (resend) {
      try {
        await resend.emails.send({
        from: 'ROCQET <noreply@rocqet.app>',
        to: email,
        subject: `You've been invited to join ${workspace.name} on ROCQET`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #111827;">You're invited to join ${workspace.name}</h2>
            <p style="color: #6B7280; line-height: 1.6;">
              ${user.email} has invited you to join their workspace on ROCQET as a ${role}.
            </p>
            <p style="color: #6B7280; line-height: 1.6;">
              ROCQET is the GitHub for AI Prompts - collaborate on prompts, track versions, and manage your team's AI assets.
            </p>
            <div style="margin: 32px 0;">
              <a href="${inviteUrl}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Accept Invitation
              </a>
            </div>
            <p style="color: #9CA3AF; font-size: 14px;">
              This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 32px 0;">
            <p style="color: #9CA3AF; font-size: 12px;">
              © 2025 ROCQET. All rights reserved.
            </p>
          </div>
        `
        });
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        // Don't fail the invite if email fails - they can still get the link from the UI
      }
    } else {
      console.log('Resend not configured - invite link:', inviteUrl);
    }

    // Log activity
    await supabase
      .from('activity_logs')
      .insert({
        workspace_id: workspaceId,
        user_id: user.id,
        action: 'invite_sent',
        entity_type: 'workspace_invite',
        entity_id: invite.id,
        metadata: { email, role }
      });

    // Create notification for the invitee (if they have an account)
    const { data: inviteeUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();
    
    if (inviteeUser) {
      // User exists, send them a notification
      await supabase
        .from('notifications')
        .insert({
          user_id: inviteeUser.id,
          workspace_id: workspaceId,
          type: 'invite_received',
          title: 'Workspace Invitation',
          message: `You've been invited to join "${workspace.name}" as a ${role}`,
          entity_type: 'workspace_invite',
          entity_id: invite.id,
          action_url: `/invite/${inviteToken}`,
          metadata: {
            workspace_name: workspace.name,
            workspace_slug: workspace.slug,
            role,
            invited_by: user.email
          }
        });
    }

    return NextResponse.json({ 
      success: true, 
      invite,
      inviteUrl 
    });

  } catch (error) {
    console.error('Error in invite API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Resend invite
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { inviteId } = await request.json();

    // Get invite details
    const { data: invite } = await supabase
      .from('workspace_invites')
      .select('*, workspaces(name)')
      .eq('id', inviteId)
      .single();

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    // Validate permission
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', invite.workspace_id)
      .eq('user_id', user.id)
      .single();

    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Update expiry
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    const { error: updateError } = await supabase
      .from('workspace_invites')
      .update({ 
        expires_at: newExpiresAt.toISOString(),
        status: 'pending' 
      })
      .eq('id', inviteId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to resend invite' }, { status: 500 });
    }

    // Resend email
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${invite.token}`;
    
    if (resend) {
      try {
        await resend.emails.send({
          from: 'ROCQET <noreply@rocqet.app>',
          to: invite.email,
          subject: `Reminder: You've been invited to join ${invite.workspaces.name} on ROCQET`,
          html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #111827;">Reminder: You're invited to join ${invite.workspaces.name}</h2>
            <p style="color: #6B7280; line-height: 1.6;">
              This is a reminder that you've been invited to join ${invite.workspaces.name} on ROCQET as a ${invite.role}.
            </p>
            <div style="margin: 32px 0;">
              <a href="${inviteUrl}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Accept Invitation
              </a>
            </div>
            <p style="color: #9CA3AF; font-size: 14px;">
              This invitation will expire in 7 days.
            </p>
          </div>
        `
        });
      } catch (emailError) {
        console.error('Error sending reminder email:', emailError);
      }
    } else {
      console.log('Resend not configured - invite link:', inviteUrl);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error resending invite:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Cancel invite
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const inviteId = searchParams.get('id');

    if (!inviteId) {
      return NextResponse.json({ error: 'Invite ID required' }, { status: 400 });
    }

    // Get invite to verify permissions
    const { data: invite } = await supabase
      .from('workspace_invites')
      .select('workspace_id')
      .eq('id', inviteId)
      .single();

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    // Validate permission
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', invite.workspace_id)
      .eq('user_id', user.id)
      .single();

    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Update invite status to cancelled
    const { error } = await supabase
      .from('workspace_invites')
      .update({ status: 'cancelled' })
      .eq('id', inviteId);

    if (error) {
      return NextResponse.json({ error: 'Failed to cancel invite' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error cancelling invite:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}