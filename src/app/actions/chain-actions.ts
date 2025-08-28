'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// Step configuration schemas for validation
const WebhookConfigSchema = z.object({
  url: z.string().url().optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).default('POST'),
  headers: z.record(z.string()).optional(),
});

const PromptConfigSchema = z.object({
  promptId: z.string().uuid(),
  variables: z.record(z.any()).optional(),
});

const ApiCallConfigSchema = z.object({
  url: z.string().url(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
  headers: z.record(z.string()).optional(),
  body: z.string().optional(),
  authentication: z.object({
    type: z.enum(['none', 'bearer', 'api_key']).optional(),
    value: z.string().optional(),
  }).optional(),
});

const DatabaseConfigSchema = z.object({
  queryType: z.enum(['select', 'analytics']),
  query: z.string().optional(),
  parameters: z.record(z.any()).optional(),
});

const ConditionConfigSchema = z.object({
  variable: z.string(),
  operator: z.enum(['equals', 'not_equals', 'contains', 'greater_than', 'less_than']),
  value: z.any(),
  thenSteps: z.array(z.any()).optional(),
  elseSteps: z.array(z.any()).optional(),
});

const LoopConfigSchema = z.object({
  type: z.enum(['forEach', 'while', 'fixed']),
  variable: z.string().optional(),
  condition: z.string().optional(),
  iterations: z.number().optional(),
  steps: z.array(z.any()).optional(),
});

const SwitchConfigSchema = z.object({
  expression: z.string(),
  cases: z.array(z.object({
    value: z.string(),
    label: z.string(),
    steps: z.array(z.any()).optional(),
  })),
  defaultSteps: z.array(z.any()).optional(),
});

const CodeConfigSchema = z.object({
  language: z.enum(['javascript', 'python']).default('javascript'),
  code: z.string(),
  inputs: z.record(z.any()).optional(),
  sandbox: z.boolean().default(true),
});

const ApprovalConfigSchema = z.object({
  message: z.string(),
  approvers: z.array(z.string()),
  timeout: z.number().optional(),
  requireAll: z.boolean().default(false),
});

// Main step schema
const StepSchema = z.object({
  id: z.string(),
  type: z.enum(['webhook', 'prompt', 'api_call', 'database', 'condition', 'loop', 'switch', 'code', 'approval']),
  name: z.string(),
  config: z.union([
    WebhookConfigSchema,
    PromptConfigSchema,
    ApiCallConfigSchema,
    DatabaseConfigSchema,
    ConditionConfigSchema,
    LoopConfigSchema,
    SwitchConfigSchema,
    CodeConfigSchema,
    ApprovalConfigSchema,
  ]).optional(),
  position: z.number(),
});

// Chain schema
const ChainSchema = z.object({
  name: z.string().min(1, 'Chain name is required'),
  description: z.string().optional(),
  steps: z.array(StepSchema),
  trigger: z.enum(['manual', 'webhook', 'schedule', 'event']).default('manual'),
  triggerConfig: z.any().optional(),
  active: z.boolean().default(true),
});

// Helper function to generate slug
function generateSlug(name: string): string {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
  
  // Add a random suffix to ensure uniqueness
  const suffix = Math.random().toString(36).substring(2, 8);
  return `${baseSlug}-${suffix}`;
}

export async function createChain(
  workspaceId: string,
  data: z.infer<typeof ChainSchema>
) {
  const supabase = await createClient();
  
  // Validate input
  const validatedData = ChainSchema.parse(data);
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }
  
  // Generate slug
  const slug = generateSlug(validatedData.name);
  
  // Create chain
  const { data: chain, error } = await supabase
    .from('chains')
    .insert({
      workspace_id: workspaceId,
      slug,
      name: validatedData.name,
      description: validatedData.description,
      steps: validatedData.steps,
      trigger: validatedData.trigger,
      trigger_config: validatedData.triggerConfig,
      active: validatedData.active,
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single();
    
  if (error) {
    console.error('Error creating chain:', error);
    throw new Error('Failed to create chain');
  }
  
  // If webhook trigger, generate webhook URL
  if (validatedData.trigger === 'webhook' && chain) {
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/chains/${chain.id}/webhook`;
    
    await supabase
      .from('chains')
      .update({
        trigger_config: {
          ...validatedData.triggerConfig,
          webhook_url: webhookUrl,
        }
      })
      .eq('id', chain.id);
  }
  
  revalidatePath(`/[workspace]/chains`, 'page');
  
  return chain;
}

export async function updateChain(
  chainId: string,
  data: Partial<z.infer<typeof ChainSchema>>
) {
  const supabase = await createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }
  
  // Update chain
  const { data: chain, error } = await supabase
    .from('chains')
    .update({
      ...data,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', chainId)
    .select()
    .single();
    
  if (error) {
    console.error('Error updating chain:', error);
    throw new Error('Failed to update chain');
  }
  
  revalidatePath(`/[workspace]/chains`, 'page');
  
  return chain;
}

export async function deleteChain(chainId: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('chains')
    .delete()
    .eq('id', chainId);
    
  if (error) {
    console.error('Error deleting chain:', error);
    throw new Error('Failed to delete chain');
  }
  
  revalidatePath(`/[workspace]/chains`, 'page');
  
  return { success: true };
}

export async function executeChain(
  chainId: string,
  inputs: Record<string, any> = {}
) {
  const supabase = await createClient();
  
  // Get chain
  const { data: chain, error: chainError } = await supabase
    .from('chains')
    .select('*')
    .eq('id', chainId)
    .single();
    
  if (chainError || !chain) {
    throw new Error('Chain not found');
  }
  
  // Create execution record
  const { data: { user } } = await supabase.auth.getUser();
  const { data: execution, error: execError } = await supabase
    .from('chain_executions')
    .insert({
      chain_id: chainId,
      workspace_id: chain.workspace_id,
      status: 'running',
      inputs,
      started_at: new Date().toISOString(),
      executed_by: user?.id,
    })
    .select()
    .single();
    
  if (execError || !execution) {
    throw new Error('Failed to create execution record');
  }
  
  try {
    // Execute steps
    const results = await executeSteps(chain.steps, inputs, execution.id);
    
    // Update execution record
    await supabase
      .from('chain_executions')
      .update({
        status: 'completed',
        outputs: results,
        completed_at: new Date().toISOString(),
      })
      .eq('id', execution.id);
      
    return { execution, results };
  } catch (error) {
    // Update execution record with error
    await supabase
      .from('chain_executions')
      .update({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString(),
      })
      .eq('id', execution.id);
      
    throw error;
  }
}

async function executeSteps(
  steps: any[],
  context: Record<string, any>,
  executionId: string
): Promise<Record<string, any>> {
  const results: Record<string, any> = { ...context };
  
  for (const step of steps) {
    try {
      switch (step.type) {
        case 'prompt':
          results[step.id] = await executePromptStep(step, results);
          break;
        case 'api_call':
          results[step.id] = await executeApiCallStep(step, results);
          break;
        case 'condition':
          results[step.id] = await executeConditionStep(step, results);
          break;
        case 'loop':
          results[step.id] = await executeLoopStep(step, results);
          break;
        case 'code':
          results[step.id] = await executeCodeStep(step, results);
          break;
        case 'webhook':
          // Webhook steps are triggers, not executable steps in the chain
          // They return the initial input data or wait for webhook call
          results[step.id] = { 
            message: 'Webhook trigger registered', 
            webhookUrl: step.config?.webhookUrl || 'Webhook URL will be generated' 
          };
          break;
        // Add more step types as needed
        default:
          console.warn(`Unknown step type: ${step.type}`);
      }
    } catch (error) {
      console.error(`Error executing step ${step.id}:`, error);
      throw error;
    }
  }
  
  return results;
}

async function executePromptStep(step: any, context: Record<string, any>) {
  const supabase = await createClient();
  
  // Get prompt
  const { data: prompt } = await supabase
    .from('prompts')
    .select('*')
    .eq('id', step.config.promptId)
    .single();
    
  if (!prompt) {
    throw new Error(`Prompt ${step.config.promptId} not found`);
  }
  
  // Replace variables in prompt
  let processedContent = prompt.content;
  const variables = { ...prompt.variables, ...step.config.variables, ...context };
  
  for (const [key, value] of Object.entries(variables)) {
    processedContent = processedContent.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  }
  
  // Here you would call your AI API (OpenAI, Anthropic, etc.)
  // For now, returning mock response
  return {
    prompt: processedContent,
    response: `Mock response for prompt: ${prompt.name}`,
    timestamp: new Date().toISOString(),
  };
}

async function executeApiCallStep(step: any, context: Record<string, any>) {
  const config = step.config;
  
  // Replace variables in URL and body
  let url = config.url;
  let body = config.body;
  
  for (const [key, value] of Object.entries(context)) {
    url = url.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    if (body) {
      body = body.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }
  }
  
  // Prepare headers
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...config.headers,
  };
  
  // Add authentication
  if (config.authentication?.type === 'bearer' && config.authentication.value) {
    headers['Authorization'] = `Bearer ${config.authentication.value}`;
  } else if (config.authentication?.type === 'api_key' && config.authentication.value) {
    headers['X-API-Key'] = config.authentication.value;
  }
  
  // Make API call
  const response = await fetch(url, {
    method: config.method,
    headers,
    body: body && ['POST', 'PUT', 'PATCH'].includes(config.method) ? body : undefined,
  });
  
  const data = await response.json();
  
  return {
    status: response.status,
    data,
    timestamp: new Date().toISOString(),
  };
}

async function executeConditionStep(step: any, context: Record<string, any>) {
  const config = step.config;
  const variable = context[config.variable];
  const value = config.value;
  
  let conditionMet = false;
  
  switch (config.operator) {
    case 'equals':
      conditionMet = variable == value;
      break;
    case 'not_equals':
      conditionMet = variable != value;
      break;
    case 'contains':
      conditionMet = String(variable).includes(String(value));
      break;
    case 'greater_than':
      conditionMet = Number(variable) > Number(value);
      break;
    case 'less_than':
      conditionMet = Number(variable) < Number(value);
      break;
  }
  
  // Execute nested steps based on condition
  const stepsToExecute = conditionMet ? config.thenSteps : config.elseSteps;
  if (stepsToExecute && stepsToExecute.length > 0) {
    return await executeSteps(stepsToExecute, context, '');
  }
  
  return { conditionMet };
}

async function executeLoopStep(step: any, context: Record<string, any>) {
  const config = step.config;
  const results: any[] = [];
  
  if (config.type === 'forEach') {
    const items = context[config.variable];
    if (Array.isArray(items)) {
      for (const item of items) {
        const loopContext = { ...context, item };
        const result = await executeSteps(config.steps || [], loopContext, '');
        results.push(result);
      }
    }
  } else if (config.type === 'fixed') {
    const iterations = config.iterations || 1;
    for (let i = 0; i < iterations; i++) {
      const loopContext = { ...context, index: i };
      const result = await executeSteps(config.steps || [], loopContext, '');
      results.push(result);
    }
  }
  
  return results;
}

async function executeCodeStep(step: any, context: Record<string, any>) {
  // For security, code execution should be done in a sandboxed environment
  // This is a placeholder - in production, use a service like Deno Deploy or similar
  
  console.warn('Code execution not implemented in production');
  
  return {
    warning: 'Code execution requires sandbox setup',
    code: step.config.code,
    timestamp: new Date().toISOString(),
  };
}

export async function getChainExecutions(chainId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('chain_executions')
    .select('*')
    .eq('chain_id', chainId)
    .order('started_at', { ascending: false })
    .limit(10);
    
  if (error) {
    console.error('Error fetching executions:', error);
    throw new Error('Failed to fetch executions');
  }
  
  return data;
}