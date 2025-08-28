import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      return NextResponse.json({ error: 'Auth error', details: userError }, { status: 401 });
    }
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get workspaces
    const { data: workspaces, error: wsError } = await supabase
      .from('workspace_members')
      .select('workspace_id, workspaces(*)')
      .eq('user_id', user.id);

    if (wsError) {
      return NextResponse.json({ error: 'Workspace error', details: wsError }, { status: 400 });
    }

    // Get prompts
    const workspaceId = workspaces?.[0]?.workspace_id;
    if (workspaceId) {
      const { data: prompts, error: promptError } = await supabase
        .from('prompts')
        .select('*')
        .eq('workspace_id', workspaceId);

      return NextResponse.json({ 
        user: user.email,
        workspace: workspaces?.[0]?.workspaces,
        prompts: prompts || [],
        promptError: promptError
      });
    }

    return NextResponse.json({ 
      user: user.email,
      workspaces: workspaces,
      message: 'No workspace found'
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}