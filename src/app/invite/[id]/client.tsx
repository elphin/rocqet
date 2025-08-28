'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Users, Shield, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface AcceptInviteClientProps {
  invite: any;
  user: any;
}

const ROLE_DESCRIPTIONS = {
  viewer: 'View prompts and test them',
  member: 'Create and edit prompts',
  admin: 'Manage team and settings',
  owner: 'Full access to everything'
};

export function AcceptInviteClient({ invite, user }: AcceptInviteClientProps) {
  const router = useRouter();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      const response = await fetch('/api/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invite_id: invite.id
        })
      });

      if (response.ok) {
        toast.success('Welcome to the workspace!');
        setTimeout(() => {
          router.push(`/${invite.workspaces.slug}`);
        }, 500);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to accept invitation');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleReject = async () => {
    setIsRejecting(true);
    try {
      const response = await fetch('/api/invite/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invite_id: invite.id
        })
      });

      if (response.ok) {
        toast.success('Invitation declined');
        setTimeout(() => {
          router.push('/');
        }, 500);
      } else {
        toast.error('Failed to decline invitation');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsRejecting(false);
    }
  };

  const daysUntilExpiry = Math.ceil(
    (new Date(invite.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="rounded-lg bg-white p-8 shadow-lg">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Workspace Invitation</h1>
            <p className="mt-2 text-gray-600">
              You've been invited to join
            </p>
          </div>

          <div className="mb-6 rounded-lg bg-gray-50 p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              {invite.workspaces.name}
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Shield className="h-4 w-4" />
                <span>Role: <span className="font-medium text-gray-900">{invite.role}</span></span>
              </div>
              <p className="text-gray-500 ml-6">
                {ROLE_DESCRIPTIONS[invite.role as keyof typeof ROLE_DESCRIPTIONS]}
              </p>
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="h-4 w-4" />
                <span>Expires in {daysUntilExpiry} {daysUntilExpiry === 1 ? 'day' : 'days'}</span>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Accepting as: <span className="font-medium">{user.email}</span>
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              className="flex-1"
              onClick={handleAccept}
              disabled={isAccepting || isRejecting}
            >
              {isAccepting ? 'Accepting...' : 'Accept Invitation'}
            </Button>
            <Button
              variant="outline"
              onClick={handleReject}
              disabled={isAccepting || isRejecting}
            >
              {isRejecting ? 'Declining...' : 'Decline'}
            </Button>
          </div>
        </div>

        <p className="mt-4 text-center text-sm text-gray-500">
          Wrong account?{' '}
          <a href="/logout" className="text-blue-600 hover:underline">
            Sign out
          </a>
        </p>
      </div>
    </div>
  );
}