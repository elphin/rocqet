'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Crown, Zap, Building2, Globe, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface TierSwitcherProps {
  workspaceId: string;
  currentTier?: string;
}

const TIERS = [
  {
    id: 'free',
    name: 'Free',
    icon: Globe,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    limits: {
      prompts: '1,000/mo',
      members: '5',
      apiKeys: '1'
    }
  },
  {
    id: 'pro',
    name: 'Pro',
    icon: Zap,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    limits: {
      prompts: '10,000/mo',
      members: '20',
      apiKeys: '5'
    }
  },
  {
    id: 'business',
    name: 'Business',
    icon: Building2,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    limits: {
      prompts: '100,000/mo',
      members: '100',
      apiKeys: 'Unlimited'
    }
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    icon: Crown,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    limits: {
      prompts: 'Unlimited',
      members: 'Unlimited',
      apiKeys: 'Unlimited'
    }
  }
];

export function TierSwitcher({ workspaceId, currentTier = 'free' }: TierSwitcherProps) {
  const router = useRouter();
  const [selectedTier, setSelectedTier] = useState(currentTier);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleTierChange = async (newTier: string) => {
    if (newTier === selectedTier) return;
    
    setIsUpdating(true);
    
    try {
      const response = await fetch('/api/workspace/update-tier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          tier: newTier
        })
      });

      const result = await response.json();

      if (response.ok) {
        setSelectedTier(newTier);
        toast.success(`Switched to ${newTier.toUpperCase()} tier`, {
          description: 'Page will refresh to apply changes'
        });
        setIsOpen(false);
        
        // Refresh page after short delay
        setTimeout(() => {
          router.refresh();
          window.location.reload();
        }, 1000);
      } else {
        toast.error(result.error || 'Failed to update tier');
      }
    } catch (error) {
      toast.error('An error occurred while updating tier');
      console.error('Tier update error:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const currentTierInfo = TIERS.find(t => t.id === selectedTier) || TIERS[0];

  // Only show in development
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-4 right-4 z-40">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className={`${currentTierInfo.bgColor} ${currentTierInfo.color} border-0 shadow-lg`}
          variant="outline"
          size="sm"
        >
          <currentTierInfo.icon className="h-4 w-4 mr-2" />
          {currentTierInfo.name} Tier
          <ChevronDown className="h-3 w-3 ml-2" />
        </Button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="fixed bottom-16 right-4 z-50">
          <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl border border-gray-200 dark:border-neutral-700 p-2 w-72">
            <div className="mb-2 px-2 py-1">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                Development Tier Switcher
              </h3>
            </div>
            
            <div className="space-y-1">
              {TIERS.map((tier) => (
                <button
                  key={tier.id}
                  onClick={() => handleTierChange(tier.id)}
                  disabled={isUpdating}
                  className={`
                    w-full p-3 rounded-lg border transition-all text-left
                    ${tier.id === selectedTier 
                      ? `border-blue-500 ${tier.bgColor}` 
                      : 'border-transparent hover:bg-gray-50 dark:hover:bg-neutral-700'
                    }
                    ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <tier.icon className={`h-5 w-5 ${tier.color}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {tier.name}
                          </span>
                          {tier.id === selectedTier && (
                            <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                          {tier.limits.prompts} prompts • {tier.limits.members} members • {tier.limits.apiKeys} API keys
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-neutral-700">
              <div className="text-[10px] text-gray-500 dark:text-gray-500 px-2">
                ⚠️ Dev only - Changes workspace subscription tier for testing
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}