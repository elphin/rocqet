import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // First, check if user exists in users table
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!existingUser) {
      // Create user record
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email!,
          full_name: user.user_metadata?.full_name || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (userError) {
        console.error('Error creating user:', userError);
      }
    }

    // Get all workspaces
    const { data: workspaces, error: wsError } = await supabase
      .from('workspaces')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('Found workspaces:', workspaces);

    // Check current workspace memberships
    const { data: memberships } = await supabase
      .from('workspace_members')
      .select('*')
      .eq('user_id', user.id);

    console.log('Current memberships:', memberships);

    // If user has no memberships but workspaces exist, link to most recent workspace
    if ((!memberships || memberships.length === 0) && workspaces && workspaces.length > 0) {
      const workspace = workspaces[0]; // Get most recent workspace
      
      // Add user as owner of this workspace
      const { data: newMembership, error: memberError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: workspace.id,
          user_id: user.id,
          role: 'owner',
          joined_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (memberError) {
        return NextResponse.json({ 
          error: 'Failed to link workspace', 
          details: memberError,
          workspace_id: workspace.id,
          user_id: user.id
        }, { status: 400 });
      }

      return NextResponse.json({ 
        message: 'Workspace linked successfully!',
        workspace: workspace,
        membership: newMembership
      });
    }

    return NextResponse.json({ 
      user: user.email,
      workspaces: workspaces,
      memberships: memberships,
      message: memberships && memberships.length > 0 
        ? 'User already has workspace membership' 
        : 'No workspaces found to link'
    });
  } catch (error: any) {
    console.error('Fix workspace error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}