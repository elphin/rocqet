'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CodeMirrorPromptEditor } from '@/components/codemirror-prompt-editor';
import { 
  ArrowLeft, Save, Wand2, Variable, Settings, Lock, Copy, Share2, Star,
  Globe, FolderOpen, Hash, Plus, X, Info, Eye, Users, Clock, TrendingUp,
  Heart, ExternalLink, Download, Code, FileText, ChevronDown, GitBranch
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { hasPermission, Role } from '@/lib/permissions';
import { formatDate } from '@/lib/utils/date';

export default function EditPromptPage({
  params
}: {
  params: Promise<{ workspace: string; id: string }> // 'id' is actually the slug now
}) {
  const { workspace, id } = use(params);
  // Basic fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [shortcode, setShortcode] = useState('');
  const [content, setContent] = useState('');
  
  // Advanced fields
  const [folder, setFolder] = useState<{ id: string; name: string } | null>(null);
  const [tags, setTags] = useState<{ id: string; name: string; color: string }[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  
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
  const [showVariablesModal, setShowVariablesModal] = useState(false);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  
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
        // Get workspace membership
        console.log('Fetching workspace membership for:', workspace);
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
        
        console.log('Membership result:', { membership, error: membershipError });
        
        if (membership) {
          setWorkspaceId(membership.workspace_id);
          setUserRole(membership.role as Role);
          setUserTier(membership.workspaces.subscription_tier || 'free');
          
          // Check if user has permission to edit prompts
          const canEdit = hasPermission(membership.role as Role, 'prompts.edit');
          setHasEditPermission(canEdit);
          
          if (!canEdit) {
            setError('You do not have permission to edit prompts');
            return;
          }
          
          // First fetch the basic prompt data
          console.log('Fetching prompt with slug:', id, 'and workspace_id:', membership.workspace_id);
          const { data: prompt, error: promptError } = await supabase
            .from('prompts')
            .select('*')
            .eq('slug', id)
            .eq('workspace_id', membership.workspace_id)
            .single();
          
          console.log('Prompt query result:', { prompt, error: promptError });
          
          if (prompt) {
            console.log('Prompt found:', prompt);
            setOriginalPrompt(prompt);
            setName(prompt.name || '');
            setDescription(prompt.description || '');
            setShortcode(prompt.shortcode || '');
            setContent(prompt.content || '');
            // Handle different visibility field names
            // Free tier can only have public prompts
            setIsPublic(prompt.visibility === 'public' || prompt.is_public === true || membership.workspaces.subscription_tier === 'free' || false);
            setIsFavorite(prompt.is_favorite === true || false);
            setModel(prompt.model || 'gpt-4');
            setTemperature(prompt.temperature !== undefined ? prompt.temperature : 7);
            
            // Fetch related data separately with error handling
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
              // Continue with basic prompt data even if related data fails
              setAvailableFolders([]);
              setAvailableTags([]);
            }
          } else {
            console.error('Prompt not found with slug:', id, 'Error:', promptError);
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

  // Detect variables in content (format: {{variable_name}})
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
      // Check if content has changed to determine if we need a new version
      const contentChanged = originalPrompt.content !== content;
      const newVersion = contentChanged ? (originalPrompt.version || 1) + 1 : originalPrompt.version;
      
      const payload = {
        id: originalPrompt.id,
        workspace_id: workspaceId,
        name,
        description,
        shortcode,
        content,
        folder_id: folder?.id || null,
        visibility: isPublic ? 'public' : 'private',
        is_favorite: isFavorite,
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
      // Redirect to the prompt detail page using the slug
      router.push(`/${workspace}/prompts/${result.data.slug || id}`);
    } catch (err: any) {
      console.error('Error updating prompt:', err);
      toast.error(err.message || 'Failed to update prompt');
      setError(err.message || 'Failed to update prompt');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFavorite = async () => {
    const newFavoriteState = !isFavorite;
    setIsFavorite(newFavoriteState);
    
    // Save immediately to database
    try {
      const { error } = await supabase
        .from('prompts')
        .update({ is_favorite: newFavoriteState })
        .eq('id', originalPrompt?.id)
        .eq('workspace_id', workspaceId);
      
      if (error) {
        console.error('Error updating favorite status:', error);
        setIsFavorite(!newFavoriteState); // Revert on error
        toast.error('Failed to update favorite status');
      } else {
        toast.success(newFavoriteState ? 'Added to favorites' : 'Removed from favorites');
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
      setIsFavorite(!newFavoriteState); // Revert on error
      toast.error('Failed to update favorite status');
    }
  };

  const handleCopyRaw = () => {
    navigator.clipboard.writeText(content);
    toast.success('Prompt copied to clipboard!');
  };

  const handleCopyWithVariables = () => {
    let filledContent = content;
    Object.entries(variableValues).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      filledContent = filledContent.replace(regex, value);
    });
    navigator.clipboard.writeText(filledContent);
    toast.success('Prompt with variables copied to clipboard!');
    setShowVariablesModal(false);
    setVariableValues({});
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
    
    // Generate a random color for the new tag
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
      
      // Add the new tag to available tags
      setAvailableTags([...availableTags, data]);
      // Add it to selected tags
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

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="mx-auto max-w-7xl p-6">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
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
            <div className="flex items-center gap-2">
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
                className="bg-primary hover:bg-primary-dark text-white"
              >
                <Save className="mr-1.5 h-3.5 w-3.5" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Basic Info */}
            <div className="rounded-lg bg-white dark:bg-neutral-900 p-4 shadow-xs border border-neutral-200 dark:border-neutral-800">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-gray-300 mb-1">
                    Title
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Blog Post Generator"
                    className="h-7 text-sm"
                  />
                </div>
                
                {/* Metadata */}
                <div className="flex items-center gap-4 py-2 border-b border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center gap-1 text-[10px] text-neutral-500">
                    <span>Created by</span>
                    <span className="text-neutral-700 font-medium">You</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-neutral-500">
                    <span>•</span>
                    <span>{formatDate(originalPrompt?.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-neutral-500">
                    <span>•</span>
                    <span>Updated {formatDate(originalPrompt?.updated_at)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-neutral-500">
                    <span>•</span>
                    <span>Version {originalPrompt?.version || 1}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-neutral-500">
                    <Eye className="h-3 w-3" />
                    <span>{originalPrompt?.views || 0}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-neutral-500">
                    <TrendingUp className="h-3 w-3" />
                    <span>{originalPrompt?.uses || 0}</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of what this prompt does"
                    className="h-7 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-gray-300 mb-1">
                    Shortcode
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={shortcode}
                      onChange={(e) => setShortcode(e.target.value)}
                      placeholder="e.g., blog-post"
                      className="h-7 text-sm"
                    />
                    <Button variant="ghost" size="sm" className="h-7">
                      <Info className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-neutral-500 mt-1">
                    Use this code in the browser extension for quick access
                  </p>
                </div>
              </div>
            </div>

            {/* Organization */}
            <div className="rounded-lg bg-white dark:bg-neutral-900 p-4 shadow-xs border border-neutral-200 dark:border-neutral-800">
              <h3 className="text-sm font-medium mb-3 text-neutral-900 dark:text-gray-100">Organization</h3>
              <div className="space-y-3">
                {/* Folder Selection */}
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Folder
                  </label>
                  <div className="relative">
                    <button
                      onClick={() => setShowFolderDropdown(!showFolderDropdown)}
                      className="w-full h-7 px-2 text-sm text-left border border-neutral-300 rounded-md hover:bg-neutral-50 flex items-center justify-between"
                    >
                      <span className="flex items-center gap-1.5">
                        <FolderOpen className="h-3.5 w-3.5 text-neutral-400" />
                        {folder ? folder.name : 'Select folder'}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 text-neutral-400" />
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
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {tags.map(tag => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium"
                        style={{ 
                          backgroundColor: tag.color + '20',
                          color: tag.color 
                        }}
                      >
                        <Hash className="h-2.5 w-2.5" />
                        {tag.name}
                        <button
                          onClick={() => handleRemoveTag(tag.id)}
                          className="ml-1 hover:opacity-70"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setShowTagsDropdown(!showTagsDropdown)}
                      className="text-xs text-primary hover:text-primary-dark"
                    >
                      <Plus className="h-3 w-3 inline mr-1" />
                      Add tag
                    </button>
                    {showTagsDropdown && (
                      <div className="absolute z-20 mt-1 w-64 bg-white border border-neutral-200 rounded-md shadow-lg">
                        <div className="p-2 border-b border-neutral-100">
                          <Input
                            value={tagSearchQuery}
                            onChange={(e) => setTagSearchQuery(e.target.value)}
                            placeholder="Search or create new tag..."
                            className="h-7 text-xs"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && tagSearchQuery.trim()) {
                                e.preventDefault();
                                // If no exact match exists, create new tag
                                const exactMatch = availableTags.find(
                                  t => t.name.toLowerCase() === tagSearchQuery.toLowerCase()
                                );
                                if (exactMatch && !tags.find(t => t.id === exactMatch.id)) {
                                  handleAddTag(exactMatch);
                                } else if (!exactMatch) {
                                  handleCreateTag();
                                }
                              }
                            }}
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {(() => {
                            const searchLower = tagSearchQuery.toLowerCase();
                            const unselectedTags = availableTags.filter(
                              t => !tags.find(tag => tag.id === t.id)
                            );
                            const filteredTags = searchLower
                              ? unselectedTags.filter(t => 
                                  t.name.toLowerCase().includes(searchLower)
                                )
                              : unselectedTags;
                            
                            const exactMatch = availableTags.find(
                              t => t.name.toLowerCase() === searchLower
                            );
                            const showCreateOption = tagSearchQuery.trim() && !exactMatch;

                            return (
                              <>
                                {filteredTags.length > 0 && (
                                  <div className="p-1">
                                    {filteredTags.map(tag => (
                                      <button
                                        key={tag.id}
                                        onClick={() => handleAddTag(tag)}
                                        className="w-full px-3 py-1.5 text-xs text-left hover:bg-neutral-50 flex items-center gap-1.5"
                                      >
                                        <span 
                                          className="w-3 h-3 rounded-full flex-shrink-0" 
                                          style={{ backgroundColor: tag.color }}
                                        />
                                        <span className="truncate">{tag.name}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                                {showCreateOption && (
                                  <>
                                    {filteredTags.length > 0 && (
                                      <div className="border-t border-neutral-100" />
                                    )}
                                    <div className="p-1">
                                      <button
                                        onClick={handleCreateTag}
                                        className="w-full px-3 py-1.5 text-xs text-left hover:bg-primary-pale flex items-center gap-1.5 text-primary"
                                      >
                                        <Plus className="h-3 w-3" />
                                        <span>Create "{tagSearchQuery}"</span>
                                      </button>
                                    </div>
                                  </>
                                )}
                                {!showCreateOption && filteredTags.length === 0 && (
                                  <div className="p-3 text-xs text-neutral-500 text-center">
                                    {searchLower ? 'No matching tags found' : 'All tags are already added'}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Visibility */}
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Visibility
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsPublic(false)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border ${
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
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border ${
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
                      Free tier only supports public prompts. Upgrade to Pro or Business for private prompts.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Content Editor */}
            <div className="rounded-lg bg-white dark:bg-neutral-900 p-4 shadow-xs border border-neutral-200 dark:border-neutral-800">
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-medium text-neutral-700 dark:text-gray-300">
                  Prompt Content
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
              <div className="rounded-lg bg-error/10 p-3 border border-error/20">
                <p className="text-xs text-error">{error}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Model Settings */}
            <div className="rounded-lg bg-white dark:bg-neutral-900 p-4 shadow-xs border border-neutral-200 dark:border-neutral-800">
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
                    className="w-full h-7 px-2 text-sm border border-neutral-300 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-neutral-800 text-neutral-900 dark:text-gray-100"
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

            {/* Statistics */}
            <div className="rounded-lg bg-white dark:bg-neutral-900 p-4 shadow-xs border border-neutral-200 dark:border-neutral-800">
              <h3 className="text-sm font-medium mb-3 text-neutral-900 dark:text-gray-100">Statistics</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <Eye className="h-3.5 w-3.5 text-neutral-400" />
                  </div>
                  <div className="text-lg font-semibold text-neutral-900 dark:text-gray-100">{originalPrompt?.views || 0}</div>
                  <div className="text-[10px] text-neutral-500 dark:text-gray-400">Views</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <TrendingUp className="h-3.5 w-3.5 text-neutral-400" />
                  </div>
                  <div className="text-lg font-semibold text-neutral-900 dark:text-gray-100">{originalPrompt?.uses || 0}</div>
                  <div className="text-[10px] text-neutral-500 dark:text-gray-400">Uses</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <Heart className="h-3.5 w-3.5 text-neutral-400" />
                  </div>
                  <div className="text-lg font-semibold text-neutral-900 dark:text-gray-100">{originalPrompt?.favorites_count || 0}</div>
                  <div className="text-[10px] text-neutral-500 dark:text-gray-400">Favorites</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <Share2 className="h-3.5 w-3.5 text-neutral-400" />
                  </div>
                  <div className="text-lg font-semibold text-neutral-900 dark:text-gray-100">{originalPrompt?.shares_count || 0}</div>
                  <div className="text-[10px] text-neutral-500 dark:text-gray-400">Shares</div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="rounded-lg bg-primary-pale p-4 border border-primary-light">
              <h3 className="text-sm font-medium text-primary-dark mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start h-7 text-xs border-primary-light text-primary hover:bg-primary-light"
                >
                  <Code className="mr-2 h-3 w-3" />
                  Copy with Variables
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start h-7 text-xs border-primary-light text-primary hover:bg-primary-light"
                >
                  <FileText className="mr-2 h-3 w-3" />
                  View Version History
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start h-7 text-xs border-primary-light text-primary hover:bg-primary-light"
                >
                  <Users className="mr-2 h-3 w-3" />
                  Share to Team
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start h-7 text-xs border-primary-light text-primary hover:bg-primary-light"
                >
                  <ExternalLink className="mr-2 h-3 w-3" />
                  Get Public Link
                </Button>
              </div>
            </div>

            {/* Version Info */}
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
      
      {/* Variables Modal */}
      {showVariablesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
            <div className="p-6">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary-pale rounded-lg flex items-center justify-center">
                    <Variable className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-900">Fill in Variables</h3>
                </div>
                <button
                  onClick={() => {
                    setShowVariablesModal(false);
                    setVariableValues({});
                  }}
                  className="text-neutral-400 hover:text-neutral-600 -mt-1 -mr-1 p-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <p className="text-sm text-neutral-600 mb-6">
                Replace the variables in your prompt with actual values
              </p>
              
              <div className="space-y-4">
                {variables.map((variable) => (
                  <div key={variable}>
                    <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 mb-2">
                      <code className="px-2 py-0.5 bg-neutral-100 rounded text-xs font-mono">
                        {`{{${variable}}}`}
                      </code>
                      <span className="text-xs text-neutral-500">Optional</span>
                    </label>
                    <Input
                      value={variableValues[variable] || ''}
                      onChange={(e) => setVariableValues({
                        ...variableValues,
                        [variable]: e.target.value
                      })}
                      placeholder={`Enter ${variable}...`}
                      className="h-10 text-sm"
                    />
                  </div>
                ))}
              </div>
              
              <div className="mt-8 flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowVariablesModal(false);
                    setVariableValues({});
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCopyWithVariables}
                  className="flex-1 bg-neutral-800 hover:bg-neutral-900 text-white"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy with Values
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}