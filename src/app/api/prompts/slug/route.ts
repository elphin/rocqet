import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(request: NextRequest) {
  console.log('PATCH /api/prompts/slug - Start');
  
  try {
    const supabase = await createClient();
    
    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { id, workspace_id, slug } = body;
    
    if (!id || !workspace_id || !slug) {
      return NextResponse.json({ error: 'Missing required fields: id, workspace_id, slug' }, { status: 400 });
    }

    console.log('Slug update request:', { id, workspace_id, slug });

    // Validate slug format
    const slugPattern = /^[a-zA-Z0-9-_]+$/;
    if (!slugPattern.test(slug)) {
      return NextResponse.json({ 
        error: 'Invalid slug format. Use only letters, numbers, hyphens, and underscores.',
        code: 'INVALID_SLUG_FORMAT'
      }, { status: 400 });
    }

    if (slug.length < 3 || slug.length > 100) {
      return NextResponse.json({ 
        error: 'Slug must be between 3 and 100 characters',
        code: 'INVALID_SLUG_LENGTH'
      }, { status: 400 });
    }

    if (slug.startsWith('-') || slug.startsWith('_') || slug.endsWith('-') || slug.endsWith('_')) {
      return NextResponse.json({ 
        error: 'Slug cannot start or end with hyphens or underscores',
        code: 'INVALID_SLUG_FORMAT'
      }, { status: 400 });
    }

    // Check if the user has permission to edit this prompt
    const { data: existingPrompt, error: fetchError } = await supabase
      .from('prompts')
      .select('id, slug, workspace_id')
      .eq('id', id)
      .eq('workspace_id', workspace_id)
      .single();

    if (fetchError) {
      console.error('Error fetching prompt:', fetchError);
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
    }

    // Check if slug is already the same
    if (existingPrompt.slug === slug) {
      return NextResponse.json({ data: { slug: existingPrompt.slug } });
    }

    // Check if slug is already taken by another prompt in the same workspace
    const { data: duplicatePrompt, error: duplicateError } = await supabase
      .from('prompts')
      .select('id')
      .eq('workspace_id', workspace_id)
      .eq('slug', slug)
      .neq('id', id)
      .single();

    if (duplicateError && duplicateError.code !== 'PGRST116') {
      console.error('Error checking duplicate slug:', duplicateError);
      return NextResponse.json({ error: 'Failed to validate slug uniqueness' }, { status: 500 });
    }

    if (duplicatePrompt) {
      return NextResponse.json({ 
        error: 'This slug is already in use by another prompt',
        code: 'SLUG_EXISTS'
      }, { status: 409 });
    }

    // Update the prompt with new slug
    const { data: updatedPrompt, error: updateError } = await supabase
      .from('prompts')
      .update({
        slug,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('workspace_id', workspace_id)
      .select('id, slug')
      .single();

    if (updateError) {
      console.error('Prompt slug update error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }
    
    console.log('Prompt slug updated successfully:', { id, oldSlug: existingPrompt.slug, newSlug: slug });

    return NextResponse.json({ data: updatedPrompt });
  } catch (error: any) {
    console.error('API PATCH slug error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}