import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/crypto';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface GeneratePromptRequest {
  workspaceId: string;
  goal: string;
  platform?: string;
  style?: string;
  variables?: string[];
  examples?: string[];
  provider?: 'openai' | 'anthropic' | 'google' | 'groq';
  metaPromptId?: string;
}

interface GeneratedPrompt {
  title: string;
  description: string;
  content: string;
  variables: string[];
  tags: string[];
  suggestedModel?: string;
  suggestedTemperature?: number;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: GeneratePromptRequest = await request.json();
    const { workspaceId, goal, platform = 'general', style = 'instructional', variables = [], examples = [], provider, metaPromptId } = body;

    // Validate workspace membership
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get available API keys for the workspace
    const { data: apiKeys } = await supabase
      .from('workspace_api_keys')
      .select('provider, encrypted_key, is_default')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true);

    if (!apiKeys || apiKeys.length === 0) {
      return NextResponse.json({ 
        error: 'No API keys configured. Please add an API key in settings.' 
      }, { status: 400 });
    }

    // Select provider based on preference or availability
    let selectedProvider = provider;
    let selectedKey = null;

    if (provider) {
      // Use specified provider
      selectedKey = apiKeys.find(k => k.provider === provider);
      if (!selectedKey) {
        return NextResponse.json({ 
          error: `No API key found for provider: ${provider}` 
        }, { status: 400 });
      }
    } else {
      // Use default or first available
      selectedKey = apiKeys.find(k => k.is_default) || apiKeys[0];
      selectedProvider = selectedKey.provider as any;
    }

    // Get meta-prompt template
    let metaPromptTemplate: string;
    
    if (metaPromptId) {
      // Use specific meta-prompt
      const { data: metaPrompt } = await supabase
        .from('meta_prompt_templates')
        .select('template')
        .eq('id', metaPromptId)
        .single();
      
      if (!metaPrompt) {
        return NextResponse.json({ error: 'Meta-prompt not found' }, { status: 404 });
      }
      metaPromptTemplate = metaPrompt.template;
    } else {
      // Use default general purpose template
      const { data: defaultTemplate } = await supabase
        .from('meta_prompt_templates')
        .select('template')
        .eq('category', 'general')
        .eq('is_system', true)
        .single();
      
      metaPromptTemplate = defaultTemplate?.template || getDefaultMetaPrompt();
    }

    // Build the generation prompt
    const generationPrompt = buildGenerationPrompt(metaPromptTemplate, {
      goal,
      platform,
      style,
      variables: variables.join(', '),
      examples: examples.join('\n')
    });

    // Generate the prompt using the selected provider
    let generatedResult: GeneratedPrompt;
    let tokensUsed = { prompt: 0, completion: 0 };
    let modelUsed = '';
    let cost = 0;

    const startTime = Date.now();

    try {
      // Decrypt the API key first
      const decryptedKey = await decrypt(selectedKey.encrypted_key);
      
      switch (selectedProvider) {
      case 'openai':
        const openai = new OpenAI({ apiKey: decryptedKey });
        const openaiResponse = await openai.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: 'You are an expert prompt engineer. Generate structured JSON output.' },
            { role: 'user', content: generationPrompt }
          ],
          temperature: 0.7,
          response_format: { type: 'json_object' }
        });
        
        generatedResult = JSON.parse(openaiResponse.choices[0].message.content || '{}');
        tokensUsed = {
          prompt: openaiResponse.usage?.prompt_tokens || 0,
          completion: openaiResponse.usage?.completion_tokens || 0
        };
        modelUsed = 'gpt-4-turbo-preview';
        cost = calculateCost('openai', tokensUsed);
        break;

      case 'anthropic':
        const anthropic = new Anthropic({ apiKey: decryptedKey });
        const claudeResponse = await anthropic.messages.create({
          model: 'claude-3-opus-20240229',
          messages: [{ role: 'user', content: generationPrompt }],
          max_tokens: 2000,
          temperature: 0.7
        });
        
        const claudeContent = claudeResponse.content[0].type === 'text' 
          ? claudeResponse.content[0].text 
          : '';
        generatedResult = parseGeneratedContent(claudeContent);
        tokensUsed = {
          prompt: claudeResponse.usage?.input_tokens || 0,
          completion: claudeResponse.usage?.output_tokens || 0
        };
        modelUsed = 'claude-3-opus';
        cost = calculateCost('anthropic', tokensUsed);
        break;

      case 'google':
        const genAI = new GoogleGenerativeAI(decryptedKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        const geminiResponse = await model.generateContent(generationPrompt);
        const geminiText = geminiResponse.response.text();
        
        generatedResult = parseGeneratedContent(geminiText);
        modelUsed = 'gemini-pro';
        // Google doesn't provide token counts in the same way
        tokensUsed = { prompt: 0, completion: 0 };
        break;

      default:
        return NextResponse.json({ 
          error: `Unsupported provider: ${selectedProvider}` 
        }, { status: 400 });
      }
    } catch (decryptError) {
      console.error('API key decryption error:', decryptError);
      return NextResponse.json({ 
        error: 'Failed to decrypt API key. Please re-enter your API key in settings.' 
      }, { status: 500 });
    }

    const generationTime = Date.now() - startTime;

    // Save generation to history
    const { data: generation, error: saveError } = await supabase
      .from('prompt_generations')
      .insert({
        workspace_id: workspaceId,
        user_id: user.id,
        meta_prompt_id: metaPromptId || null,
        input: {
          goal,
          platform,
          style,
          variables,
          examples
        },
        generated_title: generatedResult.title,
        generated_description: generatedResult.description,
        generated_content: generatedResult.content,
        generated_variables: generatedResult.variables,
        generated_tags: generatedResult.tags,
        suggested_model: generatedResult.suggestedModel,
        suggested_temperature: generatedResult.suggestedTemperature,
        provider: selectedProvider,
        model_used: modelUsed,
        prompt_tokens: tokensUsed.prompt,
        completion_tokens: tokensUsed.completion,
        total_tokens: tokensUsed.prompt + tokensUsed.completion,
        cost,
        generation_time_ms: generationTime,
        status: 'success'
      })
      .select()
      .single();

    if (saveError) {
      console.error('Failed to save generation history:', saveError);
    }

    // Update meta-prompt usage count
    if (metaPromptId) {
      await supabase
        .from('meta_prompt_templates')
        .update({ usage_count: supabase.raw('usage_count + 1') })
        .eq('id', metaPromptId);
    }

    return NextResponse.json({
      ...generatedResult,
      generationId: generation?.id,
      tokensUsed,
      cost: cost / 100, // Convert cents to dollars
      generationTime
    });

  } catch (error) {
    console.error('Prompt generation error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to generate prompt' 
    }, { status: 500 });
  }
}

function buildGenerationPrompt(template: string, variables: Record<string, string>): string {
  let prompt = template;
  
  // Replace template variables
  Object.entries(variables).forEach(([key, value]) => {
    // Handle Handlebars-style conditionals
    const conditionalRegex = new RegExp(`{{#if ${key}}}([\\s\\S]*?){{/if}}`, 'g');
    if (value) {
      prompt = prompt.replace(conditionalRegex, '$1');
    } else {
      prompt = prompt.replace(conditionalRegex, '');
    }
    
    // Replace simple variables
    prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
  });
  
  // Clean up any remaining template syntax
  prompt = prompt.replace(/{{#if \w+}}[\s\S]*?{{\/if}}/g, '');
  prompt = prompt.replace(/{{\w+}}/g, '');
  
  return prompt;
}

function parseGeneratedContent(content: string): GeneratedPrompt {
  try {
    // Try to parse as JSON first
    return JSON.parse(content);
  } catch {
    // Fallback: Extract structured data from text
    const lines = content.split('\n');
    const result: GeneratedPrompt = {
      title: '',
      description: '',
      content: '',
      variables: [],
      tags: []
    };
    
    let currentSection = '';
    
    for (const line of lines) {
      if (line.startsWith('Title:')) {
        result.title = line.replace('Title:', '').trim();
      } else if (line.startsWith('Description:')) {
        result.description = line.replace('Description:', '').trim();
      } else if (line.startsWith('Content:')) {
        currentSection = 'content';
      } else if (line.startsWith('Variables:')) {
        const varsText = line.replace('Variables:', '').trim();
        result.variables = varsText.split(',').map(v => v.trim()).filter(Boolean);
      } else if (line.startsWith('Tags:')) {
        const tagsText = line.replace('Tags:', '').trim();
        result.tags = tagsText.split(',').map(t => t.trim()).filter(Boolean);
      } else if (currentSection === 'content' && line.trim()) {
        result.content += line + '\n';
      }
    }
    
    result.content = result.content.trim();
    return result;
  }
}

function calculateCost(provider: string, tokens: { prompt: number; completion: number }): number {
  // Costs in cents per 1000 tokens
  const pricing = {
    openai: { prompt: 3, completion: 6 }, // GPT-4 Turbo
    anthropic: { prompt: 1.5, completion: 7.5 }, // Claude 3 Opus
    google: { prompt: 0.5, completion: 1.5 } // Gemini Pro (estimated)
  };
  
  const providerPricing = pricing[provider as keyof typeof pricing] || { prompt: 0, completion: 0 };
  
  return Math.round(
    (tokens.prompt * providerPricing.prompt / 1000) +
    (tokens.completion * providerPricing.completion / 1000)
  );
}

function getDefaultMetaPrompt(): string {
  return `You are an expert prompt engineer. Create a high-quality prompt based on the following requirements:

Goal: {{goal}}
Platform: {{platform}}
Style: {{style}}
Variables: {{variables}}
Examples: {{examples}}

Generate a prompt that:
1. Is clear, specific, and actionable
2. Includes appropriate context and constraints
3. Uses variables with {{variable}} syntax where appropriate
4. Follows best practices for the target platform
5. Optimizes for the desired style

Output in JSON format:
{
  "title": "Concise, descriptive title",
  "description": "Brief description of what the prompt does",
  "content": "The actual prompt content with {{variables}} included",
  "variables": ["list", "of", "variables"],
  "tags": ["relevant", "tags"],
  "suggestedModel": "recommended model",
  "suggestedTemperature": 0.7
}`;
}