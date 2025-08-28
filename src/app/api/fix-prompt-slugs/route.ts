import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateSlug, generateUniqueSlug } from '@/lib/utils/slug';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get all prompts without slugs or with 'undefined' slug
    const { data: prompts, error: fetchError } = await supabase
      .from('prompts')
      .select('id, name, workspace_id, slug')
      .or('slug.is.null,slug.eq.undefined');
    
    if (fetchError) {
      console.error('Error fetching prompts:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    
    if (!prompts || prompts.length === 0) {
      return NextResponse.json({ message: 'No prompts need slug updates' });
    }
    
    const results = [];
    
    // Update each prompt with a unique slug
    for (const prompt of prompts) {
      const baseSlug = generateSlug(prompt.name);
      
      // Generate unique slug within the workspace
      const slug = await generateUniqueSlug(baseSlug, async (testSlug) => {
        const { data } = await supabase
          .from('prompts')
          .select('id')
          .eq('workspace_id', prompt.workspace_id)
          .eq('slug', testSlug)
          .neq('id', prompt.id) // Don't match the current prompt
          .single();
        return !!data;
      });
      
      // Update the prompt with the new slug
      const { error: updateError } = await supabase
        .from('prompts')
        .update({ slug })
        .eq('id', prompt.id);
      
      if (updateError) {
        console.error(`Error updating prompt ${prompt.id}:`, updateError);
        results.push({
          id: prompt.id,
          name: prompt.name,
          status: 'error',
          error: updateError.message
        });
      } else {
        console.log(`Updated prompt ${prompt.id} with slug: ${slug}`);
        results.push({
          id: prompt.id,
          name: prompt.name,
          slug: slug,
          status: 'success'
        });
      }
    }
    
    return NextResponse.json({
      message: `Updated ${results.filter(r => r.status === 'success').length} prompts`,
      total: prompts.length,
      results
    });
    
  } catch (error: any) {
    console.error('Error in fix-prompt-slugs:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}