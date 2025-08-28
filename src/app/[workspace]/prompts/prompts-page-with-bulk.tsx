'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { 
  Copy, 
  Edit, 
  Share2, 
  Star, 
  Trash2,
  FolderOpen,
  Hash,
  Search,
  ChevronDown,
  Plus,
  Upload,
  Download,
  Move,
  Tag,
  Users,
  X,
  Check,
  Sparkles,
  MoreHorizontal,
  Clipboard,
  Files,
  Variable
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/lib/toast-config';
import { SmartDiscovery } from '@/components/smart-discovery';
import { auditPromptDelete } from '@/lib/audit';
import { 
  BulkMoveModal, 
  BulkTagModal, 
  BulkDeleteModal,
  BulkShareModal 
} from '@/components/modals/bulk-actions-modals';
import { VariableFillModal } from '@/components/modals/variable-fill-modal';
import { TierLimitBanner } from '@/components/tier-limit-banner';

interface Prompt {
  id: string;
  name: string;
  slug: string;
  description?: string;
  content?: string;
  folder_id?: string;
  tags?: string[];
  variables?: any[]; // Array of variable definitions
  updated_at: string;
  created_at: string;
  is_favorite?: boolean;
  run_count?: number;
}

interface Folder {
  id: string;
  name: string;
  parent_id?: string;
}

interface PromptsPageClientProps {
  initialPrompts: Prompt[];
  folders: Folder[];
  workspaceSlug: string;
  workspaceId: string;
  workspaceTier: string;
  totalCount: number;
  pageSize: number;
  promptLimit: number;
}

type SortOption = 'name' | 'updated' | 'created' | 'popularity';

export function PromptsPageClient({ 
  initialPrompts, 
  folders, 
  workspaceSlug,
  workspaceId,
  workspaceTier,
  totalCount,
  pageSize,
  promptLimit
}: PromptsPageClientProps) {
  const [prompts, setPrompts] = useState<Prompt[]>(initialPrompts);
  const [selectedPrompts, setSelectedPrompts] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const totalPages = Math.ceil(totalCount / pageSize);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [showFavorites, setShowFavorites] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('updated');
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showTagsDropdown, setShowTagsDropdown] = useState(false);
  const [showFoldersDropdown, setShowFoldersDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showDiscovery, setShowDiscovery] = useState(false);
  
  // Refs for dropdowns
  const tagsDropdownRef = useRef<HTMLDivElement>(null);
  const foldersDropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  
  // Close dropdowns on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tagsDropdownRef.current && !tagsDropdownRef.current.contains(event.target as Node)) {
        setShowTagsDropdown(false);
      }
      if (foldersDropdownRef.current && !foldersDropdownRef.current.contains(event.target as Node)) {
        setShowFoldersDropdown(false);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setShowSortDropdown(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowTagsDropdown(false);
        setShowFoldersDropdown(false);
        setShowSortDropdown(false);
        // Also close bulk modals
        setShowBulkMoveModal(false);
        setShowBulkTagModal(false);
        setShowBulkDeleteModal(false);
        setShowBulkShareModal(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);
  
  // Bulk action modals
  const [showBulkMoveModal, setShowBulkMoveModal] = useState(false);
  const [showBulkTagModal, setShowBulkTagModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showBulkShareModal, setShowBulkShareModal] = useState(false);
  
  // Variable fill modal
  const [showVariableModal, setShowVariableModal] = useState(false);
  const [selectedPromptForVariables, setSelectedPromptForVariables] = useState<Prompt | null>(null);
  
  // Delete confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteClickCount, setDeleteClickCount] = useState<Map<string, number>>(new Map());
  
  const supabase = createClient();

  // Extract all unique tags from prompts
  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    prompts.forEach(prompt => {
      if (prompt.tags) {
        prompt.tags.forEach(tag => tagsSet.add(tag));
      }
    });
    return Array.from(tagsSet).sort();
  }, [prompts]);

  // Filter and sort prompts
  const filteredAndSortedPrompts = useMemo(() => {
    let filtered = [...prompts];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(prompt => 
        prompt.name.toLowerCase().includes(query) ||
        prompt.description?.toLowerCase().includes(query) ||
        prompt.content?.toLowerCase().includes(query)
      );
    }

    // Folder filter
    if (selectedFolder && selectedFolder !== 'all') {
      filtered = filtered.filter(prompt => prompt.folder_id === selectedFolder);
    }

    // Tags filter
    if (selectedTags.size > 0) {
      filtered = filtered.filter(prompt => {
        if (!prompt.tags) return false;
        return Array.from(selectedTags).some(tag => prompt.tags?.includes(tag));
      });
    }

    // Favorites filter
    if (showFavorites) {
      filtered = filtered.filter(prompt => prompt.is_favorite);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'created':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'popularity':
          return (b.run_count || 0) - (a.run_count || 0);
        case 'updated':
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });

    return filtered;
  }, [prompts, searchQuery, selectedFolder, selectedTags, showFavorites, sortBy]);

  // Load prompts for a specific page
  const loadPage = async (page: number) => {
    setIsLoading(true);
    try {
      const offset = (page - 1) * pageSize;
      const { data, error } = await supabase
        .from('prompts')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('updated_at', { ascending: false })
        .range(offset, offset + pageSize - 1);
      
      if (error) throw error;
      
      setPrompts(data || []);
      setCurrentPage(page);
      setSelectedPrompts(new Set()); // Clear selections when changing page
    } catch (error) {
      console.error('Error loading prompts:', error);
      toast.error('Failed to load prompts');
    } finally {
      setIsLoading(false);
    }
  };

  // Bulk Actions
  const handleBulkMove = async (folderId: string | null) => {
    const loadingToast = toast.loading(`Moving ${selectedPrompts.size} prompts...`);
    
    try {
      const { error } = await supabase
        .from('prompts')
        .update({ folder_id: folderId })
        .in('id', Array.from(selectedPrompts));

      if (error) throw error;

      setPrompts(prompts.map(p => 
        selectedPrompts.has(p.id) ? { ...p, folder_id: folderId || undefined } : p
      ));
      
      toast.dismiss(loadingToast);
      toast.success(
        `Moved ${selectedPrompts.size} prompts to ${folderId ? folders.find(f => f.id === folderId)?.name : 'root'}`,
        'The prompts have been successfully moved'
      );
      setSelectedPrompts(new Set());
      setShowBulkActions(false);
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Failed to move prompts', 'Please try again');
    }
  };

  const handleBulkTags = async (action: 'add' | 'remove', tags: string[]) => {
    const loadingToast = toast.loading(
      `${action === 'add' ? 'Adding' : 'Removing'} tags for ${selectedPrompts.size} prompts...`
    );
    
    try {
      // Get current prompts
      const selectedPromptsList = prompts.filter(p => selectedPrompts.has(p.id));
      
      // Update each prompt's tags
      for (const prompt of selectedPromptsList) {
        let newTags: string[] = [];
        
        if (action === 'add') {
          const existingTags = prompt.tags || [];
          newTags = [...new Set([...existingTags, ...tags])];
        } else {
          newTags = (prompt.tags || []).filter(t => !tags.includes(t));
        }
        
        const { error } = await supabase
          .from('prompts')
          .update({ tags: newTags })
          .eq('id', prompt.id);
        
        if (error) throw error;
      }
      
      // Update local state
      setPrompts(prompts.map(p => {
        if (selectedPrompts.has(p.id)) {
          if (action === 'add') {
            const existingTags = p.tags || [];
            return { ...p, tags: [...new Set([...existingTags, ...tags])] };
          } else {
            return { ...p, tags: (p.tags || []).filter(t => !tags.includes(t)) };
          }
        }
        return p;
      }));
      
      toast.dismiss(loadingToast);
      toast.success(
        `${action === 'add' ? 'Added' : 'Removed'} ${tags.length} tag${tags.length !== 1 ? 's' : ''}`,
        `Successfully updated ${selectedPrompts.size} prompts`
      );
      setSelectedPrompts(new Set());
      setShowBulkActions(false);
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error(`Failed to ${action} tags`, 'Please try again');
    }
  };

  const handleBulkFavorite = async () => {
    const selectedPromptsList = prompts.filter(p => selectedPrompts.has(p.id));
    const allFavorited = selectedPromptsList.every(p => p.is_favorite);
    const newState = !allFavorited;
    
    const loadingToast = toast.loading(
      `${newState ? 'Adding to' : 'Removing from'} favorites...`
    );
    
    try {
      const { error } = await supabase
        .from('prompts')
        .update({ is_favorite: newState })
        .in('id', Array.from(selectedPrompts));

      if (error) throw error;

      setPrompts(prompts.map(p => 
        selectedPrompts.has(p.id) ? { ...p, is_favorite: newState } : p
      ));
      
      toast.dismiss(loadingToast);
      toast.success(
        newState ? 'Added to favorites' : 'Removed from favorites',
        `Updated ${selectedPrompts.size} prompts`
      );
      setSelectedPrompts(new Set());
      setShowBulkActions(false);
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Failed to update favorites', 'Please try again');
    }
  };

  const handleBulkShare = async (shareType: 'team' | 'workspace', message?: string) => {
    const loadingToast = toast.loading(`Sharing ${selectedPrompts.size} prompts with ${shareType}...`);
    
    try {
      // Here you would implement the actual sharing logic
      // For now, we'll simulate a successful share
      
      // Update prompts in database to mark as shared
      const { error } = await supabase
        .from('prompts')
        .update({ 
          shared_with: shareType,
          share_message: message,
          shared_at: new Date().toISOString()
        })
        .in('id', Array.from(selectedPrompts));

      if (error) throw error;
      
      toast.dismiss(loadingToast);
      toast.success(
        `Shared with ${shareType}`,
        `${selectedPrompts.size} prompts have been shared with ${shareType === 'team' ? 'your team' : 'the workspace'}`
      );
      setSelectedPrompts(new Set());
      setShowBulkActions(false);
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Failed to share prompts', 'Please try again');
    }
  };

  const handleBulkDelete = async () => {
    const loadingToast = toast.loading(`Moving ${selectedPrompts.size} prompts to trash...`);
    
    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Soft delete: set deleted_at for all selected prompts
      const { error } = await supabase
        .from('prompts')
        .update({ 
          deleted_at: new Date().toISOString(),
          deleted_by: user?.id
        })
        .in('id', Array.from(selectedPrompts));

      if (error) throw error;

      setPrompts(prompts.filter(p => !selectedPrompts.has(p.id)));
      
      toast.dismiss(loadingToast);
      toast.success(
        `Moved ${selectedPrompts.size} prompts to trash`,
        'You can restore them within 30 days'
      );
      setSelectedPrompts(new Set());
      setShowBulkActions(false);
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Failed to delete prompts', 'Please try again');
    }
  };

  // Individual actions
  const handleToggleFavorite = async (promptId: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('prompts')
        .update({ is_favorite: !currentState })
        .eq('id', promptId);

      if (error) throw error;

      setPrompts(prompts.map(p => 
        p.id === promptId ? { ...p, is_favorite: !currentState } : p
      ));
      
      toast.success(
        currentState ? 'Removed from favorites' : 'Added to favorites'
      );
    } catch (error) {
      toast.error('Failed to update favorite');
    }
  };

  const handleDelete = async (promptId: string) => {
    // Get current click count for this prompt
    const currentClickCount = deleteClickCount.get(promptId) || 0;
    
    if (currentClickCount === 0) {
      // First click - show confirmation state
      const newClickCount = new Map(deleteClickCount);
      newClickCount.set(promptId, 1);
      setDeleteClickCount(newClickCount);
      setDeleteConfirmId(promptId);
      
      // Reset after 3 seconds if not confirmed
      setTimeout(() => {
        setDeleteClickCount(prev => {
          const updated = new Map(prev);
          updated.delete(promptId);
          return updated;
        });
        setDeleteConfirmId(null);
      }, 3000);
      
      return;
    }
    
    // Second click - perform soft delete
    const loadingToast = toast.loading('Moving to trash...');
    
    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Find the prompt to get its folder_id
      const prompt = prompts.find(p => p.id === promptId);
      
      // Soft delete: set deleted_at and save original folder
      const { error } = await supabase
        .from('prompts')
        .update({ 
          deleted_at: new Date().toISOString(),
          deleted_by: user?.id,
          original_folder_id: prompt?.folder_id || null
        })
        .eq('id', promptId);

      if (error) throw error;

      // Log to audit trail
      await auditPromptDelete(workspaceId, promptId, prompt?.name || 'Unknown');

      // Remove from UI
      setPrompts(prompts.filter(p => p.id !== promptId));
      
      // Clean up state
      setDeleteClickCount(prev => {
        const updated = new Map(prev);
        updated.delete(promptId);
        return updated;
      });
      setDeleteConfirmId(null);
      
      toast.dismiss(loadingToast);
      toast.success(
        'Moved to trash', 
        'You can restore it within 30 days from the trash'
      );
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Failed to delete prompt');
      
      // Reset state on error
      setDeleteClickCount(prev => {
        const updated = new Map(prev);
        updated.delete(promptId);
        return updated;
      });
      setDeleteConfirmId(null);
    }
  };

  // Copy raw content to clipboard
  const handleCopyPrompt = async (prompt: Prompt) => {
    try {
      await navigator.clipboard.writeText(prompt.content || '');
      toast.success('Copied to clipboard', prompt.name);
    } catch (error) {
      toast.error('Failed to copy prompt');
    }
  };
  
  // Copy with variables modal (for prompts with variables)
  const handleCopyWithVariables = (prompt: Prompt) => {
    // Extract variables from content
    const content = prompt.content || '';
    const variableMatches = [
      ...(content.match(/\{\{([^}]+)\}\}/g) || []),
      ...(content.match(/\$\{([^}]+)\}/g) || [])
    ];
    
    if (variableMatches.length > 0) {
      // For now, show a simple prompt for each variable
      // In production, this should open a proper modal
      let processedContent = content;
      const uniqueVars = [...new Set(variableMatches)];
      
      for (const varMatch of uniqueVars) {
        const varName = varMatch.replace(/[{}$]/g, '').trim();
        const value = window.prompt(`Enter value for variable: ${varName}`);
        if (value !== null) {
          processedContent = processedContent.replaceAll(varMatch, value);
        }
      }
      
      navigator.clipboard.writeText(processedContent);
      toast.success('Copied with variables filled', 'The prompt has been copied with your values');
    } else {
      // No variables found, just copy as is
      navigator.clipboard.writeText(content);
      toast.success('Copied to clipboard');
    }
  };
  
  // Duplicate prompt in database
  const handleDuplicatePrompt = async (prompt: Prompt) => {
    const loadingToast = toast.loading('Creating duplicate...');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Create a new prompt with same content but different name
      const { error } = await supabase
        .from('prompts')
        .insert({
          workspace_id: workspaceId,
          name: `${prompt.name} (Copy)`,
          slug: `${prompt.slug}-copy-${Date.now()}`,
          description: prompt.description,
          content: prompt.content,
          folder_id: prompt.folder_id,
          tags: prompt.tags,
          variables: prompt.variables || [],
          created_by: user?.id
        });
        
      if (error) throw error;
      
      toast.dismiss(loadingToast);
      toast.success('Prompt duplicated', `Created "${prompt.name} (Copy)"`);
      
      // Refresh the prompts list
      const { data: newPrompts } = await supabase
        .from('prompts')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('updated_at', { ascending: false });
        
      if (newPrompts) {
        setPrompts(newPrompts);
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Failed to duplicate prompt');
    }
  };

  const toggleBulkMode = () => {
    setShowBulkActions(!showBulkActions);
    if (showBulkActions) {
      setSelectedPrompts(new Set());
    }
  };

  const handleSelectPrompt = (promptId: string) => {
    const newSelection = new Set(selectedPrompts);
    if (newSelection.has(promptId)) {
      newSelection.delete(promptId);
    } else {
      newSelection.add(promptId);
    }
    setSelectedPrompts(newSelection);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPrompts(new Set(filteredAndSortedPrompts.map(p => p.id)));
    } else {
      setSelectedPrompts(new Set());
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950">
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Tier Limit Banner */}
        {promptLimit !== -1 && (
          <TierLimitBanner
            type="prompts"
            current={totalCount}
            limit={promptLimit}
            tier={workspaceTier}
            workspaceSlug={workspaceSlug}
          />
        )}
        
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Prompts</h1>
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                Team
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant={showDiscovery ? "default" : "outline"}
                size="sm"
                onClick={() => setShowDiscovery(!showDiscovery)}
                className={showDiscovery 
                  ? "bg-purple-600 hover:bg-purple-700 text-white border-purple-600 dark:bg-purple-500 dark:hover:bg-purple-600" 
                  : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                }
              >
                <Sparkles className="w-4 h-4 mr-1.5" />
                Discovery
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <Upload className="w-4 h-4 mr-1.5" />
                Import
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <Download className="w-4 h-4 mr-1.5" />
                Export
              </Button>
              <Button 
                variant={showBulkActions ? "default" : "outline"}
                size="sm"
                onClick={toggleBulkMode}
                className={showBulkActions 
                  ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600 dark:bg-blue-500 dark:hover:bg-blue-600" 
                  : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                }
              >
                <Check className="w-4 h-4 mr-1.5" />
                {showBulkActions ? 'Exit Bulk' : 'Bulk Edit'}
              </Button>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Organize and manage your AI prompt templates
          </p>
        </div>

        {/* Bulk Actions Bar */}
        {showBulkActions && (
          <div className="mb-4 p-4 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {selectedPrompts.size > 0 
                    ? `${selectedPrompts.size} prompt${selectedPrompts.size !== 1 ? 's' : ''} selected`
                    : 'Select prompts to perform actions'
                  }
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setShowBulkMoveModal(true)}
                  disabled={selectedPrompts.size === 0}
                  className="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Move className="w-4 h-4 mr-1.5" />
                  Move
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setShowBulkTagModal(true)}
                  disabled={selectedPrompts.size === 0}
                  className="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Tag className="w-4 h-4 mr-1.5" />
                  Tags
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleBulkFavorite}
                  disabled={selectedPrompts.size === 0}
                  className="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Star className="w-4 h-4 mr-1.5" />
                  Favorite
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setShowBulkShareModal(true)}
                  disabled={selectedPrompts.size === 0}
                  className="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Users className="w-4 h-4 mr-1.5" />
                  Share
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setShowBulkDeleteModal(true)}
                  disabled={selectedPrompts.size === 0}
                  className="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area with optional Discovery Sidebar */}
        <div className={showDiscovery ? "grid grid-cols-1 lg:grid-cols-3 gap-6" : ""}>
          {/* Table with integrated filters */}
          <div className={`${showDiscovery ? "lg:col-span-2" : ""} bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800 overflow-hidden relative`}>
          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-white/50 dark:bg-neutral-900/50 flex items-center justify-center z-10">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <span className="text-gray-600 dark:text-gray-400">Loading prompts...</span>
              </div>
            </div>
          )}
          
          {/* Filters Bar - integrated with table */}
          <div className="p-4 border-b border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950">
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search prompts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-10 ${searchQuery ? 'pr-10' : 'pr-3'} py-2 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100`}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-full transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                  </button>
                )}
              </div>

              {/* Favorites Filter */}
              <button
                onClick={() => setShowFavorites(!showFavorites)}
                className={`flex items-center gap-2 px-4 py-2 text-sm border rounded-lg transition-colors ${
                  showFavorites 
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400' 
                    : 'border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                <Star className={`w-4 h-4 ${showFavorites ? 'fill-current text-blue-600 dark:text-blue-400' : 'text-gray-500'}`} />
                <span>Favorites</span>
                {showFavorites && (
                  <span className="ml-1 px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                    ✓
                  </span>
                )}
              </button>

              {/* Folder Filter */}
              <div className="relative" ref={foldersDropdownRef}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const newState = !showFoldersDropdown;
                    if (newState) {
                      setShowTagsDropdown(false);
                      setShowSortDropdown(false);
                    }
                    setShowFoldersDropdown(newState);
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800"
                >
                  <FolderOpen className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-700 dark:text-gray-300">
                    {selectedFolder ? folders.find(f => f.id === selectedFolder)?.name : 'All folders'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
                
                {/* Folders Dropdown Content */}
                {showFoldersDropdown && (
                  <div className="absolute top-full mt-1 right-0 w-64 bg-white dark:bg-neutral-900 rounded-lg shadow-lg border border-gray-200 dark:border-neutral-700 z-50" onClick={(e) => e.stopPropagation()}>
                    <div className="p-3 border-b border-gray-200 dark:border-neutral-700">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Select folder</span>
                    </div>
                    <div className="max-h-64 overflow-y-auto p-2">
                      <button
                        onClick={() => {
                          setSelectedFolder(null);
                          setShowFoldersDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-50 dark:hover:bg-neutral-800 ${
                          !selectedFolder ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        All folders
                      </button>
                      {folders.map(folder => (
                        <button
                          key={folder.id}
                          onClick={() => {
                            setSelectedFolder(folder.id);
                            setShowFoldersDropdown(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-50 dark:hover:bg-neutral-800 ${
                            selectedFolder === folder.id ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {folder.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Tags Filter */}
              <div className="relative" ref={tagsDropdownRef}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const newState = !showTagsDropdown;
                    if (newState) {
                      setShowFoldersDropdown(false);
                      setShowSortDropdown(false);
                    }
                    setShowTagsDropdown(newState);
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800 relative"
                >
                  <Tag className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-700 dark:text-gray-300">
                    {selectedTags.size > 0 ? `${selectedTags.size} tag${selectedTags.size !== 1 ? 's' : ''}` : 'Tags'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                  {selectedTags.size > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                      {selectedTags.size}
                    </span>
                  )}
                </button>
                {showTagsDropdown && (
                  <div className="absolute top-full mt-1 right-0 w-64 bg-white dark:bg-neutral-900 rounded-lg shadow-lg border border-gray-200 dark:border-neutral-700 z-50" onClick={(e) => e.stopPropagation()}>
                    <div className="p-3 border-b border-gray-200 dark:border-neutral-700">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Select tags</span>
                        {selectedTags.size > 0 && (
                          <button
                            onClick={() => setSelectedTags(new Set())}
                            className="text-xs text-blue-600 hover:text-blue-700"
                          >
                            Clear all
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto p-2">
                      {allTags.length > 0 ? (
                        allTags.map(tag => (
                          <label
                            key={tag}
                            className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-neutral-800 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedTags.has(tag)}
                              onChange={(e) => {
                                const newTags = new Set(selectedTags);
                                if (e.target.checked) {
                                  newTags.add(tag);
                                } else {
                                  newTags.delete(tag);
                                }
                                setSelectedTags(newTags);
                              }}
                              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{tag}</span>
                          </label>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400 p-2">No tags available</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Sort Dropdown */}
              <div className="relative" ref={sortDropdownRef}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const newState = !showSortDropdown;
                    if (newState) {
                      setShowTagsDropdown(false);
                      setShowFoldersDropdown(false);
                    }
                    setShowSortDropdown(newState);
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800"
                >
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300">
                    {sortBy === 'updated' ? 'Recently updated' : 
                     sortBy === 'created' ? 'Recently created' : 
                     sortBy === 'name' ? 'Name' : 'Most popular'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
                
                {/* Sort Dropdown Content */}
                {showSortDropdown && (
                  <div className="absolute top-full mt-1 right-0 w-48 bg-white dark:bg-neutral-900 rounded-lg shadow-lg border border-gray-200 dark:border-neutral-700 z-50" onClick={(e) => e.stopPropagation()}>
                    <div className="p-2">
                      <button
                        onClick={() => {
                          setSortBy('updated');
                          setShowSortDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-50 dark:hover:bg-neutral-800 ${
                          sortBy === 'updated' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        Recently updated
                      </button>
                      <button
                        onClick={() => {
                          setSortBy('created');
                          setShowSortDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-50 dark:hover:bg-neutral-800 ${
                          sortBy === 'created' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        Recently created
                      </button>
                      <button
                        onClick={() => {
                          setSortBy('name');
                          setShowSortDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-50 dark:hover:bg-neutral-800 ${
                          sortBy === 'name' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        Name
                      </button>
                      <button
                        onClick={() => {
                          setSortBy('popularity');
                          setShowSortDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-50 dark:hover:bg-neutral-800 ${
                          sortBy === 'popularity' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        Most popular
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Active filters summary */}
          {(searchQuery || selectedTags.size > 0 || selectedFolder) && (
            <div className="px-4 py-2 bg-gray-50 dark:bg-neutral-800/50 border-b border-gray-200 dark:border-neutral-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <span>Active filters:</span>
                  {searchQuery && (
                    <span className="px-2 py-0.5 bg-white dark:bg-neutral-900 rounded">
                      Search: "{searchQuery}"
                    </span>
                  )}
                  {selectedTags.size > 0 && (
                    <span className="px-2 py-0.5 bg-white dark:bg-neutral-900 rounded">
                      {selectedTags.size} tag{selectedTags.size !== 1 ? 's' : ''}
                    </span>
                  )}
                  {selectedFolder && (
                    <span className="px-2 py-0.5 bg-white dark:bg-neutral-900 rounded">
                      Folder: {folders.find(f => f.id === selectedFolder)?.name}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedTags(new Set());
                    setSelectedFolder(null);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Clear all
                </button>
              </div>
            </div>
          )}
          
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-neutral-950 border-b border-gray-200 dark:border-neutral-800">
              <tr>
                {showBulkActions && (
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedPrompts.size === filteredAndSortedPrompts.length && filteredAndSortedPrompts.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Folder
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tags
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Updated
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-neutral-800">
              {filteredAndSortedPrompts.map((prompt) => {
                const folder = folders.find(f => f.id === prompt.folder_id);
                return (
                  <tr 
                    key={prompt.id} 
                    onClick={() => showBulkActions && handleSelectPrompt(prompt.id)}
                    className={`transition-colors ${
                      selectedPrompts.has(prompt.id) 
                        ? 'bg-blue-50 dark:bg-[rgb(25,61,163)]/20 hover:bg-blue-100 dark:hover:bg-[rgb(25,61,163)]/30' 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    } ${showBulkActions ? 'cursor-pointer' : ''}`}
                  >
                    {showBulkActions && (
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedPrompts.has(prompt.id)}
                          onChange={() => handleSelectPrompt(prompt.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-gray-300"
                        />
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div>
                        <Link 
                          href={`/${workspaceSlug}/prompts/${prompt.slug}`}
                          className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          {prompt.name}
                        </Link>
                        {prompt.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {prompt.description}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {folder ? (
                        <div className="flex items-center gap-1.5">
                          <FolderOpen className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">{folder.name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {prompt.tags && prompt.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {prompt.tags.map(tag => (
                            <span 
                              key={tag}
                              className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs"
                            >
                              <Hash className="w-3 h-3" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500">
                        {formatDistanceToNow(new Date(prompt.updated_at), { addSuffix: true })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        {/* Copy to clipboard */}
                        <button 
                          onClick={() => handleCopyPrompt(prompt)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded group relative"
                          title="Copy to clipboard"
                        >
                          <Clipboard className="w-4 h-4" />
                          <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                            Copy to clipboard
                          </span>
                        </button>
                        
                        {/* Copy with variables (show if prompt has variable patterns) */}
                        {prompt.content && (prompt.content.includes('{{') || prompt.content.includes('${')) && (
                          <button 
                            onClick={() => handleCopyWithVariables(prompt)}
                            className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded group relative"
                            title="Copy with variables"
                          >
                            <Variable className="w-4 h-4" />
                            <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                              Fill variables
                            </span>
                          </button>
                        )}
                        
                        {/* Duplicate in database */}
                        <button 
                          onClick={() => handleDuplicatePrompt(prompt)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded group relative"
                          title="Duplicate prompt"
                        >
                          <Files className="w-4 h-4" />
                          <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                            Duplicate
                          </span>
                        </button>
                        
                        {/* Edit */}
                        <Link href={`/${workspaceSlug}/prompts/${prompt.slug}/edit`}>
                          <button 
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded group relative"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                            <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                              Edit
                            </span>
                          </button>
                        </Link>
                        
                        {/* Share */}
                        <button 
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded group relative"
                          title="Share"
                        >
                          <Share2 className="w-4 h-4" />
                          <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                            Share
                          </span>
                        </button>
                        <button 
                          onClick={() => handleToggleFavorite(prompt.id, prompt.is_favorite || false)}
                          className={`p-1.5 rounded transition-colors ${
                            prompt.is_favorite 
                              ? 'text-yellow-500 hover:bg-gray-100' 
                              : 'text-gray-400 hover:text-yellow-500 hover:bg-gray-100'
                          }`}
                          title="Favorite"
                        >
                          <Star className={`w-4 h-4 ${prompt.is_favorite ? 'fill-current' : ''}`} />
                        </button>
                        <button 
                          onClick={() => handleDelete(prompt.id)}
                          className={`p-1.5 rounded transition-all duration-200 ${
                            deleteConfirmId === prompt.id
                              ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 scale-110 animate-pulse'
                              : 'text-gray-400 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`}
                          title={deleteConfirmId === prompt.id ? 'Click again to confirm delete' : 'Move to trash'}
                        >
                          {deleteConfirmId === prompt.id ? (
                            <div className="relative">
                              <Trash2 className="w-4 h-4" />
                              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-600 rounded-full animate-ping" />
                            </div>
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between border-t border-gray-200 dark:border-neutral-700 pt-6">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} prompts
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadPage(currentPage - 1)}
                  disabled={currentPage === 1 || isLoading}
                >
                  Previous
                </Button>
                
                {/* Page numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={i}
                        onClick={() => loadPage(pageNum)}
                        disabled={isLoading}
                        className={`px-3 py-1 text-sm rounded-md transition-colors ${
                          pageNum === currentPage
                            ? 'bg-blue-600 text-white'
                            : 'hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadPage(currentPage + 1)}
                  disabled={currentPage === totalPages || isLoading}
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredAndSortedPrompts.length === 0 && (
            <div className="py-12 text-center">
              <Sparkles className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <p className="text-gray-500 mb-2">No prompts found</p>
              <p className="text-sm text-gray-400">
                {searchQuery || selectedTags.size > 0 || showFavorites || selectedFolder
                  ? 'Try adjusting your filters' 
                  : 'Create your first prompt to get started'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {filteredAndSortedPrompts.length > 0 && (
          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredAndSortedPrompts.length} of {prompts.length} prompts
          </div>
        )}
      </div>

      {/* Smart Discovery Sidebar */}
      {showDiscovery && (
        <div className="lg:col-span-1">
          <SmartDiscovery 
            workspaceId={workspaceId}
            workspaceSlug={workspaceSlug}
          />
        </div>
      )}
    </div>

      {/* Bulk Action Modals */}
      <BulkMoveModal
        isOpen={showBulkMoveModal}
        onClose={() => setShowBulkMoveModal(false)}
        onConfirm={handleBulkMove}
        folders={folders}
        selectedCount={selectedPrompts.size}
      />

      <BulkTagModal
        isOpen={showBulkTagModal}
        onClose={() => setShowBulkTagModal(false)}
        onConfirm={handleBulkTags}
        availableTags={allTags}
        selectedCount={selectedPrompts.size}
      />

      <BulkDeleteModal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        onConfirm={handleBulkDelete}
        selectedCount={selectedPrompts.size}
      />

      <BulkShareModal
        isOpen={showBulkShareModal}
        onClose={() => setShowBulkShareModal(false)}
        onConfirm={handleBulkShare}
        selectedCount={selectedPrompts.size}
      />
      
      {/* Variable Fill Modal */}
      {selectedPromptForVariables && (
        <VariableFillModal
          isOpen={showVariableModal}
          onClose={() => {
            setShowVariableModal(false);
            setSelectedPromptForVariables(null);
          }}
          promptContent={selectedPromptForVariables.content || ''}
          promptName={selectedPromptForVariables.name}
          onCopy={(filledContent) => {
            navigator.clipboard.writeText(filledContent);
            toast.success('Prompt copied with variables!');
            setShowVariableModal(false);
            setSelectedPromptForVariables(null);
          }}
        />
      )}
    </div>
  );
}