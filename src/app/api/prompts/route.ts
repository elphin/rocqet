import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateSlug, generateUniqueSlug } from '@/lib/utils/slug';

export async function POST(request: NextRequest) {
  console.log('POST /api/prompts - Start');
  
  try {
    const supabase = await createClient();
    
    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log('Auth check:', { user: user?.email, error: authError });
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized', details: authError }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { workspace_id, name, description, content, variables, model, temperature } = body;
    
    console.log('Request body:', { workspace_id, name, hasContent: !!content });

    // Generate unique slug
    const baseSlug = generateSlug(name);
    const slug = await generateUniqueSlug(baseSlug, async (testSlug) => {
      const { data } = await supabase
        .from('prompts')
        .select('id')
        .eq('workspace_id', workspace_id)
        .eq('slug', testSlug)
        .single();
      return !!data;
    });

    // Create the prompt
    const { data: prompt, error: promptError } = await supabase
      .from('prompts')
      .insert({
        workspace_id,
        name,
        slug,
        description: description || null,
        content,
        variables: variables || [],
        model: model || 'gpt-4',
        temperature: temperature || 7,
        created_by: user.id,
        updated_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (promptError) {
      console.error('Prompt creation error:', promptError);
      return NextResponse.json({ error: promptError.message, details: promptError }, { status: 400 });
    }
    
    console.log('Prompt created successfully:', prompt.id);

    // Create initial version
    const { error: versionError } = await supabase
      .from('prompt_versions')
      .insert({
        prompt_id: prompt.id,
        workspace_id,
        version: 1,
        content,
        variables: variables || [],
        parameters: { model: model || 'gpt-4', temperature: temperature || 7 },
        change_type: 'create',
        change_message: 'Initial version',
        created_by: user.id,
        created_at: new Date().toISOString(),
      });

    if (versionError) {
      console.error('Version creation error:', versionError);
      // Still return success if prompt was created
    }

    return NextResponse.json({ data: prompt });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  console.log('PATCH /api/prompts - Start');
  
  try {
    const supabase = await createClient();
    
    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log('Auth check:', { user: user?.email, error: authError });
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized', details: authError }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { 
      id, 
      workspace_id, 
      name, 
      slug,
      description,
      shortcode,
      content, 
      folder_id,
      visibility,
      is_favorite,
      variables, 
      model, 
      temperature,
      version,
      create_version,
      tags
    } = body;
    
    console.log('Update request:', { id, workspace_id, name, version, create_version });

    // Update the prompt
    const updateData: any = {
      name,
      description: description || null,
      content,
      variables: variables || [],
      model: model || 'gpt-4',
      temperature: temperature || 7,
      version: version || 1,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };
    
    // Add optional fields if provided
    if (slug !== undefined) updateData.slug = slug;
    if (shortcode !== undefined) updateData.shortcode = shortcode;
    if (folder_id !== undefined) updateData.folder_id = folder_id;
    if (visibility !== undefined) updateData.visibility = visibility;
    if (is_favorite !== undefined) updateData.is_favorite = is_favorite;
    
    const { data: prompt, error: promptError } = await supabase
      .from('prompts')
      .update(updateData)
      .eq('id', id)
      .eq('workspace_id', workspace_id)
      .select()
      .single();

    if (promptError) {
      console.error('Prompt update error:', promptError);
      return NextResponse.json({ error: promptError.message, details: promptError }, { status: 400 });
    }
    
    console.log('Prompt updated successfully:', prompt.id);
    
    // Handle tags if provided
    if (tags !== undefined && Array.isArray(tags)) {
      // First delete existing tags
      await supabase
        .from('prompt_tags')
        .delete()
        .eq('prompt_id', id);
      
      // Then insert new tags
      if (tags.length > 0) {
        const tagData = tags.map(tagId => ({
          prompt_id: id,
          tag_id: tagId,
          workspace_id
        }));
        
        const { error: tagError } = await supabase
          .from('prompt_tags')
          .insert(tagData);
        
        if (tagError) {
          console.error('Error updating tags:', tagError);
        }
      }
    }

    // Create version entry if content changed
    if (create_version) {
      const { error: versionError } = await supabase
        .from('prompt_versions')
        .insert({
          prompt_id: id,
          workspace_id,
          version,
          content,
          variables: variables || [],
          parameters: { model: model || 'gpt-4', temperature: temperature || 7 },
          change_type: 'update',
          change_message: 'Updated prompt content',
          created_by: user.id,
          created_at: new Date().toISOString(),
        });

      if (versionError) {
        console.error('Version creation error:', versionError);
        // Still return success if prompt was updated
      }
    }

    return NextResponse.json({ data: prompt });
  } catch (error: any) {
    console.error('API PATCH error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  console.log('DELETE /api/prompts - Start');
  
  try {
    const supabase = await createClient();
    
    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get prompt ID from URL search params
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const workspace_id = searchParams.get('workspace_id');
    
    if (!id || !workspace_id) {
      return NextResponse.json({ error: 'Missing prompt ID or workspace ID' }, { status: 400 });
    }

    console.log('Delete request:', { id, workspace_id });

    // Delete the prompt (cascades to versions due to foreign key)
    const { error: deleteError } = await supabase
      .from('prompts')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspace_id);

    if (deleteError) {
      console.error('Prompt deletion error:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }
    
    console.log('Prompt deleted successfully:', id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API DELETE error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}