import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      prompt, 
      provider, 
      model, 
      apiKey, 
      promptId, 
      workspaceId, 
      variables 
    } = body;

    // Validate workspace access
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'No workspace access' }, { status: 403 });
    }

    // Get API key - either from request or saved keys (Pro tier)
    let finalApiKey = apiKey;
    
    if (!apiKey) {
      // Check for saved API key (Pro tier feature)
      const { data: savedKey } = await supabase
        .from('api_keys')
        .select('encrypted_key')
        .eq('workspace_id', workspaceId)
        .eq('provider', provider)
        .single();

      if (savedKey?.encrypted_key) {
        // In production, decrypt the key
        finalApiKey = savedKey.encrypted_key; // TODO: Implement proper decryption
      }
    }

    if (!finalApiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 400 });
    }

    // Execute prompt based on provider
    let response = '';
    
    try {
      switch (provider) {
        case 'openai': {
          const openai = new OpenAI({ apiKey: finalApiKey });
          const completion = await openai.chat.completions.create({
            model: model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 2000
          });
          response = completion.choices[0]?.message?.content || 'No response';
          break;
        }
        
        case 'anthropic': {
          const anthropic = new Anthropic({ apiKey: finalApiKey });
          const completion = await anthropic.messages.create({
            model: model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 2000
          });
          response = completion.content[0]?.text || 'No response';
          break;
        }
        
        case 'google': {
          const genAI = new GoogleGenerativeAI(finalApiKey);
          const genModel = genAI.getGenerativeModel({ model: model });
          const result = await genModel.generateContent(prompt);
          response = result.response.text() || 'No response';
          break;
        }
        
        case 'groq': {
          const groq = new Groq({ apiKey: finalApiKey });
          const completion = await groq.chat.completions.create({
            model: model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 2000
          });
          response = completion.choices[0]?.message?.content || 'No response';
          break;
        }
        
        default:
          return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
      }
    } catch (apiError: any) {
      console.error('API Error:', apiError);
      return NextResponse.json({ 
        error: `${provider} API error: ${apiError.message || 'Unknown error'}` 
      }, { status: 500 });
    }

    // Log the run to database
    await supabase.from('prompt_runs').insert({
      prompt_id: promptId,
      workspace_id: workspaceId,
      user_id: user.id,
      provider,
      model,
      variables: variables || {},
      prompt_text: prompt,
      response_text: response,
      executed_at: new Date().toISOString()
    });

    return NextResponse.json({ response });
    
  } catch (error) {
    console.error('Error running prompt:', error);
    return NextResponse.json({ 
      error: 'Failed to run prompt' 
    }, { status: 500 });
  }
}