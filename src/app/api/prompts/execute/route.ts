import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/crypto';

// Function to call OpenAI
async function callOpenAI(apiKey: string, {
  content,
  model = 'gpt-4-turbo-preview',
  temperature = 0.7,
  max_tokens = 2000,
  system_prompt,
  top_p = 1.0,
  frequency_penalty = 0,
  presence_penalty = 0
}: any) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        ...(system_prompt ? [{ role: 'system', content: system_prompt }] : []),
        { role: 'user', content }
      ],
      temperature,
      max_tokens,
      top_p,
      frequency_penalty,
      presence_penalty
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'OpenAI API error');
  }

  const data = await response.json();
  return {
    output: data.choices[0]?.message?.content || '',
    tokensUsed: data.usage?.total_tokens || 0
  };
}

// Function to call Anthropic
async function callAnthropic(apiKey: string, {
  content,
  model = 'claude-3-opus-20240229',
  temperature = 0.7,
  max_tokens = 2000,
  system_prompt,
  top_p = 1.0
}: any) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content }],
      ...(system_prompt && { system: system_prompt }),
      temperature,
      max_tokens,
      top_p
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Anthropic API error');
  }

  const data = await response.json();
  return {
    output: data.content[0]?.text || '',
    tokensUsed: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
  };
}

// Function to call Google Gemini
async function callGoogle(apiKey: string, {
  content,
  model = 'gemini-pro',
  temperature = 0.7,
  max_tokens = 2000,
  system_prompt,
  top_p = 1.0,
  top_k = 40
}: any) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  // Combine system prompt with user content for Gemini
  const fullPrompt = system_prompt 
    ? `${system_prompt}\n\n${content}`
    : content;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: fullPrompt
        }]
      }],
      generationConfig: {
        temperature,
        maxOutputTokens: max_tokens,
        topP: top_p,
        topK: top_k
      }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Google AI API error');
  }

  const data = await response.json();
  const output = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  return {
    output,
    tokensUsed: Math.ceil((content.length + output.length) / 4) // Rough estimate
  };
}

export async function POST(request: NextRequest) {
  console.log('POST /api/prompts/execute - Start');
  
  try {
    const supabase = await createClient();
    
    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { 
      prompt_id,
      workspace_id,
      content, 
      model, 
      temperature = 0.7,
      max_tokens = 2000,
      variables = {},
      provider = 'openai', // Default to OpenAI
      system_prompt,
      top_p = 1.0,
      frequency_penalty = 0,
      presence_penalty = 0,
      top_k = 40
    } = body;
    
    console.log('Execute request:', { 
      prompt_id, 
      provider,
      model, 
      temperature,
      hasContent: !!content,
      variableCount: Object.keys(variables || {}).length 
    });

    // Get workspace API key for the selected provider
    let apiKey: string | null = null;
    let keyType: 'workspace' | 'mock' = 'mock';
    
    if (workspace_id) {
      // Check if user is member of workspace
      const { data: member } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspace_id)
        .eq('user_id', user.id)
        .single();
      
      if (member) {
        // Get default API key for this provider from workspace
        const { data: workspaceKey } = await supabase
          .from('workspace_api_keys')
          .select('encrypted_key')
          .eq('workspace_id', workspace_id)
          .eq('provider', provider)
          .eq('is_default', true)
          .single();
        
        if (workspaceKey) {
          apiKey = await decrypt(workspaceKey.encrypted_key);
          keyType = 'workspace';
        }
      }
    }
    
    if (!apiKey) {
      // No API key available - use mock response for demo
      console.log('No API key available, using mock response');
      
      const mockResponses = [
        "Based on your input, here's a thoughtful response that demonstrates the prompt execution feature is working correctly. The system has processed your variables and generated this output.",
        "This is an example output showing that the prompt has been successfully executed with your provided variables. To get real AI responses, please add your API key in Account Settings.",
        "The prompt execution system is functioning as expected. Your input has been processed and this response has been generated based on the parameters you provided.",
      ];
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const output = mockResponses[Math.floor(Math.random() * mockResponses.length)] + 
        "\n\n" +
        `[DEMO MODE - Add your ${provider.toUpperCase()} API key in Account Settings for real AI responses]`;
      
      return NextResponse.json({ 
        output,
        provider: 'mock',
        model: 'demo',
        tokens_used: 150,
        demo_mode: true
      });
    }
    
    let output = '';
    let tokensUsed = 0;
    let error = null;
    
    try {
      // Call the appropriate AI provider
      switch (provider) {
        case 'openai':
          const openaiResult = await callOpenAI(apiKey, {
            content,
            model,
            temperature,
            max_tokens,
            system_prompt,
            top_p,
            frequency_penalty,
            presence_penalty
          });
          output = openaiResult.output;
          tokensUsed = openaiResult.tokensUsed;
          break;
          
        case 'anthropic':
          const anthropicResult = await callAnthropic(apiKey, {
            content,
            model,
            temperature,
            max_tokens,
            system_prompt,
            top_p
          });
          output = anthropicResult.output;
          tokensUsed = anthropicResult.tokensUsed;
          break;
          
        case 'google':
          const googleResult = await callGoogle(apiKey, {
            content,
            model,
            temperature,
            max_tokens,
            system_prompt,
            top_p,
            top_k
          });
          output = googleResult.output;
          tokensUsed = googleResult.tokensUsed;
          break;
          
        default:
          throw new Error(`Provider ${provider} not yet implemented`);
      }
    } catch (aiError: any) {
      console.error(`AI Provider Error (${provider}):`, aiError);
      error = aiError.message || 'AI provider error';
      
      // Update last used timestamp for workspace key
      if (keyType === 'workspace' && workspace_id) {
        await supabase
          .from('workspace_api_keys')
          .update({ 
            last_used_at: new Date().toISOString()
          })
          .eq('workspace_id', workspace_id)
          .eq('provider', provider)
          .eq('is_default', true);
      }
      
      return NextResponse.json({ 
        error: `AI Provider Error: ${error}`,
        provider,
        model 
      }, { status: 500 });
    }
    
    // Update last used timestamp for successful execution
    if (keyType === 'workspace' && workspace_id) {
      await supabase
        .from('workspace_api_keys')
        .update({ 
          last_used_at: new Date().toISOString()
        })
        .eq('workspace_id', workspace_id)
        .eq('provider', provider)
        .eq('is_default', true);
    }
    
    // Log the execution if we have a prompt_id
    if (prompt_id && workspace_id) {
      // Create prompt_executions table if needed
      const { data: run, error: runError } = await supabase
        .from('prompt_runs')
        .insert({
          prompt_id,
          workspace_id,
          input: {
            prompt_content: content,  // Store the actual prompt content
            variables: variables || {},
            content: content  // Also store as 'content' for backwards compatibility
          },
          output,
          model,
          parameters: { 
            temperature, 
            max_tokens, 
            provider,
            top_p,
            frequency_penalty,
            presence_penalty,
            top_k
          },
          prompt_tokens: Math.ceil(content.length / 4),
          completion_tokens: Math.ceil(output.length / 4),
          total_tokens: tokensUsed,
          latency_ms: 1500,
          cost: Math.ceil(tokensUsed * 0.002), // Rough cost estimate
          status: 'completed',
          executed_by: user.id,
          executed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (runError) {
        console.error('Error logging run:', runError);
        // Don't fail the request if logging fails
      }
      
      // Update prompt usage - first get current count
      const { data: promptData } = await supabase
        .from('prompts')
        .select('usage_count')
        .eq('id', prompt_id)
        .single();
      
      const currentCount = promptData?.usage_count || 0;
      
      await supabase
        .from('prompts')
        .update({ 
          usage_count: currentCount + 1,
          last_used_at: new Date().toISOString()
        })
        .eq('id', prompt_id);
    }
    
    return NextResponse.json({
      output,
      provider,
      model,
      tokens_used: tokensUsed,
      key_type: keyType
    });
    
  } catch (error: any) {
    console.error('API execute error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to execute prompt' 
    }, { status: 500 });
  }
}