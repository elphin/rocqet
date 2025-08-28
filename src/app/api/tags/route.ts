import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const workspace_id = searchParams.get('workspace_id');
    
    if (!workspace_id) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
    }
    
    // Get all tags for this workspace
    const { data: tags, error } = await supabase
      .from('tags')
      .select('*')
      .eq('workspace_id', workspace_id)
      .order('name', { ascending: true });
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Get tag usage counts
    const { data: tagCounts } = await supabase
      .from('prompt_tags')
      .select('tag_id')
      .in('tag_id', tags?.map(t => t.id) || []);
    
    // Add usage count to each tag
    const tagsWithCounts = tags?.map(tag => ({
      ...tag,
      usage_count: tagCounts?.filter(tc => tc.tag_id === tag.id).length || 0
    }));
    
    return NextResponse.json(tagsWithCounts || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { workspace_id, name, color } = body;
    
    // Check if tag already exists
    const { data: existingTag } = await supabase
      .from('tags')
      .select('id')
      .eq('workspace_id', workspace_id)
      .eq('name', name.toLowerCase())
      .single();
    
    if (existingTag) {
      return NextResponse.json({ 
        error: 'Tag already exists',
        data: existingTag 
      }, { status: 409 });
    }
    
    // Create new tag (removing created_by and timestamps as they might not exist or be auto-generated)
    const { data: tag, error } = await supabase
      .from('tags')
      .insert({
        workspace_id,
        name: name.toLowerCase(),
        color: color || '#3B82F6' // Default blue color if not provided
      })
      .select()
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json(tag);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Tag ID required' }, { status: 400 });
    }
    
    // Remove tag from all prompts first
    await supabase
      .from('prompt_tags')
      .delete()
      .eq('tag_id', id);
    
    // Delete the tag
    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', id);
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}