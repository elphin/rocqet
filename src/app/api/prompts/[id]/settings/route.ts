import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { 
      provider,
      model, 
      temperature,
      maxTokens,
      topP,
      frequencyPenalty,
      presencePenalty
    } = body;

    // Validate provider and model combination
    const validCombinations = {
      'openai': ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-4o', 'gpt-4o-mini'],
      'anthropic': [
        'claude-3-opus-20240229', 
        'claude-3-sonnet-20240229', 
        'claude-3-haiku-20240307',
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022'
      ],
      'google': ['gemini-pro', 'gemini-1.5-pro', 'gemini-1.5-flash']
    };

    if (provider && model) {
      const validModels = validCombinations[provider as keyof typeof validCombinations];
      if (!validModels || !validModels.includes(model)) {
        return NextResponse.json({ 
          error: 'Invalid provider/model combination',
          validCombinations 
        }, { status: 400 });
      }
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date().toISOString(),
      updated_by: user.id
    };

    // Add settings fields if provided
    if (provider !== undefined) updateData.default_provider = provider;
    if (model !== undefined) updateData.model = model;
    if (temperature !== undefined) updateData.temperature = Math.round(temperature * 10); // Store as integer
    if (maxTokens !== undefined) updateData.default_max_tokens = maxTokens;
    if (topP !== undefined) updateData.default_top_p = Math.round(topP * 10);
    if (frequencyPenalty !== undefined) updateData.default_frequency_penalty = Math.round(frequencyPenalty * 10);
    if (presencePenalty !== undefined) updateData.default_presence_penalty = Math.round(presencePenalty * 10);

    // Update the prompt settings
    const { data: prompt, error: updateError } = await supabase
      .from('prompts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Settings update error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    // Transform the response to include actual decimal values
    const transformedPrompt = {
      ...prompt,
      temperature: prompt.temperature / 10,
      default_top_p: prompt.default_top_p ? prompt.default_top_p / 10 : 1.0,
      default_frequency_penalty: prompt.default_frequency_penalty ? prompt.default_frequency_penalty / 10 : 0,
      default_presence_penalty: prompt.default_presence_penalty ? prompt.default_presence_penalty / 10 : 0
    };

    return NextResponse.json({ 
      data: transformedPrompt,
      message: 'Settings updated successfully' 
    });

  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}