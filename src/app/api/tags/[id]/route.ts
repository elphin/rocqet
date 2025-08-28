import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    const { data: tag, error } = await supabase
      .from('tags')
      .select(`
        *,
        prompt_tags (
          prompt_id,
          prompts (
            id,
            name,
            slug
          )
        )
      `)
      .eq('id', id)
      .single();
    
    if (error || !tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }
    
    return NextResponse.json(tag);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { name, description, color } = body;
    
    // Get the tag to check workspace permissions
    const { data: existingTag } = await supabase
      .from('tags')
      .select('workspace_id')
      .eq('id', id)
      .single();
    
    if (!existingTag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }
    
    // Check user has access to workspace
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', existingTag.workspace_id)
      .eq('user_id', user.id)
      .single();
    
    if (!membership || !['owner', 'admin', 'member'].includes(membership.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    // Update the tag
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.toLowerCase();
    if (description !== undefined) updateData.description = description;
    if (color !== undefined) updateData.color = color;
    
    const { data: tag, error } = await supabase
      .from('tags')
      .update(updateData)
      .eq('id', id)
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the tag to check workspace permissions
    const { data: existingTag } = await supabase
      .from('tags')
      .select('workspace_id, name')
      .eq('id', id)
      .single();
    
    if (!existingTag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }
    
    // Check user has admin/owner access to workspace
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', existingTag.workspace_id)
      .eq('user_id', user.id)
      .single();
    
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
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
    
    // Log activity
    await supabase
      .from('activity_logs')
      .insert({
        workspace_id: existingTag.workspace_id,
        user_id: user.id,
        action: 'tag_deleted',
        entity_type: 'tag',
        entity_id: id,
        metadata: { name: existingTag.name }
      });
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}