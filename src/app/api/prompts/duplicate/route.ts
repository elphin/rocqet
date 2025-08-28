import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateSlug, generateUniqueSlug } from '@/lib/utils/slug';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { prompt_id, workspace_id } = body;
    
    // Get the original prompt
    const { data: original, error: fetchError } = await supabase
      .from('prompts')
      .select('*')
      .eq('id', prompt_id)
      .eq('workspace_id', workspace_id)
      .single();
    
    if (fetchError || !original) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
    }
    
    // Generate new name and slug
    const newName = `${original.name} (Copy)`;
    const baseSlug = generateSlug(newName);
    const newSlug = await generateUniqueSlug(baseSlug, async (testSlug) => {
      const { data } = await supabase
        .from('prompts')
        .select('id')
        .eq('workspace_id', workspace_id)
        .eq('slug', testSlug)
        .single();
      return !!data;
    });
    
    // Create the duplicate
    const { data: duplicate, error: createError } = await supabase
      .from('prompts')
      .insert({
        workspace_id: original.workspace_id,
        name: newName,
        slug: newSlug,
        description: original.description,
        content: original.content,
        folder_id: original.folder_id,
        variables: original.variables,
        parameters: original.parameters,
        model: original.model,
        temperature: original.temperature,
        max_tokens: original.max_tokens,
        version: 1,
        tags: original.tags,
        metadata: {
          ...original.metadata,
          duplicated_from: prompt_id,
          duplicated_at: new Date().toISOString()
        },
        created_by: user.id,
        updated_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (createError) {
      console.error('Error duplicating prompt:', createError);
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }
    
    // Create initial version entry
    await supabase
      .from('prompt_versions')
      .insert({
        prompt_id: duplicate.id,
        workspace_id,
        version: 1,
        content: duplicate.content,
        variables: duplicate.variables,
        parameters: { model: duplicate.model, temperature: duplicate.temperature },
        change_type: 'create',
        change_message: `Duplicated from "${original.name}"`,
        created_by: user.id,
        created_at: new Date().toISOString(),
      });
    
    return NextResponse.json({ 
      data: duplicate,
      message: 'Prompt duplicated successfully'
    });
    
  } catch (error: any) {
    console.error('API duplicate error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}