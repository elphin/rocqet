'use client';

import { useState } from 'react';
import { Link2, Edit3, Hash, Lock, Globe, Eye, EyeOff, Copy, Check, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { SlugEditModal } from '@/components/modals/slug-edit-modal';

interface PromptDetailSidebarProps {
  prompt: {
    id: string;
    name: string;
    slug: string;
    shortcode?: string;
    is_shared: boolean;
    visibility?: string;
    workspace_id: string;
  };
  workspace: {
    id: string;
    slug: string;
    name: string;
    tier?: string;
  };
  membership: {
    role: 'owner' | 'admin' | 'editor' | 'viewer';
  };
  onPromptUpdate?: (updatedData: any) => void;
}

export function PromptDetailSidebar({
  prompt,
  workspace,
  membership,
  onPromptUpdate
}: PromptDetailSidebarProps) {
  const [showSlugModal, setShowSlugModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState(false);
  const [shortcode, setShortcode] = useState(prompt.shortcode || '');
  const [isPublic, setIsPublic] = useState(prompt.is_shared || prompt.visibility === 'public');

  const canEdit = membership.role === 'owner' || membership.role === 'admin' || membership.role === 'editor';
  const fullPromptUrl = `/${workspace.slug}/prompts/${prompt.slug}`;

  const handleSlugUpdate = (newSlug: string) => {
    if (onPromptUpdate) {
      onPromptUpdate({
        ...prompt,
        slug: newSlug
      });
    }
    // Redirect to new URL
    window.location.href = `/${workspace.slug}/prompts/${newSlug}`;
  };

  const handleShortcodeUpdate = async (newShortcode: string) => {
    try {
      const response = await fetch('/api/prompts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: prompt.id,
          workspace_id: workspace.id,
          shortcode: newShortcode
        })
      });

      if (response.ok) {
        setShortcode(newShortcode);
        if (onPromptUpdate) {
          onPromptUpdate({
            ...prompt,
            shortcode: newShortcode
          });
        }
        toast.success('Shortcode updated');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to update shortcode');
      }
    } catch (error) {
      console.error('Error updating shortcode:', error);
      toast.error('Failed to update shortcode');
    }
  };

  const handleVisibilityChange = async (isShared: boolean) => {
    // Check workspace tier limitations
    if (!isShared && workspace.tier === 'free') {
      toast.error('Free tier only supports public prompts. Upgrade to Pro for private prompts.');
      return;
    }

    setUpdating(true);
    try {
      const response = await fetch('/api/prompts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: prompt.id,
          workspace_id: workspace.id,
          is_shared: isShared
        })
      });

      if (response.ok) {
        setIsPublic(isShared);
        if (onPromptUpdate) {
          onPromptUpdate({
            ...prompt,
            is_shared: isShared,
            visibility: isShared ? 'public' : 'private'
          });
        }
        toast.success(`Prompt is now ${isShared ? 'public' : 'private'}`);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to update visibility');
      }
    } catch (error) {
      console.error('Error updating visibility:', error);
      toast.error('Failed to update visibility');
    } finally {
      setUpdating(false);
    }
  };

  const handleCopyUrl = () => {
    const fullUrl = `${window.location.origin}${fullPromptUrl}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedSlug(true);
    toast.success('URL copied to clipboard');
    setTimeout(() => setCopiedSlug(false), 2000);
  };

  return (
    <>
      {/* URL & Settings Card */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-gray-100 mb-4">Settings</h3>
        
        <div className="space-y-4">
          {/* URL Slug Section */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-neutral-600 dark:text-gray-400">URL</span>
            
            <div className="flex items-center gap-1">
              <button
                onClick={handleCopyUrl}
                className="flex-1 min-w-0 flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-all text-left group"
              >
                <Link2 className="h-3 w-3 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <span className="text-xs font-mono text-neutral-700 dark:text-neutral-300 truncate flex-1 text-right" dir="rtl">
                  {fullPromptUrl}
                </span>
                <div className="flex-shrink-0">
                  {copiedSlug ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3 text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors" />
                  )}
                </div>
              </button>
              
              {canEdit && (
                <button
                  onClick={() => setShowSlugModal(true)}
                  className="px-2 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-all flex-shrink-0"
                  disabled={updating}
                  title="Edit URL"
                >
                  <Edit3 className="h-3 w-3 text-neutral-600 dark:text-gray-400" />
                </button>
              )}
            </div>
          </div>

          {/* Shortcode Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-neutral-600 dark:text-gray-400">Shortcode</span>
              <div className="group relative">
                <Info className="h-3 w-3 text-neutral-400 hover:text-neutral-600 dark:hover:text-gray-300 cursor-help" />
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-50 w-64">
                  <div className="bg-neutral-900 dark:bg-neutral-800 text-white text-xs rounded-lg p-3 shadow-lg">
                    <p className="leading-relaxed">
                      Use this shortcode with the ROCQET browser extension to quickly insert this prompt anywhere. Type <span className="font-mono bg-neutral-800 dark:bg-neutral-700 px-1 py-0.5 rounded">@{shortcode || 'shortcode'}</span> to instantly access and paste your prompt content.
                    </p>
                    <div className="absolute left-4 top-full">
                      <div className="border-8 border-transparent border-t-neutral-900 dark:border-t-neutral-800"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={shortcode}
                onChange={(e) => setShortcode(e.target.value)}
                onBlur={() => {
                  if (shortcode !== prompt.shortcode) {
                    handleShortcodeUpdate(shortcode);
                  }
                }}
                placeholder="e.g., blog-post"
                className="flex-1 px-2 py-1.5 text-xs font-mono bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                disabled={!canEdit}
              />
            </div>
          </div>

          {/* Visibility Section */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-medium text-neutral-600 dark:text-gray-400">Visibility</span>
            <div className="flex gap-1.5">
              <button
                onClick={() => handleVisibilityChange(false)}
                disabled={updating || !canEdit || workspace.tier === 'free'}
                className={`flex items-center justify-center gap-1 px-3 py-1 text-[11px] rounded-md border transition-all ${
                  !isPublic 
                    ? 'bg-button-primary text-white border-button-primary dark:bg-button-primary dark:text-white' 
                    : 'bg-white dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-750 hover:border-neutral-300'
                } ${(workspace.tier === 'free' || !canEdit) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <Lock className="h-3 w-3" />
                <span>Private</span>
              </button>
              <button
                onClick={() => handleVisibilityChange(true)}
                disabled={updating || !canEdit}
                className={`flex items-center justify-center gap-1 px-3 py-1 text-[11px] rounded-md border transition-all ${
                  isPublic 
                    ? 'bg-button-primary text-white border-button-primary dark:bg-button-primary dark:text-white' 
                    : 'bg-white dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-750 hover:border-neutral-300'
                } ${!canEdit ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <Globe className="h-3 w-3" />
                <span>Public</span>
              </button>
            </div>
            
            {/* Workspace tier limitation notice */}
            {workspace.tier === 'free' && (
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[10px] text-amber-600 dark:text-amber-400">
                  Free tier only supports public prompts
                </span>
              </div>
            )}
          </div>

          {/* Privacy Status Indicator */}
          <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center gap-2">
              {isPublic ? (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-neutral-600 dark:text-gray-400">
                    Publicly accessible
                  </span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-neutral-400 dark:bg-neutral-500 rounded-full"></div>
                  <span className="text-xs text-neutral-600 dark:text-gray-400">
                    Private to workspace
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Slug Edit Modal */}
      <SlugEditModal
        isOpen={showSlugModal}
        onClose={() => setShowSlugModal(false)}
        currentSlug={prompt.slug}
        title={prompt.name}
        workspaceSlug={workspace.slug}
        type="prompt"
        onSave={async (newSlug: string) => {
          const response = await fetch('/api/prompts', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: prompt.id,
              workspace_id: workspace.id,
              slug: newSlug
            })
          });
          
          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update slug');
          }
          
          handleSlugUpdate(newSlug);
        }}
      />
    </>
  );
}