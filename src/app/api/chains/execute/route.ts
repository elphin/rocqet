import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

interface ChainStep {
  id: string;
  prompt_id: string;
  step_order: number;
  input_mapping: Record<string, string>;
  output_key?: string;
  parallel_group?: number; // Steps with same group number can run in parallel
  retry_config?: {
    max_attempts: number;
    backoff_ms: number;
  };
  prompts?: any; // Joined prompt data
}

interface ExecutionContext {
  variables: Record<string, any>;
  results: Record<string, any>;
  errors: any[];
  executionId: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { 
      chainId, 
      workspaceId, 
      initialInputs, 
      apiKeyId,
      options = {}
    } = await request.json();

    // Options
    const {
      stopOnError = true,
      maxParallel = 3,
      timeout = 30000,
      dryRun = false
    } = options;

    if (!chainId || !workspaceId) {
      return NextResponse.json(
        { error: 'Chain ID and Workspace ID are required' },
        { status: 400 }
      );
    }

    // Verify user access
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get chain details
    const { data: chain, error: chainError } = await supabase
      .from('prompt_chains')
      .select(`
        *,
        prompt_chain_steps (
          *,
          prompts (
            id,
            name,
            content,
            model,
            temperature,
            max_tokens,
            variables
          )
        )
      `)
      .eq('id', chainId)
      .eq('workspace_id', workspaceId)
      .single();

    if (chainError || !chain) {
      return NextResponse.json(
        { error: 'Chain not found' },
        { status: 404 }
      );
    }

    // Get API key
    let apiKey: string | null = null;
    let provider: string = 'openai'; // default

    if (apiKeyId) {
      const { data: apiKeyData } = await supabase
        .from('workspace_api_keys')
        .select('api_key, provider')
        .eq('id', apiKeyId)
        .eq('workspace_id', workspaceId)
        .single();

      if (apiKeyData) {
        apiKey = apiKeyData.api_key;
        provider = apiKeyData.provider;
      }
    } else {
      // Try to get default API key
      const { data: defaultKey } = await supabase
        .from('workspace_api_keys')
        .select('api_key, provider')
        .eq('workspace_id', workspaceId)
        .eq('is_default', true)
        .single();

      if (defaultKey) {
        apiKey = defaultKey.api_key;
        provider = defaultKey.provider;
      }
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'No API key configured for this workspace' },
        { status: 400 }
      );
    }

    // Initialize AI clients
    const openai = provider === 'openai' ? new OpenAI({ apiKey }) : null;
    const anthropic = provider === 'anthropic' ? new Anthropic({ apiKey }) : null;

    // Create execution record
    const { data: execution, error: execError } = await supabase
      .from('chain_runs')
      .insert({
        chain_id: chainId,
        workspace_id: workspaceId,
        input: initialInputs,
        status: 'running',
        executed_by: user.id
      })
      .select()
      .single();

    if (execError || !execution) {
      return NextResponse.json(
        { error: 'Failed to create execution record' },
        { status: 500 }
      );
    }

    // Initialize execution context
    const context: ExecutionContext = {
      variables: { ...initialInputs },
      results: {},
      errors: [],
      executionId: execution.id
    };

    // Sort steps by order and group for parallel execution
    const steps = chain.prompt_chain_steps.sort((a: ChainStep, b: ChainStep) => a.step_order - b.step_order);
    
    // Group steps that can run in parallel
    const stepGroups = steps.reduce((groups: ChainStep[][], step: ChainStep) => {
      const groupIndex = step.parallel_group || step.step_order;
      if (!groups[groupIndex]) {
        groups[groupIndex] = [];
      }
      groups[groupIndex].push(step);
      return groups;
    }, []);

    // Execute step groups
    for (const group of stepGroups) {
      if (group && group.length > 0) {
        try {
          if (group.length === 1) {
            // Single step - execute normally
            await executeStep(group[0], context, { openai, anthropic, provider }, {
              dryRun,
              timeout,
              supabase,
              workspaceId,
              userId: user.id
            });
          } else {
            // Multiple steps - execute in parallel
            const promises = group.slice(0, maxParallel).map(step =>
              executeStep(step, context, { openai, anthropic, provider }, {
                dryRun,
                timeout,
                supabase,
                workspaceId,
                userId: user.id
              })
            );
            
            const results = await Promise.allSettled(promises);
            
            // Check for errors
            results.forEach((result, index) => {
              if (result.status === 'rejected') {
                context.errors.push({
                  step: group[index].id,
                  error: result.reason.message || result.reason
                });
                
                if (stopOnError) {
                  throw new Error(`Step ${group[index].id} failed: ${result.reason}`);
                }
              }
            });
          }
        } catch (error: any) {
          if (stopOnError) {
            // Update execution as failed
            await supabase
              .from('chain_runs')
              .update({
                status: 'error',
                error: error.message,
                output: context.results,
                steps: context.errors,
                completed_at: new Date().toISOString()
              })
              .eq('id', execution.id);

            return NextResponse.json(
              { 
                error: error.message,
                execution_id: execution.id,
                partial_results: context.results 
              },
              { status: 500 }
            );
          }
        }
      }
    }

    // Calculate execution metrics
    const totalTokens = Object.values(context.results).reduce((sum: number, result: any) => {
      return sum + (result.tokens_used || 0);
    }, 0);

    const totalCost = Object.values(context.results).reduce((sum: number, result: any) => {
      return sum + (result.cost || 0);
    }, 0);

    // Update execution record
    await supabase
      .from('chain_runs')
      .update({
        status: context.errors.length > 0 ? 'partial' : 'success',
        output: context.results,
        steps: context.errors,
        total_tokens: totalTokens,
        total_cost: totalCost,
        completed_at: new Date().toISOString()
      })
      .eq('id', execution.id);

    // Update chain statistics
    await supabase
      .from('prompt_chains')
      .update({
        run_count: chain.run_count + 1,
        last_run_at: new Date().toISOString()
      })
      .eq('id', chainId);

    return NextResponse.json({
      success: true,
      execution_id: execution.id,
      results: context.results,
      errors: context.errors,
      metrics: {
        total_tokens: totalTokens,
        total_cost: totalCost,
        steps_completed: Object.keys(context.results).length,
        steps_failed: context.errors.length
      }
    });

  } catch (error: any) {
    console.error('Chain execution error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to execute chain' },
      { status: 500 }
    );
  }
}

// Execute a single step with retry logic
async function executeStep(
  step: ChainStep,
  context: ExecutionContext,
  clients: { openai: any; anthropic: any; provider: string },
  options: any
): Promise<void> {
  const { dryRun, timeout, supabase, workspaceId, userId } = options;
  const prompt = step.prompts;
  
  if (!prompt) {
    throw new Error(`Prompt not found for step ${step.id}`);
  }

  // Prepare inputs
  const inputs: Record<string, any> = {};
  for (const [targetVar, sourceVar] of Object.entries(step.input_mapping || {})) {
    inputs[targetVar] = resolveVariable(sourceVar, context);
  }

  // Replace variables in prompt content
  let processedContent = prompt.content;
  for (const [key, value] of Object.entries(inputs)) {
    processedContent = processedContent.replace(
      new RegExp(`{{${key}}}`, 'g'),
      value
    );
  }

  if (dryRun) {
    // Simulate execution
    context.results[step.id] = {
      output: `[DRY RUN] Would execute: ${prompt.name}`,
      inputs,
      processed_content: processedContent
    };
    return;
  }

  // Retry configuration
  const maxAttempts = step.retry_config?.max_attempts || 1;
  const backoffMs = step.retry_config?.backoff_ms || 1000;
  
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Execute with timeout
      const result = await Promise.race([
        executePrompt(processedContent, prompt, clients, inputs),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Execution timeout')), timeout)
        )
      ]);

      // Store result
      context.results[step.id] = result;
      
      // Store in variables if output key is specified
      if (step.output_key) {
        context.variables[step.output_key] = result.output;
      }

      // Record successful execution
      await supabase
        .from('prompt_runs')
        .insert({
          prompt_id: prompt.id,
          workspace_id: workspaceId,
          chain_run_id: context.executionId,
          input: inputs,
          output: result.output,
          model: prompt.model,
          status: 'success',
          tokens_used: result.tokens_used,
          cost: result.cost,
          duration_ms: result.duration_ms,
          executed_by: userId
        });

      return; // Success - exit retry loop
      
    } catch (error: any) {
      lastError = error;
      
      if (attempt < maxAttempts) {
        // Wait before retry with exponential backoff
        await new Promise(resolve => 
          setTimeout(resolve, backoffMs * Math.pow(2, attempt - 1))
        );
      }
    }
  }

  // All attempts failed
  throw lastError;
}

// Execute prompt with AI provider
async function executePrompt(
  content: string,
  promptConfig: any,
  clients: { openai: any; anthropic: any; provider: string },
  inputs: any
): Promise<any> {
  const startTime = Date.now();
  
  try {
    if (clients.provider === 'openai' && clients.openai) {
      const response = await clients.openai.chat.completions.create({
        model: promptConfig.model || 'gpt-4',
        messages: [{ role: 'user', content }],
        temperature: (promptConfig.temperature || 7) / 10,
        max_tokens: promptConfig.max_tokens,
      });

      return {
        output: response.choices[0].message.content,
        tokens_used: response.usage?.total_tokens || 0,
        cost: calculateCost(response.usage?.total_tokens || 0, promptConfig.model),
        duration_ms: Date.now() - startTime,
        model: promptConfig.model,
        inputs
      };
      
    } else if (clients.provider === 'anthropic' && clients.anthropic) {
      const response = await clients.anthropic.messages.create({
        model: promptConfig.model || 'claude-3-opus-20240229',
        messages: [{ role: 'user', content }],
        temperature: (promptConfig.temperature || 7) / 10,
        max_tokens: promptConfig.max_tokens || 1024,
      });

      return {
        output: response.content[0].text,
        tokens_used: response.usage?.input_tokens + response.usage?.output_tokens || 0,
        cost: calculateCost(
          response.usage?.input_tokens + response.usage?.output_tokens || 0,
          promptConfig.model
        ),
        duration_ms: Date.now() - startTime,
        model: promptConfig.model,
        inputs
      };
    }
    
    throw new Error('No valid AI client available');
    
  } catch (error: any) {
    throw new Error(`AI execution failed: ${error.message}`);
  }
}

// Resolve variable from context
function resolveVariable(path: string, context: ExecutionContext): any {
  // Handle direct variable references
  if (context.variables[path] !== undefined) {
    return context.variables[path];
  }
  
  // Handle result references (e.g., "step1.output")
  if (path.includes('.')) {
    const [stepId, ...keys] = path.split('.');
    let value = context.results[stepId];
    
    for (const key of keys) {
      if (value && typeof value === 'object') {
        value = value[key];
      } else {
        return undefined;
      }
    }
    
    return value;
  }
  
  return undefined;
}

// Calculate cost based on token usage
function calculateCost(tokens: number, model: string): number {
  const pricing: Record<string, number> = {
    'gpt-4': 0.03 / 1000,
    'gpt-4-turbo-preview': 0.01 / 1000,
    'gpt-3.5-turbo': 0.002 / 1000,
    'claude-3-opus-20240229': 0.015 / 1000,
    'claude-3-sonnet-20240229': 0.003 / 1000,
  };
  
  return tokens * (pricing[model] || 0.01 / 1000);
}