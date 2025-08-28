'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Play, 
  Edit, 
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Copy,
  Download,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface ChainRunnerProps {
  chain: any;
  prompts: any[];
  runs: any[];
  workspaceSlug: string;
}

export function ChainRunner({ 
  chain, 
  prompts, 
  runs,
  workspaceSlug 
}: ChainRunnerProps) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [stepResults, setStepResults] = useState<Record<number, any>>({});
  const [initialVariables, setInitialVariables] = useState<Record<string, string>>({});
  const [expandedRun, setExpandedRun] = useState<string | null>(null);

  // Extract all unique variables from first step
  const firstStep = chain.steps[0];
  const firstPrompt = firstStep ? prompts.find(p => p.id === firstStep.promptId) : null;
  
  // Extract variables from prompt content
  const extractVariables = (content: string): string[] => {
    if (!content) {
      console.warn('No content provided to extractVariables');
      return [];
    }
    
    // More flexible regex that handles:
    // - Letters, numbers, underscores, hyphens
    // - Spaces around the variable name
    // - Case insensitive
    const regex = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_\-]*)\s*\}\}/gi;
    const matches = new Set<string>();
    let match;
    while ((match = regex.exec(content)) !== null) {
      // Store the original case of the variable
      matches.add(match[1]);
    }
    
    const variables = Array.from(matches);
    console.log('Detected variables in first prompt:', variables);
    return variables;
  };
  
  const requiredVariables = firstPrompt?.content 
    ? extractVariables(firstPrompt.content)
    : (firstPrompt?.variables ? Object.keys(firstPrompt.variables) : []);

  // Initialize empty state for detected variables - REMOVED useEffect to prevent loop
  // The initial state is handled directly in the textarea

  // Only log once on mount, not on every render
  useEffect(() => {
    console.log('Chain Runner Mounted:', {
      firstPromptContent: firstPrompt?.content?.substring(0, 200),
      detectedVariables: requiredVariables,
      chainId: chain.id
    });
  }, []); // Empty dependency array = only on mount

  const runChain = async () => {
    // Validate initial variables
    console.log('Checking variables:', {
      required: requiredVariables,
      provided: initialVariables,
      keys: Object.keys(initialVariables)
    });
    
    const missingVars = requiredVariables.filter(v => !initialVariables[v]?.trim());
    if (missingVars.length > 0) {
      toast.error(`Please provide values for: ${missingVars.join(', ')}`);
      return;
    }

    setRunning(true);
    setStepResults({});
    setCurrentStep(0);

    const supabase = createClient();
    const startTime = Date.now();
    let runRecord: any = null;
    const allStepResults: any[] = [];
    let totalTokens = 0;
    let totalCost = 0;
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Create chain run record
      const { data: runData, error: runError } = await supabase
        .from('prompt_chain_runs')
        .insert({
          chain_id: chain.id,
          workspace_id: chain.workspace_id,
          status: 'running',
          executed_at: new Date().toISOString(),
          executed_by: user?.id || null,
          inputs: initialVariables,
          outputs: {},
          step_results: [],
          total_tokens: 0,
          total_cost: 0,
          execution_time: 0
        })
        .select()
        .single();

      if (runError) throw runError;
      runRecord = runData;

      let previousOutput = null;

      // Execute each step
      for (let i = 0; i < chain.steps.length; i++) {
        setCurrentStep(i);
        const step = chain.steps[i];
        const prompt = prompts.find(p => p.id === step.promptId);
        
        if (!prompt) {
          throw new Error(`Prompt not found for step ${i + 1}`);
        }

        // Prepare variables for this step
        const stepVariables: Record<string, any> = {};
        
        // Extract variables from the prompt content itself
        const promptVars = extractVariables(prompt.content || '');
        
        // For the first step, use initial variables
        if (i === 0) {
          // Map all initial variables to step variables
          promptVars.forEach(varName => {
            if (initialVariables[varName]) {
              stepVariables[varName] = initialVariables[varName];
            }
          });
        } else {
          // For subsequent steps, check for variable mapping or use previousOutput
          promptVars.forEach(varName => {
            const mapping = step.variableMapping?.[varName];
            
            // Check various output variable patterns
            const lowerVarName = varName.toLowerCase();
            
            if (mapping) {
              // Check if it's a reference to previous step output
              if (mapping.includes('{{') && mapping.includes('}}')) {
                if (mapping.includes('previousOutput')) {
                  stepVariables[varName] = previousOutput;
                } else if (mapping.includes('input.')) {
                  const inputVar = mapping.replace('{{input.', '').replace('}}', '');
                  stepVariables[varName] = initialVariables[inputVar];
                }
              } else {
                stepVariables[varName] = mapping;
              }
            } else if (
              // Match common output variable patterns (case insensitive)
              lowerVarName === 'previousoutput' || 
              lowerVarName === 'output' ||
              lowerVarName.startsWith('output_p') || // output_p1, output_p2, etc.
              lowerVarName.startsWith('output_step') || // output_step1, etc.
              lowerVarName === 'result' ||
              lowerVarName === 'previous'
            ) {
              // Map to previous step output
              stepVariables[varName] = previousOutput;
              console.log(`Step ${i + 1}: Mapping ${varName} to previousOutput`);
            }
          });
        }

        // Prepare the prompt content with variables filled in
        let filledContent = prompt.content || '';
        
        // Only log for debugging the first step
        if (i === 0) {
          console.log(`Step 1 Debug:`, {
            hasPromptContent: !!prompt.content,
            promptContentLength: prompt.content?.length,
            stepVariables,
            stepVariableKeys: Object.keys(stepVariables || {}),
            stepVariableValues: Object.values(stepVariables || {}).map(v => 
              v ? `${String(v).substring(0, 30)}...` : 'empty'
            )
          });
        }
        
        if (stepVariables && Object.keys(stepVariables).length > 0) {
          // Replace variables in the prompt content
          Object.entries(stepVariables).forEach(([key, value]) => {
            // Try both uppercase and lowercase versions
            const patterns = [
              `\\{\\{\\s*${key}\\s*\\}\\}`, // {{input}}
              `\\{\\{\\s*${key.toUpperCase()}\\s*\\}\\}`, // {{INPUT}}
              `\\{\\{\\s*${key.toLowerCase()}\\s*\\}\\}` // {{input}}
            ];
            
            patterns.forEach(pattern => {
              const regex = new RegExp(pattern, 'gi'); // Case insensitive
              const matches = filledContent.match(regex);
              if (matches && i === 0) {
                console.log(`Found ${matches.length} instances of pattern ${pattern} to replace with "${String(value).substring(0, 50)}..."`);
              }
              filledContent = filledContent.replace(regex, String(value || ''));
            });
          });
        }
        
        if (i === 0) {
          // Check if any variables are still unreplaced
          const remainingVars = filledContent.match(/\{\{[^}]+\}\}/g);
          if (remainingVars) {
            console.warn(`WARNING: Unreplaced variables found:`, remainingVars);
          }
          
          console.log(`Step 1 After Replacement:`, {
            finalContentPreview: filledContent.substring(0, 400)
          });
        }

        // Ensure temperature is a valid number between 0 and 2
        let temperature = parseFloat(prompt.temperature || prompt.default_temperature || '0.7');
        if (isNaN(temperature) || temperature < 0 || temperature > 2) {
          console.warn(`Invalid temperature ${temperature}, using default 0.7`);
          temperature = 0.7;
        }
        
        // Ensure max_tokens is a valid integer
        let maxTokens = parseInt(prompt.max_tokens || prompt.default_max_tokens || '2000', 10);
        if (isNaN(maxTokens) || maxTokens < 1) {
          maxTokens = 2000;
        }

        console.log(`Executing step ${i + 1}:`, {
          promptId: prompt.id,
          promptName: prompt.name,
          provider: prompt.default_provider || 'openai',
          model: prompt.model || 'gpt-4-turbo-preview',
          temperature,
          maxTokens,
          variables: Object.keys(stepVariables || {})
        });

        // Execute the prompt
        const requestBody = {
          prompt_id: prompt.id,  // Changed from promptId to prompt_id
          content: filledContent, // Send the filled content
          workspace_id: chain.workspace_id, // Add workspace_id so API can find the keys
          variables: stepVariables,
          provider: prompt.default_provider || 'openai', // Use default_provider from prompt
          model: prompt.model || 'gpt-4-turbo-preview', // Use model from prompt
          temperature: temperature,
          max_tokens: maxTokens
        };
        
        console.log('Sending request body:', {
          ...requestBody,
          content: requestBody.content.substring(0, 100) + '...'
        });
        
        const response = await fetch('/api/prompts/execute', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error(`Step ${i + 1} failed:`, errorData);
          throw new Error(errorData.error || errorData.message || `Step ${i + 1} failed`);
        }

        const result = await response.json();
        previousOutput = result.output;
        
        // Track tokens and cost if available
        if (result.usage) {
          totalTokens += (result.usage.total_tokens || 0);
          if (result.usage.cost) {
            totalCost += Math.round(result.usage.cost * 100); // Convert to cents
          }
        }
        
        const stepResult = {
          stepIndex: i,
          promptId: prompt.id,
          promptName: prompt.name,
          input: stepVariables,
          output: result.output,
          tokens: result.usage?.total_tokens || 0,
          cost: result.usage?.cost || 0,
          executedAt: new Date().toISOString()
        };
        
        allStepResults.push(stepResult);
        setStepResults(prev => ({ ...prev, [i]: result.output }));
      }

      // Update chain run record with final results
      const executionTime = Date.now() - startTime;
      const { error: updateError } = await supabase
        .from('prompt_chain_runs')
        .update({
          status: 'completed',
          outputs: { finalOutput: previousOutput },
          step_results: allStepResults,
          total_tokens: totalTokens,
          total_cost: totalCost,
          execution_time: executionTime
        })
        .eq('id', runRecord.id);
      
      if (updateError) {
        console.error('Failed to update chain run record:', updateError);
      }
      
      // Also update the chain's run count and last run time
      await supabase
        .from('prompt_chains')
        .update({
          run_count: (chain.run_count || 0) + 1,
          last_run_at: new Date().toISOString()
        })
        .eq('id', chain.id);

      toast.success('Chain executed successfully!');
      router.refresh();
    } catch (error: any) {
      console.error('Chain execution error:', error);
      toast.error(error.message || 'Failed to execute chain');
      
      // Update run record with error status
      if (runRecord?.id) {
        const executionTime = Date.now() - startTime;
        await supabase
          .from('prompt_chain_runs')
          .update({
            status: 'failed',
            error: error.message || 'Unknown error',
            failed_at_step: currentStep !== null ? currentStep + 1 : null,
            execution_time: executionTime,
            step_results: allStepResults
          })
          .eq('id', runRecord.id);
      }
    } finally {
      setRunning(false);
      setCurrentStep(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {chain.name}
            </h1>
            {chain.description && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {chain.description}
              </p>
            )}
          </div>
          <Link href={`/${workspaceSlug}/chains/${chain.id}/edit`}>
            <Button variant="outline">
              <Edit className="w-4 h-4 mr-2" />
              Edit Chain
            </Button>
          </Link>
        </div>

        {/* Chain Steps Visualization */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-800 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Chain Steps
          </h2>
          
          <div className="space-y-3">
            {chain.steps.map((step: any, index: number) => {
              const prompt = prompts.find(p => p.id === step.promptId);
              const isActive = currentStep === index;
              const hasResult = stepResults[index] !== undefined;
              
              return (
                <div key={index} className="flex items-center gap-3">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    isActive ? 'bg-blue-500 text-white animate-pulse' :
                    hasResult ? 'bg-green-500 text-white' :
                    'bg-gray-200 dark:bg-neutral-700 text-gray-600 dark:text-gray-400'
                  }`}>
                    {isActive ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : hasResult ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {prompt?.name || 'Unknown Prompt'}
                    </div>
                    {prompt?.description && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {prompt.description}
                      </div>
                    )}
                  </div>
                  
                  {index < chain.steps.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Run Interface */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-800 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Run Chain
          </h2>
          
          {requiredVariables.length > 0 ? (
            <div className="space-y-4 mb-6">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Input Variables for "{firstPrompt?.name || 'First Step'}"
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Found {requiredVariables.length} variable{requiredVariables.length !== 1 ? 's' : ''} in the first prompt. 
                  Fill in the values below to run the chain.
                </p>
              </div>
              {requiredVariables.map(varName => (
                <div key={varName}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <span className="font-semibold">
                      {varName.charAt(0).toUpperCase() + varName.slice(1).replace(/_/g, ' ')}
                    </span>
                    <span className="ml-2 text-xs text-gray-500 font-normal">
                      {`{{${varName}}}`}
                    </span>
                  </label>
                  <textarea
                    value={initialVariables[varName] || ''}
                    onChange={(e) => setInitialVariables(prev => ({
                      ...prev,
                      [varName]: e.target.value
                    }))}
                    placeholder={`Enter value for {{${varName}}}...`}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    disabled={running}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="mb-6">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      No Input Variables Detected
                    </p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                      The first prompt in this chain doesn't have any defined variables. 
                      Add variables like {`{{input}}`} or {`{{query}}`} to your first prompt to accept input.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  General Input (Optional)
                  <span className="ml-2 text-xs text-gray-500">
                    This will be available as {`{{input}}`} in your prompts
                  </span>
                </label>
                <textarea
                  value={initialVariables['input'] || ''}
                  onChange={(e) => setInitialVariables(prev => ({
                    ...prev,
                    input: e.target.value
                  }))}
                  placeholder="Enter any input text for the chain..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 resize-none"
                  rows={3}
                  disabled={running}
                />
              </div>
            </div>
          )}
          
          <Button
            variant="success"
            onClick={runChain}
            disabled={running}
          >
            {running ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running Step {(currentStep ?? 0) + 1} of {chain.steps.length}...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run Chain
              </>
            )}
          </Button>
        </div>

        {/* Results */}
        {Object.keys(stepResults).length > 0 && (
          <div className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-800 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Results
            </h2>
            
            <div className="space-y-4">
              {Object.entries(stepResults).map(([stepIndex, result]) => {
                const step = chain.steps[parseInt(stepIndex)];
                const prompt = prompts.find(p => p.id === step.promptId);
                
                return (
                  <div key={stepIndex} className="border-l-2 border-green-500 pl-4">
                    <div className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Step {parseInt(stepIndex) + 1}: {prompt?.name}
                    </div>
                    <div className="bg-gray-50 dark:bg-neutral-800 rounded p-3 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {result}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Run History */}
        {runs.length > 0 && (
          <div className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-800 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Recent Runs
            </h2>
            
            <div className="space-y-3">
              {runs.map((run) => (
                <div 
                  key={run.id}
                  className="border border-gray-200 dark:border-neutral-700 rounded-lg p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-800"
                  onClick={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {run.status === 'completed' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : run.status === 'failed' ? (
                        <XCircle className="w-5 h-5 text-red-500" />
                      ) : (
                        <Clock className="w-5 h-5 text-yellow-500" />
                      )}
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {formatDistanceToNow(new Date(run.started_at), { addSuffix: true })}
                      </span>
                    </div>
                    
                    <span className={`text-xs px-2 py-1 rounded ${
                      run.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      run.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}>
                      {run.status}
                    </span>
                  </div>
                  
                  {expandedRun === run.id && run.output && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-neutral-700">
                      <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {run.output}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}