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
    const { invite_id, workspace_id } = body;
    
    // Check if user has permission
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspace_id)
      .eq('user_id', user.id)
      .single();
    
    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    // Get the existing invite
    const { data: existingInvite } = await supabase
      .from('workspace_invites')
      .select('email, role')
      .eq('id', invite_id)
      .eq('workspace_id', workspace_id)
      .single();
    
    if (!existingInvite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }
    
    // Update the existing invite with new expiry
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7); // Expires in 7 days
    
    const { error } = await supabase
      .from('workspace_invites')
      .update({
        status: 'pending',
        expires_at: newExpiresAt.toISOString(),
        invited_by: user.id,
        updated_at: new Date().toISOString(),
        // Clear any previous acceptance/rejection data
        accepted_by: null,
        accepted_at: null,
        rejected_by: null,
        rejected_at: null
      })
      .eq('id', invite_id)
      .eq('workspace_id', workspace_id);
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    // TODO: Send email notification
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invite_id}`;
    
    return NextResponse.json({ 
      message: 'Invitation resent successfully',
      inviteLink
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}