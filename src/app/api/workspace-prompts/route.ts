import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    
    if (!slug) {
      return NextResponse.json({ error: 'Workspace slug required' }, { status: 400 });
    }
    
    // Get workspace by slug
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id')
      .eq('slug', slug)
      .single();
    
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }
    
    // Get all prompts for this workspace
    const { data: prompts } = await supabase
      .from('prompts')
      .select('id, name, slug, description')
      .eq('workspace_id', workspace.id)
      .order('updated_at', { ascending: false });
    
    return NextResponse.json({ prompts: prompts || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}