'use client';

import { useState } from 'react';
import { X, Link2, Users, Globe, Lock, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { generateReadableSlug } from '@/lib/utils/slug-generator';
import { createClient } from '@/lib/supabase/client';

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
  const [activeTab, setActiveTab] = useState<'public' | 'team'>('public');
  const [password, setPassword] = useState('');
  const [expiresIn, setExpiresIn] = useState('');
  const [maxViews, setMaxViews] = useState('');
  const [allowCopying, setAllowCopying] = useState(true);
  const [showVariables, setShowVariables] = useState(true);
  const [creating, setCreating] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  
  const supabase = createClient();

  if (!isOpen) return null;

  const handleCreateLink = async () => {
    setCreating(true);
    try {
      const slug = generateReadableSlug();
      
      // Calculate expiration date
      let expiresAt = null;
      if (expiresIn) {
        const hours = parseInt(expiresIn);
        if (!isNaN(hours) && hours > 0) {
          expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
        }
      }

      // Parse max views
      let maxViewsNum = null;
      if (maxViews) {
        const views = parseInt(maxViews);
        if (!isNaN(views) && views > 0) {
          maxViewsNum = views;
        }
      }

      // Hash password if provided
      let passwordHash = null;
      if (password) {
        // In production, use proper password hashing (bcrypt)
        // For now, we'll store it as base64
        passwordHash = btoa(password);
      }

      const { data, error } = await supabase
        .from('share_links')
        .insert({
          prompt_id: prompt.id,
          workspace_id: prompt.workspace_id,
          slug,
          password_hash: passwordHash,
          expires_at: expiresAt,
          max_views: maxViewsNum,
          allow_copying: allowCopying,
          show_variables: showVariables,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) throw error;

      const link = `${window.location.origin}/share/${slug}`;
      setShareLink(link);
      
      toast.success('Share link created successfully');
    } catch (error) {
      console.error('Error creating share link:', error);
      toast.error('Failed to create share link');
    } finally {
      setCreating(false);
    }
  };

  const handleCopyLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReset = () => {
    setPassword('');
    setExpiresIn('');
    setMaxViews('');
    setAllowCopying(true);
    setShowVariables(true);
    setShareLink('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h2 className="text-xl font-semibold">Share Link Settings</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Create a secure link to share this prompt
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {/* Tab Selection */}
          <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 mb-6">
            <button
              onClick={() => setActiveTab('public')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === 'public'
                  ? 'bg-white dark:bg-zinc-700 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              <Link2 size={16} />
              Public Link
            </button>
            <button
              onClick={() => setActiveTab('team')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === 'team'
                  ? 'bg-white dark:bg-zinc-700 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              <Users size={16} />
              Share with Team
            </button>
          </div>

          {activeTab === 'public' ? (
            <div className="space-y-5">
              {!shareLink ? (
                <>
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4 text-sm">
                    <p className="text-zinc-600 dark:text-zinc-400">
                      Create a public link to share this prompt with anyone
                    </p>
                  </div>

                  {/* Password Protection */}
                  <div>
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">
                      Password Protection (optional)
                    </label>
                    <Input
                      type="password"
                      placeholder="Leave empty for no password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  {/* Expiration */}
                  <div>
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">
                      Expires After (hours)
                    </label>
                    <Input
                      type="text"
                      placeholder="Never expires"
                      value={expiresIn}
                      onChange={(e) => setExpiresIn(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  {/* Maximum Views */}
                  <div>
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">
                      Maximum Views
                    </label>
                    <Input
                      type="text"
                      placeholder="Unlimited views"
                      value={maxViews}
                      onChange={(e) => setMaxViews(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  {/* Allow Copying */}
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Allow copying
                    </label>
                    <Switch
                      checked={allowCopying}
                      onCheckedChange={setAllowCopying}
                    />
                  </div>

                  {/* Show Variables */}
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Show variables
                    </label>
                    <Switch
                      checked={showVariables}
                      onCheckedChange={setShowVariables}
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* Generated Link */}
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-green-700 dark:text-green-400">
                        Share link created successfully
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={shareLink}
                        readOnly
                        className="flex-1 bg-white dark:bg-zinc-800"
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
                  </div>

                  {/* Link Settings Summary */}
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4 space-y-2">
                    <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                      Link Settings
                    </h4>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Password:</span>
                        <span className="text-zinc-700 dark:text-zinc-300">
                          {password ? 'Protected' : 'None'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Expires:</span>
                        <span className="text-zinc-700 dark:text-zinc-300">
                          {expiresIn ? `After ${expiresIn} hours` : 'Never'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Max views:</span>
                        <span className="text-zinc-700 dark:text-zinc-300">
                          {maxViews || 'Unlimited'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Copying:</span>
                        <span className="text-zinc-700 dark:text-zinc-300">
                          {allowCopying ? 'Allowed' : 'Disabled'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Variables:</span>
                        <span className="text-zinc-700 dark:text-zinc-300">
                          {showVariables ? 'Visible' : 'Hidden'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleReset}
                    variant="outline"
                    className="w-full"
                  >
                    Create Another Link
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Share with team members in your workspace
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">
                  Email addresses
                </label>
                <Input
                  type="text"
                  placeholder="Enter email addresses separated by commas"
                  className="w-full"
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                  Team members will be notified via email
                </p>
              </div>

              <Button
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-white"
                disabled
              >
                Send Invitations
              </Button>
            </div>
          )}
        </div>

        {activeTab === 'public' && !shareLink && (
          <div className="flex gap-3 p-6 border-t border-zinc-200 dark:border-zinc-800">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateLink}
              disabled={creating}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white"
            >
              {creating ? 'Creating...' : 'Create Link'}
            </Button>
          </div>
        )}

        {(activeTab === 'team' || shareLink) && (
          <div className="p-6 border-t border-zinc-200 dark:border-zinc-800">
            <Button
              onClick={onClose}
              variant="outline"
              className="w-full"
            >
              Close
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}