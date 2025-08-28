'use client';

import { useState, useEffect, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, Play, Copy, Loader2, ChevronDown, ChevronRight, 
  Zap, Save, GitCompare, Trash2, Variable, Settings2, Sliders,
  Settings, FileText, Package2
} from 'lucide-react';
import Link from 'next/link';
import { toast } from '@/lib/toast-config';
import { createVariableColorMap } from '@/lib/utils/variable-colors';
import { AI_PROVIDERS, type AIProvider } from '@/lib/utils/ai-providers';
import { PromptComparisonModal } from '@/components/prompt-comparison-modal';
import { parseVariables, extractDefaults, replaceVariables } from '@/lib/utils/variable-parser';

interface PlaygroundOutput {
  id: string;
  prompt_id?: string;
  content: string;
  input?: any;
  output: string;
  timestamp: Date;
  model: string;
  temperature: number;
  parameters?: any;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  latency_ms?: number;
  cost?: number;
  status?: string;
  executed_at?: string;
}

export default function ImprovedTestPromptPage({
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
  const [showVariables, setShowVariables] = useState(true);
  const [provider, setProvider] = useState<AIProvider>('openai');
  const [model, setModel] = useState('gpt-4');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2000);
  const [topP, setTopP] = useState(1);
  const [frequencyPenalty, setFrequencyPenalty] = useState(0);
  const [presencePenalty, setPresencePenalty] = useState(0);
  const [topK, setTopK] = useState(40);
  const [showExtraSettings, setShowExtraSettings] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedOutputs, setSelectedOutputs] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [savingVersion, setSavingVersion] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSavedContent, setLastSavedContent] = useState('');
  const [showProcessedPreview, setShowProcessedPreview] = useState(true);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [runHistory, setRunHistory] = useState<any[]>([]);
  
  const editorRef = useRef<HTMLTextAreaElement>(null);
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
        const content = prompt.content || '';
        setEditableContent(content);
        setLastSavedContent(content);
        
        // Load saved settings
        setModel(prompt.model || 'gpt-4');
        setTemperature((prompt.temperature || 7) / 10);
        setMaxTokens(prompt.default_max_tokens || 2000);
        
        // Set provider based on model
        if (prompt.model?.includes('claude')) {
          setProvider('anthropic');
        } else if (prompt.model?.includes('gemini')) {
          setProvider('google');
        } else {
          setProvider(prompt.default_provider || 'openai');
        }
        
        // Load advanced settings if available
        if (prompt.default_top_p !== undefined && prompt.default_top_p !== null) {
          setTopP(prompt.default_top_p / 10);
        }
        if (prompt.default_frequency_penalty !== undefined && prompt.default_frequency_penalty !== null) {
          setFrequencyPenalty(prompt.default_frequency_penalty / 10);
        }
        if (prompt.default_presence_penalty !== undefined && prompt.default_presence_penalty !== null) {
          setPresencePenalty(prompt.default_presence_penalty / 10);
        }
        
        // Parse variables and their defaults from content
        const parsedVars = parseVariables(content);
        const defaults = extractDefaults(parsedVars);
        setVariables(defaults);
      } else {
        setError('Prompt not found');
      }
    };
    
    fetchPrompt();
  }, [workspace, id, router]);

  // Load run history for comparison
  useEffect(() => {
    const loadRunHistory = async () => {
      if (!prompt?.id) return;
      
      try {
        const { data } = await supabase
          .from('prompt_runs')
          .select('*')
          .eq('prompt_id', prompt.id)
          .order('executed_at', { ascending: false })
          .limit(20);
        
        if (data) {
          setRunHistory(data);
        }
      } catch (error) {
        console.error('Error loading run history:', error);
      }
    };

    loadRunHistory();
  }, [prompt?.id, supabase]);

  useEffect(() => {
    if (prompt) {
      setHasChanges(editableContent !== lastSavedContent);
    }
  }, [editableContent, lastSavedContent, prompt]);

  // Add keyboard shortcut for Execute (Cmd/Ctrl + Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !executing && prompt) {
        e.preventDefault();
        handleExecute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [executing, prompt]);

  // Parse variables from editable content
  const parsedVariables = parseVariables(editableContent);
  const detectedVars = parsedVariables.map(v => v.name);
  const variableColorMap = createVariableColorMap(detectedVars);

  // Auto-save on blur (soft save to local state)
  const handleBlur = async () => {
    setIsEditing(false);
    
    if (hasChanges && prompt) {
      setAutoSaving(true);
      try {
        // Soft save - just update the prompt in memory, not database
        setLastSavedContent(editableContent);
        toast.success('Changes saved locally', { duration: 2000 });
      } catch (err) {
        console.error('Error auto-saving:', err);
      } finally {
        setAutoSaving(false);
      }
    }
  };

  const handlePromptClick = () => {
    setIsEditing(true);
    setTimeout(() => {
      editorRef.current?.focus();
    }, 0);
  };

  const handleExecute = async () => {
    if (!prompt) return;
    
    setExecuting(true);
    setError(null);
    
    try {
      // Process the content with variable replacements (handles defaults too)
      const processedContent = replaceVariables(editableContent, variables);
      
      console.log('Executing with processed content:', processedContent);
      
      const response = await fetch('/api/prompts/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt_id: prompt.id,
          workspace_id: prompt.workspace_id,
          content: processedContent,
          model: model,
          provider: provider,
          temperature: temperature,
          max_tokens: maxTokens,
          variables: variables,
          // Advanced settings
          top_p: topP,
          frequency_penalty: frequencyPenalty,
          presence_penalty: presencePenalty,
          top_k: topK
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to execute prompt');
      }
      
      const result = await response.json();
      
      const newOutput: PlaygroundOutput = {
        id: Date.now().toString(),
        prompt_id: prompt.id,
        content: editableContent,
        input: { prompt_content: editableContent, variables },
        output: result.output || 'No output generated',
        timestamp: new Date(),
        model: model,
        temperature: temperature,
        parameters: {
          temperature,
          max_tokens: maxTokens,
          top_p: topP,
          frequency_penalty: frequencyPenalty,
          presence_penalty: presencePenalty
        },
        prompt_tokens: result.prompt_tokens,
        completion_tokens: result.completion_tokens,
        total_tokens: result.total_tokens,
        latency_ms: result.latency_ms,
        cost: result.cost,
        status: 'success',
        executed_at: new Date().toISOString()
      };
      
      setOutputs(prev => [newOutput, ...prev].slice(0, 20));
      toast.success('Executed successfully');
      
      // Also reload run history to include the new run from database
      const { data: updatedRuns } = await supabase
        .from('prompt_runs')
        .select('*')
        .eq('prompt_id', prompt.id)
        .order('executed_at', { ascending: false })
        .limit(20);
      
      if (updatedRuns) {
        setRunHistory(updatedRuns);
      }
      
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
      toast.error(err.message || 'Failed to execute prompt');
    } finally {
      setExecuting(false);
    }
  };

  const handleSaveAsVersion = async () => {
    if (!hasChanges) {
      toast.info('No changes to save');
      return;
    }
    
    setSavingVersion(true);
    try {
      const { error: versionError } = await supabase
        .from('prompt_versions')
        .insert({
          prompt_id: prompt.id,
          content: editableContent,
          version_tag: `v${Date.now()}`,
          changes_summary: 'Updated via playground'
        });

      if (versionError) throw versionError;

      const { data: updatedPrompt, error: updateError } = await supabase
        .from('prompts')
        .update({ 
          content: editableContent,
          updated_at: new Date().toISOString(),
          updated_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', prompt.id)
        .select()
        .single();
        
      if (updateError) throw updateError;
      
      setPrompt(updatedPrompt);
      setLastSavedContent(editableContent);
      setHasChanges(false);
      toast.success('Content saved as new version');
    } catch (err: any) {
      console.error('Error saving version:', err);
      toast.error('Failed to save version');
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

  // Apply settings from a run
  const handleApplySettings = async (run: any) => {
    try {
      const response = await fetch(`/api/prompts/${prompt.id}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: run.model?.includes('claude') ? 'anthropic' : 
                   run.model?.includes('gemini') ? 'google' : 'openai',
          model: run.model,
          temperature: run.parameters?.temperature || temperature,
          maxTokens: run.parameters?.max_tokens,
          topP: run.parameters?.top_p,
          frequencyPenalty: run.parameters?.frequency_penalty,
          presencePenalty: run.parameters?.presence_penalty
        })
      });

      if (!response.ok) throw new Error('Failed to apply settings');
      
      const result = await response.json();
      
      // Update local state
      setModel(run.model);
      setTemperature(run.parameters?.temperature || temperature);
      setMaxTokens(run.parameters?.max_tokens || maxTokens);
      if (run.parameters?.top_p !== undefined) setTopP(run.parameters.top_p);
      if (run.parameters?.frequency_penalty !== undefined) setFrequencyPenalty(run.parameters.frequency_penalty);
      if (run.parameters?.presence_penalty !== undefined) setPresencePenalty(run.parameters.presence_penalty);
      
      // Update provider based on model
      if (run.model?.includes('claude')) setProvider('anthropic');
      else if (run.model?.includes('gemini')) setProvider('google');
      else setProvider('openai');
      
      // Update prompt object to reflect saved settings
      if (result.data) {
        setPrompt({...prompt, ...result.data});
      }
      
      toast.success('Settings applied and saved successfully');
    } catch (error) {
      toast.error('Failed to apply settings');
      throw error;
    }
  };

  // Apply content from a run
  const handleApplyContent = async (run: any) => {
    try {
      const content = run.input?.prompt_content || run.input?.content;
      if (!content) {
        toast.error('No content found in this run');
        return;
      }

      // Update local content
      setEditableContent(content);
      setHasChanges(true);
      
      // Save as new version
      await handleSaveAsVersion();
      
      toast.success('Content applied and saved as new version');
    } catch (error) {
      toast.error('Failed to apply content');
      throw error;
    }
  };

  // Apply both settings and content
  const handleApplyBoth = async (run: any) => {
    try {
      await handleApplySettings(run);
      await handleApplyContent(run);
    } catch (error) {
      // Errors already handled in individual functions
    }
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
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Playground</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {prompt?.name} 
                  {hasChanges && <span className="ml-2 text-amber-600">(modified)</span>}
                  {autoSaving && <span className="ml-2 text-blue-600">Auto-saving...</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
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
                      Save as Version
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column - Prompt Editor & Variables */}
          <div className="space-y-6">
            {/* Variables Input - MOVED TO TOP */}
            {detectedVars.length > 0 && (
              <div className="rounded-lg bg-white dark:bg-gray-800 p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowVariables(!showVariables)}
                  className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white mb-4 w-full"
                >
                  {showVariables ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <Variable className="h-4 w-4 text-purple-500" />
                  Variables ({detectedVars.length})
                </button>
                
                {showVariables && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {parsedVariables.map((variable, index) => {
                      const varName = variable.name;
                      const defaultValue = variable.defaultValue;
                      const color = variableColorMap[varName];
                      // Define inline colors for stronger visibility
                      const borderColors = [
                        '#3b82f6', // blue
                        '#a855f7', // purple
                        '#10b981', // green
                        '#f59e0b', // amber
                        '#ec4899', // pink
                        '#06b6d4', // cyan
                        '#f97316', // orange
                        '#14b8a6'  // teal
                      ];
                      const borderColor = borderColors[index % borderColors.length];
                      
                      return (
                        <div key={varName}>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {varName}
                            {defaultValue && (
                              <span className="ml-2 text-xs text-gray-500">
                                (default: {defaultValue})
                              </span>
                            )}
                          </label>
                          <input
                            value={variables[varName] || ''}
                            onChange={(e) => setVariables({
                              ...variables,
                              [varName]: e.target.value
                            })}
                            placeholder={defaultValue || `Enter ${varName}...`}
                            className="w-full px-3 py-2 text-sm rounded-md border-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 transition-all"
                            style={{
                              borderColor: borderColor,
                              outlineColor: borderColor
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = borderColor;
                              e.target.style.boxShadow = `0 0 0 3px ${borderColor}33`;
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = borderColor;
                              e.target.style.boxShadow = 'none';
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Click-to-Edit Prompt Editor */}
            <div className="rounded-lg bg-white dark:bg-gray-800 p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-medium text-gray-900 dark:text-white">
                  Prompt Editor
                  {isEditing && (
                    <span className="ml-2 text-xs text-blue-600">
                      (Editing - click outside to save)
                    </span>
                  )}
                </h2>
                <div className="flex items-center gap-3">
                  {detectedVars.length > 0 && !isEditing && (
                    <button
                      onClick={() => setShowProcessedPreview(!showProcessedPreview)}
                      className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                    >
                      <div className={`w-9 h-5 rounded-full transition-colors ${
                        showProcessedPreview ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                      } relative`}>
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                          showProcessedPreview ? 'translate-x-4' : 'translate-x-0.5'
                        }`} />
                      </div>
                      <span>{showProcessedPreview ? 'With values' : 'With placeholders'}</span>
                    </button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      // Copy based on toggle state
                      if (showProcessedPreview) {
                        // Copy with replaced values using the replaceVariables function
                        const processedContent = replaceVariables(editableContent, variables);
                        navigator.clipboard.writeText(processedContent);
                        toast.success('Copied prompt with values');
                      } else {
                        // Copy raw prompt with placeholders
                        navigator.clipboard.writeText(editableContent);
                        toast.success('Copied prompt with placeholders');
                      }
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              
              {isEditing ? (
                <textarea
                  ref={editorRef}
                  value={editableContent}
                  onChange={(e) => setEditableContent(e.target.value)}
                  onBlur={handleBlur}
                  className="w-full min-h-[350px] p-4 font-mono text-sm border-2 border-blue-500 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all animate-pulse-once"
                  placeholder="Enter your prompt..."
                  autoFocus
                />
              ) : (
                <div>
                  <div 
                    onClick={handlePromptClick}
                    className="cursor-text rounded-lg bg-gray-50 dark:bg-gray-900/50 p-4 min-h-[350px] border border-transparent hover:border-gray-300 dark:hover:border-gray-600 transition-all group relative"
                  >
                    {/* Show prompt with or without variable replacements based on toggle */}
                    <div className="whitespace-pre-wrap font-mono text-sm text-gray-700 dark:text-gray-300">
                      {(() => {
                        if (!editableContent) return <span className="text-gray-400">Click here to edit prompt...</span>;
                        
                        // If showing raw preview, just highlight the placeholders
                        if (!showProcessedPreview) {
                          let parts: JSX.Element[] = [];
                          let lastIndex = 0;
                          
                          // Find all variable placeholders
                          const placeholders: Array<{start: number, end: number, key: string}> = [];
                          detectedVars.forEach(varName => {
                            const regex = new RegExp(`\\{\\{\\s*${varName}\\s*\\}\\}`, 'g');
                            let match;
                            while ((match = regex.exec(editableContent)) !== null) {
                              placeholders.push({
                                start: match.index,
                                end: match.index + match[0].length,
                                key: varName
                              });
                            }
                          });
                          
                          // Sort by position
                          placeholders.sort((a, b) => a.start - b.start);
                          
                          // Build highlighted content
                          placeholders.forEach((placeholder, index) => {
                            if (placeholder.start > lastIndex) {
                              parts.push(
                                <span key={`text-${index}`}>
                                  {editableContent.slice(lastIndex, placeholder.start)}
                                </span>
                              );
                            }
                            
                            const color = variableColorMap[placeholder.key];
                            parts.push(
                              <span 
                                key={`var-${index}`}
                                className={`px-1 py-0.5 rounded ${color.bg} ${color.text} font-semibold`}
                                title={`Variable: ${placeholder.key}`}
                              >
                                {editableContent.slice(placeholder.start, placeholder.end)}
                              </span>
                            );
                            
                            lastIndex = placeholder.end;
                          });
                          
                          if (lastIndex < editableContent.length) {
                            parts.push(
                              <span key="text-final">
                                {editableContent.slice(lastIndex)}
                              </span>
                            );
                          }
                          
                          return parts.length > 0 ? parts : editableContent;
                        }
                        
                        // Show processed preview with replaced values
                        let parts: JSX.Element[] = [];
                        let lastIndex = 0;
                        
                        // Find all variable positions and replace them
                        const replacements: Array<{start: number, end: number, key: string, value: string}> = [];
                        
                        // Process all detected variables, using either user value or default
                        parsedVariables.forEach(variable => {
                          const key = variable.name;
                          const userValue = variables[key];
                          const defaultValue = variable.defaultValue;
                          const finalValue = userValue || defaultValue;
                          
                          if (finalValue) {
                            const regex = new RegExp(`\\{\\{\\s*${key}(?::[^}]+)?\\s*\\}\\}`, 'g');
                            let match;
                            while ((match = regex.exec(editableContent)) !== null) {
                              replacements.push({
                                start: match.index,
                                end: match.index + match[0].length,
                                key,
                                value: finalValue
                              });
                            }
                          }
                        });
                        
                        // Sort replacements by position
                        replacements.sort((a, b) => a.start - b.start);
                        
                        // Build the highlighted content
                        replacements.forEach((replacement, index) => {
                          // Add text before the variable
                          if (replacement.start > lastIndex) {
                            parts.push(
                              <span key={`text-${index}`}>
                                {editableContent.slice(lastIndex, replacement.start)}
                              </span>
                            );
                          }
                          
                          // Add the highlighted replacement with matching color
                          const color = variableColorMap[replacement.key];
                          parts.push(
                            <span 
                              key={`var-${index}`}
                              className={`px-1 py-0.5 rounded ${color.bg} ${color.text} border ${color.border}`}
                              title={`Variable: ${replacement.key}`}
                            >
                              {replacement.value}
                            </span>
                          );
                          
                          lastIndex = replacement.end;
                        });
                        
                        // Add any remaining text
                        if (lastIndex < editableContent.length) {
                          parts.push(
                            <span key="text-final">
                              {editableContent.slice(lastIndex)}
                            </span>
                          );
                        }
                        
                        // If no replacements, just show the original text
                        if (parts.length === 0) {
                          return editableContent;
                        }
                        
                        return parts;
                      })()}
                    </div>
                    
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-gray-500 mt-2">
                      Click to edit
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Model Config & Outputs */}
          <div className="space-y-6">
            {/* Model Configuration - Enhanced */}
            <div className="rounded-lg bg-white dark:bg-gray-800 p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{AI_PROVIDERS[provider].icon}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {AI_PROVIDERS[provider].name}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">•</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {AI_PROVIDERS[provider].models.find(m => m.value === model)?.label || model}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="h-6 px-2 text-xs"
                >
                  {showAdvanced ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  <Settings2 className="h-3 w-3 ml-1" />
                  <span className="ml-1">Settings</span>
                </Button>
              </div>
              
              {showAdvanced && (
                <div className="space-y-4 pt-3 border-t border-gray-100 dark:border-gray-600">
                  {/* Provider Selection */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">
                      AI Provider
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {Object.entries(AI_PROVIDERS).map(([key, config]) => (
                        <button
                          key={key}
                          onClick={() => {
                            setProvider(key as AIProvider);
                            setModel(config.models[0].value);
                          }}
                          className={`p-2 rounded-md border text-xs font-medium transition-all ${
                            provider === key
                              ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300'
                              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-gray-400'
                          }`}
                        >
                          <div className="text-lg mb-1">{config.icon}</div>
                          <div>{config.name}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Model Selection */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                      Model
                    </label>
                    <select 
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-2 py-1.5 text-sm bg-white dark:bg-gray-700"
                    >
                      {AI_PROVIDERS[provider].models.map(m => (
                        <option key={m.value} value={m.value}>
                          {m.label} (Max: {m.maxTokens.toLocaleString()} tokens)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Basic Settings */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                        Temperature: {temperature.toFixed(2)}
                      </label>
                      <input
                        type="range"
                        min={AI_PROVIDERS[provider].settings.temperature.min}
                        max={AI_PROVIDERS[provider].settings.temperature.max}
                        step={AI_PROVIDERS[provider].settings.temperature.step}
                        value={temperature}
                        onChange={(e) => setTemperature(parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Precise</span>
                        <span>Creative</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                        Max Tokens: {maxTokens.toLocaleString()}
                      </label>
                      <input
                        type="range"
                        min={1}
                        max={AI_PROVIDERS[provider].models.find(m => m.value === model)?.maxTokens || 4096}
                        step={100}
                        value={maxTokens}
                        onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Short</span>
                        <span>Long</span>
                      </div>
                    </div>
                  </div>

                  {/* Advanced Settings Toggle */}
                  <button
                    onClick={() => setShowExtraSettings(!showExtraSettings)}
                    className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    <Sliders className="h-3 w-3" />
                    {showExtraSettings ? 'Hide' : 'Show'} Advanced Parameters
                  </button>

                  {/* Extra Advanced Settings */}
                  {showExtraSettings && (
                    <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-md">
                      {AI_PROVIDERS[provider].settings.topP && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                            Top P: {topP.toFixed(2)}
                          </label>
                          <input
                            type="range"
                            min={AI_PROVIDERS[provider].settings.topP.min}
                            max={AI_PROVIDERS[provider].settings.topP.max}
                            step={AI_PROVIDERS[provider].settings.topP.step}
                            value={topP}
                            onChange={(e) => setTopP(parseFloat(e.target.value))}
                            className="w-full"
                          />
                        </div>
                      )}
                      
                      {AI_PROVIDERS[provider].settings.topK && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                            Top K: {topK}
                          </label>
                          <input
                            type="range"
                            min={AI_PROVIDERS[provider].settings.topK.min}
                            max={AI_PROVIDERS[provider].settings.topK.max}
                            step={AI_PROVIDERS[provider].settings.topK.step}
                            value={topK}
                            onChange={(e) => setTopK(parseInt(e.target.value))}
                            className="w-full"
                          />
                        </div>
                      )}
                      
                      {AI_PROVIDERS[provider].settings.frequencyPenalty && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                            Frequency Penalty: {frequencyPenalty.toFixed(1)}
                          </label>
                          <input
                            type="range"
                            min={AI_PROVIDERS[provider].settings.frequencyPenalty.min}
                            max={AI_PROVIDERS[provider].settings.frequencyPenalty.max}
                            step={AI_PROVIDERS[provider].settings.frequencyPenalty.step}
                            value={frequencyPenalty}
                            onChange={(e) => setFrequencyPenalty(parseFloat(e.target.value))}
                            className="w-full"
                          />
                        </div>
                      )}
                      
                      {AI_PROVIDERS[provider].settings.presencePenalty && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                            Presence Penalty: {presencePenalty.toFixed(1)}
                          </label>
                          <input
                            type="range"
                            min={AI_PROVIDERS[provider].settings.presencePenalty.min}
                            max={AI_PROVIDERS[provider].settings.presencePenalty.max}
                            step={AI_PROVIDERS[provider].settings.presencePenalty.step}
                            value={presencePenalty}
                            onChange={(e) => setPresencePenalty(parseFloat(e.target.value))}
                            className="w-full"
                          />
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        <p><strong>Top P:</strong> Controls diversity via nucleus sampling</p>
                        <p><strong>Top K:</strong> Limits vocabulary to top K tokens</p>
                        <p><strong>Frequency Penalty:</strong> Reduces repetition of tokens</p>
                        <p><strong>Presence Penalty:</strong> Encourages new topics</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Execute Button - Positioned between settings and output */}
            <div className="rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Ready to execute</span>
                    {detectedVars.length > 0 && (
                      <span className="ml-2">• {detectedVars.filter(v => variables[v]).length}/{detectedVars.length} variables filled</span>
                    )}
                  </div>
                </div>
                <Button
                  onClick={handleExecute}
                  disabled={executing}
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all"
                  size="default"
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
                      <span className="ml-2 text-xs opacity-75">⌘↵</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            {/* Outputs */}
            <div className="rounded-lg bg-white dark:bg-gray-800 p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-medium text-gray-900 dark:text-white">
                  Output History ({outputs.length})
                </h2>
                <div className="flex items-center gap-2">
                  {(outputs.length > 1 || runHistory.length > 1) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowComparisonModal(true)}
                    >
                      <GitCompare className="mr-2 h-3 w-3" />
                      Compare Runs
                    </Button>
                  )}
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
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-xs font-medium">
                                {output.model} • {output.temperature.toFixed(1)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(output.timestamp).toLocaleTimeString()}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleApplySettings(output)}
                                title="Apply AI settings"
                                className="h-6 w-6 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                              >
                                <Settings className="h-3 w-3 text-blue-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleApplyContent(output)}
                                title="Apply prompt content"
                                className="h-6 w-6 p-0 hover:bg-green-100 dark:hover:bg-green-900/30"
                              >
                                <FileText className="h-3 w-3 text-green-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleApplyBoth(output)}
                                title="Apply both"
                                className="h-6 w-6 p-0 hover:bg-purple-100 dark:hover:bg-purple-900/30"
                              >
                                <Package2 className="h-3 w-3 text-purple-600" />
                              </Button>
                            </div>
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
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-500 mr-2">
                            {new Date(output.timestamp).toLocaleTimeString()}
                          </span>
                          
                          {/* Apply Settings Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleApplySettings(output)}
                            title="Apply AI settings (model, temperature, etc.)"
                            className="h-7 w-7 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                          >
                            <Settings className="h-3.5 w-3.5 text-blue-600 hover:text-blue-700" />
                          </Button>
                          
                          {/* Apply Content Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleApplyContent(output)}
                            title="Apply prompt content"
                            className="h-7 w-7 p-0 hover:bg-green-100 dark:hover:bg-green-900/30"
                          >
                            <FileText className="h-3.5 w-3.5 text-green-600 hover:text-green-700" />
                          </Button>
                          
                          {/* Apply Both Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleApplyBoth(output)}
                            title="Apply both settings and content"
                            className="h-7 w-7 p-0 hover:bg-purple-100 dark:hover:bg-purple-900/30"
                          >
                            <Package2 className="h-3.5 w-3.5 text-purple-600 hover:text-purple-700" />
                          </Button>
                          
                          <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />
                          
                          {/* Copy Output Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(output.output);
                              toast.success('Output copied');
                            }}
                            title="Copy output"
                            className="h-7 w-7 p-0"
                          >
                            <Copy className="h-3.5 w-3.5" />
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

      {/* Comparison Modal */}
      {showComparisonModal && (runHistory.length > 0 || outputs.length > 0) && (
        <PromptComparisonModal
          runs={[
            ...runHistory,
            ...outputs.map(o => ({
              ...o,
              executed_at: o.executed_at || o.timestamp,
              parameters: o.parameters || { temperature: o.temperature }
            }))
          ]}
          onClose={() => setShowComparisonModal(false)}
          onApplySettings={handleApplySettings}
          onApplyContent={handleApplyContent}
          onApplyBoth={handleApplyBoth}
        />
      )}
    </div>
  );
}