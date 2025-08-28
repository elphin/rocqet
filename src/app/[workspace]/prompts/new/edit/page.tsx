'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CodeMirrorPromptEditor } from '@/components/codemirror-prompt-editor';
import { 
  ArrowLeft, Save, Variable, Settings, Lock, Globe, FolderOpen, 
  Hash, Plus, X, Info, ChevronDown, GitBranch
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { hasPermission, Role } from '@/lib/permissions';

export default function NewPromptEditPage({
  params
}: {
  params: Promise<{ workspace: string }>
}) {
  const { workspace } = use(params);
  
  // Basic fields - START EMPTY
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [shortcode, setShortcode] = useState('');
  const [content, setContent] = useState('');
  
  // Organization fields
  const [folder, setFolder] = useState<{ id: string; name: string } | null>(null);
  const [tags, setTags] = useState<{ id: string; name: string; color: string }[]>([]);
  const [isPublic, setIsPublic] = useState(true); // Will be updated based on tier
  
  // Model settings
  const [model, setModel] = useState('gpt-4');
  const [temperature, setTemperature] = useState(7);
  const [variables, setVariables] = useState<string[]>([]);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<Role>('viewer');
  const [hasEditPermission, setHasEditPermission] = useState(false);
  const [showFolderDropdown, setShowFolderDropdown] = useState(false);
  const [showTagsDropdown, setShowTagsDropdown] = useState(false);
  const [availableFolders, setAvailableFolders] = useState<any[]>([]);
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  const [userTier, setUserTier] = useState<string>('free');
  
  const router = useRouter();
  const supabase = createClient();

  // Load workspace and check permissions
  useEffect(() => {
    const loadWorkspace = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push('/auth/signin');
          return;
        }
        
        const { data: membership } = await supabase
          .from('workspace_members')
          .select(`
            workspace_id,
            role,
            workspaces!inner (
              id,
              name,
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
          const tier = membership.workspaces.subscription_tier || 'free';
          setUserTier(tier);
          
          // Set default visibility based on tier
          setIsPublic(tier === 'free');
          
          const canEdit = hasPermission(membership.role as Role, 'prompts.create');
          setHasEditPermission(canEdit);
          
          if (!canEdit) {
            setError('You do not have permission to create prompts');
            return;
          }
          
          // Load available folders and tags
          const [foldersRes, tagsRes] = await Promise.all([
            supabase
              .from('folders')
              .select('id, name')
              .eq('workspace_id', membership.workspace_id),
            supabase
              .from('tags')
              .select('id, name, color')
              .eq('workspace_id', membership.workspace_id)
          ]);
          
          if (foldersRes.data) setAvailableFolders(foldersRes.data);
          if (tagsRes.data) setAvailableTags(tagsRes.data);
        }
      } catch (err: any) {
        console.error('Error loading workspace:', err);
        setError(err.message || 'Failed to load workspace');
      } finally {
        setLoading(false);
      }
    };
    
    loadWorkspace();
  }, [workspace, router]);

  // Extract variables from content
  useEffect(() => {
    const matches = content.match(/\{\{([^}]+)\}\}/g) || [];
    const vars = matches.map(m => m.replace(/\{\{|\}\}/g, '').trim());
    setVariables([...new Set(vars)]);
  }, [content]);

  // Generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // Save new prompt
  const handleSave = async () => {
    if (!workspaceId) return;
    
    if (!name.trim()) {
      toast.error('Please enter a prompt name');
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Not authenticated');
        return;
      }
      
      const slug = generateSlug(name);
      
      // Create the new prompt
      const { data: newPrompt, error: insertError } = await supabase
        .from('prompts')
        .insert({
          workspace_id: workspaceId,
          name: name.trim(),
          slug,
          description: description.trim(),
          shortcode: shortcode.trim(),
          content,
          folder_id: folder?.id || null,
          visibility: isPublic ? 'public' : 'private',
          is_shared: false, // Team sharing is separate from public/private
          model,
          temperature,
          variables: variables.map(v => ({ name: v, type: 'text', required: false })),
          created_by: user.id,
          updated_by: user.id
        })
        .select()
        .single();
      
      if (insertError) {
        if (insertError.message.includes('duplicate')) {
          toast.error('A prompt with this name already exists');
        } else {
          toast.error(insertError.message);
        }
        return;
      }
      
      // Add tags if selected
      if (tags.length > 0 && newPrompt) {
        const tagInserts = tags.map(tag => ({
          prompt_id: newPrompt.id,
          tag_id: tag.id
        }));
        
        await supabase
          .from('prompt_tags')
          .insert(tagInserts);
      }
      
      toast.success('Prompt created successfully!');
      router.push(`/${workspace}/prompts/${slug}`);
      
    } catch (err: any) {
      console.error('Error saving prompt:', err);
      toast.error(err.message || 'Failed to save prompt');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error && !hasEditPermission) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-red-500 mb-4">{error}</p>
        <Link href={`/${workspace}/prompts`}>
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Prompts
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href={`/${workspace}/prompts`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-500">Create New Prompt</span>
            </div>
          </div>
          
          {/* Removed Create button from header */}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="grid grid-cols-3 gap-6">
            {/* Left Column - Main Content */}
            <div className="col-span-2 space-y-6">
              {/* Basic Information */}
              <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-6">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-gray-100 mb-4">Basic Information</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter prompt name"
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe what this prompt does"
                      className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg resize-none h-20 dark:bg-neutral-800 dark:text-gray-100"
                    />
                  </div>
                  
                </div>
              </div>

              {/* Prompt Content */}
              <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-gray-100">Prompt Content</h3>
                  {variables.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      <Variable className="h-3.5 w-3.5" />
                      {variables.length} variable{variables.length !== 1 ? 's' : ''} detected
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <CodeMirrorPromptEditor
                    value={content}
                    onChange={setContent}
                    mode="prompt"
                    placeholder="Write your prompt here... Use {{variable}} for dynamic content"
                  />
                </div>
              </div>
              
              {/* Create Button Below Editor */}
              <div className="flex justify-end">
                <Button 
                  onClick={handleSave}
                  disabled={saving || !name.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Creating...' : 'Create Prompt'}
                </Button>
              </div>
            </div>

            {/* Right Column - Settings */}
            <div className="space-y-6">
              {/* Create Button at Top */}
              <Button 
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Creating...' : 'Create Prompt'}
              </Button>
              
              {/* Organization */}
              <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-6">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-gray-100 mb-4">Organization</h3>
                
                <div className="space-y-4">
                  {/* Folder Selection */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Folder
                    </label>
                    <div className="relative">
                      <button
                        onClick={() => setShowFolderDropdown(!showFolderDropdown)}
                        className="w-full px-3 py-2 text-left border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 dark:bg-neutral-800 dark:text-gray-100"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FolderOpen className="h-4 w-4 text-neutral-500" />
                            <span className="text-sm">
                              {folder ? folder.name : 'No folder'}
                            </span>
                          </div>
                          <ChevronDown className="h-4 w-4 text-neutral-500" />
                        </div>
                      </button>
                      
                      {showFolderDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg z-10">
                          <button
                            onClick={() => {
                              setFolder(null);
                              setShowFolderDropdown(false);
                            }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-neutral-50 dark:hover:bg-neutral-700"
                          >
                            No folder
                          </button>
                          {availableFolders.map((f) => (
                            <button
                              key={f.id}
                              onClick={() => {
                                setFolder(f);
                                setShowFolderDropdown(false);
                              }}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-neutral-50 dark:hover:bg-neutral-700"
                            >
                              {f.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Tags
                    </label>
                    <div className="relative">
                      <button
                        onClick={() => setShowTagsDropdown(!showTagsDropdown)}
                        className="w-full px-3 py-2 text-left border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 dark:bg-neutral-800"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Hash className="h-4 w-4 text-neutral-500" />
                            <span className="text-sm dark:text-gray-100">
                              {tags.length > 0 ? `${tags.length} selected` : 'Select tags'}
                            </span>
                          </div>
                          <ChevronDown className="h-4 w-4 text-neutral-500" />
                        </div>
                      </button>
                      
                      {showTagsDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg z-10 max-h-60 overflow-auto">
                          {availableTags.map((tag) => {
                            const isSelected = tags.some(t => t.id === tag.id);
                            return (
                              <button
                                key={tag.id}
                                onClick={() => {
                                  if (isSelected) {
                                    setTags(tags.filter(t => t.id !== tag.id));
                                  } else {
                                    setTags([...tags, tag]);
                                  }
                                }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-neutral-50 dark:hover:bg-neutral-700 flex items-center justify-between"
                              >
                                <span style={{ color: tag.color }}>{tag.name}</span>
                                {isSelected && <X className="h-3 w-3" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {tags.map((tag) => (
                          <span
                            key={tag.id}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs"
                            style={{ 
                              backgroundColor: `${tag.color}20`,
                              color: tag.color
                            }}
                          >
                            {tag.name}
                            <button
                              onClick={() => setTags(tags.filter(t => t.id !== tag.id))}
                              className="ml-1"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Shortcode */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Shortcode
                    </label>
                    <Input
                      value={shortcode}
                      onChange={(e) => setShortcode(e.target.value)}
                      placeholder="Quick access code"
                      className="w-full"
                    />
                    <p className="text-xs text-neutral-500 mt-1">Optional quick access identifier</p>
                  </div>
                </div>
              </div>

              {/* Model Settings */}
              <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-6">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-gray-100 mb-4">Model Settings</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Model
                    </label>
                    <select
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg dark:bg-neutral-800 dark:text-gray-100"
                    >
                      <option value="gpt-4">GPT-4</option>
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                      <option value="claude-3-opus">Claude 3 Opus</option>
                      <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
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
                  </div>
                </div>
              </div>

              {/* Visibility */}
              <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-6">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-gray-100 mb-4">Visibility</h3>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsPublic(false)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border transition-colors ${
                      !isPublic 
                        ? 'bg-blue-50 text-blue-600 border-blue-300' 
                        : 'bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-50'
                    }`}
                    disabled={userTier === 'free'}
                  >
                    <Lock className="h-3.5 w-3.5" />
                    Private
                  </button>
                  
                  <button
                    onClick={() => setIsPublic(true)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border transition-colors ${
                      isPublic 
                        ? 'bg-blue-50 text-blue-600 border-blue-300' 
                        : 'bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-50'
                    }`}
                  >
                    <Globe className="h-3.5 w-3.5" />
                    Public
                  </button>
                </div>
                
                {userTier === 'free' && (
                  <p className="text-xs text-amber-600 mt-2">
                    Free tier prompts are always public. Upgrade to Pro for private prompts.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}