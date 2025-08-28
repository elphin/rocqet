import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { workspace_id, member_id } = body;
    
    // Check if user has permission to remove members
    const { data: currentUserMembership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspace_id)
      .eq('user_id', user.id)
      .single();
    
    if (!currentUserMembership || 
        (currentUserMembership.role !== 'owner' && currentUserMembership.role !== 'admin')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    // Get the member being removed
    const { data: targetMember } = await supabase
      .from('workspace_members')
      .select('user_id, role')
      .eq('id', member_id)
      .eq('workspace_id', workspace_id)
      .single();
    
    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    
    // Prevent removing yourself
    if (targetMember.user_id === user.id) {
      return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 });
    }
    
    // Only owners can remove admins or other owners
    if ((targetMember.role === 'admin' || targetMember.role === 'owner') && 
        currentUserMembership.role !== 'owner') {
      return NextResponse.json({ 
        error: 'Only owners can remove admins' 
      }, { status: 403 });
    }
    
    // Prevent removing the last owner
    if (targetMember.role === 'owner') {
      const { data: owners } = await supabase
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', workspace_id)
        .eq('role', 'owner');
      
      if (owners && owners.length <= 1) {
        return NextResponse.json({ 
          error: 'Cannot remove the last owner' 
        }, { status: 400 });
      }
    }
    
    // Remove the member
    const { error } = await supabase
      .from('workspace_members')
      .delete()
      .eq('id', member_id)
      .eq('workspace_id', workspace_id);
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ message: 'Member removed successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}