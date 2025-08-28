'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { 
  ArrowLeft, 
  Users, 
  Mail, 
  Shield, 
  Trash2, 
  UserPlus,
  Copy,
  X,
  Clock,
  ChevronDown,
  Crown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useSubscription } from '@/hooks/use-subscription';
import { TierSwitcher } from '@/components/tier-switcher';

interface TeamMember {
  id: string;
  role: string;
  joined_at: string;
  user_id: string;
  users: {
    id: string;
    email: string;
    created_at: string;
  };
}

interface Invite {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  expires_at: string;
}

interface TeamSettingsClientProps {
  workspace: any;
  membership: any;
  user: any;
  members: TeamMember[];
  invites: Invite[];
  params: {
    workspace: string;
  };
}

const ROLES = [
  { value: 'viewer', label: 'Viewer', description: 'Can view prompts and test them' },
  { value: 'member', label: 'Member', description: 'Can create and edit prompts' },
  { value: 'admin', label: 'Admin', description: 'Can manage team and settings' },
  { value: 'owner', label: 'Owner', description: 'Full access to everything' },
];

export function TeamSettingsClient({
  workspace,
  membership,
  user,
  members: initialMembers,
  invites: initialInvites,
  params
}: TeamSettingsClientProps) {
  const router = useRouter();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [isInviting, setIsInviting] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [members, setMembers] = useState(initialMembers);
  const [invites, setInvites] = useState(initialInvites);
  
  // Check subscription limits
  const { subscription, requireUpgrade, checkLimit, tierConfig } = useSubscription(workspace.id);

  // Set up real-time subscriptions
  useEffect(() => {
    const supabase = createClient();

    // Subscribe to workspace_members changes
    const membersChannel = supabase
      .channel(`workspace-members-${workspace.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workspace_members',
          filter: `workspace_id=eq.${workspace.id}`
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // Fetch the new member with user details
            const { data: newMember } = await supabase
              .from('workspace_members')
              .select(`
                *,
                users (
                  id,
                  email,
                  created_at
                )
              `)
              .eq('id', payload.new.id)
              .single();
            
            if (newMember) {
              setMembers((prev) => [...prev, newMember as TeamMember]);
              toast.success('New member joined the workspace');
            }
          } else if (payload.eventType === 'UPDATE') {
            setMembers((prev) =>
              prev.map((member) =>
                member.id === payload.new.id
                  ? { ...member, ...payload.new }
                  : member
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setMembers((prev) => prev.filter((member) => member.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Subscribe to workspace_invites changes
    const invitesChannel = supabase
      .channel(`workspace-invites-${workspace.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workspace_invites',
          filter: `workspace_id=eq.${workspace.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setInvites((prev) => [...prev, payload.new as Invite]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedInvite = payload.new as Invite;
            if (updatedInvite.status !== 'pending') {
              // Remove non-pending invites from the list
              setInvites((prev) => prev.filter((invite) => invite.id !== updatedInvite.id));
            } else {
              setInvites((prev) =>
                prev.map((invite) =>
                  invite.id === updatedInvite.id ? updatedInvite : invite
                )
              );
            }
          } else if (payload.eventType === 'DELETE') {
            setInvites((prev) => prev.filter((invite) => invite.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(membersChannel);
      supabase.removeChannel(invitesChannel);
    };
  }, [workspace.id]);

  const handleInvite = async () => {
    if (!inviteEmail || !inviteEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Check if team members limit is reached
    if (requireUpgrade('teamMembers', 'invite more team members')) {
      return;
    }

    setIsInviting(true);
    try {
      const response = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspace.id,
          email: inviteEmail,
          role: inviteRole
        })
      });

      if (response.ok) {
        toast.success('Invitation sent successfully!');
        setInviteEmail('');
        setShowInviteForm(false);
        router.refresh();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to send invitation');
      }
    } catch (error) {
      toast.error('An error occurred while sending invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) {
      return;
    }

    try {
      const response = await fetch('/api/team/remove', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspace.id,
          member_id: memberId
        })
      });

      if (response.ok) {
        toast.success('Team member removed');
        router.refresh();
      } else {
        toast.error('Failed to remove team member');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    try {
      const response = await fetch('/api/team/role', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspace.id,
          member_id: memberId,
          role: newRole
        })
      });

      if (response.ok) {
        toast.success('Role updated successfully');
        router.refresh();
      } else {
        toast.error('Failed to update role');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    try {
      const response = await fetch('/api/team/invite', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invite_id: inviteId,
          workspace_id: workspace.id
        })
      });

      if (response.ok) {
        toast.success('Invitation cancelled');
        router.refresh();
      } else {
        toast.error('Failed to cancel invitation');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const copyInviteLink = (inviteId: string) => {
    const link = `${window.location.origin}/invite/${inviteId}`;
    navigator.clipboard.writeText(link);
    toast.success('Invite link copied to clipboard');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Tier Switcher for Development */}
      {subscription && (
        <TierSwitcher 
          workspaceId={workspace.id} 
          currentTier={subscription.tier} 
        />
      )}
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/${params.workspace}/settings`}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-semibold">Team Settings</h1>
                <p className="text-sm text-gray-500">Manage your workspace team</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {subscription?.tier === 'free' && (
                <div className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                  <Crown className="h-3 w-3" />
                  Free Plan
                </div>
              )}
              <Button 
                onClick={() => {
                  // Check team member limit before showing form
                  const limitCheck = checkLimit('teamMembers');
                  if (typeof limitCheck === 'object' && !limitCheck.allowed) {
                    requireUpgrade('teamMembers', 'invite more team members');
                  } else {
                    setShowInviteForm(true);
                  }
                }}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Member
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Upgrade Banner for Free Tier */}
        {subscription?.tier === 'free' && members.length >= 1 && (
          <div className="mb-6 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-blue-100 p-2">
                  <Crown className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Need more team members?</h3>
                  <p className="text-sm text-gray-600">
                    Upgrade to Pro for up to 5 team members or Business for unlimited
                  </p>
                </div>
              </div>
              <Link href={`/${params.workspace}/settings/billing`}>
                <Button variant="outline" size="sm">
                  View Plans
                </Button>
              </Link>
            </div>
          </div>
        )}
        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-3">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold">{members.length}</p>
                  {tierConfig && tierConfig.features.teamMembers !== 'unlimited' && (
                    <span className="text-sm text-gray-500">
                      / {tierConfig.features.teamMembers}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">Team Members</p>
                {tierConfig && tierConfig.features.teamMembers !== 'unlimited' && (
                  <div className="mt-2">
                    <div className="h-2 w-full rounded-full bg-gray-200">
                      <div 
                        className="h-2 rounded-full bg-blue-600 transition-all"
                        style={{ 
                          width: `${Math.min(100, (members.length / Number(tierConfig.features.teamMembers)) * 100)}%` 
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-yellow-100 p-3">
                <Mail className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{invites.length}</p>
                <p className="text-sm text-gray-500">Pending Invites</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-100 p-3">
                <Shield className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{members.filter(m => m.role === 'admin' || m.role === 'owner').length}</p>
                <p className="text-sm text-gray-500">Admins</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Invites */}
        {invites.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-4 text-lg font-semibold">Pending Invitations</h2>
            <div className="rounded-lg bg-white shadow-sm">
              <div className="divide-y divide-gray-100">
                {invites.map((invite) => (
                  <div key={invite.id} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <div>
                        <p className="font-medium">{invite.email}</p>
                        <p className="text-sm text-gray-500">
                          Invited as {invite.role} • Expires {new Date(invite.expires_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyInviteLink(invite.id)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelInvite(invite.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Team Members */}
        <div>
          <h2 className="mb-4 text-lg font-semibold">Team Members</h2>
          <div className="rounded-lg bg-white shadow-sm">
            <div className="divide-y divide-gray-100">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-medium">
                      {member.users.email[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{member.users.email}</p>
                      <p className="text-sm text-gray-500">
                        Joined {new Date(member.joined_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {membership.role === 'owner' && member.user_id !== user.id ? (
                      <select
                        value={member.role}
                        onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {ROLES.map(role => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
                        {ROLES.find(r => r.value === member.role)?.label}
                      </span>
                    )}
                    {membership.role === 'owner' && member.user_id !== user.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Invite Team Member</h2>
              <button
                onClick={() => setShowInviteForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {ROLES.filter(r => r.value !== 'owner').map(role => (
                    <option key={role.value} value={role.value}>
                      {role.label} - {role.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={handleInvite}
                  disabled={isInviting || !inviteEmail}
                >
                  {isInviting ? 'Sending...' : 'Send Invitation'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowInviteForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}