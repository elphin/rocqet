'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Save, 
  ArrowLeft, 
  Hash, 
  Lock, 
  Globe, 
  FolderPlus,
  Plus,
  X,
  Info,
  GitBranch
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Link from 'next/link';

interface EditPromptFormProps {
  prompt: any;
  folders: any[];
  tags: any[];
  workspace: any;
  workspaceSlug: string;
}

export function EditPromptForm({ 
  prompt, 
  folders, 
  tags, 
  workspace, 
  workspaceSlug 
}: EditPromptFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: prompt.name || '',
    description: prompt.description || '',
    shortcode: prompt.shortcode || '',
    folder_id: prompt.folder_id || '',
    visibility: prompt.is_shared ? 'public' : 'private',
    content: prompt.content || '',
    selectedTags: prompt.prompt_tags?.map((pt: any) => pt.tags.id) || []
  });
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [tagInput, setTagInput] = useState('');

  // Add keyboard shortcut for Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+S or Cmd+S
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [formData]); // Include formData in deps to ensure latest state is used

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Title and content are required');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/prompts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: prompt.id,
          workspace_id: workspace.id,
          name: formData.title,
          description: formData.description,
          content: formData.content,
          shortcode: formData.shortcode,
          folder_id: formData.folder_id || null,
          is_shared: formData.visibility === 'public',
          tags: formData.selectedTags
        })
      });

      if (response.ok) {
        toast.success('Prompt updated successfully');
        router.push(`/${workspaceSlug}/prompts/${prompt.slug}`);
      } else {
        throw new Error('Failed to update prompt');
      }
    } catch (error) {
      toast.error('Failed to update prompt');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAsNewVersion = async () => {
    // Implement version creation logic
    toast.info('Version control coming soon!');
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFolderName,
          workspace_id: workspace.id
        })
      });

      if (response.ok) {
        const folder = await response.json();
        setFormData({ ...formData, folder_id: folder.id });
        setShowNewFolderInput(false);
        setNewFolderName('');
        toast.success('Folder created');
        // Refresh folders list
        window.location.reload();
      }
    } catch (error) {
      toast.error('Failed to create folder');
    }
  };

  const handleAddTag = (tagId: string) => {
    if (!formData.selectedTags.includes(tagId)) {
      setFormData({
        ...formData,
        selectedTags: [...formData.selectedTags, tagId]
      });
    }
  };

  const handleRemoveTag = (tagId: string) => {
    setFormData({
      ...formData,
      selectedTags: formData.selectedTags.filter(id => id !== tagId)
    });
  };

  // Extract variables from content
  const extractedVariables = (formData.content.match(/\{\{([^}]+)\}\}/g) || [])
    .map(v => v.replace(/[{}]/g, '').trim());

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href={`/${workspaceSlug}/prompts`}>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                  Back
                </Button>
              </Link>
              <h1 className="text-lg font-semibold text-neutral-900">Edit Prompt</h1>
              <span className="text-xs text-neutral-500">
                Editing in {workspace.name} workspace
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-500">
                Auto-save enabled
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => router.push(`/${workspaceSlug}/prompts/${prompt.slug}`)}
              >
                Cancel
              </Button>
              <Button 
                size="sm"
                onClick={handleSave}
                disabled={loading}
                className="bg-primary hover:bg-primary-dark text-white"
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                Save Changes
                <span className="ml-2 text-xs opacity-60">(Ctrl+S)</span>
              </Button>
              <Button 
                size="sm"
                variant="outline"
                onClick={handleSaveAsNewVersion}
                className="border-primary text-primary"
              >
                <GitBranch className="w-3.5 h-3.5 mr-1.5" />
                Save as New Version
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Form */}
          <div className="lg:col-span-2 space-y-4">
            {/* Title */}
            <div className="bg-white rounded-lg border border-neutral-200 p-4">
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Enter prompt title..."
              />
            </div>

            {/* Description */}
            <div className="bg-white rounded-lg border border-neutral-200 p-4">
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                rows={2}
                placeholder="Brief description of what this prompt does..."
              />
            </div>

            {/* Shortcode */}
            <div className="bg-white rounded-lg border border-neutral-200 p-4">
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Shortcode
              </label>
              <input
                type="text"
                value={formData.shortcode}
                onChange={(e) => setFormData({ ...formData, shortcode: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="e.g. blog, email, code (optional)"
              />
              <p className="text-[10px] text-neutral-500 mt-1">
                Quick access code for browser extension. Type /shortcode to insert prompt.
              </p>
            </div>

            {/* Folder */}
            <div className="bg-white rounded-lg border border-neutral-200 p-4">
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Folder
              </label>
              {!showNewFolderInput ? (
                <div className="flex items-center gap-2">
                  <select
                    value={formData.folder_id}
                    onChange={(e) => setFormData({ ...formData, folder_id: e.target.value })}
                    className="flex-1 px-3 py-1.5 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="">No folder</option>
                    {folders.map(folder => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowNewFolderInput(true)}
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="New folder name..."
                    autoFocus
                  />
                  <Button size="sm" onClick={handleCreateFolder}>
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => {
                      setShowNewFolderInput(false);
                      setNewFolderName('');
                    }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>

            {/* Tags */}
            <div className="bg-white rounded-lg border border-neutral-200 p-4">
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Tags
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {formData.selectedTags.map(tagId => {
                  const tag = tags.find(t => t.id === tagId);
                  if (!tag) return null;
                  return (
                    <span 
                      key={tag.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-neutral-100"
                    >
                      <Hash className="w-2.5 h-2.5" />
                      {tag.name}
                      <button
                        onClick={() => handleRemoveTag(tag.id)}
                        className="ml-1 hover:text-error"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  );
                })}
              </div>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Type to search or create tags..."
              />
            </div>

            {/* Visibility */}
            <div className="bg-white rounded-lg border border-neutral-200 p-4">
              <label className="block text-xs font-medium text-neutral-700 mb-2">
                Visibility
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="visibility"
                    value="private"
                    checked={formData.visibility === 'private'}
                    onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                    className="text-primary"
                  />
                  <Lock className="w-3.5 h-3.5 text-neutral-600" />
                  <span className="text-sm text-neutral-700">Private</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="visibility"
                    value="public"
                    checked={formData.visibility === 'public'}
                    onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                    className="text-primary"
                  />
                  <Globe className="w-3.5 h-3.5 text-neutral-600" />
                  <span className="text-sm text-neutral-700">Public</span>
                </label>
              </div>
              {workspace.tier === 'free' && (
                <p className="text-[10px] text-warning mt-2 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Free tier only supports public prompts
                </p>
              )}
            </div>

            {/* Prompt Content */}
            <div className="bg-white rounded-lg border border-neutral-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-medium text-neutral-700">
                  Prompt Content
                </label>
                <span className="text-[10px] text-neutral-500">
                  Tip: Use {`{{variables}}`} for dynamic content that can be replaced later
                </span>
              </div>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full px-3 py-2 text-sm font-mono border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                rows={12}
                placeholder="Enter your prompt content here..."
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] text-neutral-500">
                  Line numbers shown for reference
                </span>
                {extractedVariables.length > 0 && (
                  <span className="text-[10px] text-primary">
                    {extractedVariables.length} variable{extractedVariables.length > 1 ? 's' : ''} detected
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Metadata & Info */}
          <div className="space-y-4">
            {/* Metadata */}
            <div className="bg-white rounded-lg border border-neutral-200 p-4">
              <h3 className="text-xs font-medium text-neutral-700 mb-3">Metadata</h3>
              <div className="space-y-2 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Created by</span>
                  <span className="text-neutral-700">{prompt.created_by || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Created</span>
                  <span className="text-neutral-700">
                    {new Date(prompt.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Last edited by</span>
                  <span className="text-neutral-700">{prompt.updated_by || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Last edited</span>
                  <span className="text-neutral-700">
                    {new Date(prompt.updated_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Version</span>
                  <span className="text-neutral-700">v{prompt.version || 1}</span>
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div className="bg-white rounded-lg border border-neutral-200 p-4">
              <h3 className="text-xs font-medium text-neutral-700 mb-3">Statistics</h3>
              <div className="space-y-2 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Views</span>
                  <span className="text-neutral-700">{prompt.view_count || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Uses</span>
                  <span className="text-neutral-700">{prompt.usage_count || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Favorites</span>
                  <span className="text-neutral-700">{prompt.favorite_count || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Shares</span>
                  <span className="text-neutral-700">{prompt.share_count || 0}</span>
                </div>
              </div>
            </div>

            {/* Detected Variables */}
            {extractedVariables.length > 0 && (
              <div className="bg-primary-pale rounded-lg border border-primary-light p-4">
                <h3 className="text-xs font-medium text-primary-dark mb-2">
                  Detected Variables
                </h3>
                <div className="space-y-1">
                  {extractedVariables.map((variable, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-primary">
                        {`{{${variable}}}`}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-primary-dark/70 mt-2">
                  These will be replaced when using the prompt
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}