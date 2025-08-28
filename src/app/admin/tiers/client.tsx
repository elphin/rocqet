'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Save, Plus, Trash2, Edit2 } from 'lucide-react';

interface TierConfig {
  id: string;
  tier_name: string;
  display_name: string;
  monthly_price: number;
  yearly_price: number;
  description: string;
  features: Record<string, boolean>;
  limits: Record<string, number | string[]>;
  highlighted: boolean;
  cta: string;
  active: boolean;
}

interface TierConfigClientProps {
  tiers: TierConfig[];
  isAdmin: boolean;
}

export function TierConfigClient({ tiers: initialTiers, isAdmin }: TierConfigClientProps) {
  const [tiers, setTiers] = useState<TierConfig[]>(initialTiers);
  const [editingTier, setEditingTier] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const updateTier = (tierId: string, field: string, value: any) => {
    setTiers(prev => prev.map(tier => {
      if (tier.id === tierId) {
        if (field.startsWith('features.')) {
          const featureName = field.replace('features.', '');
          return {
            ...tier,
            features: {
              ...tier.features,
              [featureName]: value
            }
          };
        } else if (field.startsWith('limits.')) {
          const limitName = field.replace('limits.', '');
          return {
            ...tier,
            limits: {
              ...tier.limits,
              [limitName]: value
            }
          };
        } else {
          return {
            ...tier,
            [field]: value
          };
        }
      }
      return tier;
    }));
  };

  const saveTier = async (tier: TierConfig) => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/tiers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tier)
      });

      if (response.ok) {
        toast.success(`${tier.display_name} tier updated successfully`);
        setEditingTier(null);
      } else {
        toast.error('Failed to update tier');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const limitLabels: Record<string, string> = {
    prompts: 'Prompts',
    versions: 'Versions per prompt',
    workspaces: 'Workspaces',
    teamMembers: 'Team Members',
    testRuns: 'Test Runs/month',
    aiModels: 'AI Models'
  };

  const featureLabels: Record<string, string> = {
    sharedPrompts: 'Shared Prompts',
    privateFolders: 'Private Folders',
    teamCollaboration: 'Team Collaboration',
    guestAccess: 'Guest Access',
    batchTesting: 'Batch Testing',
    analytics: 'Analytics Dashboard',
    auditLog: 'Audit Log',
    customBranding: 'Custom Branding',
    sso: 'SSO/SAML',
    apiAccess: 'API Access',
    webhooks: 'Webhooks'
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">Tier Configuration</h1>
              <p className="text-sm text-gray-500">Manage subscription tiers and limits</p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6">
          {tiers.map((tier) => (
            <div key={tier.id} className="rounded-lg bg-white p-6 shadow-sm">
              {/* Tier Header */}
              <div className="mb-6 flex items-center justify-between border-b pb-4">
                <div>
                  <h2 className="text-xl font-semibold">{tier.display_name}</h2>
                  <p className="text-sm text-gray-500">{tier.tier_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  {editingTier === tier.id ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => saveTier(tier)}
                        disabled={saving}
                      >
                        <Save className="mr-1 h-4 w-4" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingTier(null)}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingTier(tier.id)}
                    >
                      <Edit2 className="mr-1 h-4 w-4" />
                      Edit
                    </Button>
                  )}
                </div>
              </div>

              {/* Basic Info */}
              <div className="mb-6 grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Monthly Price (€)
                  </label>
                  <Input
                    type="number"
                    value={tier.monthly_price}
                    onChange={(e) => updateTier(tier.id, 'monthly_price', parseInt(e.target.value))}
                    disabled={editingTier !== tier.id}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Yearly Price (€)
                  </label>
                  <Input
                    type="number"
                    value={tier.yearly_price}
                    onChange={(e) => updateTier(tier.id, 'yearly_price', parseInt(e.target.value))}
                    disabled={editingTier !== tier.id}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    CTA Button Text
                  </label>
                  <Input
                    value={tier.cta}
                    onChange={(e) => updateTier(tier.id, 'cta', e.target.value)}
                    disabled={editingTier !== tier.id}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="mb-6">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Description
                </label>
                <Input
                  value={tier.description}
                  onChange={(e) => updateTier(tier.id, 'description', e.target.value)}
                  disabled={editingTier !== tier.id}
                />
              </div>

              {/* Limits */}
              <div className="mb-6">
                <h3 className="mb-3 font-medium text-gray-900">Limits</h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  {Object.entries(limitLabels).map(([key, label]) => {
                    const value = tier.limits[key];
                    const isUnlimited = value === -1 || value === 'unlimited';
                    
                    if (key === 'aiModels') {
                      return (
                        <div key={key}>
                          <label className="mb-1 block text-sm font-medium text-gray-700">
                            {label}
                          </label>
                          <Input
                            value={Array.isArray(value) ? value.join(', ') : value}
                            onChange={(e) => updateTier(tier.id, `limits.${key}`, e.target.value.split(', '))}
                            disabled={editingTier !== tier.id}
                            placeholder="gpt-3.5-turbo, gpt-4, etc."
                          />
                        </div>
                      );
                    }
                    
                    return (
                      <div key={key}>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          {label}
                        </label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={isUnlimited ? '' : value}
                            onChange={(e) => updateTier(tier.id, `limits.${key}`, 
                              e.target.value === '' ? -1 : parseInt(e.target.value)
                            )}
                            disabled={editingTier !== tier.id || isUnlimited}
                            placeholder={isUnlimited ? 'Unlimited' : '0'}
                          />
                          <label className="flex items-center gap-1 text-sm">
                            <Switch
                              checked={isUnlimited}
                              onCheckedChange={(checked) => 
                                updateTier(tier.id, `limits.${key}`, checked ? -1 : 0)
                              }
                              disabled={editingTier !== tier.id}
                            />
                            ∞
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Features */}
              <div>
                <h3 className="mb-3 font-medium text-gray-900">Features</h3>
                <div className="grid gap-2 sm:grid-cols-3">
                  {Object.entries(featureLabels).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2">
                      <Switch
                        checked={tier.features[key] || false}
                        onCheckedChange={(checked) => updateTier(tier.id, `features.${key}`, checked)}
                        disabled={editingTier !== tier.id}
                      />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}