'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/lib/toast-config';
import { 
  Building2, 
  Users, 
  Crown, 
  AlertCircle, 
  Save,
  Sparkles
} from 'lucide-react';

interface WorkspaceSettingsClientProps {
  workspace: any;
  memberCount: number;
  userRole: string;
}

const tierInfo = {
  free: {
    name: 'Free',
    maxSeats: 1,
    badge: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    icon: null
  },
  pro: {
    name: 'Pro',
    maxSeats: 1,
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    icon: null
  },
  professional: {
    name: 'Professional',
    maxSeats: 10,
    badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    icon: Sparkles
  },
  business: {
    name: 'Business',
    maxSeats: 50,
    badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
    icon: Crown
  },
  enterprise: {
    name: 'Enterprise',
    maxSeats: 999,
    badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
    icon: Crown
  }
};

export function WorkspaceSettingsClient({ 
  workspace, 
  memberCount, 
  userRole 
}: WorkspaceSettingsClientProps) {
  const [displayName, setDisplayName] = useState(workspace.display_name || workspace.name);
  const [seats, setSeats] = useState(workspace.seats || 1);
  const [saving, setSaving] = useState(false);

  const tier = workspace.subscription_tier || 'free';
  const tierConfig = tierInfo[tier as keyof typeof tierInfo] || tierInfo.free;
  const maxSeats = workspace.max_seats || tierConfig.maxSeats;
  const isTeamTier = ['professional', 'business', 'enterprise'].includes(tier);

  const handleSaveGeneral = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/workspaces/${workspace.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName
        })
      });

      if (!response.ok) throw new Error('Failed to update workspace');
      
      toast.success('Workspace settings updated');
    } catch (error) {
      toast.error('Failed to update workspace settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSeats = async () => {
    if (seats < memberCount) {
      toast.error(`Cannot set seats below current member count (${memberCount})`);
      return;
    }

    if (seats > maxSeats) {
      toast.error(`Cannot exceed maximum seats for ${tierConfig.name} tier (${maxSeats})`);
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/workspaces/${workspace.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seats: seats
        })
      });

      if (!response.ok) throw new Error('Failed to update seats');
      
      toast.success('Seat allocation updated');
    } catch (error) {
      toast.error('Failed to update seat allocation');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-gray-100">
            Workspace Settings
          </h1>
          <p className="text-sm text-neutral-600 dark:text-gray-400 mt-1">
            Manage your workspace configuration and team settings
          </p>
        </div>

        {/* General Settings */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xs border border-neutral-200 dark:border-neutral-800 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Building2 className="w-5 h-5 text-neutral-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-gray-100">
              General
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-gray-300 mb-1">
                Workspace Name (permanent)
              </label>
              <Input
                value={workspace.name}
                disabled
                className="bg-neutral-50 dark:bg-neutral-800 cursor-not-allowed"
              />
              <p className="text-xs text-neutral-500 dark:text-gray-500 mt-1">
                The workspace slug (/{workspace.slug}) cannot be changed after creation
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-gray-300 mb-1">
                Display Name
              </label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter display name"
                className="bg-white dark:bg-neutral-800"
              />
              <p className="text-xs text-neutral-500 dark:text-gray-500 mt-1">
                This name will be shown in the UI but won't affect URLs
              </p>
            </div>

            <Button
              onClick={handleSaveGeneral}
              disabled={saving || displayName === (workspace.display_name || workspace.name)}
              className="bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-white dark:text-neutral-900"
            >
              <Save className="w-4 h-4 mr-2" />
              Save General Settings
            </Button>
          </div>
        </div>

        {/* Team Settings */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xs border border-neutral-200 dark:border-neutral-800 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-5 h-5 text-neutral-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-gray-100">
              Team Settings
            </h2>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${tierConfig.badge}`}>
              {tierConfig.icon && <tierConfig.icon className="w-3 h-3 inline mr-1" />}
              {tierConfig.name} Tier
            </span>
          </div>

          {!isTeamTier ? (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-700">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                    Team features not available
                  </h3>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                    Upgrade to Professional, Business, or Enterprise tier to add team members and manage seats.
                  </p>
                  <Button
                    size="sm"
                    className="mt-3 bg-yellow-600 hover:bg-yellow-700 text-white"
                  >
                    Upgrade to Professional
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-gray-300 mb-1">
                    Current Members
                  </label>
                  <div className="text-2xl font-bold text-neutral-900 dark:text-gray-100">
                    {memberCount}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-gray-300 mb-1">
                    Allocated Seats
                  </label>
                  <Input
                    type="number"
                    value={seats}
                    onChange={(e) => setSeats(parseInt(e.target.value) || 1)}
                    min={memberCount}
                    max={maxSeats}
                    className="text-lg font-bold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-gray-300 mb-1">
                    Maximum Seats
                  </label>
                  <div className="text-2xl font-bold text-neutral-900 dark:text-gray-100">
                    {maxSeats}
                  </div>
                </div>
              </div>

              {seats < memberCount && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-200 dark:border-red-700">
                  <p className="text-xs text-red-700 dark:text-red-300">
                    Cannot set seats below current member count
                  </p>
                </div>
              )}

              {seats > maxSeats && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-200 dark:border-red-700">
                  <p className="text-xs text-red-700 dark:text-red-300">
                    Cannot exceed maximum seats for {tierConfig.name} tier
                  </p>
                </div>
              )}

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Available seats: {seats - memberCount} • 
                  Used: {memberCount}/{seats} • 
                  Tier limit: {maxSeats} seats
                </p>
              </div>

              <Button
                onClick={handleSaveSeats}
                disabled={saving || seats === workspace.seats || seats < memberCount || seats > maxSeats}
                className="bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-white dark:text-neutral-900"
              >
                <Save className="w-4 h-4 mr-2" />
                Update Seat Allocation
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}