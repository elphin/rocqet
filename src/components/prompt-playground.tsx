'use client';

import { useState, useEffect } from 'react';
import { 
  Play, 
  Loader2, 
  Variable, 
  Settings,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  AlertCircle,
  Sparkles,
  X,
  Lock,
  CheckCircle2,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/lib/toast-config';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface PromptPlaygroundProps {
  content: string;
  promptId: string;
  workspaceId: string;
  workspaceSlug?: string;
  onVariableChange?: (variables: Record<string, string>) => void;
}

type ModelProvider = 'openai' | 'anthropic' | 'google' | 'mistral' | 'cohere' | 'huggingface';

interface ConfiguredProvider {
  provider: ModelProvider;
  hasKey: boolean;
  models: string[];
}

// Comprehensive list of LLM models per provider (updated December 2024)
const ALL_PROVIDERS = {
  openai: { 
    name: 'OpenAI',
    models: [
      'gpt-4-turbo-preview',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-4-32k',
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k',
      'gpt-3.5-turbo-instruct',
      'text-davinci-003',
      'text-davinci-002'
    ]
  },
  anthropic: { 
    name: 'Anthropic',
    models: [
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229', 
      'claude-3-haiku-20240307',
      'claude-2.1',
      'claude-2.0',
      'claude-instant-1.2'
    ]
  },
  google: { 
    name: 'Google AI',
    models: [
      'gemini-pro',
      'gemini-pro-vision',
      'gemini-ultra',
      'palm-2',
      'text-bison-001',
      'chat-bison-001'
    ]
  },
  mistral: { 
    name: 'Mistral',
    models: [
      'mistral-large-latest',
      'mistral-large-2402',
      'mistral-medium-latest',
      'mistral-medium-2312', 
      'mistral-small-latest',
      'mistral-small-2402',
      'mistral-tiny-latest',
      'mistral-embed'
    ]
  },
  cohere: { 
    name: 'Cohere',
    models: [
      'command',
      'command-light',
      'command-nightly',
      'command-r',
      'command-r-plus',
      'embed-english-v3.0',
      'embed-multilingual-v3.0'
    ]
  },
  huggingface: { 
    name: 'Hugging Face',
    models: [
      'meta-llama/Llama-2-70b-chat-hf',
      'meta-llama/Llama-2-13b-chat-hf',
      'meta-llama/Llama-2-7b-chat-hf',
      'mistralai/Mixtral-8x7B-Instruct-v0.1',
      'mistralai/Mistral-7B-Instruct-v0.2',
      'tiiuae/falcon-180B-chat',
      'HuggingFaceH4/zephyr-7b-beta'
    ]
  }
} as const;

export function PromptPlayground({ 
  content, 
  promptId, 
  workspaceId,
  workspaceSlug,
  onVariableChange 
}: PromptPlaygroundProps) {
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [detectedVars, setDetectedVars] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [response, setResponse] = useState<string>('');
  const [showVariables, setShowVariables] = useState(true);
  const [showResponse, setShowResponse] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // API Configuration
  const [selectedProvider, setSelectedProvider] = useState<ModelProvider | ''>('');
  const [selectedModel, setSelectedModel] = useState('');
  const [configuredProviders, setConfiguredProviders] = useState<ConfiguredProvider[]>([]);
  const [loading, setLoading] = useState(true);

  // Load configured API keys on mount
  useEffect(() => {
    const loadConfiguredProviders = async () => {
      console.log('PromptPlayground mounted with props:', { 
        workspaceId, 
        workspaceSlug, 
        promptId 
      });
      
      if (!workspaceId) {
        console.log('No workspaceId, skipping provider load');
        setLoading(false);
        return;
      }
      
      const supabase = createClient();
      
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user:', user?.id || 'Not authenticated');
      
      try {
        // Get workspace API keys
        const { data: workspaceKeys, error } = await supabase
          .from('workspace_ai_keys')
          .select('provider, api_key')
          .eq('workspace_id', workspaceId)
          .eq('is_active', true);

        console.log('Workspace keys query:', { 
          workspaceId, 
          resultCount: workspaceKeys?.length || 0,
          error: error?.message,
          data: workspaceKeys 
        });

        const providers: ConfiguredProvider[] = [];
        
        if (workspaceKeys && workspaceKeys.length > 0) {
          workspaceKeys.forEach(key => {
            const provider = key.provider as ModelProvider;
            if (ALL_PROVIDERS[provider]) {
              providers.push({
                provider,
                hasKey: true,
                models: ALL_PROVIDERS[provider].models
              });
            }
          });
        }
        
        console.log('Setting providers:', providers);
        setConfiguredProviders(providers);
        
        // Set default provider if available
        if (providers.length > 0) {
          setSelectedProvider(providers[0].provider);
          setSelectedModel(providers[0].models[0]);
        }
      } catch (error) {
        console.error('Error loading configured providers:', error);
      } finally {
        console.log('Setting loading to false');
        setLoading(false);
      }
    };

    loadConfiguredProviders();
  }, [workspaceId]);
  
  // Debug state changes
  useEffect(() => {
    console.log('State updated - loading:', loading, 'providers:', configuredProviders);
  }, [loading, configuredProviders]);

  // Detect variables in content
  useEffect(() => {
    const regex = /\{\{([^}]+)\}\}/g;
    const matches = [...content.matchAll(regex)];
    const varNames = matches.map(m => m[1].trim());
    const uniqueVars = [...new Set(varNames)];
    
    setDetectedVars(uniqueVars);
    
    // Initialize variable values
    const initialValues: Record<string, string> = {};
    uniqueVars.forEach(v => {
      if (!variables[v]) {
        initialValues[v] = '';
      }
    });
    if (Object.keys(initialValues).length > 0) {
      setVariables(prev => ({ ...prev, ...initialValues }));
    }
  }, [content]);

  // Update parent component when variables change
  useEffect(() => {
    if (onVariableChange) {
      onVariableChange(variables);
    }
  }, [variables, onVariableChange]);

  const handleVariableChange = (varName: string, value: string) => {
    setVariables(prev => ({ ...prev, [varName]: value }));
  };

  const getFilledPrompt = () => {
    let filled = content;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      filled = filled.replace(regex, value || `{{${key}}}`);
    });
    return filled;
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(getFilledPrompt());
    setCopied(true);
    toast.success('Prompt copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRunPrompt = async () => {
    // Check if all variables are filled
    const missingVars = detectedVars.filter(v => !variables[v]);
    if (missingVars.length > 0) {
      toast.error(`Please fill in all variables: ${missingVars.join(', ')}`);
      return;
    }

    if (!selectedProvider || !selectedModel) {
      toast.error('Please select a provider and model');
      return;
    }

    setIsRunning(true);
    setShowResponse(true);
    setResponse('');

    try {
      const response = await fetch('/api/prompts/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: getFilledPrompt(),
          promptId,
          workspace_id: workspaceId, // Use underscore for consistency with API
          provider: selectedProvider,
          model: selectedModel,
          variables,
          temperature: 0.7,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to run prompt');
      }

      const data = await response.json();
      setResponse(data.output || data.response || 'No response received');
      
      toast.success('Prompt executed successfully');
    } catch (error: any) {
      console.error('Error running prompt:', error);
      toast.error(error.message || 'Failed to run prompt');
      setResponse('Error: ' + (error.message || 'Failed to execute prompt'));
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Variables Section */}
      {detectedVars.length > 0 && (
        <div className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-800 overflow-hidden">
          <button
            onClick={() => setShowVariables(!showVariables)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Variable className="w-4 h-4 text-purple-500" />
              <span className="font-medium text-gray-900 dark:text-gray-100">
                Variables ({detectedVars.length})
              </span>
            </div>
            {showVariables ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>
          
          {showVariables && (
            <div className="px-4 pb-4 border-t border-gray-200 dark:border-neutral-800">
              {detectedVars.map(varName => (
                <div key={varName} className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {varName}
                  </label>
                  <Input
                    value={variables[varName] || ''}
                    onChange={(e) => handleVariableChange(varName, e.target.value)}
                    placeholder={`Enter value for ${varName}`}
                    className="bg-white dark:bg-neutral-800"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* API Configuration */}
      <div className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-800 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-gray-500" />
            <span className="font-medium text-gray-900 dark:text-gray-100">
              Model Configuration
            </span>
          </div>
          {workspaceSlug && (
            <Link 
              href={`/${workspaceSlug}/settings/ai-providers`}
              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Configure API Keys →
            </Link>
          )}
        </div>
        
        {loading ? (
          <div className="text-center py-4">
            <Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" />
            <p className="text-sm text-gray-500 mt-2">Loading configured providers...</p>
          </div>
        ) : configuredProviders.length === 0 ? (
          <div className="text-center py-6 bg-gray-50 dark:bg-neutral-800/50 rounded-lg">
            <Lock className="w-8 h-8 text-gray-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
              No API Keys Configured
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Configure your API keys in settings to test prompts
            </p>
            {workspaceSlug && (
              <Link href={`/${workspaceSlug}/settings/ai-providers`}>
                <Button variant="default" size="sm">
                  <Settings className="w-3.5 h-3.5 mr-1.5" />
                  Configure API Keys
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Provider
                </label>
                <select
                  value={selectedProvider}
                  onChange={(e) => {
                    const provider = e.target.value as ModelProvider;
                    if (configuredProviders.some(p => p.provider === provider)) {
                      setSelectedProvider(provider);
                      const providerConfig = configuredProviders.find(p => p.provider === provider);
                      if (providerConfig && providerConfig.models.length > 0) {
                        setSelectedModel(providerConfig.models[0]);
                      }
                    }
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select a provider</option>
                  {Object.entries(ALL_PROVIDERS).map(([key, provider]) => {
                    const isConfigured = configuredProviders.some(p => p.provider === key);
                    return (
                      <option 
                        key={key} 
                        value={key}
                        disabled={!isConfigured}
                        className={!isConfigured ? 'text-gray-400' : ''}
                      >
                        {provider.name} {!isConfigured && '(No API key)'}
                      </option>
                    );
                  })}
                </select>
              </div>
              
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Model
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  disabled={!selectedProvider}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 disabled:opacity-50"
                >
                  {selectedProvider && configuredProviders
                    .find(p => p.provider === selectedProvider)
                    ?.models.map(model => (
                      <option key={model} value={model}>{model}</option>
                    )) || (
                    <option value="">Select a model</option>
                  )}
                </select>
              </div>
            </div>

            {/* Provider status indicator */}
            <div className="mt-4 space-y-2">
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-700 dark:text-blue-300">
                  <p className="font-medium mb-1">Available Providers:</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {Object.entries(ALL_PROVIDERS).map(([key, provider]) => {
                      const isConfigured = configuredProviders.some(p => p.provider === key);
                      return (
                        <span 
                          key={key}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                            isConfigured 
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                          }`}
                        >
                          {isConfigured && <CheckCircle2 className="w-3 h-3" />}
                          {!isConfigured && <Lock className="w-3 h-3" />}
                          {provider.name}
                        </span>
                      );
                    })}
                  </div>
                  <p className="mt-2">
                    Configure API keys for providers you want to test in{' '}
                    {workspaceSlug ? (
                      <Link 
                        href={`/${workspaceSlug}/settings/ai-providers`}
                        className="underline hover:no-underline"
                      >
                        Settings → AI Providers
                      </Link>
                    ) : (
                      'Settings → AI Providers'
                    )}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
        
        {configuredProviders.length > 0 && (
          <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            <span>Using workspace API keys</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleRunPrompt}
          disabled={isRunning || configuredProviders.length === 0}
          className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Run Prompt
            </>
          )}
        </Button>
        
        <Button
          variant="outline"
          onClick={handleCopyPrompt}
          className="border-gray-200 dark:border-neutral-700"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-2" />
              Copy with Variables
            </>
          )}
        </Button>
      </div>

      {/* Response Section */}
      {showResponse && (
        <div className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-500" />
              <span className="font-medium text-gray-900 dark:text-gray-100">
                Response
              </span>
            </div>
            <button
              onClick={() => setShowResponse(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="p-4">
            {isRunning ? (
              <div className="flex items-center gap-3 text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating response...</span>
              </div>
            ) : response ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <pre className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                  {response}
                </pre>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">
                No response yet. Click "Run Prompt" to test.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}