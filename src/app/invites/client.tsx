'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { 
  Mail, 
  Users, 
  Shield, 
  Clock, 
  Check, 
  X,
  ArrowRight,
  Building,
  User,
  Crown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface Invite {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  expires_at: string;
  token: string;
  workspaces: {
    id: string;
    name: string;
    slug: string;
    logo_url?: string;
    subscription_tier: string;
  };
}

interface Membership {
  workspace_id: string;
  role: string;
  workspaces: {
    id: string;
    name: string;
    slug: string;
  };
}

interface InvitesClientProps {
  invites: Invite[];
  memberships: Membership[];
  user: any;
}

const ROLE_INFO = {
  viewer: { label: 'Viewer', icon: User, color: 'bg-gray-100 text-gray-700', description: 'Can view prompts and test them' },
  member: { label: 'Member', icon: User, color: 'bg-blue-100 text-blue-700', description: 'Can create and edit prompts' },
  admin: { label: 'Admin', icon: Shield, color: 'bg-purple-100 text-purple-700', description: 'Can manage team and settings' },
  owner: { label: 'Owner', icon: Crown, color: 'bg-yellow-100 text-yellow-700', description: 'Full access to everything' },
};

const TIER_BADGES = {
  starter: { label: 'Starter', className: 'bg-gray-100 text-gray-700' },
  pro: { label: 'Pro', className: 'bg-blue-100 text-blue-700' },
  team: { label: 'Team', className: 'bg-purple-100 text-purple-700' },
};

export function InvitesClient({ invites, memberships, user }: InvitesClientProps) {
  const router = useRouter();
  const [processingInvite, setProcessingInvite] = useState<string | null>(null);

  const handleAccept = async (invite: Invite) => {
    setProcessingInvite(invite.id);
    try {
      const response = await fetch('/api/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_id: invite.id })
      });

      if (response.ok) {
        toast.success(`Successfully joined ${invite.workspaces.name}!`);
        setTimeout(() => {
          router.push(`/${invite.workspaces.slug}/dashboard`);
        }, 500);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to accept invitation');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setProcessingInvite(null);
    }
  };

  const handleReject = async (invite: Invite) => {
    setProcessingInvite(invite.id);
    try {
      const response = await fetch('/api/invite/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_id: invite.id })
      });

      if (response.ok) {
        toast.success('Invitation declined');
        // Refresh the page to update the list
        router.refresh();
      } else {
        toast.error('Failed to decline invitation');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setProcessingInvite(null);
    }
  };

  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Workspace Invitations
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your pending workspace invitations
          </p>
        </div>

        {/* Pending Invites */}
        {invites.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border dark:border-gray-800 p-12 text-center">
            <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Pending Invitations
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You don't have any pending workspace invitations
            </p>
            <Button
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center gap-2"
            >
              Go to Dashboard
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="space-y-4 mb-12">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Pending Invitations ({invites.length})
            </h2>
            {invites.map((invite) => {
              const roleInfo = ROLE_INFO[invite.role as keyof typeof ROLE_INFO];
              const tierBadge = TIER_BADGES[invite.workspaces.subscription_tier as keyof typeof TIER_BADGES];
              const expired = isExpired(invite.expires_at);
              
              return (
                <div
                  key={invite.id}
                  className={`bg-white dark:bg-gray-900 rounded-lg shadow-sm border dark:border-gray-800 p-6 ${
                    expired ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4">
                      {/* Workspace Logo */}
                      <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                        {invite.workspaces.name.charAt(0).toUpperCase()}
                      </div>
                      
                      {/* Workspace Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {invite.workspaces.name}
                          </h3>
                          {tierBadge && (
                            <Badge className={tierBadge.className}>
                              {tierBadge.label}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                          <div className="flex items-center gap-1">
                            <roleInfo.icon className="h-4 w-4" />
                            <span>Invited as {roleInfo.label}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>
                              {expired ? (
                                <span className="text-red-600">Expired</span>
                              ) : (
                                `Expires ${formatDistanceToNow(new Date(invite.expires_at), { addSuffix: true })}`
                              )}
                            </span>
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-500 dark:text-gray-500">
                          {roleInfo.description}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    {!expired && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(invite)}
                          disabled={processingInvite === invite.id}
                        >
                          <X className="h-4 w-4" />
                          Decline
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleAccept(invite)}
                          disabled={processingInvite === invite.id}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Accept
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Current Workspaces */}
        {memberships.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Your Workspaces ({memberships.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {memberships.map((membership) => {
                const roleInfo = ROLE_INFO[membership.role as keyof typeof ROLE_INFO];
                
                return (
                  <div
                    key={membership.workspace_id}
                    className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border dark:border-gray-800 p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => router.push(`/${membership.workspaces.slug}/dashboard`)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                        {membership.workspaces.name.charAt(0).toUpperCase()}
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {membership.workspaces.name}
                        </h3>
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-500 mt-1">
                          <roleInfo.icon className="h-3 w-3" />
                          <span>{roleInfo.label}</span>
                        </div>
                      </div>
                      
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}