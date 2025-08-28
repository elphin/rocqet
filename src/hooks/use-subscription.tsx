'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { 
  TierName, 
  canAccessFeature, 
  shouldUpgrade,
  SUBSCRIPTION_TIERS 
} from '@/lib/subscription-tiers';

interface WorkspaceSubscription {
  tier: TierName;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'paused';
  period: 'monthly' | 'yearly';
  startsAt: Date;
  endsAt?: Date;
  trialEndsAt?: Date;
}

interface WorkspaceUsage {
  prompts: number;
  testRuns: number;
  apiCalls: number;
  teamMembers: number;
  workspaces: number;
}

export function useSubscription(workspaceId: string) {
  const [subscription, setSubscription] = useState<WorkspaceSubscription | null>(null);
  const [usage, setUsage] = useState<WorkspaceUsage | null>(null);
  const [tierConfig, setTierConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!workspaceId) return;

    const fetchSubscriptionData = async () => {
      const supabase = createClient();
      
      try {
        // Fetch workspace subscription info
        const { data: workspace } = await supabase
          .from('workspaces')
          .select(`
            subscription_tier,
            subscription_status,
            subscription_period,
            subscription_started_at,
            subscription_ends_at,
            trial_ends_at
          `)
          .eq('id', workspaceId)
          .single();

        // Check for dev override
        const { data: override } = await supabase
          .from('dev_tier_overrides')
          .select('*')
          .eq('workspace_id', workspaceId)
          .eq('enabled', true)
          .single();

        const effectiveTier = (override?.override_tier || workspace?.subscription_tier || 'free') as TierName;

        if (workspace) {
          setSubscription({
            tier: effectiveTier,
            status: workspace.subscription_status || 'active',
            period: workspace.subscription_period || 'monthly',
            startsAt: new Date(workspace.subscription_started_at),
            endsAt: workspace.subscription_ends_at ? new Date(workspace.subscription_ends_at) : undefined,
            trialEndsAt: workspace.trial_ends_at ? new Date(workspace.trial_ends_at) : undefined
          });
        }

        // Fetch dynamic tier configuration
        const { data: tierData } = await supabase
          .from('tier_configurations')
          .select('*')
          .eq('tier_name', effectiveTier)
          .eq('active', true)
          .single();

        if (tierData) {
          setTierConfig({
            name: tierData.tier_name,
            displayName: tierData.display_name,
            features: tierData.features,
            limits: tierData.limits,
            price: {
              monthly: tierData.monthly_price,
              yearly: tierData.yearly_price
            }
          });
        }

        // Fetch current usage
        const currentMonth = new Date();
        currentMonth.setDate(1);
        currentMonth.setHours(0, 0, 0, 0);

        const { data: usageData } = await supabase
          .from('workspace_usage')
          .select('*')
          .eq('workspace_id', workspaceId)
          .eq('month', currentMonth.toISOString().split('T')[0])
          .single();

        // Count team members
        const { count: memberCount } = await supabase
          .from('workspace_members')
          .select('id', { count: 'exact' })
          .eq('workspace_id', workspaceId);

        // Count workspaces for the current user
        const { data: { user } } = await supabase.auth.getUser();
        const { count: workspaceCount } = await supabase
          .from('workspace_members')
          .select('workspace_id', { count: 'exact' })
          .eq('user_id', user?.id);

        // Count prompts
        const { count: promptCount } = await supabase
          .from('prompts')
          .select('id', { count: 'exact' })
          .eq('workspace_id', workspaceId);

        setUsage({
          prompts: promptCount || 0,
          testRuns: usageData?.test_runs_count || 0,
          apiCalls: usageData?.api_calls_count || 0,
          teamMembers: memberCount || 0,
          workspaces: workspaceCount || 0
        });
      } catch (error) {
        console.error('Error fetching subscription data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptionData();

    // Set up real-time subscription for usage updates
    const supabase = createClient();
    const channel = supabase
      .channel(`usage-${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workspace_usage',
          filter: `workspace_id=eq.${workspaceId}`
        },
        (payload) => {
          if (payload.new) {
            setUsage(prev => ({
              ...prev!,
              testRuns: payload.new.test_runs_count || 0,
              apiCalls: payload.new.api_calls_count || 0
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId]);

  const checkLimit = (feature: string) => {
    if (!subscription || !usage || !tierConfig) return { allowed: true };
    
    let currentUsage: number | undefined;
    let limit: number | undefined;
    
    // Get current usage for the feature
    switch (feature) {
      case 'prompts':
        currentUsage = usage.prompts;
        limit = tierConfig.limits.prompts;
        break;
      case 'teamMembers':
        currentUsage = usage.teamMembers;
        limit = tierConfig.limits.teamMembers;
        break;
      case 'workspaces':
        currentUsage = usage.workspaces;
        limit = tierConfig.limits.workspaces;
        break;
      case 'testRuns':
        currentUsage = usage.testRuns;
        limit = tierConfig.limits.testRuns;
        break;
      default:
        // For boolean features
        return { allowed: tierConfig.features[feature] === true };
    }

    // -1 means unlimited
    if (limit === -1 || limit === undefined) {
      return { allowed: true, unlimited: true };
    }

    return {
      allowed: currentUsage < limit,
      limit,
      current: currentUsage,
      remaining: Math.max(0, limit - currentUsage)
    };
  };

  const requireUpgrade = (
    feature: keyof typeof SUBSCRIPTION_TIERS.free.features,
    action?: string
  ) => {
    if (!subscription || !usage) return false;

    let currentUsage: number | undefined;
    
    switch (feature) {
      case 'prompts':
        currentUsage = usage.prompts;
        break;
      case 'teamMembers':
        currentUsage = usage.teamMembers;
        break;
      case 'workspaces':
        currentUsage = usage.workspaces;
        break;
      case 'testRuns':
        currentUsage = usage.testRuns;
        break;
    }

    const upgrade = shouldUpgrade(subscription.tier, feature, currentUsage);
    
    if (upgrade.shouldUpgrade) {
      toast.error(
        upgrade.reason || `Upgrade to ${upgrade.suggestedTier} to ${action || 'access this feature'}`,
        {
          action: {
            label: 'Upgrade',
            onClick: () => router.push(`/${workspaceId}/settings/billing`)
          }
        }
      );
      return true;
    }
    
    return false;
  };

  const isFeatureEnabled = (feature: keyof typeof SUBSCRIPTION_TIERS.free.features): boolean => {
    if (!subscription) return false;
    
    const tierConfig = SUBSCRIPTION_TIERS[subscription.tier];
    const featureValue = tierConfig.features[feature];
    
    return featureValue === true || featureValue === 'unlimited' || 
           (typeof featureValue === 'number' && featureValue > 0);
  };

  const getUsagePercentage = (feature: 'prompts' | 'teamMembers' | 'testRuns'): number => {
    if (!subscription || !usage) return 0;
    
    const tierConfig = SUBSCRIPTION_TIERS[subscription.tier];
    const limit = tierConfig.features[feature];
    
    if (limit === 'unlimited' || typeof limit !== 'number') return 0;
    
    const current = usage[feature];
    return Math.min(100, Math.round((current / limit) * 100));
  };

  const isTrialing = (): boolean => {
    return subscription?.status === 'trialing' && 
           subscription.trialEndsAt !== undefined &&
           subscription.trialEndsAt > new Date();
  };

  const daysLeftInTrial = (): number => {
    if (!subscription?.trialEndsAt || !isTrialing()) return 0;
    
    const now = new Date();
    const diff = subscription.trialEndsAt.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  return {
    subscription,
    usage,
    loading,
    checkLimit,
    requireUpgrade,
    isFeatureEnabled,
    getUsagePercentage,
    isTrialing,
    daysLeftInTrial,
    tierConfig: subscription ? SUBSCRIPTION_TIERS[subscription.tier] : null
  };
}