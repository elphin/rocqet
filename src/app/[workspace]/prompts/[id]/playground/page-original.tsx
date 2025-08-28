'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Play, Copy, Settings, Loader2, Sparkles, ChevronDown, ChevronRight, Info, Zap } from 'lucide-react';
import Link from 'next/link';

export default function TestPromptPage({
  params
}: {
  params: Promise<{ workspace: string; id: string }>
}) {
  const { workspace, id } = use(params);
  const [prompt, setPrompt] = useState<any>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showProviderInfo, setShowProviderInfo] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [model, setModel] = useState('gpt-4');
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Load prompt data
    const fetchPrompt = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/signin');
        return;
      }

      // Get workspace
      const { data: membership } = await supabase
        .from('workspace_members')
        .select(`
          workspace_id,
          workspaces!inner (
            id,
            slug
          )
        `)
        .eq('user_id', user.id)
        .eq('workspaces.slug', workspace)
        .limit(1)
        .single();
      
      if (!membership) {
        setError('Workspace not found');
        return;
      }
      
      // Get prompt
      const { data: prompt, error } = await supabase
        .from('prompts')
        .select('*')
        .eq('slug', id)
        .eq('workspace_id', membership.workspace_id)
        .single();
      
      if (prompt && !error) {
        setPrompt(prompt);
        
        // Initialize model and temperature
        setModel(prompt.model || 'gpt-4');
        setTemperature((prompt.temperature || 7) / 10);
        
        // Initialize variables with empty values
        const vars = prompt.variables as any[] || [];
        const initialVars: Record<string, string> = {};
        vars.forEach((v: any) => {
          initialVars[v.name] = v.defaultValue || '';
        });
        setVariables(initialVars);
      } else {
        setError('Prompt not found');
      }
    };
    
    fetchPrompt();
  }, [workspace, id, router]);

  const handleExecute = async () => {
    if (!prompt) return;
    
    setExecuting(true);
    setError(null);
    
    try {
      // Replace variables in content
      let processedContent = prompt.content;
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
        processedContent = processedContent.replace(regex, value);
      });
      
      // Call API to execute prompt
      const response = await fetch('/api/prompts/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt_id: prompt.id,
          workspace_id: prompt.workspace_id,
          content: processedContent,
          model: model,
          temperature: temperature,
          max_tokens: prompt.max_tokens,
          variables: variables
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to execute prompt');
      }
      
      const result = await response.json();
      setOutput(result.output || 'No output generated');
      
      // Update usage count
      await supabase
        .from('prompts')
        .update({ 
          usage_count: (prompt.usage_count || 0) + 1,
          last_used_at: new Date().toISOString()
        })
        .eq('id', prompt.id);
      
    } catch (err: any) {
      console.error('Error executing prompt:', err);
      setError(err.message || 'Failed to execute prompt');
    } finally {
      setExecuting(false);
    }
  };

  const getProcessedPrompt = () => {
    if (!prompt) return '';
    
    let processedContent = prompt.content;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      processedContent = processedContent.replace(regex, value || `{{${key}}}`);
    });
    return processedContent;
  };

  if (!prompt && !error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (error && !prompt) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link href={`/${workspace}/prompts`}>
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Prompts
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const promptVariables = prompt?.variables as any[] || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="border-b bg-white dark:bg-gray-800 dark:border-gray-700">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/${workspace}/prompts/${prompt?.slug}`}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Test Playground</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">{prompt?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => router.push(`/${workspace}/prompts/${prompt?.slug}`)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleExecute}
                disabled={executing}
              >
                {executing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Execute
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column - Variables & Prompt */}
          <div className="space-y-6">
            {/* Variables Input */}
            {promptVariables.length > 0 && (
              <div className="rounded-lg bg-white dark:bg-gray-800 p-6 shadow-sm">
                <h2 className="mb-4 text-sm font-medium text-gray-900 dark:text-white">Input Variables</h2>
                <div className="space-y-4">
                  {promptVariables.map((variable: any) => (
                    <div key={variable.name}>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {variable.name}
                        {variable.description && (
                          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                            ({variable.description})
                          </span>
                        )}
                      </label>
                      <Input
                        value={variables[variable.name] || ''}
                        onChange={(e) => setVariables({
                          ...variables,
                          [variable.name]: e.target.value
                        })}
                        placeholder={`Enter ${variable.name}...`}
                        className="w-full"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Prompt Preview */}
            <div className="rounded-lg bg-white dark:bg-gray-800 p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-medium text-gray-900 dark:text-white">Prompt Preview</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(getProcessedPrompt())}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <div className="rounded-lg bg-gray-50 dark:bg-gray-700 p-4">
                <pre className="whitespace-pre-wrap font-mono text-sm text-gray-700 dark:text-gray-300">
                  {getProcessedPrompt()}
                </pre>
              </div>
            </div>
          </div>

          {/* Right Column - Model Config & Output */}
          <div className="space-y-6">
            {/* Model Configuration - Compact Design */}
            <div className="rounded-lg bg-white dark:bg-gray-800 p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {model}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">•</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Temp: {temperature.toFixed(1)}
                  </span>
                  {prompt?.max_tokens && (
                    <>
                      <span className="text-xs text-gray-500 dark:text-gray-400">•</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Max: {prompt.max_tokens}
                      </span>
                    </>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700"
                >
                  {showAdvanced ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  <span className="ml-1">Advanced</span>
                </Button>
              </div>
              
              {showAdvanced && (
                <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-gray-600">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                        Model
                      </label>
                      <select 
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-2 py-1 text-sm bg-white dark:bg-gray-700 dark:text-white"
                      >
                        <option value="gpt-4">gpt-4</option>
                        <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                        <option value="claude-3-haiku">claude-3-haiku</option>
                        <option value="claude-3-sonnet">claude-3-sonnet</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                        Temperature
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={temperature}
                        onChange={(e) => setTemperature(parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        {temperature.toFixed(1)}
                      </div>
                    </div>
                  </div>
                  
                  {/* Collapsible Provider Info */}
                  <div className="pt-2">
                    <button
                      onClick={() => setShowProviderInfo(!showProviderInfo)}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                    >
                      <Info className="h-3 w-3" />
                      {showProviderInfo ? 'Hide' : 'Show'} available providers
                    </button>
                    {showProviderInfo && (
                      <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-md text-xs text-blue-800 dark:text-blue-200">
                        <div className="font-medium mb-1">Available Providers:</div>
                        <div className="space-y-1">
                          <div>• OpenAI (GPT-4, GPT-3.5)</div>
                          <div>• Anthropic (Claude-3 family)</div>
                          <div>• Google (Gemini Pro)</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Output */}
            <div className="rounded-lg bg-white dark:bg-gray-800 p-6 shadow-sm min-h-[400px]">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-medium text-gray-900 dark:text-white">Output</h2>
                {output && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(output)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                )}
              </div>
              
              {executing ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Sparkles className="h-8 w-8 text-blue-500 animate-pulse mb-4" />
                  <p className="text-sm text-gray-500">Generating response...</p>
                </div>
              ) : output ? (
                <div className="rounded-lg bg-gray-50 dark:bg-gray-700 p-4">
                  <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 dark:text-gray-200">
                    {output}
                  </pre>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
                  <Play className="h-12 w-12 mb-4" />
                  <p className="text-sm">Execute the prompt to see output</p>
                </div>
              )}
              
              {error && (
                <div className="mt-4 rounded-lg bg-red-50 dark:bg-red-900/30 p-4">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}