'use client';

import { useState, useEffect } from 'react';
import { 
  Key, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  Shield,
  AlertCircle,
  Loader2,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/lib/toast-config';

interface ApiKeySettingsProps {
  workspaceId: string;
  canManageKeys?: boolean;
  isPro?: boolean;
}

type Provider = 'openai' | 'anthropic' | 'google';

interface ApiKey {
  id: string;
  name: string;
  provider: Provider;
  masked_key: string;
  is_default: boolean;
  last_used_at?: string;
  created_at: string;
  created_by: string;
}

const PROVIDER_INFO = {
  openai: {
    name: 'OpenAI',
    placeholder: 'sk-...',
    helpText: 'Your OpenAI API key starts with "sk-"',
    models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo']
  },
  anthropic: {
    name: 'Anthropic',
    placeholder: 'sk-ant-...',
    helpText: 'Your Anthropic API key starts with "sk-ant-"',
    models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku']
  },
  google: {
    name: 'Google',
    placeholder: 'AIza...',
    helpText: 'Your Google AI API key',
    models: ['gemini-pro', 'gemini-1.5-pro']
  }
};

export function ApiKeySettings({ workspaceId, canManageKeys = true, isPro = true }: ApiKeySettingsProps) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingKey, setTestingKey] = useState<string | null>(null);
  const [newKey, setNewKey] = useState({
    name: '',
    provider: 'openai' as Provider,
    api_key: '',
    is_default: false
  });
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());

  // Load existing API keys
  useEffect(() => {
    loadApiKeys();
  }, [workspaceId]);

  const loadApiKeys = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/workspace/api-keys?workspace_id=${workspaceId}`);
      if (!response.ok) throw new Error('Failed to load keys');
      
      const { data } = await response.json();
      setKeys(data || []);
    } catch (error) {
      console.error('Failed to load API keys:', error);
      toast.error('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const testApiKey = async (provider: Provider, apiKey: string): Promise<boolean> => {
    try {
      // Basic validation - must be a non-empty string
      if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
        return false;
      }
      
      // This would normally be done server-side for security
      // For now, we'll just validate the format
      switch (provider) {
        case 'openai':
          // OpenAI keys can start with sk- or sk-proj-
          return (apiKey.startsWith('sk-') || apiKey.startsWith('sk-proj-')) && apiKey.length > 20;
        case 'anthropic':
          // Anthropic keys start with sk-ant-
          return apiKey.startsWith('sk-ant-') && apiKey.length > 20;
        case 'google':
          // Google/Gemini API keys are typically 39 characters
          return apiKey.length >= 39;
        case 'cohere':
          // Cohere keys are typically 40 characters
          return apiKey.length >= 40;
        case 'perplexity':
          // Perplexity keys start with pplx-
          return apiKey.startsWith('pplx-') && apiKey.length > 20;
        default:
          // For other providers, just check minimum length
          return apiKey.length >= 10;
      }
    } catch (error) {
      return false;
    }
  };

  const handleAddKey = async () => {
    if (!newKey.name || !newKey.api_key) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!canManageKeys) {
      toast.error('You do not have permission to manage API keys');
      return;
    }

    setSaving(true);
    setTestingKey(newKey.api_key);

    try {
      // Test the key first
      const isValid = await testApiKey(newKey.provider, newKey.api_key);
      if (!isValid) {
        toast.error('Invalid API key format. Please check and try again.');
        return;
      }

      const response = await fetch('/api/workspace/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          ...newKey
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add key');
      }

      const { data } = await response.json();
      setKeys([data, ...keys]);
      setShowAddModal(false);
      setNewKey({ name: '', provider: 'openai', api_key: '', is_default: false });
      toast.success('API key added successfully');
    } catch (error: any) {
      console.error('Failed to add API key:', error);
      toast.error(error.message || 'Failed to add API key');
    } finally {
      setSaving(false);
      setTestingKey(null);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/workspace/api-keys?id=${keyId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete key');

      setKeys(keys.filter(k => k.id !== keyId));
      toast.success('API key deleted');
    } catch (error) {
      console.error('Failed to delete API key:', error);
      toast.error('Failed to delete API key');
    }
  };

  const handleSetDefault = async (keyId: string, provider: Provider) => {
    try {
      // Update locally first for optimistic UI
      setKeys(keys.map(k => ({
        ...k,
        is_default: k.id === keyId ? true : (k.provider === provider ? false : k.is_default)
      })));

      // Then update on server
      const response = await fetch(`/api/workspace/api-keys/${keyId}/set-default`, {
        method: 'PATCH'
      });

      if (!response.ok) throw new Error('Failed to set default');
      
      toast.success('Default key updated');
    } catch (error) {
      console.error('Failed to set default:', error);
      toast.error('Failed to set default key');
      // Reload to get correct state
      loadApiKeys();
    }
  };

  if (!isPro) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-xl border border-blue-200 dark:border-blue-800 p-8">
        <div className="text-center">
          <Shield className="w-12 h-12 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            API Key Management is a Pro Feature
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Upgrade to Pro to securely store and manage your API keys across different AI providers.
          </p>
          <Button variant="accent">
            Upgrade to Pro
          </Button>
        </div>
      </div>
    );
  }

  if (!canManageKeys) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
          <div>
            <h3 className="font-medium text-yellow-900 dark:text-yellow-100 mb-1">
              Permission Required
            </h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              Only workspace owners and admins can manage API keys. Contact your workspace admin for access.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            API Keys
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your AI provider API keys for this workspace
          </p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          variant="default"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add API Key
        </Button>
      </div>

      {/* Security Notice */}
      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
              Your API keys are encrypted
            </p>
            <p className="text-blue-700 dark:text-blue-300">
              All API keys are encrypted using AES-256 encryption and are never exposed in logs or to unauthorized users.
              Only workspace admins can manage these keys.
            </p>
          </div>
        </div>
      </div>

      {/* Keys List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : keys.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-neutral-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-neutral-600">
          <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No API keys configured
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Add your first API key to start using AI features in your prompts
          </p>
          <Button
            onClick={() => setShowAddModal(true)}
            variant="outline"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Key
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {keys.map((key) => (
            <div
              key={key.id}
              className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 p-5"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gray-100 dark:bg-neutral-700 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Key className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                        {key.name}
                      </h4>
                      <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
                        {PROVIDER_INFO[key.provider].name}
                      </span>
                      {key.is_default && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <code className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        {revealedKeys.has(key.id) ? '••••••••••••' : key.masked_key}
                      </code>
                      <button
                        onClick={() => {
                          const newRevealed = new Set(revealedKeys);
                          if (newRevealed.has(key.id)) {
                            newRevealed.delete(key.id);
                          } else {
                            newRevealed.add(key.id);
                          }
                          setRevealedKeys(newRevealed);
                        }}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {revealedKeys.has(key.id) ? (
                          <Eye className="w-3.5 h-3.5" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>Added {new Date(key.created_at).toLocaleDateString()}</span>
                      {key.last_used_at && (
                        <span>Last used: {new Date(key.last_used_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!key.is_default && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSetDefault(key.id, key.provider)}
                    >
                      Set as Default
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteKey(key.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Key Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl w-full max-w-lg">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Add API Key
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                    Provider
                  </label>
                  <select
                    value={newKey.provider}
                    onChange={(e) => setNewKey({ ...newKey, provider: e.target.value as Provider })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100"
                  >
                    {Object.entries(PROVIDER_INFO).map(([value, info]) => (
                      <option key={value} value={value}>
                        {info.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                    Key Name
                  </label>
                  <Input
                    value={newKey.name}
                    onChange={(e) => setNewKey({ ...newKey, name: e.target.value })}
                    placeholder="e.g., Production Key"
                    className="bg-white dark:bg-neutral-800"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    A friendly name to identify this key
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                    API Key
                  </label>
                  <Input
                    type="password"
                    value={newKey.api_key}
                    onChange={(e) => setNewKey({ ...newKey, api_key: e.target.value })}
                    placeholder={PROVIDER_INFO[newKey.provider].placeholder}
                    className="bg-white dark:bg-neutral-800 font-mono"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {PROVIDER_INFO[newKey.provider].helpText}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="setDefault"
                    checked={newKey.is_default}
                    onChange={(e) => setNewKey({ ...newKey, is_default: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="setDefault" className="text-sm text-gray-700 dark:text-gray-300">
                    Set as default key for {PROVIDER_INFO[newKey.provider].name}
                  </label>
                </div>
                
                <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-blue-700 dark:text-blue-300">
                      <p className="font-medium mb-1">Security Note</p>
                      <p>
                        Your API key will be encrypted before storage and will never be visible to other users.
                        We recommend using API keys with restricted permissions when possible.
                      </p>
                    </div>
                  </div>
                </div>

                {testingKey && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Validating API key...</span>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false);
                    setNewKey({ name: '', provider: 'openai', api_key: '', is_default: false });
                  }}
                  className="flex-1"
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddKey}
                  variant="default"
                  className="flex-1"
                  disabled={saving || !newKey.name || !newKey.api_key}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Key'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}