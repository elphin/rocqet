import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { workspace_id, email, role } = body;
    
    // Check if user has permission to invite
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspace_id)
      .eq('user_id', user.id)
      .single();
    
    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    // Check if user is already a member
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();
    
    if (existingUser) {
      const { data: existingMember } = await supabase
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', workspace_id)
        .eq('user_id', existingUser.id)
        .single();
      
      if (existingMember) {
        return NextResponse.json({ 
          error: 'User is already a member of this workspace' 
        }, { status: 409 });
      }
    }
    
    // Check if invite already exists
    const { data: existingInvite } = await supabase
      .from('workspace_invites')
      .select('id')
      .eq('workspace_id', workspace_id)
      .eq('email', email)
      .eq('status', 'pending')
      .single();
    
    if (existingInvite) {
      return NextResponse.json({ 
        error: 'An invitation has already been sent to this email' 
      }, { status: 409 });
    }
    
    // Create invite
    const inviteId = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days
    
    const { data: invite, error } = await supabase
      .from('workspace_invites')
      .insert({
        id: inviteId,
        workspace_id,
        email,
        role,
        status: 'pending',
        invited_by: user.id,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    // TODO: Send email invitation
    // For now, we'll just return the invite link
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${inviteId}`;
    
    return NextResponse.json({ 
      invite,
      inviteLink,
      message: 'Invitation created successfully' 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
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
    
    // Cancel invite
    const { error } = await supabase
      .from('workspace_invites')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', invite_id)
      .eq('workspace_id', workspace_id);
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ message: 'Invitation cancelled' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}