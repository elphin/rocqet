'use client';

import { useState, useEffect } from 'react';
import { 
  Play, 
  Loader2, 
  Variable, 
  ChevronDown,
  ChevronRight,
  Copy,
  Sparkles,
  Zap,
  FlaskConical,
  Save,
  GitCompare,
  X,
  Edit3,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/lib/toast-config';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { createVariableColorMap } from '@/lib/utils/variable-colors';
import { parseVariables, extractDefaults, replaceVariables } from '@/lib/utils/variable-parser';

interface PlaygroundOutput {
  id: string;
  content: string;
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
}

interface EnhancedPlaygroundProps {
  content: string;
  promptId: string;
  workspaceId: string;
  workspaceSlug?: string;
  promptSlug?: string;
  model?: string;
  temperature?: number;
  onSaveVersion?: (content: string) => Promise<void>;
}

export function PromptPlaygroundEnhanced({ 
  content: originalContent, 
  promptId, 
  workspaceId, 
  workspaceSlug,
  promptSlug,
  model: defaultModel = 'gpt-4',
  temperature: defaultTemp = 0.7,
  onSaveVersion
}: EnhancedPlaygroundProps) {
  const [editableContent, setEditableContent] = useState(originalContent);
  const [isEditing, setIsEditing] = useState(false);
  const [variables, setVariables] = useState<Record<string, string>>(() => {
    // Initialize with default values from content
    const parsed = parseVariables(originalContent);
    return extractDefaults(parsed);
  });
  const [outputs, setOutputs] = useState<PlaygroundOutput[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [showVariables, setShowVariables] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedModel, setSelectedModel] = useState(defaultModel);
  const [temperature, setTemperature] = useState(defaultTemp);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedOutputs, setSelectedOutputs] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [savingVersion, setSavingVersion] = useState(false);
  
  const supabase = createClient();

  // Detect if content has changed
  useEffect(() => {
    setHasChanges(editableContent !== originalContent);
  }, [editableContent, originalContent]);

  // Parse variables from editable content
  const parsedVariables = parseVariables(editableContent);
  const detectedVars = parsedVariables.map(v => v.name);
  const variableColorMap = createVariableColorMap(detectedVars);

  // Check for API keys
  useEffect(() => {
    const checkApiKeys = async () => {
      try {
        const { data } = await supabase
          .from('workspace_api_keys')
          .select('id')
          .eq('workspace_id', workspaceId)
          .limit(1)
          .single();
        
        setHasApiKey(!!data);
      } catch (error) {
        setHasApiKey(false);
      } finally {
        setLoading(false);
      }
    };
    
    checkApiKeys();
  }, [workspaceId]);

  const handleRun = async () => {
    if (!hasApiKey) {
      toast.error('No API key configured. Please add one in settings.');
      return;
    }

    setIsRunning(true);
    
    try {
      // Replace variables in content (handles defaults too)
      const processedContent = replaceVariables(editableContent, variables);
      
      console.log('Executing with processed content:', processedContent);
      
      // Determine provider based on model
      const provider = selectedModel.startsWith('gpt') ? 'openai' : 
                      selectedModel.startsWith('claude') ? 'anthropic' : 
                      selectedModel.startsWith('gemini') ? 'google' : 'openai';
      
      const response = await fetch('/api/prompts/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt_id: promptId,
          workspace_id: workspaceId,
          content: processedContent,
          model: selectedModel,
          provider: provider,
          temperature,
          variables
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to execute prompt');
      }

      const data = await response.json();
      
      // Add to outputs history with full run data
      const newOutput: PlaygroundOutput = {
        id: Date.now().toString(),
        content: editableContent,
        output: data.output || 'No response received',
        timestamp: new Date(),
        model: selectedModel,
        temperature,
        parameters: {
          temperature,
          max_tokens: data.max_tokens,
          top_p: 1.0,
          frequency_penalty: 0,
          presence_penalty: 0
        },
        prompt_tokens: data.prompt_tokens,
        completion_tokens: data.completion_tokens,
        total_tokens: data.total_tokens,
        latency_ms: data.latency_ms,
        cost: data.cost
      };
      
      setOutputs(prev => [newOutput, ...prev].slice(0, 10)); // Keep last 10 outputs
      toast.success('Executed successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to execute');
    } finally {
      setIsRunning(false);
    }
  };

  const handleSaveAsVersion = async () => {
    if (!hasChanges) {
      toast.info('No changes to save');
      return;
    }

    setSavingVersion(true);
    try {
      if (onSaveVersion) {
        await onSaveVersion(editableContent);
      } else {
        // Default save implementation
        const { error } = await supabase
          .from('prompt_versions')
          .insert({
            prompt_id: promptId,
            content: editableContent,
            version_tag: `v${Date.now()}`,
            changes_summary: 'Updated via playground testing'
          });

        if (error) throw error;

        // Update the main prompt
        await supabase
          .from('prompts')
          .update({ 
            content: editableContent,
            updated_at: new Date().toISOString()
          })
          .eq('id', promptId);
      }
      
      toast.success('Saved as new version');
      setHasChanges(false);
    } catch (error: any) {
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

  const clearComparison = () => {
    setCompareMode(false);
    setSelectedOutputs([]);
  };


  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-blue-600" />
            <span className="font-medium text-gray-900 dark:text-gray-100">{selectedModel}</span>
          </div>
          <span className="text-gray-400">•</span>
          <span className="text-gray-500 dark:text-gray-400">Temp: {temperature.toFixed(1)}</span>
          
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-1 px-2 py-0.5 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
          >
            {showSettings ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Settings
          </button>
        </div>

        <div className="flex items-center gap-2">
          
          {hasChanges && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleSaveAsVersion}
              disabled={savingVersion}
              className="h-7 text-xs"
            >
              {savingVersion ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Save className="h-3 w-3 mr-1" />
              )}
              Save Version
            </Button>
          )}

          {workspaceSlug && promptSlug && (
            <Link 
              href={`/${workspaceSlug}/prompts/${promptSlug}/playground`}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              <FlaskConical className="h-3.5 w-3.5" />
              Full Playground
            </Link>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-3 bg-gray-50 dark:bg-neutral-800/50 rounded-lg space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Model
              </label>
              <select 
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-200 dark:border-neutral-700 rounded bg-white dark:bg-neutral-800"
              >
                <option value="gpt-4">GPT-4 (OpenAI)</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo (OpenAI)</option>
                <option value="claude-3-haiku-20240307">Claude 3 Haiku (Anthropic)</option>
                <option value="claude-3-sonnet-20240229">Claude 3 Sonnet (Anthropic)</option>
                <option value="claude-3-opus-20240229">Claude 3 Opus (Anthropic)</option>
                <option value="gemini-pro">Gemini Pro (Google)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
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
          {!hasApiKey && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              No API key configured. Add one in settings to test prompts.
            </p>
          )}
        </div>
      )}

      {/* Variables */}
      {detectedVars.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setShowVariables(!showVariables)}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {showVariables ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            <Variable className="h-3.5 w-3.5 text-purple-500" />
            Variables ({detectedVars.length})
          </button>
          
          {showVariables && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-5">
              {parsedVariables.map(variable => {
                const varName = variable.name;
                const defaultValue = variable.defaultValue;
                const color = variableColorMap[varName];
                return (
                  <div key={varName}>
                    <label className={`block text-xs font-medium mb-1 ${color.text}`}>
                      {varName}
                      {defaultValue && (
                        <span className="ml-1 text-gray-500 font-normal">
                          (default: {defaultValue})
                        </span>
                      )}
                    </label>
                    <input
                      value={variables[varName] || ''}
                      onChange={(e) => setVariables(prev => ({ ...prev, [varName]: e.target.value }))}
                      placeholder={defaultValue || `Enter ${varName}`}
                      className={`w-full h-8 px-2 text-sm rounded border-2 bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 ${color.border} ${color.focusBorder} ${color.focusRing} focus:outline-none focus:ring-2 transition-all`}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Editable Prompt */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Prompt {hasChanges && <span className="text-xs text-amber-600">(modified)</span>}
            {detectedVars.length > 0 && !isEditing && <span className="text-xs text-gray-500 ml-2">(preview with variables)</span>}
          </label>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
          >
            {isEditing ? (
              <>
                <Check className="h-3 w-3" />
                Done Editing
              </>
            ) : (
              <>
                <Edit3 className="h-3 w-3" />
                Edit Prompt
              </>
            )}
          </button>
        </div>
        
        {isEditing ? (
          <textarea
            value={editableContent}
            onChange={(e) => setEditableContent(e.target.value)}
            className="w-full min-h-[200px] p-3 text-sm font-mono border-2 border-blue-500 rounded-lg bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your prompt..."
            autoFocus
          />
        ) : (
          <div 
            onClick={() => setIsEditing(true)}
            className="relative group cursor-text"
          >
            <div className="p-3 text-sm font-mono border border-gray-200 dark:border-neutral-700 rounded-lg bg-gray-50 dark:bg-neutral-900/50 hover:border-gray-400 dark:hover:border-gray-500 transition-all min-h-[100px]">
              <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                {(() => {
                  if (!editableContent) return <span className="text-gray-400">Click to edit prompt...</span>;
                  
                  // Build highlighted content with inline replacements
                  let parts: JSX.Element[] = [];
                  let lastIndex = 0;
                  
                  // Find all variable positions
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
                  
                  // Sort by position
                  replacements.sort((a, b) => a.start - b.start);
                  
                  // Build highlighted content
                  replacements.forEach((replacement, index) => {
                    // Add text before variable
                    if (replacement.start > lastIndex) {
                      parts.push(
                        <span key={`text-${index}`}>
                          {editableContent.slice(lastIndex, replacement.start)}
                        </span>
                      );
                    }
                    
                    // Add highlighted replacement with matching color
                    const color = variableColorMap[replacement.key];
                    parts.push(
                      <span 
                        key={`var-${index}`}
                        className={`px-1 py-0.5 rounded ${color.bg} ${color.text}`}
                        title={`${replacement.key}: ${replacement.value}`}
                      >
                        {replacement.value}
                      </span>
                    );
                    
                    lastIndex = replacement.end;
                  });
                  
                  // Add remaining text
                  if (lastIndex < editableContent.length) {
                    parts.push(
                      <span key="text-final">
                        {editableContent.slice(lastIndex)}
                      </span>
                    );
                  }
                  
                  return parts.length > 0 ? parts : editableContent;
                })()}
              </div>
            </div>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Use replaceVariables to handle defaults
                const processedContent = replaceVariables(editableContent, variables);
                navigator.clipboard.writeText(processedContent);
                toast.success('Copied processed prompt');
              }}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Execute Button */}
      <Button
        onClick={handleRun}
        disabled={isRunning || !hasApiKey || loading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
      >
        {isRunning ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Running...
          </>
        ) : (
          <>
            <Play className="h-4 w-4 mr-2" />
            Execute Prompt
          </>
        )}
      </Button>

      {/* Outputs */}
      {outputs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Outputs ({outputs.length})
            </h3>
            {compareMode && selectedOutputs.length > 0 && (
              <button
                onClick={clearComparison}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Clear Selection
              </button>
            )}
          </div>

          {/* Comparison View */}
          {compareMode && selectedOutputs.length === 2 ? (
            <div className="grid grid-cols-2 gap-4">
              {selectedOutputs.map(outputId => {
                const output = outputs.find(o => o.id === outputId);
                if (!output) return null;
                
                return (
                  <div key={outputId} className="rounded-lg border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800/50">
                    <div className="px-3 py-2 border-b border-gray-200 dark:border-neutral-700 flex items-center justify-between">
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {output.model} • Temp {output.temperature.toFixed(1)}
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
            /* Regular List View */
            <div className="space-y-2">
              {outputs.map((output, index) => (
                <div 
                  key={output.id}
                  className={`rounded-lg border ${
                    compareMode && selectedOutputs.includes(output.id)
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-neutral-700">
                    <div className="flex items-center gap-3">
                      {compareMode && (
                        <input
                          type="checkbox"
                          checked={selectedOutputs.includes(output.id)}
                          onChange={() => toggleOutputSelection(output.id)}
                          className="h-3 w-3"
                        />
                      )}
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        Output {outputs.length - index}
                      </span>
                      <span className="text-xs text-gray-500">
                        {output.model} • {output.temperature.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {new Date(output.timestamp).toLocaleTimeString()}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(output.output);
                          toast.success('Copied to clipboard');
                        }}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="p-3 max-h-40 overflow-y-auto">
                    <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                      {output.output}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}