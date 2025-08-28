import { 
  ChainStep, 
  ChainExecution,
  StepType,
  evaluateCondition,
  resolveVariable,
  ConditionalConfig,
  SwitchConfig,
  LoopConfig,
  ApiCallConfig,
  DatabaseQueryConfig,
  CodeExecutionConfig,
  TransformationConfig,
  RetryConfig,
  ErrorHandling
} from '@/types/chain-types';
import { OpenAIClient } from '@/lib/ai/openai-client';
import Anthropic from '@anthropic-ai/sdk';

export interface ExecutionOptions {
  stopOnError?: boolean;
  maxParallel?: number;
  timeout?: number;
  dryRun?: boolean;
  debug?: boolean;
  mockMode?: boolean;
  apiKey?: string;
  provider?: 'openai' | 'anthropic';
}

export class ChainExecutionEngine {
  private openai?: OpenAIClient;
  private anthropic?: Anthropic;
  private execution: ChainExecution;
  private options: ExecutionOptions;
  private abortController: AbortController;
  private debugLog: Array<{ timestamp: string; message: string; data?: any }> = [];

  constructor(
    execution: ChainExecution,
    options: ExecutionOptions = {}
  ) {
    this.execution = execution;
    this.options = options;
    this.abortController = new AbortController();

    // Initialize AI clients if provided
    if (options.apiKey) {
      if (options.provider === 'openai') {
        this.openai = new OpenAIClient({ apiKey: options.apiKey });
      } else if (options.provider === 'anthropic') {
        this.anthropic = new Anthropic({ apiKey: options.apiKey });
      }
    }
  }

  async execute(steps: ChainStep[]): Promise<ChainExecution> {
    this.log('Starting chain execution', { stepCount: steps.length });
    
    try {
      this.execution.status = 'running';
      this.execution.startTime = new Date().toISOString();

      // Build execution graph to handle conditions and loops
      const executionGraph = this.buildExecutionGraph(steps);
      
      // Execute steps according to graph
      await this.executeGraph(executionGraph, steps);

      this.execution.status = 'completed';
    } catch (error) {
      this.execution.status = 'failed';
      this.execution.errors.push({
        stepId: this.execution.currentStep || 'unknown',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
      
      if (this.options.stopOnError) {
        throw error;
      }
    } finally {
      this.execution.endTime = new Date().toISOString();
    }

    return this.execution;
  }

  private buildExecutionGraph(steps: ChainStep[]): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>();
    
    // Initialize graph with sequential flow
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const nextSteps = new Set<string>();
      
      // Default to next step in sequence
      if (i < steps.length - 1 && step.type !== 'condition' && step.type !== 'switch') {
        nextSteps.add(steps[i + 1].id);
      }
      
      // Handle conditional branches
      if (step.type === 'condition' && step.conditionalConfig) {
        step.conditionalConfig.then.forEach(id => nextSteps.add(id));
        step.conditionalConfig.else?.forEach(id => nextSteps.add(id));
      }
      
      // Handle switch cases
      if (step.type === 'switch' && step.switchConfig) {
        step.switchConfig.cases.forEach(c => 
          c.steps.forEach(id => nextSteps.add(id))
        );
        step.switchConfig.default?.forEach(id => nextSteps.add(id));
      }
      
      graph.set(step.id, nextSteps);
    }
    
    return graph;
  }

  private async executeGraph(
    graph: Map<string, Set<string>>,
    steps: ChainStep[],
    startStepId?: string
  ): Promise<void> {
    const stepsMap = new Map(steps.map(s => [s.id, s]));
    const queue: string[] = startStepId ? [startStepId] : [steps[0]?.id].filter(Boolean);
    const visited = new Set<string>();
    
    while (queue.length > 0 && this.execution.status === 'running') {
      const stepId = queue.shift()!;
      
      if (visited.has(stepId)) continue;
      visited.add(stepId);
      
      const step = stepsMap.get(stepId);
      if (!step) continue;
      
      // Check if step should be executed (pre-condition)
      if (step.condition && !evaluateCondition(step.condition, this.execution.variables)) {
        this.log(`Skipping step ${step.name} due to condition`, { condition: step.condition });
        this.execution.stepResults[stepId] = {
          status: 'skipped',
          startTime: new Date().toISOString()
        };
        continue;
      }
      
      // Execute the step
      this.execution.currentStep = stepId;
      const result = await this.executeStep(step);
      
      // Determine next steps based on result
      const nextSteps = this.determineNextSteps(step, result, graph);
      nextSteps.forEach(id => {
        if (!visited.has(id)) {
          queue.push(id);
        }
      });
    }
  }

  private async executeStep(step: ChainStep): Promise<any> {
    this.log(`Executing step: ${step.name}`, { type: step.type });
    
    const startTime = new Date().toISOString();
    let result: any;
    let retryCount = 0;
    const maxRetries = step.retryConfig?.maxAttempts || 1;
    
    while (retryCount < maxRetries) {
      try {
        // Wait before execution if specified
        if (step.waitBefore) {
          await this.wait(step.waitBefore);
        }
        
        // Mock mode
        if (this.options.mockMode && step.mockOutput !== undefined) {
          result = step.mockOutput;
        } else {
          // Execute based on step type
          result = await this.executeStepByType(step);
        }
        
        // Store result
        if (step.outputVariable) {
          this.execution.results[step.outputVariable] = result;
          this.execution.variables[step.outputVariable] = result;
        }
        
        // Record success
        this.execution.stepResults[step.id] = {
          status: 'success',
          output: result,
          startTime,
          endTime: new Date().toISOString(),
          duration: Date.now() - new Date(startTime).getTime(),
          retryCount
        };
        
        this.execution.completedSteps.push(step.id);
        
        // Wait after execution if specified
        if (step.waitAfter) {
          await this.wait(step.waitAfter);
        }
        
        return result;
        
      } catch (error) {
        retryCount++;
        
        if (retryCount >= maxRetries) {
          // Handle error based on error handling config
          return await this.handleStepError(step, error, startTime, retryCount);
        }
        
        // Wait before retry
        const backoff = this.calculateBackoff(retryCount, step.retryConfig);
        await this.wait(backoff);
      }
    }
  }

  private async executeStepByType(step: ChainStep): Promise<any> {
    switch (step.type) {
      case 'prompt':
        return await this.executePromptStep(step);
        
      case 'condition':
        return await this.executeConditionalStep(step);
        
      case 'switch':
        return await this.executeSwitchStep(step);
        
      case 'loop':
        return await this.executeLoopStep(step);
        
      case 'api_call':
        return await this.executeApiCallStep(step);
        
      case 'database_query':
        return await this.executeDatabaseStep(step);
        
      case 'code_execution':
        return await this.executeCodeStep(step);
        
      case 'transformation':
        return await this.executeTransformationStep(step);
        
      case 'human_approval':
        return await this.executeHumanApprovalStep(step);
        
      case 'webhook':
        return await this.executeWebhookStep(step);
        
      case 'wait':
        const waitTime = step.inputMapping?.duration ? 
          Number(resolveVariable(step.inputMapping.duration, this.execution.variables)) : 
          1000;
        await this.wait(waitTime);
        return { waited: waitTime };
        
      case 'parallel_group':
        // This is handled at a higher level
        return {};
        
      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  private async executePromptStep(step: ChainStep): Promise<any> {
    if (!step.promptId) {
      throw new Error('Prompt ID is required for prompt steps');
    }
    
    // This would be implemented to fetch and execute the prompt
    // For now, returning mock data
    return { output: `Executed prompt ${step.promptId}` };
  }

  private async executeConditionalStep(step: ChainStep): Promise<any> {
    if (!step.conditionalConfig) {
      throw new Error('Conditional config is required');
    }
    
    const condition = evaluateCondition(
      step.conditionalConfig.condition,
      this.execution.variables
    );
    
    // Execute the appropriate branch steps
    const branchSteps = condition 
      ? step.conditionalConfig.then 
      : (step.conditionalConfig.else || []);
    
    const branchResults: any[] = [];
    
    for (const stepId of branchSteps) {
      const branchStep = this.chain.steps.find(s => s.id === stepId);
      if (branchStep) {
        const result = await this.executeStep(branchStep);
        branchResults.push({ stepId, result });
      }
    }
    
    return { 
      condition, 
      branch: condition ? 'then' : 'else',
      branchResults
    };
  }

  private async executeSwitchStep(step: ChainStep): Promise<any> {
    if (!step.switchConfig) {
      throw new Error('Switch config is required');
    }
    
    const value = resolveVariable(step.switchConfig.variable, this.execution.variables);
    const matchedCase = step.switchConfig.cases.find(c => c.value === value);
    
    // Execute the matched case steps or default steps
    const caseSteps = matchedCase 
      ? matchedCase.steps 
      : (step.switchConfig.default || []);
    
    const caseResults: any[] = [];
    
    for (const stepId of caseSteps) {
      const caseStep = this.chain.steps.find(s => s.id === stepId);
      if (caseStep) {
        const result = await this.executeStep(caseStep);
        caseResults.push({ stepId, result });
      }
    }
    
    return { 
      value, 
      matchedCase: matchedCase?.value,
      branch: matchedCase ? 'case' : 'default',
      caseResults
    };
  }

  private async executeLoopStep(step: ChainStep): Promise<any> {
    if (!step.loopConfig) {
      throw new Error('Loop config is required');
    }
    
    const results: any[] = [];
    
    switch (step.loopConfig.type) {
      case 'for_each':
        const items = resolveVariable(step.loopConfig.items || '', this.execution.variables);
        if (!Array.isArray(items)) {
          throw new Error('Loop items must be an array');
        }
        
        for (let i = 0; i < items.length; i++) {
          // Set loop variables
          if (step.loopConfig.itemVariable) {
            this.execution.variables[step.loopConfig.itemVariable] = items[i];
          }
          if (step.loopConfig.indexVariable) {
            this.execution.variables[step.loopConfig.indexVariable] = i;
          }
          
          // Execute loop body steps
          const iterationResults: any[] = [];
          for (const stepId of step.loopConfig.steps) {
            const loopStep = this.chain.steps.find(s => s.id === stepId);
            if (loopStep) {
              const result = await this.executeStep(loopStep);
              iterationResults.push({ stepId, result });
            }
          }
          
          results.push({ 
            index: i, 
            item: items[i],
            results: iterationResults
          });
        }
        break;
        
      case 'while':
        let iterations = 0;
        const maxIterations = step.loopConfig.maxIterations || 1000;
        
        while (iterations < maxIterations) {
          if (step.loopConfig.condition && 
              !evaluateCondition(step.loopConfig.condition, this.execution.variables)) {
            break;
          }
          
          // Set iteration variable if specified
          if (step.loopConfig.indexVariable) {
            this.execution.variables[step.loopConfig.indexVariable] = iterations;
          }
          
          // Execute loop body steps
          const iterationResults: any[] = [];
          for (const stepId of step.loopConfig.steps) {
            const loopStep = this.chain.steps.find(s => s.id === stepId);
            if (loopStep) {
              const result = await this.executeStep(loopStep);
              iterationResults.push({ stepId, result });
            }
          }
          
          results.push({ 
            iteration: iterations,
            results: iterationResults
          });
          iterations++;
        }
        break;
        
      case 'for_range':
        const start = step.loopConfig.start || 0;
        const end = step.loopConfig.end || 10;
        const stepSize = step.loopConfig.step || 1;
        
        for (let i = start; i < end; i += stepSize) {
          if (step.loopConfig.indexVariable) {
            this.execution.variables[step.loopConfig.indexVariable] = i;
          }
          
          // Execute loop body steps
          const iterationResults: any[] = [];
          for (const stepId of step.loopConfig.steps) {
            const loopStep = this.chain.steps.find(s => s.id === stepId);
            if (loopStep) {
              const result = await this.executeStep(loopStep);
              iterationResults.push({ stepId, result });
            }
          }
          
          results.push({ 
            index: i,
            results: iterationResults
          });
        }
        break;
    }
    
    return { results, count: results.length };
  }

  private async executeApiCallStep(step: ChainStep): Promise<any> {
    if (!step.apiCallConfig) {
      throw new Error('API call config is required');
    }
    
    const config = step.apiCallConfig;
    const url = resolveVariable(config.url, this.execution.variables);
    
    // Build request options
    const requestOptions: RequestInit = {
      method: config.method,
      headers: this.resolveHeaders(config.headers),
      signal: this.abortController.signal
    };
    
    if (config.body) {
      requestOptions.body = JSON.stringify(
        this.resolveObject(config.body, this.execution.variables)
      );
    }
    
    // Add authentication
    if (config.authentication) {
      this.addAuthentication(requestOptions, config.authentication);
    }
    
    // Make the request
    const response = await fetch(url, requestOptions);
    
    if (!response.ok && this.options.stopOnError) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }
    
    // Parse response
    let data: any;
    switch (config.responseType) {
      case 'text':
        data = await response.text();
        break;
      case 'blob':
        data = await response.blob();
        break;
      case 'json':
      default:
        data = await response.json();
    }
    
    // Extract specific path if specified
    if (config.extractPath) {
      data = this.extractPath(data, config.extractPath);
    }
    
    return data;
  }

  private async executeDatabaseStep(step: ChainStep): Promise<any> {
    // This would need actual database connection implementation
    // For now, returning mock data
    return { 
      rows: [], 
      message: 'Database queries not yet implemented'
    };
  }

  private async executeCodeStep(step: ChainStep): Promise<any> {
    if (!step.codeConfig) {
      throw new Error('Code config is required');
    }
    
    // This would need a sandboxed code execution environment
    // For now, returning mock data
    return {
      output: 'Code execution not yet implemented',
      language: step.codeConfig.language
    };
  }

  private async executeTransformationStep(step: ChainStep): Promise<any> {
    if (!step.transformConfig) {
      throw new Error('Transform config is required');
    }
    
    const config = step.transformConfig;
    const input = resolveVariable(config.input, this.execution.variables);
    let output: any;
    
    switch (config.type) {
      case 'json_parse':
        output = typeof input === 'string' ? JSON.parse(input) : input;
        break;
        
      case 'json_stringify':
        output = JSON.stringify(input);
        break;
        
      case 'filter':
        if (!Array.isArray(input)) {
          throw new Error('Filter transformation requires array input');
        }
        output = input.filter((item: any) => {
          // This would need safe evaluation of filter condition
          return true; // Placeholder
        });
        break;
        
      case 'map':
        if (!Array.isArray(input)) {
          throw new Error('Map transformation requires array input');
        }
        output = input.map((item: any) => {
          // This would need safe evaluation of mapper function
          return item; // Placeholder
        });
        break;
        
      case 'sort':
        if (!Array.isArray(input)) {
          throw new Error('Sort transformation requires array input');
        }
        output = [...input].sort((a, b) => {
          const fieldA = config.sortBy ? a[config.sortBy] : a;
          const fieldB = config.sortBy ? b[config.sortBy] : b;
          return fieldA < fieldB ? -1 : fieldA > fieldB ? 1 : 0;
        });
        break;
        
      case 'join':
        if (!Array.isArray(input)) {
          throw new Error('Join transformation requires array input');
        }
        output = input.join(config.separator || ',');
        break;
        
      case 'split':
        if (typeof input !== 'string') {
          throw new Error('Split transformation requires string input');
        }
        output = input.split(config.separator || ',');
        break;
        
      case 'regex_extract':
        if (!config.pattern) {
          throw new Error('Regex pattern is required');
        }
        const regex = new RegExp(config.pattern);
        const match = String(input).match(regex);
        output = match ? match[0] : null;
        break;
        
      case 'format':
        // Simple template replacement
        output = config.format || '';
        Object.entries(this.execution.variables).forEach(([key, value]) => {
          output = output.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
        });
        break;
        
      default:
        output = input;
    }
    
    return output;
  }

  private async executeHumanApprovalStep(step: ChainStep): Promise<any> {
    // This would need integration with notification system
    // For now, auto-approving in dry run mode
    if (this.options.dryRun) {
      return { approved: true, approver: 'dry-run' };
    }
    
    return { 
      approved: false, 
      message: 'Human approval not yet implemented'
    };
  }

  private async executeWebhookStep(step: ChainStep): Promise<any> {
    if (!step.webhookConfig) {
      throw new Error('Webhook config is required');
    }
    
    const config = step.webhookConfig;
    const url = resolveVariable(config.url, this.execution.variables);
    
    const requestOptions: RequestInit = {
      method: config.method || 'POST',
      headers: this.resolveHeaders(config.headers),
      signal: this.abortController.signal
    };
    
    if (config.body) {
      requestOptions.body = JSON.stringify(
        this.resolveObject(config.body, this.execution.variables)
      );
    }
    
    const response = await fetch(url, requestOptions);
    
    if (config.waitForResponse) {
      return await response.json();
    }
    
    return { status: response.status };
  }

  private determineNextSteps(
    step: ChainStep,
    result: any,
    graph: Map<string, Set<string>>
  ): string[] {
    // For conditions, switches, and loops, the branch/loop steps are already executed
    // So we should not return them as next steps
    if (step.type === 'condition' || step.type === 'switch' || step.type === 'loop') {
      // These steps handle their own branching/looping internally
      // Continue with the next steps in the main flow
      return Array.from(graph.get(step.id) || []).filter(nextId => {
        // Filter out any steps that were already executed as part of the branch/loop
        if (step.type === 'condition' && step.conditionalConfig) {
          return ![...step.conditionalConfig.then, ...(step.conditionalConfig.else || [])].includes(nextId);
        }
        if (step.type === 'switch' && step.switchConfig) {
          const allCaseSteps = step.switchConfig.cases.flatMap(c => c.steps);
          return ![...allCaseSteps, ...(step.switchConfig.default || [])].includes(nextId);
        }
        if (step.type === 'loop' && step.loopConfig) {
          return !step.loopConfig.steps.includes(nextId);
        }
        return true;
      });
    }
    
    // Default to graph connections
    return Array.from(graph.get(step.id) || []);
  }

  private async handleStepError(
    step: ChainStep,
    error: any,
    startTime: string,
    retryCount: number
  ): Promise<any> {
    const errorHandling = step.errorHandling || { onError: 'stop' };
    
    // Record error
    this.execution.stepResults[step.id] = {
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
      startTime,
      endTime: new Date().toISOString(),
      duration: Date.now() - new Date(startTime).getTime(),
      retryCount
    };
    
    this.execution.errors.push({
      stepId: step.id,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
    
    // Store error in variable if specified
    if (errorHandling.errorVariable) {
      this.execution.variables[errorHandling.errorVariable] = {
        stepId: step.id,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      };
    }
    
    // Handle based on error strategy
    switch (errorHandling.onError) {
      case 'stop':
        if (this.options.stopOnError) {
          throw error;
        }
        break;
        
      case 'continue':
        // Continue to next step
        break;
        
      case 'fallback':
        // Execute fallback steps
        if (errorHandling.fallbackSteps?.length) {
          // This would need to trigger fallback step execution
        }
        break;
        
      case 'retry':
        // Already handled in retry loop
        break;
    }
    
    return { error: error instanceof Error ? error.message : String(error) };
  }

  private calculateBackoff(attempt: number, config?: RetryConfig): number {
    if (!config) return 1000;
    
    const base = config.backoffMs;
    const multiplier = config.backoffMultiplier || 2;
    const max = config.maxBackoffMs || 30000;
    
    const backoff = Math.min(base * Math.pow(multiplier, attempt - 1), max);
    return backoff;
  }

  private resolveHeaders(headers?: Record<string, string>): HeadersInit {
    if (!headers) return {};
    
    const resolved: Record<string, string> = {};
    Object.entries(headers).forEach(([key, value]) => {
      resolved[key] = String(resolveVariable(value, this.execution.variables));
    });
    
    return resolved;
  }

  private resolveObject(obj: any, context: Record<string, any>): any {
    if (typeof obj === 'string') {
      return resolveVariable(obj, context);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.resolveObject(item, context));
    }
    
    if (obj && typeof obj === 'object') {
      const resolved: any = {};
      Object.entries(obj).forEach(([key, value]) => {
        resolved[key] = this.resolveObject(value, context);
      });
      return resolved;
    }
    
    return obj;
  }

  private addAuthentication(options: RequestInit, auth: ApiCallConfig['authentication']) {
    if (!auth || auth.type === 'none') return;
    
    const headers = (options.headers || {}) as Record<string, string>;
    
    switch (auth.type) {
      case 'bearer':
        headers['Authorization'] = `Bearer ${auth.token}`;
        break;
        
      case 'basic':
        const basic = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
        headers['Authorization'] = `Basic ${basic}`;
        break;
        
      case 'api_key':
        const headerName = auth.apiKeyHeader || 'X-API-Key';
        headers[headerName] = auth.apiKey || '';
        break;
    }
    
    options.headers = headers;
  }

  private extractPath(data: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      if (current === null || current === undefined) return undefined;
      return current[key];
    }, data);
  }

  private async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private log(message: string, data?: any): void {
    if (this.options.debug) {
      const entry = {
        timestamp: new Date().toISOString(),
        message,
        data
      };
      this.debugLog.push(entry);
      console.log(`[ChainEngine] ${message}`, data || '');
    }
  }

  public getDebugLog(): typeof this.debugLog {
    return this.debugLog;
  }

  public abort(): void {
    this.abortController.abort();
    this.execution.status = 'cancelled';
  }
}