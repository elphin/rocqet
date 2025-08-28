'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CodeMirrorPromptEditor } from '@/components/codemirror-prompt-editor';
import { 
  ArrowLeft, Save, Variable, Settings, Lock, Globe, FolderOpen, 
  Hash, Plus, X, Info, ChevronDown, GitBranch, Link2, Edit2, Copy
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { hasPermission, Role } from '@/lib/permissions';
import { SlugEditModal } from '@/components/modals/slug-edit-modal';

export default function EditPromptPageClean({
  params
}: {
  params: Promise<{ workspace: string; id: string }>
}) {
  const { workspace, id } = use(params);
  
  // Basic fields
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [shortcode, setShortcode] = useState('');
  const [content, setContent] = useState('');
  
  // Organization fields
  const [folder, setFolder] = useState<{ id: string; name: string } | null>(null);
  const [tags, setTags] = useState<{ id: string; name: string; color: string }[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  
  // Model settings
  const [model, setModel] = useState('gpt-4');
  const [temperature, setTemperature] = useState(7);
  const [variables, setVariables] = useState<string[]>([]);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [originalPrompt, setOriginalPrompt] = useState<any>(null);
  const [userRole, setUserRole] = useState<Role>('viewer');
  const [hasEditPermission, setHasEditPermission] = useState(false);
  const [showFolderDropdown, setShowFolderDropdown] = useState(false);
  const [showTagsDropdown, setShowTagsDropdown] = useState(false);
  const [availableFolders, setAvailableFolders] = useState<any[]>([]);
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [userTier, setUserTier] = useState('free');
  const [showSlugModal, setShowSlugModal] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Load existing prompt data
    const fetchPrompt = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError('Not authenticated');
          setLoading(false);
          return;
        }
        
        const { data: membership, error: membershipError } = await supabase
          .from('workspace_members')
          .select(`
            workspace_id,
            role,
            workspaces!inner (
              id,
              slug,
              subscription_tier
            )
          `)
          .eq('user_id', user.id)
          .eq('workspaces.slug', workspace)
          .single();
        
        if (membership) {
          setWorkspaceId(membership.workspace_id);
          setUserRole(membership.role as Role);
          setUserTier(membership.workspaces.subscription_tier || 'free');
          
          const canEdit = hasPermission(membership.role as Role, 'prompts.edit');
          setHasEditPermission(canEdit);
          
          if (!canEdit) {
            setError('You do not have permission to edit prompts');
            return;
          }
          
          const { data: prompt, error: promptError } = await supabase
            .from('prompts')
            .select('*')
            .eq('slug', id)
            .eq('workspace_id', membership.workspace_id)
            .single();
          
          if (prompt) {
            setOriginalPrompt(prompt);
            setName(prompt.name || '');
            setSlug(prompt.slug || '');
            setDescription(prompt.description || '');
            setShortcode(prompt.shortcode || '');
            setContent(prompt.content || '');
            // Set visibility based on saved state or tier default
            const tier = membership.workspaces.subscription_tier || 'free';
            setIsPublic(prompt.is_shared === true || prompt.visibility === 'public' || (tier === 'free' && prompt.is_shared !== false));
            setModel(prompt.model || 'gpt-4');
            setTemperature(prompt.temperature !== undefined ? prompt.temperature : 7);
            
            // Fetch related data
            try {
              const [foldersRes, tagsRes, folderRes, promptTagsRes] = await Promise.all([
                supabase
                  .from('folders')
                  .select('id, name')
                  .eq('workspace_id', membership.workspace_id),
                supabase
                  .from('tags')
                  .select('id, name, color')
                  .eq('workspace_id', membership.workspace_id),
                prompt.folder_id ? supabase
                  .from('folders')
                  .select('id, name')
                  .eq('id', prompt.folder_id)
                  .single() : Promise.resolve({ data: null, error: null }),
                supabase
                  .from('prompt_tags')
                  .select('tag_id, tags(id, name, color)')
                  .eq('prompt_id', prompt.id)
              ]);
            
              setAvailableFolders(foldersRes.data || []);
              setAvailableTags(tagsRes.data || []);
              
              if (folderRes.data) {
                setFolder(folderRes.data);
              }
              
              if (promptTagsRes.data) {
                const tagsData = promptTagsRes.data
                  .map((pt: any) => pt.tags)
                  .filter((t: any) => t !== null);
                setTags(tagsData);
              }
            } catch (relatedError) {
              console.warn('Error fetching related data:', relatedError);
              setAvailableFolders([]);
              setAvailableTags([]);
            }
          } else {
            setError(promptError?.message || 'Prompt not found');
          }
        } else {
          setError('Workspace membership not found');
        }
      } catch (err: any) {
        console.error('Error loading prompt:', err);
        setError(err.message || 'Failed to load prompt');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPrompt();
  }, [workspace, id]);

  // Detect variables in content
  useEffect(() => {
    const regex = /\{\{([^}]+)\}\}/g;
    const matches = content.match(regex);
    if (matches) {
      const vars = matches.map(m => m.replace(/[{}]/g, '').trim());
      setVariables([...new Set(vars)]);
    } else {
      setVariables([]);
    }
  }, [content]);

  const handleSave = async () => {
    if (!workspaceId || !originalPrompt) {
      setError('Unable to save. Please refresh the page.');
      return;
    }

    if (!name.trim()) {
      setError('Please enter a prompt name');
      return;
    }

    if (!content.trim()) {
      setError('Please enter prompt content');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const contentChanged = originalPrompt.content !== content;
      const newVersion = contentChanged ? (originalPrompt.version || 1) + 1 : originalPrompt.version;
      
      // Validate and format slug
      const formattedSlug = slug
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-')          // Replace spaces with hyphens
        .replace(/-+/g, '-')           // Replace multiple hyphens with single
        .replace(/^-|-$/g, '');        // Remove leading/trailing hyphens

      // Check if slug is unique (only if changed)
      if (formattedSlug !== originalPrompt.slug) {
        const { data: existingPrompt } = await supabase
          .from('prompts')
          .select('id')
          .eq('workspace_id', workspaceId)
          .eq('slug', formattedSlug)
          .single();

        if (existingPrompt) {
          toast.error('A prompt with this slug already exists. Please choose a different slug.');
          setSaving(false);
          return;
        }
      }

      const payload = {
        id: originalPrompt.id,
        workspace_id: workspaceId,
        name,
        slug: formattedSlug,
        description,
        shortcode,
        content,
        folder_id: folder?.id || null,
        visibility: isPublic ? 'public' : 'private',
        variables: variables.map(v => ({ name: v, type: 'text', defaultValue: '' })),
        model,
        temperature,
        version: newVersion,
        create_version: contentChanged,
        tags: tags.map(t => t.id)
      };
      
      const response = await fetch('/api/prompts', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update prompt');
      }

      toast.success('Prompt updated successfully!');
      router.push(`/${workspace}/prompts/${formattedSlug || result.data.slug || id}`);
    } catch (err: any) {
      console.error('Error updating prompt:', err);
      toast.error(err.message || 'Failed to update prompt');
      setError(err.message || 'Failed to update prompt');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTag = (tag: any) => {
    if (!tags.find(t => t.id === tag.id)) {
      setTags([...tags, tag]);
    }
    setShowTagsDropdown(false);
    setTagSearchQuery('');
  };

  const handleRemoveTag = (tagId: string) => {
    setTags(tags.filter(t => t.id !== tagId));
  };

  const handleCreateTag = async () => {
    if (!tagSearchQuery.trim() || !workspaceId) return;
    
    const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    try {
      const { data, error } = await supabase
        .from('tags')
        .insert({ 
          name: tagSearchQuery.trim(), 
          workspace_id: workspaceId,
          color: randomColor
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setAvailableTags([...availableTags, data]);
      handleAddTag(data);
      toast.success('Tag created and added!');
    } catch (err) {
      toast.error('Failed to create tag');
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !workspaceId) return;
    
    try {
      const { data, error } = await supabase
        .from('folders')
        .insert({ 
          name: newFolderName, 
          workspace_id: workspaceId 
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setFolder(data);
      setAvailableFolders([...availableFolders, data]);
      setNewFolderName('');
      setShowFolderDropdown(false);
      toast.success('Folder created!');
    } catch (err) {
      toast.error('Failed to create folder');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-3 text-sm text-neutral-500">Loading prompt...</p>
        </div>
      </div>
    );
  }

  if (error && !originalPrompt) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          {!hasEditPermission ? (
            <>
              <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-error/10">
                <Lock className="h-5 w-5 text-error" />
              </div>
              <h3 className="mb-2 text-base font-medium text-neutral-900">No Permission</h3>
              <p className="text-neutral-600 mb-4 text-sm">
                You need at least a Member role to edit prompts
              </p>
            </>
          ) : (
            <p className="text-error mb-4">{error}</p>
          )}
          <Link href={`/${workspace}/prompts`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-3.5 w-3.5" />
              Back to Prompts
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleSlugSave = async (newSlug: string) => {
    // Validate and format slug
    const formattedSlug = newSlug
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // Check if slug is unique (only if changed)
    if (formattedSlug !== originalPrompt.slug) {
      const { data: existingPrompt } = await supabase
        .from('prompts')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('slug', formattedSlug)
        .single();

      if (existingPrompt) {
        throw new Error('A prompt with this slug already exists');
      }
    }

    setSlug(formattedSlug);
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="mx-auto max-w-7xl p-6">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Link href={`/${workspace}/prompts`}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-gray-100">Edit Prompt</h1>
                <p className="text-sm text-neutral-500 dark:text-gray-400 mt-1">Make changes to your prompt template</p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/${workspace}/prompts/${id}`)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving || !name || !content}
                className="bg-primary hover:bg-primary-dark text-white shadow-sm px-4 transition-all duration-200 hover:shadow-md hover:scale-[1.02]"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-1.5 h-3.5 w-3.5" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-4 md:grid-cols-1">
          {/* Main Content - LEFT SIDE */}
          <div className="lg:col-span-3 md:col-span-1 space-y-4">
            {/* Basic Info - Simplified */}
            <div className="rounded-lg bg-white dark:bg-neutral-900 p-4 shadow-xs border border-neutral-200 dark:border-neutral-800">
              <div className="space-y-3">
                <div>
                  <label htmlFor="prompt-title" className="block text-sm font-semibold text-neutral-900 dark:text-gray-100 mb-2">
                    Title <span className="text-red-500" aria-label="required">*</span>
                  </label>
                  <Input
                    id="prompt-title"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Blog Post Generator"
                    className="h-9 text-sm transition-all duration-200 focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:border-primary"
                    aria-required="true"
                    aria-invalid={!name && error ? 'true' : 'false'}
                  />
                </div>
                
                <div>
                  <label htmlFor="prompt-description" className="block text-sm font-semibold text-neutral-900 dark:text-gray-100 mb-2">
                    Description
                  </label>
                  <Input
                    id="prompt-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of what this prompt does"
                    className="h-9 text-sm transition-all duration-200 focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* Content Editor - NOW HIGHER ON THE PAGE */}
            <div className="rounded-lg bg-white dark:bg-neutral-900 p-4 shadow-sm border-2 border-neutral-200 dark:border-neutral-800 focus-within:border-primary focus-within:shadow-md transition-all duration-200">
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-semibold text-neutral-900 dark:text-gray-100">
                  Prompt Content <span className="text-red-500" aria-label="required">*</span>
                </label>
                <div className="text-[10px] text-neutral-500 dark:text-gray-400">
                  Use {"{{variable}}"} for dynamic values • Select text and click "Make Variable"
                </div>
              </div>
              <CodeMirrorPromptEditor
                value={content}
                onChange={setContent}
                placeholder={`Write your prompt here...

Example:
Write a blog post about {{topic}} for {{audience}}.
The tone should be {{tone}} and approximately {{length}} words.`}
                detectedVariables={variables}
                mode="prompt"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-950 p-4 border border-red-200 dark:border-red-800 flex items-start gap-3">
                <X className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-red-900 dark:text-red-100">Error</h4>
                  <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT SIDEBAR - All organization stuff here */}
          <div className="lg:col-span-1 space-y-4">
            {/* URL, Shortcode & Visibility - Combined card */}
            <div className="rounded-lg bg-white dark:bg-neutral-900 p-4 shadow-xs border border-neutral-200 dark:border-neutral-800 hover:shadow-sm hover:border-neutral-300 dark:hover:border-neutral-700 transition-all duration-200">
              <h3 className="text-sm font-medium mb-3 text-neutral-900 dark:text-gray-100">Properties</h3>
              
              {/* URL Slug */}
              <div className="mb-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-neutral-700 dark:text-gray-300">
                    URL
                  </label>
                  <button
                    onClick={() => setShowSlugModal(true)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors flex items-center gap-1"
                  >
                    <Edit2 className="h-3 w-3" />
                    Edit
                  </button>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/${workspace}/prompts/${slug}`);
                    toast.success('URL copied to clipboard');
                  }}
                  className="w-full flex items-center gap-2 p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-all text-left group"
                >
                  <Link2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <span className="text-xs font-mono text-neutral-700 dark:text-neutral-300 truncate flex-1 text-right" dir="rtl">
                    /{workspace}/prompts/{slug || 'your-slug'}
                  </span>
                  <Copy className="h-3.5 w-3.5 text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors flex-shrink-0" />
                </button>
              </div>

              {/* Shortcode */}
              <div className="mb-3">
                <label className="block text-xs font-medium text-neutral-700 dark:text-gray-300 mb-1">
                  Shortcode
                </label>
                <Input
                  value={shortcode}
                  onChange={(e) => setShortcode(e.target.value)}
                  placeholder="e.g., blog-post"
                  className="h-7 text-xs"
                />
                <p className="text-[10px] text-neutral-500 mt-1">
                  Use in browser extension for quick access
                </p>
              </div>

              {/* Visibility */}
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-gray-300 mb-1">
                  Visibility
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsPublic(false)}
                    className={`flex items-center gap-1 px-2 py-1 text-xs rounded border ${
                      !isPublic 
                        ? 'bg-primary-pale text-primary border-primary' 
                        : 'bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-50'
                    }`}
                    disabled={userTier === 'free'}
                  >
                    <Lock className="h-3 w-3" />
                    Private
                  </button>
                  <button
                    onClick={() => setIsPublic(true)}
                    className={`flex items-center gap-1 px-2 py-1 text-xs rounded border ${
                      isPublic 
                        ? 'bg-primary-pale text-primary border-primary' 
                        : 'bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-50'
                    }`}
                  >
                    <Globe className="h-3 w-3" />
                    Public
                  </button>
                </div>
                {userTier === 'free' && (
                  <p className="text-[10px] text-warning mt-1">
                    Free tier only supports public prompts
                  </p>
                )}
              </div>
            </div>

            {/* Organization */}
            <div className="rounded-lg bg-white dark:bg-neutral-900 p-4 shadow-xs border border-neutral-200 dark:border-neutral-800 hover:shadow-sm hover:border-neutral-300 dark:hover:border-neutral-700 transition-all duration-200">
              <h3 className="text-sm font-medium mb-3 text-neutral-900 dark:text-gray-100">Organization</h3>
              <div className="space-y-3">
                {/* Folder */}
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Folder
                  </label>
                  <div className="relative">
                    <button
                      onClick={() => setShowFolderDropdown(!showFolderDropdown)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setShowFolderDropdown(false);
                        if (e.key === 'Enter') e.preventDefault();
                      }}
                      className="w-full h-7 px-2 text-xs text-left border border-neutral-300 rounded-md hover:bg-neutral-50 flex items-center justify-between"
                    >
                      <span className="flex items-center gap-1.5">
                        <FolderOpen className="h-3 w-3 text-neutral-400" />
                        {folder ? folder.name : 'Select folder'}
                      </span>
                      <ChevronDown className="h-3 w-3 text-neutral-400" />
                    </button>
                    {showFolderDropdown && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-neutral-200 rounded-md shadow-lg">
                        <div className="p-2 border-b">
                          <div className="flex gap-1">
                            <Input
                              value={newFolderName}
                              onChange={(e) => setNewFolderName(e.target.value)}
                              placeholder="New folder name"
                              className="h-6 text-xs flex-1"
                            />
                            <Button 
                              size="sm" 
                              className="h-6 px-2 text-xs"
                              onClick={handleCreateFolder}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="max-h-40 overflow-y-auto">
                          {availableFolders.map(f => (
                            <button
                              key={f.id}
                              onClick={() => {
                                setFolder(f);
                                setShowFolderDropdown(false);
                              }}
                              className="w-full px-3 py-1.5 text-xs text-left hover:bg-neutral-50 flex items-center gap-1.5"
                            >
                              <FolderOpen className="h-3 w-3 text-neutral-400" />
                              {f.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tags */}
                <div className="relative">
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {tags.map(tag => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border transition-all duration-200 hover:scale-[1.05]"
                        style={{ 
                          backgroundColor: tag.color + '15',
                          borderColor: tag.color + '30',
                          color: tag.color 
                        }}
                      >
                        <Hash className="h-2.5 w-2.5" />
                        {tag.name}
                        <button
                          onClick={() => handleRemoveTag(tag.id)}
                          className="hover:opacity-70"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowTagsDropdown(!showTagsDropdown)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setShowTagsDropdown(false);
                    }}
                    className="text-xs text-primary hover:text-primary-dark"
                  >
                    <Plus className="h-3 w-3 inline mr-1" />
                    Add tag
                  </button>
                  {showTagsDropdown && (
                    <div className="absolute z-20 mt-1 w-full bg-white border border-neutral-200 rounded-md shadow-lg">
                      <div className="p-2 border-b border-neutral-100">
                        <Input
                          value={tagSearchQuery}
                          onChange={(e) => setTagSearchQuery(e.target.value)}
                          placeholder="Search or create tag..."
                          className="h-6 text-xs"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-32 overflow-y-auto">
                        {availableTags
                          .filter(t => !tags.find(tag => tag.id === t.id))
                          .filter(t => !tagSearchQuery || t.name.toLowerCase().includes(tagSearchQuery.toLowerCase()))
                          .map(tag => (
                            <button
                              key={tag.id}
                              onClick={() => handleAddTag(tag)}
                              className="w-full px-2 py-1 text-xs text-left hover:bg-neutral-50 flex items-center gap-1"
                            >
                              <span 
                                className="w-2.5 h-2.5 rounded-full" 
                                style={{ backgroundColor: tag.color }}
                              />
                              {tag.name}
                            </button>
                          ))}
                        {tagSearchQuery && !availableTags.find(t => t.name.toLowerCase() === tagSearchQuery.toLowerCase()) && (
                          <button
                            onClick={handleCreateTag}
                            className="w-full px-2 py-1 text-xs text-left hover:bg-primary-pale flex items-center gap-1 text-primary"
                          >
                            <Plus className="h-3 w-3" />
                            Create "{tagSearchQuery}"
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* Model Settings */}
            <div className="rounded-lg bg-white dark:bg-neutral-900 p-4 shadow-xs border border-neutral-200 dark:border-neutral-800 hover:shadow-sm hover:border-neutral-300 dark:hover:border-neutral-700 transition-all duration-200">
              <div className="mb-3 flex items-center gap-2">
                <Settings className="h-3.5 w-3.5 text-neutral-600" />
                <h3 className="text-sm font-medium text-neutral-900 dark:text-gray-100">Model Settings</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Model
                  </label>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full h-7 px-2 text-xs border border-neutral-300 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-neutral-800 text-neutral-900 dark:text-gray-100"
                  >
                    <option value="gpt-4">GPT-4</option>
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    <option value="claude-3-opus">Claude 3 Opus</option>
                    <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Temperature: {temperature / 10}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={temperature}
                    onChange={(e) => setTemperature(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-[10px] text-neutral-500 mt-1">
                    <span>Precise</span>
                    <span>Creative</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Version Info - Only show when there are unsaved changes */}
            {originalPrompt?.content !== content && (
              <div className="rounded-lg bg-warning-pale p-3 border border-warning-light">
                <div className="flex items-center gap-2 mb-1">
                  <GitBranch className="h-3.5 w-3.5 text-warning" />
                  <span className="text-xs font-medium text-warning-dark">Unsaved Changes</span>
                </div>
                <p className="text-[10px] text-warning-dark">
                  Saving will create version {(originalPrompt?.version || 1) + 1}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Slug Edit Modal */}
      <SlugEditModal
        isOpen={showSlugModal}
        onClose={() => setShowSlugModal(false)}
        currentSlug={slug}
        title={name}
        workspaceSlug={workspace}
        type="prompt"
        onSave={handleSlugSave}
      />
    </div>
  );
}