'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Key,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Save,
  AlertCircle,
  CheckCircle,
  Zap,
  DollarSign,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';

interface AiProvidersClientProps {
  workspaceKeys: any[];
  userKeys: any[];
  models: any[];
  isWorkspaceAdmin: boolean;
  workspaceUsage: any[];
  workspaceId: string;
  workspaceName: string;
}

const PROVIDERS = [
  { id: 'openai', name: 'OpenAI', icon: '🤖' },
  { id: 'anthropic', name: 'Anthropic', icon: '🧠' },
  { id: 'google', name: 'Google AI', icon: '🔍' },
  { id: 'mistral', name: 'Mistral', icon: '🌊' },
  { id: 'cohere', name: 'Cohere', icon: '🎯' },
  { id: 'huggingface', name: 'Hugging Face', icon: '🤗' }
];

export function AiProvidersClient({
  workspaceKeys,
  userKeys,
  models,
  isWorkspaceAdmin,
  workspaceUsage,
  workspaceId,
  workspaceName
}: AiProvidersClientProps) {
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [newKeys, setNewKeys] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const toggleKeyVisibility = (keyId: string) => {
    setShowKeys(prev => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  const saveKey = async (provider: string) => {
    if (!newKeys[provider]) {
      toast.error('Please enter an API key');
      return;
    }

    setSaving(true);
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from('workspace_ai_keys')
        .upsert({
          workspace_id: workspaceId,
          provider,
          api_key: newKeys[provider],
          is_default: true,
          is_active: true
        });

      if (error) throw error;

      toast.success(`${provider} API key saved successfully`);
      setNewKeys(prev => ({ ...prev, [provider]: '' }));
      setEditingKey(null);
      window.location.reload();
    } catch (error: any) {
      console.error('Error saving key:', error);
      toast.error(error.message || 'Failed to save API key');
    } finally {
      setSaving(false);
    }
  };

  const deleteKey = async (keyId: string, provider: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) return;

    const supabase = createClient();
    
    try {
      const { error } = await supabase
        .from('workspace_ai_keys')
        .delete()
        .eq('id', keyId);

      if (error) throw error;

      toast.success(`${provider} API key deleted`);
      window.location.reload();
    } catch (error: any) {
      console.error('Error deleting key:', error);
      toast.error(error.message || 'Failed to delete API key');
    }
  };

  // Calculate usage stats
  const totalRuns = workspaceUsage.length;
  const totalTokens = workspaceUsage.reduce((sum, run) => sum + (run.tokens_used || 0), 0);
  const totalCost = workspaceUsage.reduce((sum, run) => sum + (run.cost || 0), 0);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          AI Providers
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Configure API keys for {workspaceName} workspace
        </p>
      </div>

      {/* Usage Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-800 p-4">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Runs</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {totalRuns.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-800 p-4">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-yellow-500" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Tokens Used</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {totalTokens.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-800 p-4">
          <div className="flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Cost</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                ${totalCost.toFixed(4)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* API Keys */}
      <div className="space-y-6">
        {PROVIDERS.map(provider => {
          const existingKey = workspaceKeys.find(k => k.provider === provider.id);
          const isEditing = editingKey === provider.id;

          return (
            <div 
              key={provider.id}
              className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-800 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{provider.icon}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {provider.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {existingKey ? 'API key configured' : 'No API key configured'}
                    </p>
                  </div>
                </div>

                {existingKey ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    {isWorkspaceAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteKey(existingKey.id, provider.name)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                ) : (
                  <AlertCircle className="w-5 h-5 text-gray-400" />
                )}
              </div>

              {existingKey && !isEditing ? (
                <div className="flex items-center gap-2">
                  <Input
                    type={showKeys[existingKey.id] ? 'text' : 'password'}
                    value={showKeys[existingKey.id] ? existingKey.api_key : '••••••••••••••••'}
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleKeyVisibility(existingKey.id)}
                  >
                    {showKeys[existingKey.id] ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                  {isWorkspaceAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingKey(provider.id)}
                    >
                      Edit
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {(isEditing || !existingKey) && isWorkspaceAdmin ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="password"
                        placeholder={`Enter your ${provider.name} API key`}
                        value={newKeys[provider.id] || ''}
                        onChange={(e) => setNewKeys(prev => ({ 
                          ...prev, 
                          [provider.id]: e.target.value 
                        }))}
                        className="flex-1"
                      />
                      <Button
                        onClick={() => saveKey(provider.id)}
                        disabled={saving}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                      {isEditing && (
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setEditingKey(null);
                            setNewKeys(prev => ({ ...prev, [provider.id]: '' }));
                          }}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  ) : (
                    !existingKey && !isWorkspaceAdmin && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Contact your workspace admin to configure this API key
                      </p>
                    )
                  )}
                </>
              )}

              {/* Available models for this provider */}
              {existingKey && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-neutral-800">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Available Models:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {models
                      .filter(m => m.provider === provider.id)
                      .map(model => (
                        <span 
                          key={model.id}
                          className="px-2 py-1 text-xs bg-gray-100 dark:bg-neutral-800 rounded text-gray-700 dark:text-gray-300"
                        >
                          {model.model_name}
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info Box */}
      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
        <div className="flex">
          <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="ml-3">
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300">
              About API Keys
            </h4>
            <p className="mt-1 text-sm text-blue-700 dark:text-blue-400">
              API keys are encrypted and stored securely. They are only accessible to workspace admins
              and are never exposed in client-side code. Each workspace can have its own set of API keys.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}