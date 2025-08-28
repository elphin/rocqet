'use client';

import { useState, useEffect } from 'react';
import { 
  Play, 
  Settings, 
  Key, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Zap,
  DollarSign,
  RefreshCw,
  Pause,
  X,
  ChevronRight,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

interface ChainExecutionPanelProps {
  chainId: string;
  chainName: string;
  workspaceId: string;
  steps: any[];
  defaultInputs?: Record<string, any>;
  onClose?: () => void;
}

interface ApiKey {
  id: string;
  name: string;
  provider: string;
  is_default: boolean;
}

interface ExecutionStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  output?: any;
  error?: string;
  duration?: number;
  tokens?: number;
  cost?: number;
}

export function ChainExecutionPanel({
  chainId,
  chainName,
  workspaceId,
  steps,
  defaultInputs = {},
  onClose
}: ChainExecutionPanelProps) {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [selectedApiKey, setSelectedApiKey] = useState<string>('');
  const [inputs, setInputs] = useState<Record<string, any>>(defaultInputs);
  const [executing, setExecuting] = useState(false);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  
  // Execution options
  const [options, setOptions] = useState({
    stopOnError: true,
    maxParallel: 3,
    timeout: 30000,
    dryRun: false,
    retryFailedSteps: true
  });

  // Statistics
  const [stats, setStats] = useState({
    totalSteps: steps.length,
    completedSteps: 0,
    failedSteps: 0,
    totalTokens: 0,
    totalCost: 0,
    totalDuration: 0
  });

  const supabase = createClient();

  useEffect(() => {
    fetchApiKeys();
    initializeExecutionSteps();
  }, []);

  const fetchApiKeys = async () => {
    const { data } = await supabase
      .from('workspace_api_keys')
      .select('id, name, provider, is_default')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true);

    if (data) {
      setApiKeys(data);
      const defaultKey = data.find(k => k.is_default);
      if (defaultKey) {
        setSelectedApiKey(defaultKey.id);
      }
    }
  };

  const initializeExecutionSteps = () => {
    const initialSteps = steps.map(step => ({
      id: step.id,
      name: step.prompts?.name || `Step ${step.step_order || step.order}`,
      status: 'pending' as const,
      output: null,
      error: null,
      duration: 0,
      tokens: 0,
      cost: 0
    }));
    setExecutionSteps(initialSteps);
  };

  const handleExecute = async () => {
    if (!selectedApiKey) {
      toast.error('Please select an API key');
      return;
    }

    setExecuting(true);
    setStats(prev => ({ ...prev, completedSteps: 0, failedSteps: 0 }));

    try {
      const response = await fetch('/api/chains/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chainId,
          workspaceId,
          initialInputs: inputs,
          apiKeyId: selectedApiKey,
          options
        })
      });

      const data = await response.json();

      if (response.ok) {
        setExecutionId(data.execution_id);
        
        // Update stats
        setStats({
          totalSteps: steps.length,
          completedSteps: data.metrics.steps_completed,
          failedSteps: data.metrics.steps_failed,
          totalTokens: data.metrics.total_tokens,
          totalCost: data.metrics.total_cost,
          totalDuration: 0 // Calculate from individual steps
        });

        // Update step statuses
        const updatedSteps = executionSteps.map(step => {
          const result = data.results[step.id];
          const error = data.errors.find((e: any) => e.step === step.id);
          
          if (result) {
            return {
              ...step,
              status: 'success' as const,
              output: result.output,
              duration: result.duration_ms,
              tokens: result.tokens_used,
              cost: result.cost
            };
          } else if (error) {
            return {
              ...step,
              status: 'error' as const,
              error: error.error
            };
          }
          
          return step;
        });

        setExecutionSteps(updatedSteps);
        
        if (data.errors.length === 0) {
          toast.success('Chain executed successfully!');
        } else {
          toast.warning(`Chain completed with ${data.errors.length} errors`);
        }
      } else {
        toast.error(data.error || 'Execution failed');
        
        // Mark current step as failed
        if (data.partial_results) {
          const failedStepIndex = Object.keys(data.partial_results).length;
          setExecutionSteps(prev => prev.map((step, index) => {
            if (index < failedStepIndex) {
              return { ...step, status: 'success' as const };
            } else if (index === failedStepIndex) {
              return { ...step, status: 'error' as const, error: data.error };
            }
            return step;
          }));
        }
      }
    } catch (error: any) {
      console.error('Execution error:', error);
      toast.error('Failed to execute chain');
    } finally {
      setExecuting(false);
    }
  };

  const handleRetry = async (stepId: string) => {
    // Implement retry logic for individual steps
    toast.info('Retry functionality coming soon!');
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-400" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStepColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      default:
        return 'bg-gray-50 dark:bg-neutral-800 border-gray-200 dark:border-neutral-700';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-gray-100">
              Execute Chain
            </h2>
            <p className="text-sm text-neutral-600 dark:text-gray-400 mt-1">
              {chainName}
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-600 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* API Key Selection */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <Key className="h-4 w-4" />
              API Key
            </label>
            <select
              value={selectedApiKey}
              onChange={(e) => setSelectedApiKey(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900"
              disabled={executing}
            >
              <option value="">Select an API key...</option>
              {apiKeys.map(key => (
                <option key={key.id} value={key.id}>
                  {key.name} ({key.provider})
                  {key.is_default && ' - Default'}
                </option>
              ))}
            </select>
          </div>

          {/* Input Variables */}
          {Object.keys(defaultInputs).length > 0 && (
            <div>
              <label className="text-sm font-medium text-neutral-700 dark:text-gray-300 mb-2 block">
                Input Variables
              </label>
              <div className="space-y-2">
                {Object.entries(defaultInputs).map(([key, value]) => (
                  <div key={key}>
                    <label className="text-xs text-neutral-500 dark:text-gray-500">
                      {key}
                    </label>
                    <Input
                      value={inputs[key] || ''}
                      onChange={(e) => setInputs({ ...inputs, [key]: e.target.value })}
                      placeholder={`Enter ${key}...`}
                      disabled={executing}
                      className="text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Advanced Options */}
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-neutral-600 dark:text-gray-400 hover:text-neutral-900 dark:hover:text-gray-200"
            >
              {showAdvanced ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <Settings className="h-4 w-4" />
              Advanced Options
            </button>

            {showAdvanced && (
              <div className="mt-3 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-neutral-700 dark:text-gray-300">
                    Stop on Error
                  </label>
                  <Switch
                    checked={options.stopOnError}
                    onCheckedChange={(checked) => 
                      setOptions({ ...options, stopOnError: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-neutral-700 dark:text-gray-300">
                    Dry Run (Simulate)
                  </label>
                  <Switch
                    checked={options.dryRun}
                    onCheckedChange={(checked) => 
                      setOptions({ ...options, dryRun: checked })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm text-neutral-700 dark:text-gray-300">
                    Max Parallel Steps
                  </label>
                  <Input
                    type="number"
                    value={options.maxParallel}
                    onChange={(e) => 
                      setOptions({ ...options, maxParallel: parseInt(e.target.value) })
                    }
                    min={1}
                    max={10}
                    className="mt-1 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm text-neutral-700 dark:text-gray-300">
                    Timeout (ms)
                  </label>
                  <Input
                    type="number"
                    value={options.timeout}
                    onChange={(e) => 
                      setOptions({ ...options, timeout: parseInt(e.target.value) })
                    }
                    min={1000}
                    step={1000}
                    className="mt-1 text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Execute Button */}
        <div className="mt-6">
          <Button
            onClick={handleExecute}
            disabled={executing || !selectedApiKey}
            className="w-full"
          >
            {executing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Execute Chain
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Execution Progress */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Statistics */}
        {(executing || executionId) && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3">
              <div className="flex items-center gap-2 text-neutral-600 dark:text-gray-400 text-xs mb-1">
                <CheckCircle className="h-3 w-3" />
                Completed
              </div>
              <p className="text-lg font-semibold text-neutral-900 dark:text-gray-100">
                {stats.completedSteps}/{stats.totalSteps}
              </p>
            </div>
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-xs mb-1">
                <AlertCircle className="h-3 w-3" />
                Failed
              </div>
              <p className="text-lg font-semibold text-neutral-900 dark:text-gray-100">
                {stats.failedSteps}
              </p>
            </div>
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs mb-1">
                <Zap className="h-3 w-3" />
                Tokens
              </div>
              <p className="text-lg font-semibold text-neutral-900 dark:text-gray-100">
                {stats.totalTokens.toLocaleString()}
              </p>
            </div>
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3">
              <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 text-xs mb-1">
                <DollarSign className="h-3 w-3" />
                Cost
              </div>
              <p className="text-lg font-semibold text-neutral-900 dark:text-gray-100">
                ${stats.totalCost.toFixed(4)}
              </p>
            </div>
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3">
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 text-xs mb-1">
                <Clock className="h-3 w-3" />
                Duration
              </div>
              <p className="text-lg font-semibold text-neutral-900 dark:text-gray-100">
                {(stats.totalDuration / 1000).toFixed(1)}s
              </p>
            </div>
          </div>
        )}

        {/* Step Progress */}
        <div className="space-y-3">
          {executionSteps.map((step, index) => (
            <div
              key={step.id}
              className={`rounded-lg border p-4 transition-all ${getStepColor(step.status)}`}
            >
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs text-neutral-500 dark:text-gray-500 font-mono">
                    {(index + 1).toString().padStart(2, '0')}
                  </span>
                  {getStepIcon(step.status)}
                  <span className="text-sm font-medium text-neutral-900 dark:text-gray-100">
                    {step.name}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  {step.duration > 0 && (
                    <span className="text-xs text-neutral-500 dark:text-gray-500">
                      {step.duration}ms
                    </span>
                  )}
                  {step.tokens > 0 && (
                    <span className="text-xs text-neutral-500 dark:text-gray-500">
                      {step.tokens} tokens
                    </span>
                  )}
                  {step.status === 'error' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRetry(step.id);
                      }}
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  )}
                  {expandedStep === step.id ? (
                    <ChevronDown className="h-4 w-4 text-neutral-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-neutral-400" />
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              {expandedStep === step.id && (
                <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                  {step.output && (
                    <div className="mb-3">
                      <h4 className="text-xs font-medium text-neutral-700 dark:text-gray-300 mb-2">
                        Output
                      </h4>
                      <pre className="p-3 bg-white dark:bg-neutral-900 rounded text-xs font-mono text-neutral-700 dark:text-gray-300 overflow-x-auto">
                        {typeof step.output === 'string' ? step.output : JSON.stringify(step.output, null, 2)}
                      </pre>
                    </div>
                  )}
                  {step.error && (
                    <div>
                      <h4 className="text-xs font-medium text-red-700 dark:text-red-300 mb-2">
                        Error
                      </h4>
                      <pre className="p-3 bg-red-50 dark:bg-red-900/20 rounded text-xs font-mono text-red-700 dark:text-red-300">
                        {step.error}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}