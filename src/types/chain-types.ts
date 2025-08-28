// Chain Step Types with Advanced Features

export type StepType = 
  | 'prompt'           // Execute a prompt
  | 'condition'        // If/then/else logic
  | 'switch'           // Switch/case logic
  | 'loop'             // For-each or while loop
  | 'api_call'         // External API call
  | 'database_query'   // Database query
  | 'code_execution'   // Execute code (Python/JS)
  | 'transformation'   // Data transformation
  | 'human_approval'   // Human-in-the-loop
  | 'webhook'          // Webhook trigger/call
  | 'wait'             // Wait/delay
  | 'parallel_group'   // Parallel execution group

export interface ConditionalConfig {
  condition: {
    type: 'expression' | 'comparison' | 'exists' | 'regex' | 'custom';
    left?: string;          // Variable or value
    operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'matches';
    right?: string;         // Variable or value
    expression?: string;    // For custom expressions
    pattern?: string;       // For regex matching
  };
  then: string[];          // Step IDs to execute if true
  else?: string[];         // Step IDs to execute if false
}

export interface SwitchConfig {
  variable: string;        // Variable to switch on
  cases: Array<{
    value: any;           // Case value
    steps: string[];      // Step IDs to execute
  }>;
  default?: string[];     // Default step IDs
}

export interface LoopConfig {
  type: 'for_each' | 'while' | 'for_range';
  // For for_each
  items?: string;         // Variable containing array
  itemVariable?: string;  // Variable name for current item
  indexVariable?: string; // Variable name for current index
  // For while
  condition?: ConditionalConfig['condition'];
  maxIterations?: number;
  // For for_range
  start?: number;
  end?: number;
  step?: number;
  // Common
  steps: string[];       // Step IDs to execute in loop
}

export interface RetryConfig {
  maxAttempts: number;
  backoffMs: number;
  backoffMultiplier?: number;
  maxBackoffMs?: number;
  retryOn?: 'all_errors' | 'timeout' | 'status_codes' | 'custom';
  statusCodes?: number[];
  customCondition?: string;
}

export interface ErrorHandling {
  onError: 'stop' | 'continue' | 'fallback' | 'retry';
  fallbackSteps?: string[];
  errorVariable?: string;    // Store error in variable
  logError?: boolean;
}

export interface ApiCallConfig {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  body?: any;
  authentication?: {
    type: 'none' | 'bearer' | 'basic' | 'api_key' | 'oauth2';
    token?: string;
    username?: string;
    password?: string;
    apiKey?: string;
    apiKeyHeader?: string;
  };
  timeout?: number;
  responseType?: 'json' | 'text' | 'blob';
  outputVariable?: string;
  extractPath?: string;     // JSONPath to extract from response
}

export interface DatabaseQueryConfig {
  connectionString?: string; // Or use workspace default
  query: string;
  parameters?: Record<string, any>;
  outputVariable?: string;
  outputFormat?: 'rows' | 'single' | 'scalar';
}

export interface CodeExecutionConfig {
  language: 'javascript' | 'python';
  code: string;
  inputs?: Record<string, any>;
  timeout?: number;
  sandbox?: boolean;
  outputVariable?: string;
}

export interface TransformationConfig {
  type: 'json_parse' | 'json_stringify' | 'filter' | 'map' | 'reduce' | 
        'sort' | 'group_by' | 'join' | 'split' | 'regex_extract' | 
        'format' | 'calculate' | 'custom';
  input: string;            // Input variable
  output: string;           // Output variable
  // Type-specific configs
  path?: string;            // JSONPath for extraction
  filter?: any;             // Filter condition
  mapper?: string;          // Map function
  reducer?: string;         // Reduce function
  sortBy?: string;          // Sort field
  groupBy?: string;         // Group field
  separator?: string;       // For join/split
  pattern?: string;         // Regex pattern
  format?: string;          // Format string
  expression?: string;      // Math expression
  customFunction?: string;  // Custom transformation
}

export interface HumanApprovalConfig {
  message: string;
  approvers?: string[];     // User IDs or emails
  timeout?: number;         // Auto-approve/reject after timeout
  timeoutAction?: 'approve' | 'reject';
  requireAll?: boolean;     // Require all approvers
  dataToShow?: string[];    // Variables to display
  allowEdit?: boolean;      // Allow editing data
  notificationChannels?: ('email' | 'slack' | 'webhook')[];
}

export interface WebhookConfig {
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: any;
  waitForResponse?: boolean;
  timeout?: number;
  outputVariable?: string;
  validateResponse?: {
    statusCode?: number[];
    schema?: any;           // JSON schema
  };
}

export interface ChainStep {
  id: string;
  name: string;
  description?: string;
  type: StepType;
  
  // Common fields
  enabled?: boolean;        // Can be disabled
  condition?: ConditionalConfig['condition']; // Pre-condition to check
  
  // Type-specific configs
  promptId?: string;        // For prompt type
  conditionalConfig?: ConditionalConfig;
  switchConfig?: SwitchConfig;
  loopConfig?: LoopConfig;
  apiCallConfig?: ApiCallConfig;
  databaseConfig?: DatabaseQueryConfig;
  codeConfig?: CodeExecutionConfig;
  transformConfig?: TransformationConfig;
  approvalConfig?: HumanApprovalConfig;
  webhookConfig?: WebhookConfig;
  
  // Variable mapping
  inputMapping?: Record<string, string>;
  outputVariable?: string;
  
  // Execution control
  parallelGroup?: number;   // Steps with same number run in parallel
  waitBefore?: number;      // Wait milliseconds before execution
  waitAfter?: number;       // Wait milliseconds after execution
  timeout?: number;         // Step timeout
  
  // Error handling
  errorHandling?: ErrorHandling;
  retryConfig?: RetryConfig;
  
  // Testing & debugging
  mockOutput?: any;         // Mock output for testing
  breakpoint?: boolean;     // Pause execution here when debugging
  skipInDryRun?: boolean;   // Skip this step in dry runs
}

export interface ChainExecution {
  id: string;
  chainId: string;
  workspaceId: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  
  // Execution context
  variables: Record<string, any>;
  results: Record<string, any>;
  errors: Array<{
    stepId: string;
    error: any;
    timestamp: string;
  }>;
  
  // Step tracking
  completedSteps: string[];
  currentStep?: string;
  stepResults: Record<string, {
    status: 'success' | 'failed' | 'skipped';
    output?: any;
    error?: any;
    startTime: string;
    endTime?: string;
    duration?: number;
    retryCount?: number;
  }>;
  
  // Metrics
  totalTokens?: number;
  totalCost?: number;
  startTime: string;
  endTime?: string;
  
  // Options
  options: {
    stopOnError?: boolean;
    maxParallel?: number;
    timeout?: number;
    dryRun?: boolean;
    debug?: boolean;
    mockMode?: boolean;
  };
}

export interface ChainTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  
  // Template content
  steps: ChainStep[];
  variables: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    required?: boolean;
    default?: any;
    description?: string;
  }>;
  
  // Metadata
  author?: string;
  version?: string;
  documentation?: string;
  examples?: Array<{
    name: string;
    inputs: Record<string, any>;
    expectedOutput?: any;
  }>;
  
  // Usage
  isPublic?: boolean;
  usageCount?: number;
  rating?: number;
}

// Helper functions for step validation
export function validateStep(step: ChainStep): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!step.id) errors.push('Step ID is required');
  if (!step.name) errors.push('Step name is required');
  if (!step.type) errors.push('Step type is required');
  
  // Type-specific validation
  switch (step.type) {
    case 'prompt':
      if (!step.promptId) errors.push('Prompt ID is required for prompt steps');
      break;
    case 'condition':
      if (!step.conditionalConfig) errors.push('Conditional config is required');
      if (!step.conditionalConfig?.then?.length) errors.push('Then branch must have steps');
      break;
    case 'switch':
      if (!step.switchConfig) errors.push('Switch config is required');
      if (!step.switchConfig?.variable) errors.push('Switch variable is required');
      if (!step.switchConfig?.cases?.length) errors.push('Switch must have cases');
      break;
    case 'loop':
      if (!step.loopConfig) errors.push('Loop config is required');
      if (!step.loopConfig?.steps?.length) errors.push('Loop must have steps');
      break;
    case 'api_call':
      if (!step.apiCallConfig) errors.push('API call config is required');
      if (!step.apiCallConfig?.url) errors.push('API URL is required');
      break;
    case 'database_query':
      if (!step.databaseConfig) errors.push('Database config is required');
      if (!step.databaseConfig?.query) errors.push('Query is required');
      break;
    case 'code_execution':
      if (!step.codeConfig) errors.push('Code config is required');
      if (!step.codeConfig?.code) errors.push('Code is required');
      break;
    case 'transformation':
      if (!step.transformConfig) errors.push('Transform config is required');
      if (!step.transformConfig?.input) errors.push('Input variable is required');
      if (!step.transformConfig?.output) errors.push('Output variable is required');
      break;
    case 'human_approval':
      if (!step.approvalConfig) errors.push('Approval config is required');
      if (!step.approvalConfig?.message) errors.push('Approval message is required');
      break;
    case 'webhook':
      if (!step.webhookConfig) errors.push('Webhook config is required');
      if (!step.webhookConfig?.url) errors.push('Webhook URL is required');
      break;
  }
  
  return { valid: errors.length === 0, errors };
}

// Execution context helpers
export function evaluateCondition(
  condition: ConditionalConfig['condition'],
  context: Record<string, any>
): boolean {
  switch (condition.type) {
    case 'comparison':
      const left = resolveVariable(condition.left || '', context);
      const right = resolveVariable(condition.right || '', context);
      
      switch (condition.operator) {
        case 'eq': return left === right;
        case 'neq': return left !== right;
        case 'gt': return left > right;
        case 'gte': return left >= right;
        case 'lt': return left < right;
        case 'lte': return left <= right;
        case 'contains': return String(left).includes(String(right));
        case 'matches': return new RegExp(String(right)).test(String(left));
        default: return false;
      }
      
    case 'exists':
      return condition.left ? context[condition.left] !== undefined : false;
      
    case 'regex':
      if (!condition.pattern || !condition.left) return false;
      const value = resolveVariable(condition.left, context);
      return new RegExp(condition.pattern).test(String(value));
      
    case 'expression':
      // This would need a safe expression evaluator
      return false; // TODO: Implement safe expression evaluation
      
    default:
      return false;
  }
}

export function resolveVariable(
  value: string,
  context: Record<string, any>
): any {
  // Handle {{variable}} syntax
  if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
    const varName = value.slice(2, -2).trim();
    return getNestedValue(context, varName);
  }
  return value;
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    if (current === null || current === undefined) return undefined;
    if (key.includes('[') && key.includes(']')) {
      // Handle array notation like items[0]
      const [arrayKey, indexStr] = key.split('[');
      const index = parseInt(indexStr.replace(']', ''));
      return current[arrayKey]?.[index];
    }
    return current[key];
  }, obj);
}