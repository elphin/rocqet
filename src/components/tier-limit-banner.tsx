'use client';

import { AlertCircle, Sparkles, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface TierLimitBannerProps {
  type: 'prompts' | 'api_keys' | 'team_members';
  current: number;
  limit: number;
  tier: string;
  workspaceSlug: string;
}

export function TierLimitBanner({ 
  type, 
  current, 
  limit, 
  tier,
  workspaceSlug 
}: TierLimitBannerProps) {
  const percentage = (current / limit) * 100;
  const isNearLimit = percentage >= 80;
  const isAtLimit = current >= limit;

  if (percentage < 80) return null;

  const messages = {
    prompts: {
      warning: `You've used ${current} of ${limit} prompts in your ${tier} plan.`,
      limit: `You've reached the ${limit} prompt limit for your ${tier} plan.`,
      action: 'Upgrade to create unlimited prompts'
    },
    api_keys: {
      warning: `You have ${current} of ${limit} API keys active.`,
      limit: `You've reached the API key limit for your ${tier} plan.`,
      action: 'Upgrade for more API keys'
    },
    team_members: {
      warning: `${current} of ${limit} seats are occupied.`,
      limit: 'All team seats are occupied.',
      action: 'Add more seats'
    }
  };

  const message = messages[type];
  const displayText = isAtLimit ? message.limit : message.warning;

  return (
    <div className={`
      border rounded-lg p-4 mb-4
      ${isAtLimit 
        ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900' 
        : 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900'
      }
    `}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={`
            p-2 rounded-lg
            ${isAtLimit 
              ? 'bg-red-100 dark:bg-red-900/30' 
              : 'bg-yellow-100 dark:bg-yellow-900/30'
            }
          `}>
            <AlertCircle className={`
              h-5 w-5
              ${isAtLimit 
                ? 'text-red-600 dark:text-red-500' 
                : 'text-yellow-600 dark:text-yellow-500'
              }
            `} />
          </div>
          <div>
            <p className={`
              font-medium
              ${isAtLimit 
                ? 'text-red-900 dark:text-red-100' 
                : 'text-yellow-900 dark:text-yellow-100'
              }
            `}>
              {displayText}
            </p>
            <p className={`
              text-sm mt-1
              ${isAtLimit 
                ? 'text-red-700 dark:text-red-300' 
                : 'text-yellow-700 dark:text-yellow-300'
              }
            `}>
              {message.action}
            </p>
            
            {/* Progress bar */}
            <div className="mt-3 w-64">
              <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                <div 
                  className={`
                    h-full transition-all duration-300
                    ${isAtLimit 
                      ? 'bg-red-500' 
                      : 'bg-yellow-500'
                    }
                  `}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
              <p className="text-xs mt-1 text-neutral-600 dark:text-neutral-400">
                {current} / {limit === -1 ? 'Unlimited' : limit}
              </p>
            </div>
          </div>
        </div>

        <Link href={`/${workspaceSlug}/settings/billing`}>
          <Button 
            size="sm"
            className={`
              ${isAtLimit 
                ? 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600' 
                : 'bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-500 dark:hover:bg-yellow-600'
              }
            `}
          >
            <Sparkles className="h-4 w-4 mr-1" />
            Upgrade
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

interface UsageIndicatorProps {
  current: number;
  limit: number;
  label: string;
}

export function UsageIndicator({ current, limit, label }: UsageIndicatorProps) {
  const percentage = limit === -1 ? 0 : (current / limit) * 100;
  const isUnlimited = limit === -1;
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-neutral-600 dark:text-neutral-400">{label}</span>
        <span className="font-medium text-neutral-900 dark:text-neutral-100">
          {current}{isUnlimited ? '' : ` / ${limit}`}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
          <div 
            className={`
              h-full transition-all duration-300
              ${percentage >= 100 ? 'bg-red-500' : 
                percentage >= 80 ? 'bg-yellow-500' : 
                'bg-green-500'}
            `}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}