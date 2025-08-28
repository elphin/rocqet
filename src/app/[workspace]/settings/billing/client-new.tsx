'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Check, X, Sparkles, Users, Crown, Zap, 
  ChevronUp, ChevronDown, AlertCircle, Plus, Minus
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface BillingClientProps {
  workspace: any;
  membership: any;
  tiers: any[];
  usage: {
    prompts: number;
    teamMembers: number;
    testRuns: number;
  };
  params: { workspace: string };
}

export function BillingClient({ 
  workspace, 
  membership, 
  tiers, 
  usage,
  params 
}: BillingClientProps) {
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [teamSeats, setTeamSeats] = useState(2);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const currentTier = workspace.subscription_tier || 'starter';
  const isPersonalWorkspace = workspace.is_personal || workspace.workspace_type === 'personal';

  // Calculate pricing for team tier
  const calculateTeamPrice = (seats: number) => {
    const basePrice = billingPeriod === 'monthly' ? 99 : 990;
    const additionalSeats = Math.max(0, seats - 2);
    const seatPrice = billingPeriod === 'monthly' ? 20 : 200;
    return basePrice + (additionalSeats * seatPrice);
  };

  const handleUpgrade = async (tierName: string) => {
    if (tierName === currentTier) return;
    
    setIsProcessing(true);
    
    try {
      // Different flows for different upgrades
      if (tierName === 'team') {
        // For team tier, we need to create a new team workspace
        const { data: newWorkspace, error } = await supabase
          .from('workspaces')
          .insert({
            name: `${workspace.name} Team`,
            slug: `${workspace.slug}-team-${Math.random().toString(36).substr(2, 5)}`,
            description: 'Team workspace',
            created_by: workspace.created_by,
            workspace_type: 'team',
            is_personal: false,
            subscription_tier: 'team',
            seats: teamSeats,
            max_seats: teamSeats
          })
          .select()
          .single();

        if (error) throw error;

        // Add owner to the new team workspace
        await supabase
          .from('workspace_members')
          .insert({
            workspace_id: newWorkspace.id,
            user_id: workspace.created_by,
            role: 'owner'
          });

        toast.success('Team workspace created! Redirecting...');
        setTimeout(() => {
          router.push(`/${newWorkspace.slug}/dashboard`);
        }, 2000);

      } else if (tierName === 'pro' && isPersonalWorkspace) {
        // Upgrade personal workspace to Pro
        const { error } = await supabase
          .from('workspaces')
          .update({ subscription_tier: 'pro' })
          .eq('id', workspace.id);

        if (error) throw error;

        toast.success('Upgraded to Pro! Features unlocked.');
        router.refresh();

      } else if (tierName === 'starter') {
        // Downgrade handling
        if (usage.prompts > 25) {
          toast.error('You have more than 25 prompts. Please archive some prompts before downgrading.');
          setIsProcessing(false);
          return;
        }

        const { error } = await supabase
          .from('workspaces')
          .update({ subscription_tier: 'starter' })
          .eq('id', workspace.id);

        if (error) throw error;

        toast.success('Downgraded to Starter tier.');
        router.refresh();
      }

    } catch (error: any) {
      console.error('Upgrade error:', error);
      toast.error(error.message || 'Failed to change subscription');
    } finally {
      setIsProcessing(false);
      setShowUpgradeModal(false);
    }
  };

  const tierFeatures = {
    starter: {
      name: 'Starter',
      icon: Sparkles,
      price: 0,
      yearlyPrice: 0,
      color: 'from-gray-500 to-gray-600',
      features: [
        '25 prompts',
        '5 versions per prompt',
        '100 test runs/month',
        'Basic folders',
        'Public sharing',
        'GPT-3.5 & Claude Haiku'
      ],
      limitations: [
        'No private folders',
        'No API access',
        'No analytics',
        'No team features'
      ]
    },
    pro: {
      name: 'Pro',
      icon: Zap,
      price: 19,
      yearlyPrice: 190,
      color: 'from-blue-500 to-blue-600',
      features: [
        'Unlimited prompts',
        'Unlimited versions',
        '5,000 test runs/month',
        'Private folders & subfolders',
        'API access',
        'Analytics',
        'All AI models',
        'Export/Import',
        '1 guest user'
      ],
      limitations: [
        'No team collaboration',
        'Single workspace only'
      ]
    },
    team: {
      name: 'Team',
      icon: Users,
      price: 99,
      yearlyPrice: 990,
      color: 'from-purple-500 to-purple-600',
      features: [
        'Everything in Pro',
        `${teamSeats} team members`,
        'Multiple team workspaces',
        'Role-based access',
        'Advanced analytics',
        'Audit logs',
        'Webhooks',
        'Priority support',
        'Custom branding',
        'Unlimited test runs'
      ],
      limitations: []
    }
  };

  const currentTierInfo = tierFeatures[currentTier];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
            Billing & Subscription
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Manage your subscription and billing settings
          </p>
        </div>

        {/* Current Plan */}
        <Card className="mb-8 overflow-hidden">
          <div className={`h-2 bg-gradient-to-r ${currentTierInfo.color}`} />
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${currentTierInfo.color}`}>
                  <currentTierInfo.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                    Current Plan: {currentTierInfo.name}
                  </h2>
                  <p className="text-neutral-600 dark:text-neutral-400 mt-1">
                    {isPersonalWorkspace ? 'Personal Workspace' : 'Team Workspace'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                  €{currentTierInfo.price}
                  <span className="text-sm font-normal text-neutral-600 dark:text-neutral-400">/month</span>
                </div>
              </div>
            </div>

            {/* Usage Stats */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                <div className="text-sm text-neutral-600 dark:text-neutral-400">Prompts</div>
                <div className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                  {usage.prompts}
                  {currentTier === 'starter' && <span className="text-sm text-neutral-500">/25</span>}
                </div>
              </div>
              <div className="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                <div className="text-sm text-neutral-600 dark:text-neutral-400">Team Members</div>
                <div className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                  {usage.teamMembers}
                  {currentTier === 'team' && <span className="text-sm text-neutral-500">/{workspace.seats || 2}</span>}
                </div>
              </div>
              <div className="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                <div className="text-sm text-neutral-600 dark:text-neutral-400">Test Runs</div>
                <div className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                  {usage.testRuns}
                  {currentTier === 'starter' && <span className="text-sm text-neutral-500">/100</span>}
                  {currentTier === 'pro' && <span className="text-sm text-neutral-500">/5k</span>}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Billing Period Toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-3 p-1 bg-neutral-200 dark:bg-neutral-800 rounded-lg">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-4 py-2 rounded-md transition-all ${
                billingPeriod === 'monthly'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-4 py-2 rounded-md transition-all ${
                billingPeriod === 'yearly'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              Yearly
              <span className="ml-1 text-xs text-green-600 dark:text-green-400">Save 17%</span>
            </button>
          </div>
        </div>

        {/* Tier Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {Object.entries(tierFeatures).map(([key, tier]) => {
            const isCurrentTier = key === currentTier;
            const canUpgrade = !isCurrentTier && (
              (key === 'pro' && currentTier === 'starter' && isPersonalWorkspace) ||
              (key === 'team' && currentTier !== 'team')
            );
            const canDowngrade = !isCurrentTier && key === 'starter' && currentTier === 'pro';

            return (
              <Card 
                key={key}
                className={`relative overflow-hidden ${
                  isCurrentTier ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                {isCurrentTier && (
                  <div className="absolute top-4 right-4">
                    <span className="px-2 py-1 bg-blue-500 text-white text-xs font-medium rounded">
                      Current
                    </span>
                  </div>
                )}
                
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                        {tier.name}
                      </h3>
                    </div>
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${tier.color}`}>
                      <tier.icon className="h-5 w-5 text-white" />
                    </div>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-baseline">
                      <span className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
                        €{key === 'team' ? calculateTeamPrice(teamSeats) : 
                           billingPeriod === 'monthly' ? tier.price : tier.yearlyPrice}
                      </span>
                      <span className="ml-2 text-neutral-600 dark:text-neutral-400">
                        /{billingPeriod === 'monthly' ? 'month' : 'year'}
                      </span>
                    </div>
                    {key === 'team' && (
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-sm text-neutral-600 dark:text-neutral-400">Team seats:</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setTeamSeats(Math.max(2, teamSeats - 1))}
                            className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded"
                            disabled={teamSeats <= 2}
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="px-2 font-medium">{teamSeats}</span>
                          <button
                            onClick={() => setTeamSeats(teamSeats + 1)}
                            className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 mb-6">
                    {tier.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-neutral-700 dark:text-neutral-300">{feature}</span>
                      </div>
                    ))}
                    {tier.limitations.map((limitation, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <X className="h-4 w-4 text-neutral-400 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-neutral-500">{limitation}</span>
                      </div>
                    ))}
                  </div>

                  {canUpgrade && (
                    <Button
                      onClick={() => handleUpgrade(key)}
                      disabled={isProcessing}
                      className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                    >
                      {key === 'team' ? 'Create Team Workspace' : 'Upgrade'}
                    </Button>
                  )}
                  
                  {canDowngrade && (
                    <Button
                      onClick={() => handleUpgrade(key)}
                      disabled={isProcessing}
                      variant="outline"
                      className="w-full"
                    >
                      Downgrade
                    </Button>
                  )}
                  
                  {isCurrentTier && (
                    <Button disabled className="w-full" variant="outline">
                      Current Plan
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Warning for downgrades */}
        {currentTier !== 'starter' && (
          <Card className="border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-950/20">
            <div className="p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-neutral-900 dark:text-neutral-100">Downgrade Notice</h4>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                  Downgrading will disable features immediately. Ensure you have:
                </p>
                <ul className="text-sm text-neutral-600 dark:text-neutral-400 mt-2 ml-4 list-disc">
                  <li>Less than 25 prompts for Starter tier</li>
                  <li>Exported any important data</li>
                  <li>Removed team members (for Team → Pro/Starter)</li>
                </ul>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}