/**
 * Chain Execution Engine
 * 
 * Core engine for executing prompt chains step-by-step with:
 * - Variable context management
 * - Error handling and retries
 * - Conditional logic evaluation
 * - Result storage and monitoring
 */

import { createClient } from '@/lib/supabase/server';
import { nanoid } from 'nanoid';

// Step execution status
export type StepStatus = 'pending' | 'running' | 'success' | 'error' | 'skipped';

// Execution context that gets passed between steps
export interface ExecutionContext {
  chainId: string;
  runId: string;
  workspaceId: string;
  userId: string;
  variables: Record<string, any>;
  steps: StepExecutionResult[];
  currentStepIndex: number;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

// Result from a single step execution
export interface StepExecutionResult {
  stepId: string;
  stepType: string;
  stepName: string;
  status: StepStatus;
  startedAt?: Date;
  completedAt?: Date;
  input: any;
  output?: any;
  error?: string;
  retries?: number;
  executionTimeMs?: number;
}

// Chain configuration from database
export interface ChainConfig {
  id: string;
  name: string;
  steps: ChainStep[];
  workspaceId: string;
}

// Individual step configuration
export interface ChainStep {
  id: string;
  type: 'webhook' | 'prompt' | 'api_call' | 'database' | 'condition' | 'loop' | 'switch' | 'code' | 'approval';
  name?: string;
  config?: any;
  outputVariable?: string;
  errorHandler?: {
    action: 'retry' | 'continue' | 'fail';
    retryCount?: number;
    retryDelay?: number;
    fallbackValue?: any;
  };
}

// Step executor interface
export interface StepExecutor {
  execute(step: ChainStep, context: ExecutionContext): Promise<StepExecutionResult>;
}

/**
 * Main Chain Execution Engine
 */
export class ChainExecutionEngine {
  private executors: Map<string, StepExecutor>;
  private supabase: any;

  constructor() {
    this.executors = new Map();
    this.registerExecutors();
  }

  /**
   * Initialize the engine with database connection
   */
  async initialize() {
    this.supabase = await createClient();
  }

  /**
   * Register all step executors
   */
  private registerExecutors() {
    // These will be imported from separate executor files
    this.executors.set('prompt', new PromptExecutor());
    this.executors.set('database', new DatabaseExecutor());
    this.executors.set('api_call', new ApiCallExecutor());
    this.executors.set('condition', new ConditionExecutor());
    this.executors.set('loop', new LoopExecutor());
    this.executors.set('webhook', new WebhookExecutor());
    this.executors.set('switch', new SwitchExecutor());
    this.executors.set('code', new CodeExecutor());
    this.executors.set('approval', new ApprovalExecutor());
  }

  /**
   * Execute a complete chain
   */
  async executeChain(
    chainConfig: ChainConfig, 
    initialVariables: Record<string, any> = {},
    userId: string
  ): Promise<ExecutionContext> {
    // Create execution context
    const context: ExecutionContext = {
      chainId: chainConfig.id,
      runId: nanoid(),
      workspaceId: chainConfig.workspaceId,
      userId,
      variables: { ...initialVariables },
      steps: [],
      currentStepIndex: 0,
      status: 'running',
      startedAt: new Date()
    };

    // Store run in database
    await this.createChainRun(context, chainConfig);

    try {
      // Create a map for quick step lookup
      const stepMap = new Map(chainConfig.steps.map(s => [s.id, s]));
      const executedSteps = new Set<string>();
      
      // Execute steps with dynamic flow control
      let currentStepIndex = 0;
      
      while (currentStepIndex < chainConfig.steps.length) {
        context.currentStepIndex = currentStepIndex;
        const step = chainConfig.steps[currentStepIndex];
        
        // Prevent infinite loops
        if (executedSteps.has(step.id)) {
          const loopCount = context.variables[`_loopCount_${step.id}`] || 0;
          if (loopCount >= 100) {
            throw new Error(`Infinite loop detected at step ${step.id}`);
          }
          context.variables[`_loopCount_${step.id}`] = loopCount + 1;
        } else {
          executedSteps.add(step.id);
        }

        // Check if step should be skipped (e.g., due to condition)
        if (this.shouldSkipStep(step, context)) {
          context.steps.push({
            stepId: step.id,
            stepType: step.type,
            stepName: step.name || `Step ${currentStepIndex + 1}`,
            status: 'skipped',
            input: null
          });
          currentStepIndex++;
          continue;
        }

        // Execute the step
        const result = await this.executeStep(step, context);
        context.steps.push(result);

        // Store output in variables if specified
        if (step.outputVariable && result.output !== undefined) {
          context.variables[step.outputVariable] = result.output;
        }

        // Update run status in database
        await this.updateChainRun(context);

        // Check if we should stop execution
        if (result.status === 'error' && step.errorHandler?.action === 'fail') {
          context.status = 'failed';
          context.error = result.error;
          break;
        }
        
        // Check if chain should be stopped (from condition step)
        if (context.variables._stopChain) {
          context.status = 'completed';
          delete context.variables._stopChain;
          break;
        }
        
        // Handle branching logic
        if (context.variables._nextStepOverride) {
          // Find the index of the next step
          const nextStepId = context.variables._nextStepOverride;
          delete context.variables._nextStepOverride;
          
          const nextStepIndex = chainConfig.steps.findIndex(s => s.id === nextStepId);
          if (nextStepIndex !== -1) {
            currentStepIndex = nextStepIndex;
          } else {
            // If step not found, continue to next
            currentStepIndex++;
          }
        } else {
          // Normal sequential execution
          currentStepIndex++;
        }
      }

      // Mark as completed if all steps executed
      if (context.status === 'running') {
        context.status = 'completed';
      }

    } catch (error: any) {
      context.status = 'failed';
      context.error = error.message;
      console.error('Chain execution failed:', error);
    } finally {
      context.completedAt = new Date();
      await this.finalizeChainRun(context);
    }

    return context;
  }

  /**
   * Execute a single step with error handling and retries
   */
  private async executeStep(step: ChainStep, context: ExecutionContext): Promise<StepExecutionResult> {
    const executor = this.executors.get(step.type);
    if (!executor) {
      return {
        stepId: step.id,
        stepType: step.type,
        stepName: step.name || 'Unknown Step',
        status: 'error',
        input: step.config,
        error: `No executor found for step type: ${step.type}`,
        startedAt: new Date(),
        completedAt: new Date()
      };
    }

    let lastError: string | undefined;
    let retries = 0;
    const maxRetries = step.errorHandler?.retryCount || 0;
    const retryDelay = step.errorHandler?.retryDelay || 1000;

    while (retries <= maxRetries) {
      try {
        const startTime = Date.now();
        const result = await executor.execute(step, context);
        result.executionTimeMs = Date.now() - startTime;
        result.retries = retries;
        
        return result;
      } catch (error: any) {
        lastError = error.message;
        retries++;

        if (retries <= maxRetries) {
          console.log(`Retrying step ${step.id} (attempt ${retries}/${maxRetries})`);
          await this.delay(retryDelay * Math.pow(2, retries - 1)); // Exponential backoff
        }
      }
    }

    // All retries failed
    const result: StepExecutionResult = {
      stepId: step.id,
      stepType: step.type,
      stepName: step.name || 'Unknown Step',
      status: 'error',
      input: step.config,
      error: lastError,
      retries: retries - 1,
      startedAt: new Date(),
      completedAt: new Date()
    };

    // Use fallback value if specified
    if (step.errorHandler?.action === 'continue' && step.errorHandler.fallbackValue !== undefined) {
      result.output = step.errorHandler.fallbackValue;
      result.status = 'success';
    }

    return result;
  }

  /**
   * Check if a step should be skipped
   */
  private shouldSkipStep(step: ChainStep, context: ExecutionContext): boolean {
    // This will be enhanced with conditional logic evaluation
    // For now, always execute
    return false;
  }

  /**
   * Substitute variables in a template string
   */
  public static substituteVariables(template: string, variables: Record<string, any>): string {
    return template.replace(/\{\{(\w+)(?:\.(\w+))?\}\}/g, (match, var1, var2) => {
      if (var2) {
        // Handle nested variables like {{step1.output}}
        return variables[var1]?.[var2] ?? match;
      }
      return variables[var1] ?? match;
    });
  }

  /**
   * Parse JSON with variable substitution
   */
  public static parseJsonWithVariables(jsonString: string, variables: Record<string, any>): any {
    const substituted = ChainExecutionEngine.substituteVariables(jsonString, variables);
    try {
      return JSON.parse(substituted);
    } catch {
      return substituted;
    }
  }

  /**
   * Database operations
   */
  private async createChainRun(context: ExecutionContext, config: ChainConfig) {
    if (!this.supabase) return;

    await this.supabase
      .from('chain_runs')
      .insert({
        id: context.runId,
        chain_id: context.chainId,
        workspace_id: context.workspaceId,
        user_id: context.userId,
        status: 'running',
        input_data: context.variables,
        started_at: context.startedAt,
        config: config.steps
      });
  }

  private async updateChainRun(context: ExecutionContext) {
    if (!this.supabase) return;

    await this.supabase
      .from('chain_runs')
      .update({
        status: context.status,
        step_results: context.steps,
        current_step: context.currentStepIndex
      })
      .eq('id', context.runId);
  }

  private async finalizeChainRun(context: ExecutionContext) {
    if (!this.supabase) return;

    await this.supabase
      .from('chain_runs')
      .update({
        status: context.status,
        completed_at: context.completedAt,
        output_data: context.variables,
        step_results: context.steps,
        error: context.error,
        execution_time_ms: context.completedAt!.getTime() - context.startedAt.getTime()
      })
      .eq('id', context.runId);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Prompt Step Executor
 */
class PromptExecutor implements StepExecutor {
  async execute(step: ChainStep, context: ExecutionContext): Promise<StepExecutionResult> {
    const startTime = new Date();
    
    try {
      // Import AI service dynamically to avoid circular dependencies
      const { AIService, aiService } = await import('@/lib/ai/ai-service');
      
      // Get prompt details
      const promptId = step.config?.promptId;
      if (!promptId) {
        throw new Error('Prompt ID is required');
      }

      // Get the actual prompt content from database
      const supabase = await createClient();
      const { data: prompt, error } = await supabase
        .from('prompts')
        .select('content, model, temperature, max_tokens')
        .eq('id', promptId)
        .single();

      if (error || !prompt) {
        throw new Error('Prompt not found');
      }

      // Substitute variables in prompt variables
      const variables = step.config?.variables || {};
      const substitutedVars: Record<string, any> = {};
      
      for (const [key, value] of Object.entries(variables)) {
        if (typeof value === 'string') {
          substitutedVars[key] = ChainExecutionEngine.substituteVariables(value, context.variables);
        } else {
          substitutedVars[key] = value;
        }
      }

      // Get API key for the workspace
      const provider = step.config?.provider || 'openai';
      const apiKey = await AIService.getUserAPIKey(context.workspaceId, provider);
      
      if (!apiKey) {
        // Fallback to mock if no API key
        const output = `[Mock Response]\nPrompt: ${prompt.content}\nVariables: ${JSON.stringify(substitutedVars)}`;
        
        return {
          stepId: step.id,
          stepType: step.type,
          stepName: step.name || 'Prompt',
          status: 'success',
          input: { promptId, variables: substitutedVars },
          output,
          startedAt: startTime,
          completedAt: new Date()
        };
      }

      // Execute with AI service
      const result = await aiService.executePrompt({
        prompt: prompt.content,
        variables: substitutedVars,
        provider: {
          type: provider,
          apiKey,
          model: prompt.model || step.config?.model
        },
        temperature: prompt.temperature || 0.7,
        maxTokens: prompt.max_tokens || 2000,
        systemPrompt: step.config?.systemPrompt
      });

      if (!result.success) {
        throw new Error(result.error || 'AI execution failed');
      }

      return {
        stepId: step.id,
        stepType: step.type,
        stepName: step.name || 'Prompt',
        status: 'success',
        input: { promptId, variables: substitutedVars },
        output: result.output,
        startedAt: startTime,
        completedAt: new Date()
      };
    } catch (error: any) {
      throw new Error(`Prompt execution failed: ${error.message}`);
    }
  }
}

/**
 * Database Step Executor
 */
class DatabaseExecutor implements StepExecutor {
  async execute(step: ChainStep, context: ExecutionContext): Promise<StepExecutionResult> {
    const startTime = new Date();
    
    try {
      const config = step.config;
      
      // Import query service dynamically to avoid circular dependencies
      const { DatabaseQueryService } = await import('@/lib/database/query-service');
      
      let result;
      
      // Handle saved query
      if (config?.queryMode === 'saved' && config.queryId) {
        // Substitute variables for query parameters
        const parameters: Record<string, any> = {};
        if (config.parameters) {
          for (const [key, value] of Object.entries(config.parameters)) {
            parameters[key] = ChainExecutionEngine.substituteVariables(String(value), context.variables);
          }
        }
        
        result = await DatabaseQueryService.executeSavedQuery(
          config.queryId,
          parameters,
          context.workspaceId
        );
        
        if (!result.success) {
          throw new Error(result.error || 'Query execution failed');
        }
        
        return {
          stepId: step.id,
          stepType: step.type,
          stepName: step.name || 'Database Query',
          status: 'success',
          input: { queryId: config.queryId, parameters },
          output: {
            rows: result.rows,
            rowCount: result.rowCount,
            fields: result.fields
          },
          startedAt: startTime,
          completedAt: new Date()
        };
      }
      
      // Handle inline SQL
      if (config?.queryMode === 'inline' && config.sql) {
        const sql = ChainExecutionEngine.substituteVariables(config.sql, context.variables);
        
        // Validate the query first
        const validation = DatabaseQueryService.validateQuery(sql);
        if (!validation.valid) {
          throw new Error(validation.error || 'Invalid SQL query');
        }
        
        result = await DatabaseQueryService.executeInlineQuery(
          sql,
          context.workspaceId,
          config.connectionId
        );
        
        if (!result.success) {
          throw new Error(result.error || 'Query execution failed');
        }
        
        return {
          stepId: step.id,
          stepType: step.type,
          stepName: step.name || 'Database Query',
          status: 'success',
          input: { sql, connectionId: config.connectionId },
          output: {
            rows: result.rows,
            rowCount: result.rowCount,
            fields: result.fields
          },
          startedAt: startTime,
          completedAt: new Date()
        };
      }

      throw new Error('Invalid database step configuration: queryMode must be "saved" or "inline"');
    } catch (error: any) {
      throw new Error(`Database execution failed: ${error.message}`);
    }
  }
}

/**
 * API Call Step Executor
 */
class ApiCallExecutor implements StepExecutor {
  async execute(step: ChainStep, context: ExecutionContext): Promise<StepExecutionResult> {
    const startTime = new Date();
    
    try {
      const config = step.config;
      const url = ChainExecutionEngine.substituteVariables(config?.url || '', context.variables);
      const method = config?.method || 'GET';
      
      // Parse headers and body with variable substitution
      const headers = config?.headers ? 
        ChainExecutionEngine.parseJsonWithVariables(config.headers, context.variables) : {};
      
      const body = config?.body ? 
        ChainExecutionEngine.parseJsonWithVariables(config.body, context.variables) : undefined;

      // Add content-type header for JSON bodies
      if (body && typeof body === 'object' && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }

      // Make actual HTTP request
      const requestOptions: RequestInit = {
        method,
        headers: headers as HeadersInit
      };

      // Add body for non-GET requests
      if (method !== 'GET' && body) {
        requestOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
      }

      // Add timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config?.timeout || 30000);
      requestOptions.signal = controller.signal;

      try {
        const response = await fetch(url, requestOptions);
        clearTimeout(timeoutId);

        // Parse response based on content type
        const contentType = response.headers.get('content-type');
        let responseData;
        
        if (contentType?.includes('application/json')) {
          responseData = await response.json();
        } else if (contentType?.includes('text/')) {
          responseData = await response.text();
        } else {
          // For binary data, store as base64
          const buffer = await response.arrayBuffer();
          responseData = {
            type: 'binary',
            contentType,
            size: buffer.byteLength,
            data: Buffer.from(buffer).toString('base64')
          };
        }

        // Check if response is successful
        if (!response.ok && !config?.ignoreErrors) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return {
          stepId: step.id,
          stepType: step.type,
          stepName: step.name || 'API Call',
          status: 'success',
          input: { url, method, headers, body },
          output: {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            data: responseData
          },
          startedAt: startTime,
          completedAt: new Date()
        };
      } catch (error: any) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
          throw new Error('Request timeout exceeded');
        }
        throw error;
      }
    } catch (error: any) {
      throw new Error(`API call failed: ${error.message}`);
    }
  }
}

/**
 * Condition Step Executor
 */
class ConditionExecutor implements StepExecutor {
  async execute(step: ChainStep, context: ExecutionContext): Promise<StepExecutionResult> {
    const startTime = new Date();
    
    try {
      const config = step.config;
      const conditionType = config?.conditionType || 'simple';
      
      let result = false;
      let evaluationDetails: any = {};
      
      if (conditionType === 'simple') {
        // Simple comparison
        const leftRaw = config?.left || '';
        const rightRaw = config?.right || '';
        const left = ChainExecutionEngine.substituteVariables(leftRaw, context.variables);
        const right = ChainExecutionEngine.substituteVariables(rightRaw, context.variables);
        const operator = config?.operator || '==';
        
        result = this.evaluateCondition(left, operator, right);
        evaluationDetails = { left, operator, right, result };
        
      } else if (conditionType === 'contains') {
        // Contains text check
        const searchIn = ChainExecutionEngine.substituteVariables(config?.searchIn || '', context.variables);
        const searchFor = ChainExecutionEngine.substituteVariables(config?.searchFor || '', context.variables);
        const caseSensitive = config?.caseSensitive || false;
        
        if (caseSensitive) {
          result = searchIn.includes(searchFor);
        } else {
          result = searchIn.toLowerCase().includes(searchFor.toLowerCase());
        }
        evaluationDetails = { searchIn, searchFor, caseSensitive, result };
        
      } else if (conditionType === 'regex') {
        // Regex match check
        const testString = ChainExecutionEngine.substituteVariables(config?.testString || '', context.variables);
        const pattern = config?.pattern || '';
        const flags = config?.flags || '';
        
        try {
          const regex = new RegExp(pattern, flags);
          result = regex.test(testString);
        } catch (error) {
          result = false;
        }
        evaluationDetails = { testString, pattern, flags, result };
        
      } else if (conditionType === 'exists') {
        // Variable exists check
        const checkVariable = config?.checkVariable || '';
        const value = context.variables[checkVariable];
        result = value !== undefined && value !== null && value !== '';
        evaluationDetails = { checkVariable, value, exists: result };
        
      } else if (conditionType === 'complex') {
        // JavaScript expression evaluation
        const expression = ChainExecutionEngine.substituteVariables(config?.expression || '', context.variables);
        result = this.evaluateExpression(expression, context.variables);
        evaluationDetails = { expression, result };
        
      } else if (conditionType === 'multiple') {
        // Multiple conditions with AND/OR logic
        const conditions = config?.conditions || [];
        const logic = config?.logic || 'AND';
        
        const results = conditions.map((cond: any) => {
          const left = ChainExecutionEngine.substituteVariables(cond.left, context.variables);
          const right = ChainExecutionEngine.substituteVariables(cond.right, context.variables);
          return this.evaluateCondition(left, cond.operator, right);
        });
        
        result = logic === 'AND' ? results.every(r => r) : results.some(r => r);
        evaluationDetails = { conditions, logic, results, result };
      }

      // Store the result in context for branching
      context.variables[`${step.id}_result`] = result;
      
      // Handle branch actions
      const branchAction = result ? config?.thenAction : config?.elseAction;
      let nextStepOverride: string | undefined;
      
      if (branchAction) {
        switch (branchAction) {
          case 'goto':
            // Go to a specific step
            const targetStep = result ? config?.thenGotoStep : config?.elseGotoStep;
            if (targetStep) {
              // Handle both step number (e.g., "3") and step ID
              if (/^\d+$/.test(targetStep)) {
                // It's a step number, convert to index (0-based)
                const stepIndex = parseInt(targetStep) - 1;
                if (context.chain?.steps[stepIndex]) {
                  nextStepOverride = context.chain.steps[stepIndex].id;
                }
              } else {
                // It's a step ID or name
                nextStepOverride = targetStep;
              }
            }
            break;
            
          case 'set_variable':
            // Set a variable with a value
            const varName = result ? config?.thenVariableName : config?.elseVariableName;
            const varValue = result ? config?.thenVariableValue : config?.elseVariableValue;
            if (varName) {
              const processedValue = ChainExecutionEngine.substituteVariables(varValue || '', context.variables);
              context.variables[varName] = processedValue;
            }
            break;
            
          case 'run_prompt':
            // Store prompt ID to run as next step (would need special handling in engine)
            const promptId = result ? config?.thenPromptId : config?.elsePromptId;
            if (promptId) {
              context.variables[`${step.id}_run_prompt`] = promptId;
            }
            break;
            
          case 'run_chain':
            // Store chain ID to run as sub-chain (would need special handling in engine)
            const chainId = result ? config?.thenChainId : config?.elseChainId;
            if (chainId) {
              context.variables[`${step.id}_run_chain`] = chainId;
            }
            break;
            
          case 'skip':
            // Skip next N steps (only for else branch)
            if (!result && config?.elseSkipSteps) {
              const skipCount = parseInt(config.elseSkipSteps);
              const currentIndex = context.chain?.steps.findIndex(s => s.id === step.id) || 0;
              const targetIndex = currentIndex + skipCount + 1;
              if (context.chain?.steps[targetIndex]) {
                nextStepOverride = context.chain.steps[targetIndex].id;
              }
            }
            break;
            
          case 'stop':
            // Stop chain execution
            context.variables._stopChain = true;
            break;
            
          case 'continue':
          default:
            // Continue to next step normally
            break;
        }
      }
      
      // Set the next step override if determined
      if (nextStepOverride) {
        context.variables._nextStepOverride = nextStepOverride;
      }
      
      // Legacy support for old trueStep/falseStep config
      if (!branchAction) {
        const nextStepId = result ? config?.trueStep : config?.falseStep;
        if (nextStepId) {
          context.variables._nextStepOverride = nextStepId;
        }
      }

      return {
        stepId: step.id,
        stepType: step.type,
        stepName: step.name || 'Condition',
        status: 'success',
        input: config,
        output: {
          result,
          branch: result ? 'true' : 'false',
          action: branchAction || 'continue',
          nextStep: nextStepOverride,
          evaluationDetails
        },
        startedAt: startTime,
        completedAt: new Date()
      };
    } catch (error: any) {
      throw new Error(`Condition evaluation failed: ${error.message}`);
    }
  }

  private evaluateCondition(left: any, operator: string, right: any): boolean {
    // Type conversion for comparison
    const leftVal = this.convertValue(left);
    const rightVal = this.convertValue(right);
    
    switch (operator) {
      case '==': 
      case 'equals': 
        return leftVal == rightVal;
        
      case '!=': 
      case 'not_equals': 
        return leftVal != rightVal;
        
      case '>': 
      case 'greater_than': 
        return leftVal > rightVal;
        
      case '<': 
      case 'less_than': 
        return leftVal < rightVal;
        
      case '>=': 
      case 'greater_or_equal': 
        return leftVal >= rightVal;
        
      case '<=': 
      case 'less_or_equal': 
        return leftVal <= rightVal;
        
      case 'contains': 
        return String(leftVal).includes(String(rightVal));
        
      case 'starts_with': 
        return String(leftVal).startsWith(String(rightVal));
        
      case 'ends_with': 
        return String(leftVal).endsWith(String(rightVal));
        
      case 'matches': 
        // Regex matching
        try {
          const regex = new RegExp(String(rightVal));
          return regex.test(String(leftVal));
        } catch {
          return false;
        }
        
      case 'is_empty': 
        return !leftVal || leftVal === '' || (Array.isArray(leftVal) && leftVal.length === 0);
        
      case 'is_not_empty': 
        return !!leftVal && leftVal !== '' && (!Array.isArray(leftVal) || leftVal.length > 0);
        
      case 'in': 
        // Check if left is in right (array)
        if (Array.isArray(rightVal)) {
          return rightVal.includes(leftVal);
        }
        return false;
        
      case 'not_in': 
        if (Array.isArray(rightVal)) {
          return !rightVal.includes(leftVal);
        }
        return true;
        
      default: 
        return false;
    }
  }
  
  private convertValue(value: any): any {
    // Try to parse as JSON first (for arrays/objects from variables)
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        // Not JSON, continue with other conversions
      }
      
      // Check for boolean strings
      if (value.toLowerCase() === 'true') return true;
      if (value.toLowerCase() === 'false') return false;
      
      // Check for null/undefined strings
      if (value.toLowerCase() === 'null') return null;
      if (value.toLowerCase() === 'undefined') return undefined;
      
      // Try to parse as number
      const num = Number(value);
      if (!isNaN(num) && value.trim() !== '') {
        return num;
      }
    }
    
    return value;
  }
  
  private evaluateExpression(expression: string, variables: Record<string, any>): boolean {
    try {
      // Create a safe evaluation context
      const func = new Function(...Object.keys(variables), `return ${expression}`);
      const result = func(...Object.values(variables));
      return !!result;
    } catch (error: any) {
      console.error('Expression evaluation error:', error);
      return false;
    }
  }
}

/**
 * Loop Step Executor
 */
class LoopExecutor implements StepExecutor {
  async execute(step: ChainStep, context: ExecutionContext): Promise<StepExecutionResult> {
    const startTime = new Date();
    
    try {
      const config = step.config;
      const loopType = config?.loopType || 'for_each';
      const maxIterations = config?.maxIterations || 100; // Safety limit
      
      let iterations: any[] = [];
      let loopResults: any[] = [];
      
      // Determine what to iterate over based on loop type
      if (loopType === 'for_each') {
        // Iterate over array/collection
        const sourceVar = config?.source || '';
        const sourceValue = ChainExecutionEngine.substituteVariables(sourceVar, context.variables);
        
        // Parse source if it's a string representation of array
        let sourceArray: any[];
        if (typeof sourceValue === 'string') {
          try {
            sourceArray = JSON.parse(sourceValue);
          } catch {
            // If not JSON, split by comma or newline
            sourceArray = sourceValue.split(/[,\n]/).map(s => s.trim()).filter(s => s);
          }
        } else if (Array.isArray(sourceValue)) {
          sourceArray = sourceValue;
        } else if (sourceValue && typeof sourceValue === 'object') {
          // Convert object to array of entries
          sourceArray = Object.entries(sourceValue).map(([key, value]) => ({ key, value }));
        } else {
          sourceArray = [];
        }
        
        // Limit iterations for safety
        const itemsToProcess = sourceArray.slice(0, maxIterations);
        
        // Execute loop body for each item
        for (let i = 0; i < itemsToProcess.length; i++) {
          const item = itemsToProcess[i];
          const iterationContext = {
            ...context.variables,
            [`${step.id}_index`]: i,
            [`${step.id}_item`]: item,
            [`${step.id}_isFirst`]: i === 0,
            [`${step.id}_isLast`]: i === itemsToProcess.length - 1,
            loop_index: i,
            loop_item: item,
            loop_total: itemsToProcess.length
          };
          
          // Execute steps within loop body
          const iterationResult = await this.executeLoopBody(step, iterationContext, i);
          loopResults.push(iterationResult);
          
          // Check for break condition
          if (iterationContext._breakLoop) {
            break;
          }
        }
        
        iterations = itemsToProcess;
        
      } else if (loopType === 'while') {
        // While loop with condition
        const condition = config?.condition || '';
        let iterationCount = 0;
        
        while (iterationCount < maxIterations) {
          // Evaluate condition
          const conditionResult = this.evaluateLoopCondition(condition, {
            ...context.variables,
            [`${step.id}_iteration`]: iterationCount,
            loop_iteration: iterationCount
          });
          
          if (!conditionResult) {
            break;
          }
          
          // Execute loop body
          const iterationContext = {
            ...context.variables,
            [`${step.id}_iteration`]: iterationCount,
            loop_iteration: iterationCount
          };
          
          const iterationResult = await this.executeLoopBody(step, iterationContext, iterationCount);
          loopResults.push(iterationResult);
          
          // Update context variables from iteration
          Object.assign(context.variables, iterationContext);
          
          // Check for break
          if (iterationContext._breakLoop) {
            break;
          }
          
          iterationCount++;
        }
        
        iterations = Array.from({ length: iterationCount }, (_, i) => i);
        
      } else if (loopType === 'for_range') {
        // Classic for loop with start, end, step
        const start = this.parseNumber(config?.start, context.variables) || 0;
        const end = this.parseNumber(config?.end, context.variables) || 10;
        const stepValue = this.parseNumber(config?.step, context.variables) || 1;
        
        const rangeIterations = [];
        for (let i = start; stepValue > 0 ? i < end : i > end; i += stepValue) {
          if (rangeIterations.length >= maxIterations) break;
          
          const iterationContext = {
            ...context.variables,
            [`${step.id}_value`]: i,
            [`${step.id}_index`]: rangeIterations.length,
            loop_value: i,
            loop_index: rangeIterations.length
          };
          
          const iterationResult = await this.executeLoopBody(step, iterationContext, rangeIterations.length);
          loopResults.push(iterationResult);
          rangeIterations.push(i);
          
          // Check for break
          if (iterationContext._breakLoop) {
            break;
          }
        }
        
        iterations = rangeIterations;
      }
      
      // Aggregate results
      const aggregatedOutput = {
        iterations: iterations.length,
        results: loopResults,
        aggregated: this.aggregateResults(loopResults, config?.aggregation)
      };
      
      // Store aggregated results in context
      context.variables[`${step.id}_results`] = aggregatedOutput.aggregated;
      context.variables[`${step.id}_count`] = iterations.length;

      return {
        stepId: step.id,
        stepType: step.type,
        stepName: step.name || 'Loop',
        status: 'success',
        input: config,
        output: aggregatedOutput,
        startedAt: startTime,
        completedAt: new Date()
      };
    } catch (error: any) {
      throw new Error(`Loop execution failed: ${error.message}`);
    }
  }
  
  private async executeLoopBody(
    step: ChainStep, 
    iterationContext: Record<string, any>,
    iteration: number
  ): Promise<any> {
    // In a real implementation, this would execute the steps defined in the loop body
    // For now, we'll simulate by executing any transform operation
    const config = step.config;
    
    if (config?.transform) {
      try {
        // Apply transformation to current item
        const transformFunc = new Function('item', 'index', 'context', config.transform);
        return transformFunc(
          iterationContext.loop_item || iterationContext.loop_value,
          iteration,
          iterationContext
        );
      } catch (error) {
        console.error('Transform error:', error);
        return null;
      }
    }
    
    // Return current iteration data
    return {
      iteration,
      item: iterationContext.loop_item || iterationContext.loop_value,
      timestamp: new Date().toISOString()
    };
  }
  
  private evaluateLoopCondition(condition: string, variables: Record<string, any>): boolean {
    try {
      const substituted = ChainExecutionEngine.substituteVariables(condition, variables);
      const func = new Function(...Object.keys(variables), `return ${substituted}`);
      return !!func(...Object.values(variables));
    } catch {
      return false;
    }
  }
  
  private parseNumber(value: any, variables: Record<string, any>): number | null {
    if (value === undefined || value === null) return null;
    
    const substituted = ChainExecutionEngine.substituteVariables(String(value), variables);
    const num = Number(substituted);
    
    return isNaN(num) ? null : num;
  }
  
  private aggregateResults(results: any[], aggregationType?: string): any {
    if (!results || results.length === 0) return null;
    
    switch (aggregationType) {
      case 'concat':
        // Concatenate all results into single array
        return results.flat();
        
      case 'join':
        // Join string results
        return results.map(r => String(r)).join(', ');
        
      case 'sum':
        // Sum numeric results
        return results.reduce((sum, r) => sum + (Number(r) || 0), 0);
        
      case 'average':
        // Average numeric results
        const nums = results.map(r => Number(r) || 0);
        return nums.reduce((sum, n) => sum + n, 0) / nums.length;
        
      case 'min':
        // Find minimum value
        return Math.min(...results.map(r => Number(r) || 0));
        
      case 'max':
        // Find maximum value
        return Math.max(...results.map(r => Number(r) || 0));
        
      case 'first':
        // Return first result
        return results[0];
        
      case 'last':
        // Return last result
        return results[results.length - 1];
        
      case 'count':
        // Return count of results
        return results.length;
        
      case 'unique':
        // Return unique values
        return [...new Set(results)];
        
      default:
        // Return all results as-is
        return results;
    }
  }
}

/**
 * Other Executors (placeholders)
 */
class WebhookExecutor implements StepExecutor {
  async execute(step: ChainStep, context: ExecutionContext): Promise<StepExecutionResult> {
    return {
      stepId: step.id,
      stepType: step.type,
      stepName: step.name || 'Webhook',
      status: 'success',
      input: step.config,
      output: { received: true },
      startedAt: new Date(),
      completedAt: new Date()
    };
  }
}

class SwitchExecutor implements StepExecutor {
  async execute(step: ChainStep, context: ExecutionContext): Promise<StepExecutionResult> {
    const startTime = new Date();
    
    try {
      const config = step.config;
      const switchVar = config?.variable || '';
      const switchValue = ChainExecutionEngine.substituteVariables(switchVar, context.variables);
      const cases = config?.cases || [];
      const defaultCase = config?.default;
      
      let matchedCase: any = null;
      let nextStepId: string | null = null;
      
      // Evaluate each case
      for (const switchCase of cases) {
        const caseValue = ChainExecutionEngine.substituteVariables(switchCase.value || '', context.variables);
        
        // Check for match based on comparison type
        let isMatch = false;
        const comparisonType = switchCase.comparison || 'equals';
        
        switch (comparisonType) {
          case 'equals':
            isMatch = switchValue == caseValue;
            break;
          case 'strict_equals':
            isMatch = switchValue === caseValue;
            break;
          case 'contains':
            isMatch = String(switchValue).includes(String(caseValue));
            break;
          case 'starts_with':
            isMatch = String(switchValue).startsWith(String(caseValue));
            break;
          case 'ends_with':
            isMatch = String(switchValue).endsWith(String(caseValue));
            break;
          case 'matches_regex':
            try {
              const regex = new RegExp(String(caseValue));
              isMatch = regex.test(String(switchValue));
            } catch {
              isMatch = false;
            }
            break;
          case 'greater_than':
            isMatch = Number(switchValue) > Number(caseValue);
            break;
          case 'less_than':
            isMatch = Number(switchValue) < Number(caseValue);
            break;
          case 'in_range':
            const [min, max] = String(caseValue).split('-').map(Number);
            const numValue = Number(switchValue);
            isMatch = numValue >= min && numValue <= max;
            break;
        }
        
        if (isMatch) {
          matchedCase = switchCase;
          nextStepId = switchCase.nextStep;
          break;
        }
      }
      
      // If no case matched, use default
      if (!matchedCase && defaultCase) {
        matchedCase = { value: 'default', nextStep: defaultCase };
        nextStepId = defaultCase;
      }
      
      // Set next step override if a case matched
      if (nextStepId) {
        context.variables._nextStepOverride = nextStepId;
      }
      
      // Store result in context
      context.variables[`${step.id}_matched`] = matchedCase?.value || null;
      context.variables[`${step.id}_branch`] = nextStepId;

      return {
        stepId: step.id,
        stepType: step.type,
        stepName: step.name || 'Switch',
        status: 'success',
        input: config,
        output: {
          evaluatedValue: switchValue,
          matchedCase: matchedCase?.value,
          nextStep: nextStepId,
          allCases: cases.map(c => c.value)
        },
        startedAt: startTime,
        completedAt: new Date()
      };
    } catch (error: any) {
      throw new Error(`Switch evaluation failed: ${error.message}`);
    }
  }
}

class CodeExecutor implements StepExecutor {
  async execute(step: ChainStep, context: ExecutionContext): Promise<StepExecutionResult> {
    return {
      stepId: step.id,
      stepType: step.type,
      stepName: step.name || 'Code',
      status: 'success',
      input: step.config,
      output: null,
      startedAt: new Date(),
      completedAt: new Date()
    };
  }
}

class ApprovalExecutor implements StepExecutor {
  async execute(step: ChainStep, context: ExecutionContext): Promise<StepExecutionResult> {
    return {
      stepId: step.id,
      stepType: step.type,
      stepName: step.name || 'Approval',
      status: 'success',
      input: step.config,
      output: { approved: true },
      startedAt: new Date(),
      completedAt: new Date()
    };
  }
}

// Export singleton instance
export const chainExecutionEngine = new ChainExecutionEngine();