import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    
    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { runId, applyType } = body;

    if (!runId || !applyType) {
      return NextResponse.json({ 
        error: 'Missing required fields: runId and applyType' 
      }, { status: 400 });
    }

    if (!['settings', 'content', 'both'].includes(applyType)) {
      return NextResponse.json({ 
        error: 'Invalid applyType. Must be: settings, content, or both' 
      }, { status: 400 });
    }

    // Get the run details
    const { data: run, error: runError } = await supabase
      .from('prompt_runs')
      .select('*')
      .eq('id', runId)
      .eq('prompt_id', params.id)
      .single();

    if (runError || !run) {
      return NextResponse.json({ 
        error: 'Run not found or access denied' 
      }, { status: 404 });
    }

    // Get the current prompt
    const { data: currentPrompt, error: promptError } = await supabase
      .from('prompts')
      .select('*')
      .eq('id', params.id)
      .single();

    if (promptError || !currentPrompt) {
      return NextResponse.json({ 
        error: 'Prompt not found' 
      }, { status: 404 });
    }

    // Build update object based on applyType
    const updateData: any = {
      updated_at: new Date().toISOString(),
      updated_by: user.id
    };

    // Apply settings if requested
    if (applyType === 'settings' || applyType === 'both') {
      // Extract provider from model name
      let provider = 'openai'; // default
      if (run.model?.includes('claude')) {
        provider = 'anthropic';
      } else if (run.model?.includes('gemini')) {
        provider = 'google';
      }

      updateData.default_provider = provider;
      updateData.model = run.model;
      
      // Extract parameters from run
      const params = run.parameters || {};
      if (params.temperature !== undefined) {
        updateData.temperature = Math.round(params.temperature * 10);
      }
      if (params.max_tokens !== undefined) {
        updateData.default_max_tokens = params.max_tokens;
      }
      if (params.top_p !== undefined) {
        updateData.default_top_p = Math.round(params.top_p * 10);
      }
      if (params.frequency_penalty !== undefined) {
        updateData.default_frequency_penalty = Math.round(params.frequency_penalty * 10);
      }
      if (params.presence_penalty !== undefined) {
        updateData.default_presence_penalty = Math.round(params.presence_penalty * 10);
      }
    }

    // Apply content if requested
    if (applyType === 'content' || applyType === 'both') {
      // Get the content that was used in this run
      // This might be stored in the run's input or we need to reconstruct it
      if (run.input?.prompt_content) {
        updateData.content = run.input.prompt_content;
      }
      
      // Increment version if content is changing
      if (updateData.content && updateData.content !== currentPrompt.content) {
        updateData.version = (currentPrompt.version || 1) + 1;
        
        // Create a version history entry
        await supabase
          .from('prompt_versions')
          .insert({
            prompt_id: params.id,
            workspace_id: currentPrompt.workspace_id,
            version: updateData.version,
            content: updateData.content,
            variables: run.input?.variables || currentPrompt.variables,
            parameters: run.parameters,
            change_type: 'apply_run',
            change_message: `Applied ${applyType} from run ${runId}`,
            created_by: user.id
          });
      }
    }

    // Update the prompt
    const { data: updatedPrompt, error: updateError } = await supabase
      .from('prompts')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) {
      console.error('Apply run error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    // Transform the response to include actual decimal values
    const transformedPrompt = {
      ...updatedPrompt,
      temperature: updatedPrompt.temperature / 10,
      default_top_p: updatedPrompt.default_top_p ? updatedPrompt.default_top_p / 10 : 1.0,
      default_frequency_penalty: updatedPrompt.default_frequency_penalty ? updatedPrompt.default_frequency_penalty / 10 : 0,
      default_presence_penalty: updatedPrompt.default_presence_penalty ? updatedPrompt.default_presence_penalty / 10 : 0
    };

    return NextResponse.json({ 
      data: transformedPrompt,
      message: `Successfully applied ${applyType} from run`,
      appliedChanges: {
        type: applyType,
        runId: runId,
        settings: applyType !== 'content' ? {
          provider: updateData.default_provider,
          model: updateData.model,
          temperature: updateData.temperature ? updateData.temperature / 10 : undefined
        } : undefined,
        content: applyType !== 'settings' ? {
          updated: updateData.content !== undefined,
          newVersion: updateData.version
        } : undefined
      }
    });

  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}