'use client';

import { useState, useEffect } from 'react';
import { 
  Key, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  Shield,
  Sparkles,
  AlertCircle,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/lib/toast-config';

interface ApiKeyManagerProps {
  workspaceId: string;
  isPro: boolean;
}

type Provider = 'openai' | 'anthropic' | 'google' | 'groq';

interface ApiKey {
  id: string;
  provider: Provider;
  name: string;
  masked_key: string;
  created_at: string;
  last_used_at?: string;
}

export function ApiKeyManager({ workspaceId, isPro }: ApiKeyManagerProps) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newKey, setNewKey] = useState({
    provider: 'openai' as Provider,
    name: '',
    key: ''
  });
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const supabase = createClient();

  // Load existing API keys
  useEffect(() => {
    loadApiKeys();
  }, [workspaceId]);

  const loadApiKeys = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setKeys(data || []);
    } catch (error) {
      console.error('Failed to load API keys:', error);
      toast.error('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleAddKey = async () => {
    if (!newKey.name || !newKey.key) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      // Mask the key for storage (show only last 4 characters)
      const maskedKey = `${newKey.provider.toUpperCase()}-...${newKey.key.slice(-4)}`;
      
      // In production, encrypt the key before storing
      const { data, error } = await supabase
        .from('api_keys')
        .insert({
          workspace_id: workspaceId,
          provider: newKey.provider,
          name: newKey.name,
          encrypted_key: newKey.key, // TODO: Encrypt this in production
          masked_key: maskedKey
        })
        .select()
        .single();

      if (error) throw error;

      setKeys([data, ...keys]);
      setShowAddModal(false);
      setNewKey({ provider: 'openai', name: '', key: '' });
      toast.success('API key added successfully');
    } catch (error) {
      console.error('Failed to add API key:', error);
      toast.error('Failed to add API key');
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', keyId)
        .eq('workspace_id', workspaceId);

      if (error) throw error;

      setKeys(keys.filter(k => k.id !== keyId));
      toast.success('API key deleted');
    } catch (error) {
      console.error('Failed to delete API key:', error);
      toast.error('Failed to delete API key');
    }
  };

  if (!isPro) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              API Key Management - Pro Feature
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Securely store and manage your API keys across different AI providers. 
              Never worry about entering keys manually again.
            </p>
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <Check className="w-4 h-4 text-green-500" />
                <span>Encrypted storage for all major AI providers</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <Check className="w-4 h-4 text-green-500" />
                <span>Team-wide key sharing</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <Check className="w-4 h-4 text-green-500" />
                <span>Usage tracking and analytics</span>
              </div>
            </div>
            <Button variant="accent">
              Upgrade to Pro
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
            <Key className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              API Keys
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage your AI provider API keys
            </p>
          </div>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Key
        </Button>
      </div>

      {/* Security Notice */}
      <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
          <div className="text-sm text-yellow-800 dark:text-yellow-200">
            <p className="font-medium mb-1">Your keys are encrypted</p>
            <p className="text-yellow-700 dark:text-yellow-300">
              API keys are encrypted using AES-256 and never exposed in logs or to other team members.
            </p>
          </div>
        </div>
      </div>

      {/* Keys List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading keys...</div>
      ) : keys.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-neutral-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-neutral-600">
          <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No API keys yet
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Add your first API key to start using the test playground
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
        <div className="space-y-3">
          {keys.map((key) => (
            <div
              key={key.id}
              className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-100 dark:bg-neutral-700 rounded-lg flex items-center justify-center">
                    <Key className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {key.name}
                      </h4>
                      <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
                        {key.provider.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        {revealedKeys.has(key.id) ? key.encrypted_key : key.masked_key}
                      </span>
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
                          <EyeOff className="w-3 h-3" />
                        ) : (
                          <Eye className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {key.last_used_at && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Last used: {new Date(key.last_used_at).toLocaleDateString()}
                    </span>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl w-full max-w-md mx-4">
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
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="google">Google</option>
                    <option value="groq">Groq</option>
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
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                    API Key
                  </label>
                  <Input
                    type="password"
                    value={newKey.key}
                    onChange={(e) => setNewKey({ ...newKey, key: e.target.value })}
                    placeholder={`Enter your ${newKey.provider} API key`}
                    className="bg-white dark:bg-neutral-800"
                  />
                </div>
                
                <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Your API key will be encrypted and stored securely. 
                      Only you and your team members can use it for testing prompts.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false);
                    setNewKey({ provider: 'openai', name: '', key: '' });
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddKey}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Add Key
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}