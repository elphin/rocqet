'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, Play, Copy, Loader2, Sparkles, ChevronDown, ChevronRight, 
  Info, Zap, Save, GitCompare, Edit3, Check, X, Trash2 
} from 'lucide-react';
import Link from 'next/link';

interface PlaygroundOutput {
  id: string;
  content: string;
  output: string;
  timestamp: Date;
  model: string;
  temperature: number;
}

export default function EnhancedTestPromptPage({
  params
}: {
  params: Promise<{ workspace: string; id: string }>
}) {
  const { workspace, id } = use(params);
  const [prompt, setPrompt] = useState<any>(null);
  const [editableContent, setEditableContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [outputs, setOutputs] = useState<PlaygroundOutput[]>([]);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [model, setModel] = useState('gpt-4');
  const [compareMode, setCompareMode] = useState(false);
  const [selectedOutputs, setSelectedOutputs] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [savingVersion, setSavingVersion] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchPrompt = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/signin');
        return;
      }

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
      
      const { data: prompt, error } = await supabase
        .from('prompts')
        .select('*')
        .eq('slug', id)
        .eq('workspace_id', membership.workspace_id)
        .single();
      
      if (prompt && !error) {
        setPrompt(prompt);
        setEditableContent(prompt.content || '');
        setModel(prompt.model || 'gpt-4');
        setTemperature((prompt.temperature || 7) / 10);
        
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

  useEffect(() => {
    if (prompt) {
      setHasChanges(editableContent !== prompt.content);
    }
  }, [editableContent, prompt]);

  const handleExecute = async () => {
    if (!prompt) return;
    
    setExecuting(true);
    setError(null);
    
    try {
      let processedContent = editableContent;
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`\\\\{\\\\{\\\\s*${key}\\\\s*\\\\}\\\\}`, 'g');
        processedContent = processedContent.replace(regex, value);
      });
      
      const response = await fetch('/api/prompts/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      
      const newOutput: PlaygroundOutput = {
        id: Date.now().toString(),
        content: editableContent,
        output: result.output || 'No output generated',
        timestamp: new Date(),
        model: model,
        temperature: temperature
      };
      
      setOutputs(prev => [newOutput, ...prev].slice(0, 20));
      
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

  const handleSaveAsVersion = async () => {
    if (!hasChanges) return;
    
    setSavingVersion(true);
    try {
      const { error: versionError } = await supabase
        .from('prompt_versions')
        .insert({
          prompt_id: prompt.id,
          content: editableContent,
          version_tag: `v${Date.now()}`,
          changes_summary: 'Updated via test playground'
        });

      if (versionError) throw versionError;

      const { error: updateError } = await supabase
        .from('prompts')
        .update({ 
          content: editableContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', prompt.id);
        
      if (updateError) throw updateError;
      
      setPrompt({...prompt, content: editableContent});
      setHasChanges(false);
      setError(null);
    } catch (err: any) {
      console.error('Error saving version:', err);
      setError('Failed to save version');
    } finally {
      setSavingVersion(false);
    }
  };

  const toggleOutputSelection = (outputId: string) => {
    setSelectedOutputs(prev => {
      if (prev.includes(outputId)) {
        return prev.filter(id => id !== outputId);
      }
      if (prev.length >= 2) {
        return [prev[1], outputId];
      }
      return [...prev, outputId];
    });
  };

  const clearOutputHistory = () => {
    setOutputs([]);
    setSelectedOutputs([]);
    setCompareMode(false);
  };

  const getProcessedPrompt = () => {
    let processedContent = editableContent;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\\\{\\\\{\\\\s*${key}\\\\s*\\\\}\\\\}`, 'g');
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

  const detectedVars = editableContent.match(/\\{\\{([^}]+)\\}\\}/g)?.map(v => v.slice(2, -2).trim()) || [];

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
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {prompt?.name} 
                  {hasChanges && <span className="ml-2 text-amber-600">(modified)</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {outputs.length > 1 && (
                <Button
                  variant={compareMode ? "default" : "outline"}
                  onClick={() => setCompareMode(!compareMode)}
                >
                  <GitCompare className="mr-2 h-4 w-4" />
                  Compare
                </Button>
              )}
              {hasChanges && (
                <Button
                  variant="outline"
                  onClick={handleSaveAsVersion}
                  disabled={savingVersion}
                >
                  {savingVersion ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Version
                    </>
                  )}
                </Button>
              )}
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
          {/* Left Column - Prompt Editor & Variables */}
          <div className="space-y-6">
            {/* Editable Prompt */}
            <div className="rounded-lg bg-white dark:bg-gray-800 p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-medium text-gray-900 dark:text-white">
                  Prompt Editor
                </h2>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
                >
                  {isEditing ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Save Changes
                    </>
                  ) : (
                    <>
                      <Edit3 className="h-3.5 w-3.5" />
                      Edit Prompt
                    </>
                  )}
                </button>
              </div>
              
              {isEditing ? (
                <textarea
                  value={editableContent}
                  onChange={(e) => setEditableContent(e.target.value)}
                  className="w-full min-h-[300px] p-4 font-mono text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your prompt..."
                />
              ) : (
                <div className="relative group">
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-700 p-4 min-h-[300px]">
                    <pre className="whitespace-pre-wrap font-mono text-sm text-gray-700 dark:text-gray-300">
                      {getProcessedPrompt()}
                    </pre>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(getProcessedPrompt())}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            {/* Variables */}
            {detectedVars.length > 0 && (
              <div className="rounded-lg bg-white dark:bg-gray-800 p-6 shadow-sm">
                <h2 className="mb-4 text-sm font-medium text-gray-900 dark:text-white">
                  Variables ({detectedVars.length})
                </h2>
                <div className="space-y-4">
                  {detectedVars.map((varName) => (
                    <div key={varName}>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {varName}
                      </label>
                      <Input
                        value={variables[varName] || ''}
                        onChange={(e) => setVariables({
                          ...variables,
                          [varName]: e.target.value
                        })}
                        placeholder={`Enter ${varName}...`}
                        className="w-full"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Model Config & Outputs */}
          <div className="space-y-6">
            {/* Model Configuration */}
            <div className="rounded-lg bg-white dark:bg-gray-800 p-4 shadow-sm">
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
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="h-6 px-2 text-xs"
                >
                  {showAdvanced ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  <span className="ml-1">Settings</span>
                </Button>
              </div>
              
              {showAdvanced && (
                <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-gray-600">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                        Model
                      </label>
                      <select 
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-2 py-1 text-sm bg-white dark:bg-gray-700"
                      >
                        <option value="gpt-4">GPT-4</option>
                        <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                        <option value="claude-3-haiku">Claude 3 Haiku</option>
                        <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                        Temperature: {temperature.toFixed(1)}
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
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Outputs */}
            <div className="rounded-lg bg-white dark:bg-gray-800 p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-medium text-gray-900 dark:text-white">
                  Output History ({outputs.length})
                </h2>
                {outputs.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearOutputHistory}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
              
              {outputs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
                  <Play className="h-12 w-12 mb-4" />
                  <p className="text-sm">Execute the prompt to see output</p>
                </div>
              ) : compareMode && selectedOutputs.length === 2 ? (
                /* Comparison View */
                <div className="grid grid-cols-2 gap-4">
                  {selectedOutputs.map(outputId => {
                    const output = outputs.find(o => o.id === outputId);
                    if (!output) return null;
                    
                    return (
                      <div key={outputId} className="border border-blue-500 rounded-lg">
                        <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
                          <div className="text-xs font-medium">
                            {output.model} • {output.temperature.toFixed(1)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(output.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                        <div className="p-3 max-h-64 overflow-y-auto">
                          <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                            {output.output}
                          </pre>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Regular Output List */
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {outputs.map((output, index) => (
                    <div 
                      key={output.id}
                      className={`rounded-lg border ${
                        compareMode && selectedOutputs.includes(output.id)
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                          {compareMode && (
                            <input
                              type="checkbox"
                              checked={selectedOutputs.includes(output.id)}
                              onChange={() => toggleOutputSelection(output.id)}
                              className="h-4 w-4"
                            />
                          )}
                          <span className="text-xs font-medium">
                            Run {outputs.length - index}
                          </span>
                          <span className="text-xs text-gray-500">
                            {output.model} • {output.temperature.toFixed(1)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            {new Date(output.timestamp).toLocaleTimeString()}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(output.output);
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="p-3">
                        <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                          {output.output}
                        </pre>
                      </div>
                    </div>
                  ))}
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