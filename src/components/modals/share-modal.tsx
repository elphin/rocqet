'use client';

import { useState } from 'react';
import { X, Link2, Users, Globe, Lock, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: {
    id: string;
    name: string;
    slug: string;
    visibility: string;
    workspace_id: string;
  };
  workspace: {
    slug: string;
  };
}

export function ShareModal({ isOpen, onClose, prompt, workspace }: ShareModalProps) {
  const [shareType, setShareType] = useState<'public' | 'team'>('public');
  const [isPublic, setIsPublic] = useState(prompt.visibility === 'public');
  const [copied, setCopied] = useState(false);
  const [teamEmail, setTeamEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  if (!isOpen) return null;

  const shareUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/${workspace.slug}/prompts/${prompt.slug}`
    : '';

  const publicShareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/public/${prompt.id}`
    : '';

  const handleCopyLink = () => {
    const url = isPublic ? publicShareUrl : shareUrl;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTogglePublic = async () => {
    try {
      const response = await fetch('/api/prompts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: prompt.id,
          visibility: isPublic ? 'private' : 'public'
        })
      });

      if (!response.ok) throw new Error('Failed to update visibility');
      
      setIsPublic(!isPublic);
      toast.success(`Prompt is now ${!isPublic ? 'public' : 'private'}`);
    } catch (error) {
      toast.error('Failed to update visibility');
    }
  };

  const handleInviteTeamMember = async () => {
    if (!teamEmail) {
      toast.error('Please enter an email address');
      return;
    }

    setInviting(true);
    try {
      // This would be an API call to invite team member
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success(`Invitation sent to ${teamEmail}`);
      setTeamEmail('');
    } catch (error) {
      toast.error('Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-xl font-semibold">Share Prompt</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {/* Share Type Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setShareType('public')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                shareType === 'public'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
              }`}
            >
              <Globe className="inline-block w-4 h-4 mr-2" />
              Public Link
            </button>
            <button
              onClick={() => setShareType('team')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                shareType === 'team'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
              }`}
            >
              <Users className="inline-block w-4 h-4 mr-2" />
              Team Share
            </button>
          </div>

          {shareType === 'public' ? (
            <div className="space-y-4">
              {/* Public Access Toggle */}
              <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  {isPublic ? (
                    <Globe className="text-green-500" size={20} />
                  ) : (
                    <Lock className="text-zinc-400" size={20} />
                  )}
                  <div>
                    <div className="font-medium">
                      {isPublic ? 'Public Access' : 'Private Access'}
                    </div>
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">
                      {isPublic 
                        ? 'Anyone with the link can view this prompt'
                        : 'Only workspace members can access this prompt'
                      }
                    </div>
                  </div>
                </div>
                <Switch
                  checked={isPublic}
                  onCheckedChange={handleTogglePublic}
                />
              </div>

              {/* Share Link */}
              {isPublic && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Public Link
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={publicShareUrl}
                      readOnly
                      className="flex-1 bg-zinc-50 dark:bg-zinc-800"
                    />
                    <Button
                      onClick={handleCopyLink}
                      variant="outline"
                      className="px-3"
                    >
                      {copied ? (
                        <Check size={16} className="text-green-500" />
                      ) : (
                        <Copy size={16} />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Share this link to allow anyone to view this prompt
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Team Share */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Invite Team Member
                </label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="Enter email address"
                    value={teamEmail}
                    onChange={(e) => setTeamEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleInviteTeamMember}
                    disabled={inviting}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {inviting ? 'Sending...' : 'Invite'}
                  </Button>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Team members will have access to view and use this prompt
                </p>
              </div>

              {/* Workspace Link */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Workspace Link
                </label>
                <div className="flex gap-2">
                  <Input
                    value={shareUrl}
                    readOnly
                    className="flex-1 bg-zinc-50 dark:bg-zinc-800"
                  />
                  <Button
                    onClick={handleCopyLink}
                    variant="outline"
                    className="px-3"
                  >
                    {copied ? (
                      <Check size={16} className="text-green-500" />
                    ) : (
                      <Copy size={16} />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Only workspace members can access this link
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 p-6 border-t border-zinc-200 dark:border-zinc-800">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}