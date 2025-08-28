import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = await createClient();
    
    // Get user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Get user's workspaces
    const { data: memberships } = await supabase
      .from('workspace_members')
      .select('workspace_id, workspaces(id, name, slug)')
      .eq('user_id', user.id);
    
    const results = {
      searchingFor: params.slug,
      user: user.email,
      workspaces: memberships,
      bySlug: null as any,
      byId: null as any,
      allPromptsInWorkspaces: [] as any[]
    };
    
    if (memberships && memberships.length > 0) {
      // Search by slug in all user's workspaces
      const { data: bySlug } = await supabase
        .from('prompts')
        .select('id, name, slug, workspace_id')
        .eq('slug', params.slug)
        .in('workspace_id', memberships.map(m => m.workspace_id));
      
      results.bySlug = bySlug;
      
      // Search by ID
      const { data: byId } = await supabase
        .from('prompts')
        .select('id, name, slug, workspace_id')
        .eq('id', params.slug)
        .in('workspace_id', memberships.map(m => m.workspace_id));
      
      results.byId = byId;
      
      // Get all prompts in user's workspaces for comparison
      const { data: allPrompts } = await supabase
        .from('prompts')
        .select('id, name, slug, workspace_id')
        .in('workspace_id', memberships.map(m => m.workspace_id))
        .limit(10);
      
      results.allPromptsInWorkspaces = allPrompts || [];
    }
    
    return NextResponse.json(results);
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}