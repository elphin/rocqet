import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { promptId, versionId, content } = await request.json();

    if (!promptId || !versionId || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Update the prompt with the content from the selected version
    const { data: prompt, error: updateError } = await supabase
      .from('prompts')
      .update({
        content,
        updated_at: new Date().toISOString(),
        version: (await supabase
          .from('prompts')
          .select('version')
          .eq('id', promptId)
          .single()).data?.version + 1 || 1
      })
      .eq('id', promptId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating prompt:', updateError);
      return NextResponse.json({ error: 'Failed to restore version' }, { status: 500 });
    }

    // Create a new version record for this restoration
    const { error: versionError } = await supabase
      .from('prompt_versions')
      .insert({
        prompt_id: promptId,
        version: prompt.version,
        content,
        changes: JSON.stringify([{ op: 'restore', from: versionId }]),
        created_by: user.id
      });

    if (versionError) {
      console.error('Error creating version record:', versionError);
    }

    return NextResponse.json({ success: true, prompt });
  } catch (error) {
    console.error('Error in restore-version:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}