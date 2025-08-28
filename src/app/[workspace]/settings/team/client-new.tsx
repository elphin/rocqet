'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { 
  ArrowLeft, Users, Mail, Shield, Trash2, UserPlus, Copy, X, Clock,
  ChevronDown, Crown, CheckCircle, AlertCircle, MoreVertical,
  Activity, Calendar, User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

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
  token: string;
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
  const supabase = createClient();
  
  // State
  const [members, setMembers] = useState(initialMembers);
  const [invites, setInvites] = useState(initialInvites);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [isInviting, setIsInviting] = useState(false);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);

  // Real-time subscriptions
  useEffect(() => {
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
        async () => {
          // Refresh members list
          const { data } = await supabase
            .from('workspace_members')
            .select(`
              id, role, joined_at, user_id,
              users:user_id (id, email, created_at)
            `)
            .eq('workspace_id', workspace.id)
            .order('joined_at', { ascending: true });
          
          if (data) setMembers(data as any);
        }
      )
      .subscribe();

    // Subscribe to invites changes
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
        async () => {
          // Refresh invites list
          const { data } = await supabase
            .from('workspace_invites')
            .select('*')
            .eq('workspace_id', workspace.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });
          
          if (data) setInvites(data);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(membersChannel);
      supabase.removeChannel(invitesChannel);
    };
  }, [workspace.id]);

  // Load activity logs
  const loadActivityLogs = async () => {
    const { data } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('workspace_id', workspace.id)
      .in('action', ['member_removed', 'member_role_updated', 'invite_sent', 'invite_accepted'])
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (data) setActivityLogs(data);
  };

  // Send invitation
  const handleSendInvite = async () => {
    if (!inviteEmail) {
      toast.error('Please enter an email address');
      return;
    }

    setIsInviting(true);
    
    try {
      const response = await fetch('/api/workspace/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          workspaceId: workspace.id
        })
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Invitation sent successfully!');
        setShowInviteForm(false);
        setInviteEmail('');
        setInviteRole('member');
        
        // Add to invites list
        const { data: newInvite } = await supabase
          .from('workspace_invites')
          .select('*')
          .eq('id', result.invite.id)
          .single();
        
        if (newInvite) {
          setInvites([newInvite, ...invites]);
        }
      } else {
        toast.error(result.error || 'Failed to send invitation');
      }
    } catch (error) {
      toast.error('An error occurred while sending invitation');
    } finally {
      setIsInviting(false);
    }
  };

  // Update member role
  const handleUpdateRole = async (memberId: string, newRole: string) => {
    try {
      const response = await fetch('/api/workspace/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          role: newRole,
          workspaceId: workspace.id
        })
      });

      if (response.ok) {
        toast.success('Role updated successfully');
        // Update local state
        setMembers(members.map(m => 
          m.id === memberId ? { ...m, role: newRole } : m
        ));
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update role');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  // Remove member
  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) {
      return;
    }

    try {
      const response = await fetch(`/api/workspace/members?id=${memberId}&workspace_id=${workspace.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Team member removed');
        setMembers(members.filter(m => m.id !== memberId));
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to remove team member');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  // Cancel invite
  const handleCancelInvite = async (inviteId: string) => {
    try {
      const response = await fetch(`/api/workspace/invite?id=${inviteId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Invitation cancelled');
        setInvites(invites.filter(i => i.id !== inviteId));
      } else {
        toast.error('Failed to cancel invitation');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  // Resend invite
  const handleResendInvite = async (inviteId: string) => {
    try {
      const response = await fetch('/api/workspace/invite', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId })
      });

      if (response.ok) {
        toast.success('Invitation resent');
      } else {
        toast.error('Failed to resend invitation');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  // Copy invite link
  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(link);
    toast.success('Invite link copied to clipboard');
  };

  return (
    <div className="min-h-screen bg-gray-50">
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
              <Button
                variant="outline"
                onClick={() => {
                  loadActivityLogs();
                  setShowActivityLog(true);
                }}
              >
                <Activity className="mr-2 h-4 w-4" />
                Activity Log
              </Button>
              <Button 
                onClick={() => setShowInviteForm(true)}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Member
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-3">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{members.length}</p>
                <p className="text-sm text-gray-500">Team Members</p>
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
                <p className="text-sm text-gray-500">Pending Invitations</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-100 p-3">
                <Shield className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {members.filter(m => ['owner', 'admin'].includes(m.role)).length}
                </p>
                <p className="text-sm text-gray-500">Administrators</p>
              </div>
            </div>
          </div>
        </div>

        {/* Team Members */}
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold">Team Members</h2>
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {members.map((member) => (
                  <tr key={member.id}>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200">
                            <User className="h-5 w-5 text-gray-500" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {member.users.email}
                          </div>
                          {member.user_id === user.id && (
                            <div className="text-xs text-gray-500">You</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {member.role === 'owner' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">
                          <Crown className="h-3 w-3" />
                          Owner
                        </span>
                      ) : (
                        <select
                          value={member.role}
                          onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                          disabled={membership.role !== 'owner' && membership.role !== 'admin'}
                          className="rounded-md border-gray-300 text-sm"
                        >
                          {ROLES.filter(r => r.value !== 'owner').map(role => (
                            <option key={role.value} value={role.value}>
                              {role.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {formatDistanceToNow(new Date(member.joined_at), { addSuffix: true })}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      {member.role !== 'owner' && member.user_id !== user.id && (
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="text-red-600 hover:text-red-900"
                          disabled={membership.role !== 'owner' && membership.role !== 'admin'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Invitations */}
        {invites.length > 0 && (
          <div>
            <h2 className="mb-4 text-lg font-semibold">Pending Invitations</h2>
            <div className="space-y-3">
              {invites.map((invite) => (
                <div key={invite.id} className="rounded-lg bg-white p-4 shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
                        <Mail className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div>
                        <p className="font-medium">{invite.email}</p>
                        <p className="text-sm text-gray-500">
                          Invited as {invite.role} • Expires {formatDistanceToNow(new Date(invite.expires_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyInviteLink(invite.token)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResendInvite(invite.id)}
                      >
                        Resend
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelInvite(invite.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Invite Team Member</h3>
              <button
                onClick={() => setShowInviteForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="mt-1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="mt-1 w-full rounded-md border-gray-300"
                >
                  {ROLES.filter(r => r.value !== 'owner').map(role => (
                    <option key={role.value} value={role.value}>
                      {role.label} - {role.description}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="mt-6 flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowInviteForm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendInvite}
                disabled={isInviting || !inviteEmail}
                className="flex-1"
              >
                {isInviting ? 'Sending...' : 'Send Invitation'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Activity Log Modal */}
      {showActivityLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="h-[600px] w-full max-w-3xl overflow-hidden rounded-lg bg-white">
            <div className="flex items-center justify-between border-b p-4">
              <h3 className="text-lg font-semibold">Activity Log</h3>
              <button
                onClick={() => setShowActivityLog(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="h-[520px] overflow-y-auto p-4">
              <div className="space-y-3">
                {activityLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 rounded-lg border p-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                      <Activity className="h-4 w-4 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-medium">{log.metadata?.email || 'System'}</span>
                        {' '}
                        {log.action.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}