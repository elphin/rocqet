'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Key, Plus, Trash2, Eye, EyeOff, Shield, AlertCircle, 
  Check, Settings, Sparkles, Bot, Brain, Zap, Globe,
  ChevronDown, ChevronUp, Star, Lock, Users
} from 'lucide-react';
import { toast } from 'sonner';

interface AiProvider {
  id: string;
  name: string;
  icon: any;
  color: string;
  value: string;
}

const AI_PROVIDERS: AiProvider[] = [
  { id: 'openai', name: 'OpenAI', icon: Brain, color: 'bg-green-500', value: 'openai' },
  { id: 'anthropic', name: 'Anthropic', icon: Bot, color: 'bg-purple-500', value: 'anthropic' },
  { id: 'google', name: 'Google', icon: Globe, color: 'bg-blue-500', value: 'google' },
  { id: 'cohere', name: 'Cohere', icon: Zap, color: 'bg-orange-500', value: 'cohere' },
  { id: 'mistral', name: 'Mistral', icon: Sparkles, color: 'bg-indigo-500', value: 'mistral' },
];

interface AiProvidersClientProps {
  userKeys: any[];
  systemKeys: any[];
  models: any[];
  isAdmin: boolean;
  userUsage: any[];
  userEmail: string;
}

export function AiProvidersClient({
  userKeys,
  systemKeys,
  models,
  isAdmin,
  userUsage,
  userEmail
}: AiProvidersClientProps) {
  const router = useRouter();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showApiKey, setShowApiKey] = useState<string | null>(null);
  const [isSystemKey, setIsSystemKey] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [keyName, setKeyName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [dailyLimit, setDailyLimit] = useState('10');
  const [monthlyLimit, setMonthlyLimit] = useState('100');
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);

  const handleAddKey = async () => {
    if (!selectedProvider || !keyName || !apiKey) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/ai-providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          keyName,
          apiKey,
          isDefault,
          isSystemKey,
          dailyLimit: isSystemKey ? parseInt(dailyLimit) : undefined,
          monthlyLimit: isSystemKey ? parseInt(monthlyLimit) : undefined
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add key');
      }

      toast.success(`${isSystemKey ? 'System' : 'Personal'} API key added successfully`);
      setShowAddForm(false);
      resetForm();
      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteKey = async (keyId: string, isSystem: boolean) => {
    if (!confirm('Are you sure you want to delete this API key?')) return;

    try {
      const response = await fetch(`/api/ai-providers?id=${keyId}&system=${isSystem}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete key');

      toast.success('API key deleted successfully');
      router.refresh();
    } catch (error) {
      toast.error('Failed to delete API key');
    }
  };

  const handleToggleDefault = async (keyId: string, currentDefault: boolean) => {
    try {
      const response = await fetch('/api/ai-providers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyId,
          isDefault: !currentDefault
        })
      });

      if (!response.ok) throw new Error('Failed to update key');

      toast.success(currentDefault ? 'Removed as default' : 'Set as default key');
      router.refresh();
    } catch (error) {
      toast.error('Failed to update key');
    }
  };

  const resetForm = () => {
    setSelectedProvider('');
    setKeyName('');
    setApiKey('');
    setDailyLimit('10');
    setMonthlyLimit('100');
    setIsDefault(false);
    setIsSystemKey(false);
  };

  const getProviderKeys = (providerId: string) => {
    return userKeys.filter(key => key.provider === providerId);
  };

  const getSystemKey = (providerId: string) => {
    return systemKeys.find(key => key.provider === providerId);
  };

  const getProviderUsage = (providerId: string) => {
    const usage = userUsage.find(u => u.provider === providerId);
    return usage || { daily_count: 0, monthly_count: 0 };
  };

  const getProviderModels = (providerId: string) => {
    return models.filter(m => m.provider === providerId);
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-gray-100">AI Provider Keys</h1>
          <p className="text-sm text-neutral-600 dark:text-gray-400 mt-1">
            Manage your AI provider API keys for using AI features in ROCQET
          </p>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">How it works</h3>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                Add your personal API keys to use AI features with your own quotas and billing.
                Without personal keys, you can use limited system keys (if available).
              </p>
              {isAdmin && (
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  <Shield className="w-3 h-3 inline mr-1" />
                  As an admin, you can also manage system-wide fallback keys for all users.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Add New Key Button */}
        <div className="flex justify-end mb-6">
          <Button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add API Key
          </Button>
        </div>

        {/* Add Key Form */}
        {showAddForm && (
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xs border border-neutral-200 dark:border-neutral-800 p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4 text-neutral-900 dark:text-gray-100">
              Add New API Key
            </h3>
            
            {isAdmin && (
              <div className="mb-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isSystemKey}
                    onChange={(e) => setIsSystemKey(e.target.checked)}
                    className="rounded border-neutral-300 dark:border-neutral-600"
                  />
                  <span className="text-sm text-neutral-700 dark:text-gray-300">
                    System-wide key (fallback for all users)
                  </span>
                  <Shield className="w-4 h-4 text-amber-500" />
                </label>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-gray-300 mb-2">
                  Provider
                </label>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-gray-100"
                >
                  <option value="">Select provider...</option>
                  {AI_PROVIDERS.map(provider => (
                    <option key={provider.id} value={provider.value}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-gray-300 mb-2">
                  Key Name
                </label>
                <Input
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder={isSystemKey ? 'System Key' : 'Personal OpenAI Key'}
                  className="bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-700 dark:text-gray-300 mb-2">
                API Key
              </label>
              <div className="relative">
                <Input
                  type={showApiKey === 'new' ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="pr-10 bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(showApiKey === 'new' ? null : 'new')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-gray-300"
                >
                  {showApiKey === 'new' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isSystemKey && (
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-gray-300 mb-2">
                    Daily Limit (per user)
                  </label>
                  <Input
                    type="number"
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(e.target.value)}
                    className="bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-gray-300 mb-2">
                    Monthly Limit (per user)
                  </label>
                  <Input
                    type="number"
                    value={monthlyLimit}
                    onChange={(e) => setMonthlyLimit(e.target.value)}
                    className="bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                  />
                </div>
              </div>
            )}

            {!isSystemKey && (
              <div className="mb-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="rounded border-neutral-300 dark:border-neutral-600"
                  />
                  <span className="text-sm text-neutral-700 dark:text-gray-300">
                    Set as default for this provider
                  </span>
                </label>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleAddKey}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? 'Adding...' : 'Add Key'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  resetForm();
                }}
                className="border-neutral-200 dark:border-neutral-700"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Provider List */}
        <div className="space-y-4">
          {AI_PROVIDERS.map(provider => {
            const providerKeys = getProviderKeys(provider.value);
            const systemKey = getSystemKey(provider.value);
            const hasKeys = providerKeys.length > 0 || systemKey;
            const usage = getProviderUsage(provider.value);
            const providerModels = getProviderModels(provider.value);
            const Icon = provider.icon;

            return (
              <div
                key={provider.id}
                className="bg-white dark:bg-neutral-900 rounded-lg shadow-xs border border-neutral-200 dark:border-neutral-800 overflow-hidden"
              >
                <div
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                  onClick={() => setExpandedProvider(expandedProvider === provider.id ? null : provider.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`${provider.color} p-2 rounded-lg`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-medium text-neutral-900 dark:text-gray-100">
                        {provider.name}
                      </h3>
                      <p className="text-xs text-neutral-600 dark:text-gray-400">
                        {providerKeys.length} personal key{providerKeys.length !== 1 ? 's' : ''}
                        {systemKey && ' • System key available'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {hasKeys && (
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="text-xs text-green-600 dark:text-green-400">Configured</span>
                      </div>
                    )}
                    {expandedProvider === provider.id ? (
                      <ChevronUp className="w-4 h-4 text-neutral-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-neutral-400" />
                    )}
                  </div>
                </div>

                {expandedProvider === provider.id && (
                  <div className="border-t border-neutral-200 dark:border-neutral-800 p-4">
                    {/* Personal Keys */}
                    {providerKeys.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-neutral-700 dark:text-gray-300 mb-2">
                          Personal Keys
                        </h4>
                        <div className="space-y-2">
                          {providerKeys.map(key => (
                            <div
                              key={key.id}
                              className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <Key className="w-4 h-4 text-neutral-400" />
                                <div>
                                  <p className="text-sm font-medium text-neutral-900 dark:text-gray-100">
                                    {key.key_name}
                                  </p>
                                  <p className="text-xs text-neutral-500 dark:text-gray-500">
                                    {key.key_hint} • Used {key.usage_count} times
                                  </p>
                                </div>
                                {key.is_default && (
                                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                                    Default
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleToggleDefault(key.id, key.is_default)}
                                >
                                  <Star className={`w-4 h-4 ${key.is_default ? 'fill-amber-500 text-amber-500' : 'text-neutral-400'}`} />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteKey(key.id, false)}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* System Key */}
                    {systemKey && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-neutral-700 dark:text-gray-300 mb-2">
                          System Fallback Key
                        </h4>
                        <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                              <div>
                                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                                  System Key Active
                                </p>
                                <p className="text-xs text-amber-700 dark:text-amber-300">
                                  {systemKey.key_hint} • Limits: {systemKey.daily_limit}/day, {systemKey.monthly_limit}/month
                                </p>
                                {!isAdmin && (
                                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                                    Your usage: {usage.daily_count}/{systemKey.daily_limit} today, {usage.monthly_count}/{systemKey.monthly_limit} this month
                                  </p>
                                )}
                              </div>
                            </div>
                            {isAdmin && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteKey(systemKey.id, true)}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Available Models */}
                    {providerModels.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-neutral-700 dark:text-gray-300 mb-2">
                          Available Models
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {providerModels.map(model => (
                            <div
                              key={model.id}
                              className="text-xs px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded"
                            >
                              {model.model_name}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {!hasKeys && (
                      <p className="text-sm text-neutral-500 dark:text-gray-500 italic">
                        No API keys configured for this provider
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}