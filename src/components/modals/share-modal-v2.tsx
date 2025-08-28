'use client';

import { useState, useEffect } from 'react';
import { X, Link2, Users, Copy, Eye, Trash2, Check, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { generateReadableSlug } from '@/lib/utils/slug-generator';
import { createClient } from '@/lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';

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

interface ShareLink {
  id: string;
  slug: string;
  password_hash: string | null;
  expires_at: string | null;
  max_views: number | null;
  current_views: number;
  allow_copying: boolean;
  show_variables: boolean;
  created_at: string;
  is_active: boolean;
}

export function ShareModal({ isOpen, onClose, prompt, workspace }: ShareModalProps) {
  const [activeTab, setActiveTab] = useState<'public' | 'team'>('public');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Form fields
  const [password, setPassword] = useState('');
  const [expiresIn, setExpiresIn] = useState('');
  const [maxViews, setMaxViews] = useState('');
  const [allowCopying, setAllowCopying] = useState(true);
  const [showVariables, setShowVariables] = useState(true);
  
  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      loadShareLinks();
    }
  }, [isOpen, prompt.id]);

  const loadShareLinks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('share_links')
        .select('*')
        .eq('prompt_id', prompt.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading share links:', error);
        // If table doesn't exist, just show empty state
        if (error.code === 'PGRST205') {
          setShareLinks([]);
        }
      } else {
        setShareLinks(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
      setShareLinks([]);
    } finally {
      setLoading(false);
    }
  };

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

      if (error) {
        // If table doesn't exist, show helpful message
        if (error.code === 'PGRST205') {
          toast.error('Share links table not found. Please run the migration in Supabase dashboard.');
          console.log('Run this SQL in Supabase:', 'scripts/create-share-links-table.sql');
        } else {
          throw error;
        }
      } else {
        toast.success('Share link created successfully', {
          position: 'top-right',
          duration: 4000,
        });
        
        // Reset form
        setPassword('');
        setExpiresIn('');
        setMaxViews('');
        setAllowCopying(true);
        setShowVariables(true);
        setShowCreateForm(false);
        
        // Reload links
        await loadShareLinks();
      }
    } catch (error) {
      console.error('Error creating share link:', error);
      toast.error('Failed to create share link');
    } finally {
      setCreating(false);
    }
  };

  const handleCopyLink = (link: ShareLink) => {
    const url = `${window.location.origin}/share/${link.slug}`;
    navigator.clipboard.writeText(url);
    setCopiedId(link.id);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleViewLink = (link: ShareLink) => {
    const url = `${window.location.origin}/share/${link.slug}`;
    window.open(url, '_blank');
  };

  const handleDeleteLink = async (link: ShareLink) => {
    try {
      const { error } = await supabase
        .from('share_links')
        .update({ is_active: false })
        .eq('id', link.id);

      if (error) throw error;
      
      toast.success('Share link deleted');
      await loadShareLinks();
    } catch (error) {
      toast.error('Failed to delete share link');
    }
  };

  const formatShareUrl = (slug: string) => {
    return `${window.location.origin}/share/${slug}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-semibold">Share Link Settings</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {prompt.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => setActiveTab('public')}
            className={`flex-1 py-3 px-6 font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'public'
                ? 'text-zinc-900 dark:text-zinc-100 border-b-2 border-zinc-900 dark:border-zinc-100'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <Link2 size={16} />
            Public Link
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`flex-1 py-3 px-6 font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'team'
                ? 'text-zinc-900 dark:text-zinc-100 border-b-2 border-zinc-900 dark:border-zinc-100'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <Users size={16} />
            Share with Team
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'public' ? (
            <div>
              {!showCreateForm ? (
                <>
                  {/* Create New Share Link Button */}
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="w-full py-3 px-4 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors flex items-center justify-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 mb-6"
                  >
                    <Plus size={20} />
                    Create New Share Link
                  </button>

                  {/* Active Share Links */}
                  <div>
                    <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                      Active Share Links ({shareLinks.length})
                    </h3>
                    
                    {loading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 dark:border-zinc-100 mx-auto"></div>
                      </div>
                    ) : shareLinks.length === 0 ? (
                      <div className="text-center py-12">
                        <Link2 className="mx-auto text-zinc-300 dark:text-zinc-700 mb-3" size={48} />
                        <p className="text-zinc-500 dark:text-zinc-400 font-medium">No share links yet</p>
                        <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">
                          Create a share link to share this prompt with others
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {shareLinks.map((link) => (
                          <div
                            key={link.id}
                            className="p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Link2 size={14} className="text-zinc-400 flex-shrink-0" />
                                  <p className="text-sm font-mono text-zinc-700 dark:text-zinc-300 truncate">
                                    {formatShareUrl(link.slug)}
                                  </p>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                                  <span className="flex items-center gap-1">
                                    <Eye size={12} />
                                    {link.current_views} views
                                  </span>
                                  {link.max_views && (
                                    <span>Max: {link.max_views}</span>
                                  )}
                                  {link.expires_at && (
                                    <span>Expires: {formatDistanceToNow(new Date(link.expires_at), { addSuffix: true })}</span>
                                  )}
                                  {link.password_hash && (
                                    <span>🔒 Protected</span>
                                  )}
                                </div>
                                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                                  Created {formatDistanceToNow(new Date(link.created_at), { addSuffix: true })}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 ml-4">
                                <button
                                  onClick={() => handleCopyLink(link)}
                                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                  title="Copy link"
                                >
                                  {copiedId === link.id ? (
                                    <Check size={16} className="text-green-500" />
                                  ) : (
                                    <Copy size={16} className="text-zinc-400" />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleViewLink(link)}
                                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                  title="View"
                                >
                                  <Eye size={16} className="text-zinc-400" />
                                </button>
                                <button
                                  onClick={() => handleDeleteLink(link)}
                                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 size={16} className="text-zinc-400" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Create Form */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">
                        Password Protection (optional)
                      </label>
                      <Input
                        type="password"
                        placeholder="Leave empty for no password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">
                        Expires After (hours)
                      </label>
                      <Input
                        type="text"
                        placeholder="Never expires"
                        value={expiresIn}
                        onChange={(e) => setExpiresIn(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">
                        Maximum Views
                      </label>
                      <Input
                        type="text"
                        placeholder="Unlimited views"
                        value={maxViews}
                        onChange={(e) => setMaxViews(e.target.value)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Allow copying
                      </label>
                      <Switch
                        checked={allowCopying}
                        onCheckedChange={setAllowCopying}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Show variables
                      </label>
                      <Switch
                        checked={showVariables}
                        onCheckedChange={setShowVariables}
                      />
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button
                        onClick={() => setShowCreateForm(false)}
                        variant="outline"
                        className="flex-1"
                        disabled={creating}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateLink}
                        className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white"
                        disabled={creating}
                      >
                        {creating ? 'Creating...' : 'Create Link'}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="mx-auto text-zinc-300 dark:text-zinc-700 mb-3" size={48} />
              <p className="text-zinc-500 dark:text-zinc-400 font-medium">Team sharing coming soon</p>
              <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">
                Share prompts with your team members
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {!showCreateForm && (
          <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800">
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