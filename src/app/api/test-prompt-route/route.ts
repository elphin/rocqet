import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const url = new URL(request.url);
    
    // Test parameters
    const workspaceSlug = url.searchParams.get('workspace') || 'anotherworkspace';
    const promptSlug = url.searchParams.get('prompt') || 'my-awesome-first-prompt';
    
    console.log('Testing route with:', { workspaceSlug, promptSlug });
    
    // Step 1: Get workspace
    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .select('*')
      .eq('slug', workspaceSlug)
      .single();
    
    if (!workspace) {
      return NextResponse.json({ 
        error: 'Workspace not found',
        searched: workspaceSlug,
        wsError 
      });
    }
    
    // Step 2: Get prompt by slug
    const { data: prompt, error: promptError } = await supabase
      .from('prompts')
      .select('*')
      .eq('slug', promptSlug)
      .eq('workspace_id', workspace.id)
      .single();
    
    // Step 3: If not found by slug, list all prompts in workspace
    const { data: allPrompts } = await supabase
      .from('prompts')
      .select('id, name, slug, workspace_id')
      .eq('workspace_id', workspace.id);
    
    return NextResponse.json({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug
      },
      searchedFor: {
        workspaceSlug,
        promptSlug
      },
      foundPrompt: prompt,
      promptError,
      allPromptsInWorkspace: allPrompts || [],
      debugInfo: {
        totalPrompts: allPrompts?.length || 0,
        promptFound: !!prompt
      }
    });
    
  } catch (error: any) {
    console.error('Debug error:', error);
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}