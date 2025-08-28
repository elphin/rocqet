import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { workspace_id, member_id, role } = body;
    
    // Validate role
    const validRoles = ['viewer', 'member', 'admin', 'owner'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }
    
    // Check if user has permission to update roles
    const { data: currentUserMembership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspace_id)
      .eq('user_id', user.id)
      .single();
    
    if (!currentUserMembership || currentUserMembership.role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can change roles' }, { status: 403 });
    }
    
    // Get the member being updated
    const { data: targetMember } = await supabase
      .from('workspace_members')
      .select('user_id, role')
      .eq('id', member_id)
      .eq('workspace_id', workspace_id)
      .single();
    
    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    
    // Prevent owner from changing their own role
    if (targetMember.user_id === user.id) {
      return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 });
    }
    
    // Prevent changing another owner's role (if there are multiple owners)
    if (targetMember.role === 'owner' && role !== 'owner') {
      // Check if this is the last owner
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
    
    // Update the role
    const { error } = await supabase
      .from('workspace_members')
      .update({ 
        role,
        updated_at: new Date().toISOString()
      })
      .eq('id', member_id)
      .eq('workspace_id', workspace_id);
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ message: 'Role updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}