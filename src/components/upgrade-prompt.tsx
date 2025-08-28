'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Zap, 
  Users, 
  Database, 
  Key, 
  Globe, 
  Webhook,
  CheckCircle,
  X
} from 'lucide-react';

interface UpgradePromptProps {
  isOpen: boolean;
  onClose: () => void;
  feature: 'api_keys' | 'team' | 'database' | 'integrations' | 'webhooks';
  currentTier: 'free' | 'pro' | 'enterprise';
  workspaceSlug: string;
}

const FEATURE_INFO = {
  api_keys: {
    title: 'API Keys',
    icon: Key,
    description: 'Generate API keys to integrate ROCQET with your applications',
    availableIn: ['pro', 'enterprise'],
    benefits: [
      'Unlimited API keys',
      'Granular permissions',
      'Usage analytics',
      'Rate limiting controls'
    ]
  },
  team: {
    title: 'Team Collaboration',
    icon: Users,
    description: 'Invite team members to collaborate on prompts and chains',
    availableIn: ['pro', 'enterprise'],
    benefits: [
      'Unlimited team members',
      'Role-based access control',
      'Real-time collaboration',
      'Activity tracking'
    ]
  },
  database: {
    title: 'Database Connections',
    icon: Database,
    description: 'Connect to external databases for dynamic data in your chains',
    availableIn: ['pro', 'enterprise'],
    benefits: [
      'Multiple database connections',
      'SQL query builder',
      'Secure credential storage',
      'Read & write operations'
    ]
  },
  integrations: {
    title: 'Integrations',
    icon: Globe,
    description: 'Connect with third-party services and platforms',
    availableIn: ['enterprise'],
    benefits: [
      'Slack & Discord integration',
      'Zapier connectivity',
      'Custom webhooks',
      'API marketplace access'
    ]
  },
  webhooks: {
    title: 'Webhooks',
    icon: Webhook,
    description: 'Trigger chains via webhooks and send data to external services',
    availableIn: ['pro', 'enterprise'],
    benefits: [
      'Incoming webhooks',
      'Outgoing webhooks',
      'Event-driven automation',
      'Custom headers & auth'
    ]
  }
};

const TIER_PRICING = {
  pro: {
    name: 'Pro',
    price: '$29',
    period: '/month',
    color: 'bg-blue-600 hover:bg-blue-700'
  },
  enterprise: {
    name: 'Enterprise',
    price: 'Custom',
    period: 'pricing',
    color: 'bg-purple-600 hover:bg-purple-700'
  }
};

export function UpgradePrompt({ 
  isOpen, 
  onClose, 
  feature, 
  currentTier,
  workspaceSlug 
}: UpgradePromptProps) {
  const router = useRouter();
  const featureInfo = FEATURE_INFO[feature];
  const Icon = featureInfo.icon;
  
  // Determine which tier is needed for this feature
  const requiredTier = featureInfo.availableIn[0] as 'pro' | 'enterprise';
  const tierInfo = TIER_PRICING[requiredTier];

  const handleUpgrade = () => {
    router.push(`/${workspaceSlug}/settings/billing`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 dark:bg-neutral-800 rounded-lg">
                <Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
              <DialogTitle>{featureInfo.title}</DialogTitle>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <DialogDescription className="mt-3">
            {featureInfo.description}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-6">
          {/* Current Plan */}
          <div className="p-3 bg-gray-50 dark:bg-neutral-900 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Current Plan</span>
              <span className="px-2 py-1 text-xs font-medium bg-gray-200 dark:bg-neutral-800 rounded">
                {currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}
              </span>
            </div>
          </div>

          {/* Benefits */}
          <div>
            <h4 className="text-sm font-medium mb-3">
              Upgrade to {tierInfo.name} to unlock:
            </h4>
            <ul className="space-y-2">
              {featureInfo.benefits.map((benefit, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {benefit}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Pricing */}
          <div className="p-4 border-2 border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50/50 dark:bg-blue-900/20">
            <div className="text-center">
              <div className="text-3xl font-bold">
                {tierInfo.price}
                <span className="text-sm font-normal text-gray-500">
                  {tierInfo.period}
                </span>
              </div>
              {requiredTier === 'pro' && (
                <p className="text-xs text-gray-500 mt-1">
                  Billed monthly • Cancel anytime
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Maybe Later
            </Button>
            <Button
              onClick={handleUpgrade}
              className={`flex-1 text-white ${tierInfo.color}`}
            >
              <Zap className="h-4 w-4 mr-2" />
              Upgrade to {tierInfo.name}
            </Button>
          </div>

          {/* Additional info */}
          {featureInfo.availableIn.length > 1 && (
            <p className="text-xs text-center text-gray-500">
              Also available in: {featureInfo.availableIn.slice(1).join(', ')} plan
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}