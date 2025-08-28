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

    // Get workspace (use most recent if multiple)
    const { data: workspaceMembers } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false })
      .limit(1);

    if (!workspaceMembers || workspaceMembers.length === 0) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 });
    }
    
    const workspaceMember = workspaceMembers[0];

    // Count prompts
    const { count, error } = await supabase
      .from('prompts')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceMember.workspace_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Also get all prompts for debugging
    const { data: prompts } = await supabase
      .from('prompts')
      .select('id, name, created_at')
      .eq('workspace_id', workspaceMember.workspace_id);

    return NextResponse.json({ 
      workspace_id: workspaceMember.workspace_id,
      count: count || 0,
      prompts: prompts || []
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}