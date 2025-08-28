import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    
    // Get workspace from URL
    const url = new URL(request.url);
    const workspaceSlug = url.searchParams.get('workspace');
    
    if (!workspaceSlug) {
      return NextResponse.json({ error: 'Workspace slug required' }, { status: 400 });
    }
    
    // Get workspace
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id, name, slug')
      .eq('slug', workspaceSlug)
      .single();
    
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }
    
    // Get prompts for this workspace
    const { data: prompts, error } = await supabase
      .from('prompts')
      .select('*')
      .eq('workspace_id', workspace.id)
      .order('updated_at', { ascending: false });
    
    return NextResponse.json({
      workspace,
      prompts: prompts || [],
      error,
      message: 'Check if slugs are present in the prompts'
    });
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}