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
  FlaskConical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/lib/toast-config';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface CompactPlaygroundProps {
  content: string;
  promptId: string;
  workspaceId: string;
  workspaceSlug?: string;
  promptSlug?: string;
  model?: string;
  temperature?: number;
}

export function PromptPlaygroundCompact({ 
  content, 
  promptId, 
  workspaceId, 
  workspaceSlug,
  promptSlug,
  model: defaultModel = 'gpt-4',
  temperature: defaultTemp = 0.7
}: CompactPlaygroundProps) {
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [response, setResponse] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [showVariables, setShowVariables] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedModel, setSelectedModel] = useState(defaultModel);
  const [temperature, setTemperature] = useState(defaultTemp);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const supabase = createClient();

  // Detect variables in content
  const detectedVars = content.match(/\{\{([^}]+)\}\}/g)?.map(v => v.slice(2, -2).trim()) || [];

  // Check for API keys (simplified)
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
    setResponse('');
    
    try {
      // Replace variables in content
      let processedContent = content;
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
        processedContent = processedContent.replace(regex, value);
      });
      
      const response = await fetch('/api/prompts/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt_id: promptId,
          workspace_id: workspaceId,
          content: processedContent,
          model: selectedModel,
          temperature,
          variables
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to execute prompt');
      }

      const data = await response.json();
      setResponse(data.output || 'No response received');
      toast.success('Executed successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to execute');
      setResponse('Error: ' + (error.message || 'Failed to execute prompt'));
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Compact Model Indicator */}
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

        {/* Test in Full Playground Link */}
        {workspaceSlug && promptSlug && (
          <Link 
            href={`/${workspaceSlug}/prompts/${promptSlug}/playground`}
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            <FlaskConical className="h-3.5 w-3.5" />
            Open Full Playground
          </Link>
        )}
      </div>

      {/* Collapsible Settings (hidden by default) */}
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
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                <option value="claude-3-haiku">Claude 3 Haiku</option>
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

      {/* Variables (if any) */}
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
              {detectedVars.map(varName => (
                <div key={varName}>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {varName}
                  </label>
                  <Input
                    value={variables[varName] || ''}
                    onChange={(e) => setVariables(prev => ({ ...prev, [varName]: e.target.value }))}
                    placeholder={`Enter ${varName}`}
                    className="h-8 text-sm"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Execute Button & Response */}
      <div className="space-y-3">
        <Button
          variant="success"
          onClick={handleRun}
          disabled={isRunning || !hasApiKey || loading}
          className="w-full"
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

        {/* Response */}
        {response && (
          <div className="rounded-lg border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800/50">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-neutral-700">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Output</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(response);
                  toast.success('Copied to clipboard');
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="p-3 max-h-64 overflow-y-auto">
              <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                {response}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}