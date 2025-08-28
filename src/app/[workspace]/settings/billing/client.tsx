'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Check, 
  X,
  Crown,
  Zap,
  Building2,
  CreditCard,
  Users,
  TestTube,
  Database,
  Shield,
  Sparkles,
  TrendingUp,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface BillingClientProps {
  workspace: any;
  membership: any;
  tiers: any[];
  usage: {
    prompts: number;
    teamMembers: number;
    testRuns: number;
  };
  params: {
    workspace: string;
  };
}

const tierIcons = {
  free: Crown,
  pro: Zap,
  business: Building2
};

const tierColors = {
  free: 'border-gray-200',
  pro: 'border-blue-500 shadow-blue-100',
  business: 'border-purple-500 shadow-purple-100'
};

export function BillingClient({
  workspace,
  membership,
  tiers,
  usage,
  params
}: BillingClientProps) {
  const router = useRouter();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [isUpgrading, setIsUpgrading] = useState(false);
  const currentTier = workspace.subscription_tier || 'free';

  const handleUpgrade = async (tierName: string) => {
    if (membership.role !== 'owner') {
      toast.error('Only workspace owners can change billing');
      return;
    }

    setIsUpgrading(true);
    
    // In production, this would integrate with Stripe
    toast.info('Stripe integration coming soon!');
    
    // For now, just update the tier in the database (dev mode)
    try {
      const response = await fetch('/api/billing/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspace.id,
          tier: tierName,
          period: billingPeriod
        })
      });

      if (response.ok) {
        toast.success(`Upgraded to ${tierName} tier!`);
        router.refresh();
      } else {
        toast.error('Failed to upgrade');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsUpgrading(false);
    }
  };

  const formatLimit = (value: any) => {
    if (value === undefined || value === null) return 'N/A';
    if (value === -1) return 'Unlimited';
    if (Array.isArray(value)) return value.join(', ');
    return value.toString();
  };

  const getUsagePercentage = (current: number, limit: number | undefined) => {
    if (!limit || limit === -1) return 0;
    return Math.min(100, Math.round((current / limit) * 100));
  };

  const featureCategories = [
    {
      name: 'Core Features',
      features: [
        { key: 'prompts', label: 'Prompts', icon: Database },
        { key: 'versions', label: 'Version History', icon: TrendingUp },
        { key: 'workspaces', label: 'Workspaces', icon: Building2 },
        { key: 'teamMembers', label: 'Team Members', icon: Users },
        { key: 'testRuns', label: 'Test Runs/month', icon: TestTube }
      ]
    },
    {
      name: 'Collaboration',
      features: [
        { key: 'sharedPrompts', label: 'Shared Prompts', boolean: true },
        { key: 'privateFolders', label: 'Private Folders', boolean: true },
        { key: 'teamCollaboration', label: 'Team Collaboration', boolean: true },
        { key: 'guestAccess', label: 'Guest Access', boolean: true }
      ]
    },
    {
      name: 'Advanced Features',
      features: [
        { key: 'batchTesting', label: 'Batch Testing', boolean: true },
        { key: 'analytics', label: 'Analytics Dashboard', boolean: true },
        { key: 'auditLog', label: 'Audit Log', boolean: true },
        { key: 'apiAccess', label: 'API Access', boolean: true }
      ]
    },
    {
      name: 'Enterprise',
      features: [
        { key: 'customBranding', label: 'Custom Branding', boolean: true },
        { key: 'sso', label: 'SSO/SAML', boolean: true },
        { key: 'webhooks', label: 'Webhooks', boolean: true }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center gap-4">
            <Link href={`/${params.workspace}/settings`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold">Billing & Subscription</h1>
              <p className="text-sm text-gray-500">Manage your plan and billing</p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Current Plan */}
        <div className="mb-8 rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Current Plan</h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {currentTier && tierIcons[currentTier as keyof typeof tierIcons] && (
                <div className={`rounded-full p-3 ${
                  currentTier === 'free' ? 'bg-gray-100' :
                  currentTier === 'pro' ? 'bg-blue-100' :
                  'bg-purple-100'
                }`}>
                  {(() => {
                    const Icon = tierIcons[currentTier as keyof typeof tierIcons];
                    return <Icon className={`h-6 w-6 ${
                      currentTier === 'free' ? 'text-gray-600' :
                      currentTier === 'pro' ? 'text-blue-600' :
                      'text-purple-600'
                    }`} />;
                  })()}
                </div>
              )}
              <div>
                <p className="text-xl font-bold capitalize">{currentTier}</p>
                <p className="text-sm text-gray-500">
                  {workspace.subscription_status === 'trialing' 
                    ? `Trial ends ${new Date(workspace.trial_ends_at).toLocaleDateString()}`
                    : workspace.subscription_period || 'Monthly billing'
                  }
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">
                €{tiers.find(t => t.tier_name === currentTier)?.monthly_price || 0}
              </p>
              <p className="text-sm text-gray-500">per month</p>
            </div>
          </div>

          {/* Usage Overview */}
          <div className="mt-6 grid gap-4 border-t pt-6 sm:grid-cols-3">
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Prompts</span>
                <span className="font-medium">
                  {usage.prompts} / {formatLimit(tiers.find(t => t.tier_name === currentTier)?.limits?.prompts)}
                </span>
              </div>
              {tiers.find(t => t.tier_name === currentTier)?.limits?.prompts && 
               tiers.find(t => t.tier_name === currentTier)?.limits?.prompts !== -1 && (
                <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
                  <div 
                    className="h-2 rounded-full bg-blue-600 transition-all"
                    style={{ 
                      width: `${getUsagePercentage(
                        usage.prompts, 
                        tiers.find(t => t.tier_name === currentTier)?.limits?.prompts
                      )}%` 
                    }}
                  />
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Team Members</span>
                <span className="font-medium">
                  {usage.teamMembers} / {formatLimit(tiers.find(t => t.tier_name === currentTier)?.limits?.teamMembers)}
                </span>
              </div>
              {tiers.find(t => t.tier_name === currentTier)?.limits?.teamMembers && 
               tiers.find(t => t.tier_name === currentTier)?.limits?.teamMembers !== -1 && (
                <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
                  <div 
                    className="h-2 rounded-full bg-blue-600 transition-all"
                    style={{ 
                      width: `${getUsagePercentage(
                        usage.teamMembers, 
                        tiers.find(t => t.tier_name === currentTier)?.limits?.teamMembers
                      )}%` 
                    }}
                  />
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Test Runs</span>
                <span className="font-medium">
                  {usage.testRuns} / {formatLimit(tiers.find(t => t.tier_name === currentTier)?.limits?.testRuns)}
                </span>
              </div>
              {tiers.find(t => t.tier_name === currentTier)?.limits?.testRuns && 
               tiers.find(t => t.tier_name === currentTier)?.limits?.testRuns !== -1 && (
                <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
                  <div 
                    className="h-2 rounded-full bg-blue-600 transition-all"
                    style={{ 
                      width: `${getUsagePercentage(
                        usage.testRuns, 
                        tiers.find(t => t.tier_name === currentTier)?.limits?.testRuns
                      )}%` 
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Billing Period Toggle */}
        <div className="mb-8 flex items-center justify-center gap-4">
          <span className={billingPeriod === 'monthly' ? 'font-medium' : 'text-gray-500'}>
            Monthly
          </span>
          <Switch
            checked={billingPeriod === 'yearly'}
            onCheckedChange={(checked) => setBillingPeriod(checked ? 'yearly' : 'monthly')}
          />
          <span className={billingPeriod === 'yearly' ? 'font-medium' : 'text-gray-500'}>
            Yearly
            <span className="ml-1 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
              Save 17%
            </span>
          </span>
        </div>

        {/* Pricing Cards */}
        <div className="mb-8 grid gap-6 lg:grid-cols-3">
          {tiers.length === 0 ? (
            <div className="col-span-3 rounded-lg bg-yellow-50 border border-yellow-200 p-6">
              <p className="text-yellow-800">
                No pricing tiers configured. Please run the database setup script to initialize tiers.
              </p>
            </div>
          ) : (
          tiers.map((tier) => {
            const Icon = tierIcons[tier.tier_name as keyof typeof tierIcons];
            const isCurrentTier = tier.tier_name === currentTier;
            const price = billingPeriod === 'yearly' 
              ? Math.floor(tier.yearly_price / 12) 
              : tier.monthly_price;
            
            return (
              <div
                key={tier.tier_name}
                className={`relative rounded-lg border-2 bg-white p-6 ${
                  tierColors[tier.tier_name as keyof typeof tierColors]
                } ${tier.highlighted ? 'shadow-lg' : ''}`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white">
                    Most Popular
                  </div>
                )}
                
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {Icon && <Icon className="h-5 w-5" />}
                    <h3 className="text-lg font-semibold">{tier.display_name}</h3>
                  </div>
                  {isCurrentTier && (
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium">
                      Current
                    </span>
                  )}
                </div>

                <div className="mb-4">
                  <p className="text-3xl font-bold">
                    €{price}
                    <span className="text-base font-normal text-gray-500">/month</span>
                  </p>
                  {billingPeriod === 'yearly' && (
                    <p className="text-sm text-gray-500">
                      €{tier.yearly_price} billed yearly
                    </p>
                  )}
                </div>

                <p className="mb-6 text-sm text-gray-600">{tier.description}</p>

                {/* Key Limits */}
                <div className="mb-6 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>
                      {formatLimit(tier.limits?.prompts)} prompts
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>
                      {formatLimit(tier.limits?.teamMembers)} team member{tier.limits?.teamMembers !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>
                      {formatLimit(tier.limits?.testRuns)} test runs/month
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>
                      {formatLimit(tier.limits?.workspaces)} workspace{tier.limits?.workspaces !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <Button
                  className="w-full"
                  variant={isCurrentTier ? 'outline' : 'default'}
                  disabled={isCurrentTier || isUpgrading}
                  onClick={() => handleUpgrade(tier.tier_name)}
                >
                  {isCurrentTier ? 'Current Plan' : tier.cta}
                </Button>
              </div>
            );
          }))}
        </div>

        {/* Feature Comparison */}
        {tiers.length > 0 && (
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-lg font-semibold">Feature Comparison</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="pb-4 text-left font-medium">Features</th>
                  {tiers.map((tier) => (
                    <th key={tier.tier_name} className="pb-4 text-center font-medium">
                      <div className="flex items-center justify-center gap-2">
                        {(() => {
                          const Icon = tierIcons[tier.tier_name as keyof typeof tierIcons];
                          return Icon ? <Icon className="h-4 w-4" /> : null;
                        })()}
                        {tier.display_name}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {featureCategories.map((category) => (
                  <>
                    <tr key={category.name}>
                      <td colSpan={4} className="pt-6 pb-2">
                        <div className="text-sm font-medium text-gray-500">
                          {category.name}
                        </div>
                      </td>
                    </tr>
                    {category.features.map((feature) => (
                      <tr key={feature.key} className="border-b">
                        <td className="py-3 text-sm">{feature.label}</td>
                        {tiers.map((tier) => {
                          const value = feature.boolean
                            ? tier.features?.[feature.key]
                            : tier.limits?.[feature.key];
                          
                          return (
                            <td key={tier.tier_name} className="py-3 text-center">
                              {feature.boolean ? (
                                value ? (
                                  <Check className="mx-auto h-5 w-5 text-green-600" />
                                ) : (
                                  <X className="mx-auto h-5 w-5 text-gray-300" />
                                )
                              ) : (
                                <span className="text-sm font-medium">
                                  {formatLimit(value)}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* Billing Info */}
        {membership.role === 'owner' && (
          <div className="mt-8 rounded-lg bg-blue-50 border border-blue-200 p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900">Billing Information</h3>
                <p className="mt-1 text-sm text-blue-700">
                  Only workspace owners can manage billing. Stripe integration is coming soon.
                  For now, you can test different tiers using the development mode (Ctrl+Shift+T).
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}