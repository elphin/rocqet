'use client';

import { useState, useEffect, useMemo } from 'react';
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
  Filter,
  SortAsc,
  SortDesc,
  Calendar,
  Clock,
  TrendingUp,
  FileText,
  MoreVertical,
  Sparkles,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface Prompt {
  id: string;
  name: string;
  slug: string;
  description?: string;
  content?: string;
  folder_id?: string;
  tags?: string[];
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
}

type SortOption = 'name' | 'updated' | 'created' | 'popularity';

export function PromptsPageClient({ 
  initialPrompts, 
  folders, 
  workspaceSlug,
  workspaceId 
}: PromptsPageClientProps) {
  const [prompts, setPrompts] = useState<Prompt[]>(initialPrompts);
  const [selectedPrompts, setSelectedPrompts] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [showFavorites, setShowFavorites] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('updated');
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showTagsDropdown, setShowTagsDropdown] = useState(false);
  
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

    // Search filter (title, description, content)
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
      
      toast.success(currentState ? 'Removed from favorites' : 'Added to favorites');
    } catch (error) {
      toast.error('Failed to update favorite');
    }
  };

  const handleDelete = async (promptId: string) => {
    if (!confirm('Are you sure you want to delete this prompt?')) return;
    
    try {
      const { error } = await supabase
        .from('prompts')
        .delete()
        .eq('id', promptId);

      if (error) throw error;

      setPrompts(prompts.filter(p => p.id !== promptId));
      toast.success('Prompt deleted');
    } catch (error) {
      toast.error('Failed to delete prompt');
    }
  };

  const handleBulkActions = () => {
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

  const handleCopyPrompt = async (prompt: Prompt) => {
    try {
      await navigator.clipboard.writeText(prompt.content || '');
      toast.success('Prompt copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy prompt');
    }
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedFolder && selectedFolder !== 'all') count++;
    if (selectedTags.size > 0) count += selectedTags.size;
    if (showFavorites) count++;
    return count;
  }, [selectedFolder, selectedTags, showFavorites]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-gray-900">Prompts</h1>
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                Team
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                className="text-gray-600 hover:text-gray-900"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-gray-600 hover:text-gray-900"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleBulkActions}
                className="text-gray-600 hover:text-gray-900"
              >
                <Check className="w-4 h-4 mr-2" />
                Bulk Actions
              </Button>
              <Link href={`/${workspaceSlug}/prompts/new`}>
                <Button size="sm" className="bg-gray-900 hover:bg-gray-800 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  New Prompt
                </Button>
              </Link>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            Organize and manage your AI prompt templates
          </p>
        </div>

        {/* Filters Bar */}
        <div className="mb-6 flex items-center gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search prompts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
            />
          </div>

          {/* Favorites Filter */}
          <Button
            size="sm"
            variant={showFavorites ? "default" : "outline"}
            onClick={() => setShowFavorites(!showFavorites)}
            className={showFavorites ? "bg-gray-900 text-white" : ""}
          >
            <Star className={`w-4 h-4 ${showFavorites ? '' : 'mr-2'}`} />
            {!showFavorites && 'Favorites'}
          </Button>

          {/* Folder Filter */}
          <select
            value={selectedFolder || 'all'}
            onChange={(e) => setSelectedFolder(e.target.value === 'all' ? null : e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
          >
            <option value="all">All folders</option>
            {folders.map(folder => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>

          {/* Tags Filter */}
          <div className="relative">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowTagsDropdown(!showTagsDropdown)}
              className="min-w-[120px] justify-between"
            >
              <span className="flex items-center">
                <Hash className="w-4 h-4 mr-2" />
                Tags
                {selectedTags.size > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 bg-gray-900 text-white text-xs rounded">
                    {selectedTags.size}
                  </span>
                )}
              </span>
            </Button>
            {showTagsDropdown && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
                <div className="p-2">
                  {allTags.length === 0 ? (
                    <p className="text-sm text-gray-500 px-2 py-3">No tags available</p>
                  ) : (
                    allTags.map(tag => (
                      <label
                        key={tag}
                        className="flex items-center px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer"
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
                          className="mr-2 rounded border-gray-300"
                        />
                        <span className="text-sm">{tag}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
          >
            <option value="updated">Recently updated</option>
            <option value="created">Recently created</option>
            <option value="name">Name</option>
            <option value="popularity">Most popular</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {showBulkActions && (
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedPrompts.size === filteredAndSortedPrompts.length && filteredAndSortedPrompts.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPrompts(new Set(filteredAndSortedPrompts.map(p => p.id)));
                        } else {
                          setSelectedPrompts(new Set());
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Folder
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tags
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Updated
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAndSortedPrompts.map((prompt) => {
                const folder = folders.find(f => f.id === prompt.folder_id);
                return (
                  <tr 
                    key={prompt.id} 
                    className="hover:bg-gray-50 transition-colors"
                  >
                    {showBulkActions && (
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedPrompts.has(prompt.id)}
                          onChange={() => handleSelectPrompt(prompt.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div>
                        <Link 
                          href={`/${workspaceSlug}/prompts/${prompt.slug}`}
                          className="text-sm font-medium text-gray-900 hover:text-gray-600"
                        >
                          {prompt.name}
                        </Link>
                        {prompt.description && (
                          <p className="text-xs text-gray-500 mt-1">
                            {prompt.description}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {folder ? (
                        <div className="flex items-center gap-1.5">
                          <FolderOpen className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-sm text-gray-600">{folder.name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {prompt.tags && prompt.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {prompt.tags.map(tag => (
                            <span 
                              key={tag}
                              className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs"
                            >
                              <Hash className="w-3 h-3" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500">
                        {formatDistanceToNow(new Date(prompt.updated_at), { addSuffix: true })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => handleCopyPrompt(prompt)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                          title="Copy"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <Link href={`/${workspaceSlug}/prompts/${prompt.slug}/edit`}>
                          <button 
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </Link>
                        <button 
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                          title="Share"
                        >
                          <Share2 className="w-4 h-4" />
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
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Empty State */}
          {filteredAndSortedPrompts.length === 0 && (
            <div className="py-12 text-center">
              <Sparkles className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <p className="text-gray-500 mb-2">No prompts found</p>
              <p className="text-sm text-gray-400">
                {searchQuery || activeFilterCount > 0 
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
    </div>
  );
}