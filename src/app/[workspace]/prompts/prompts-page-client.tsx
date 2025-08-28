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
  FileText
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
type SortDirection = 'asc' | 'desc';

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
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
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
    if (selectedFolder) {
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
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'updated':
          comparison = new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
          break;
        case 'created':
          comparison = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          break;
        case 'popularity':
          comparison = (b.run_count || 0) - (a.run_count || 0);
          break;
      }
      
      return sortDirection === 'asc' ? -comparison : comparison;
    });

    return filtered;
  }, [prompts, searchQuery, selectedFolder, selectedTags, showFavorites, sortBy, sortDirection]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPrompts(new Set(filteredAndSortedPrompts.map(p => p.id)));
      setShowBulkActions(true);
    } else {
      setSelectedPrompts(new Set());
      setShowBulkActions(false);
    }
  };

  const handleSelectPrompt = (promptId: string, checked: boolean) => {
    const newSelection = new Set(selectedPrompts);
    if (checked) {
      newSelection.add(promptId);
    } else {
      newSelection.delete(promptId);
    }
    setSelectedPrompts(newSelection);
    setShowBulkActions(newSelection.size > 0);
  };

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

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedPrompts.size} prompts?`)) return;
    
    try {
      const { error } = await supabase
        .from('prompts')
        .delete()
        .in('id', Array.from(selectedPrompts));

      if (error) throw error;

      setPrompts(prompts.filter(p => !selectedPrompts.has(p.id)));
      setSelectedPrompts(new Set());
      setShowBulkActions(false);
      toast.success(`Deleted ${selectedPrompts.size} prompts`);
    } catch (error) {
      toast.error('Failed to delete prompts');
    }
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedFolder(null);
    setSelectedTags(new Set());
    setShowFavorites(false);
    setSortBy('updated');
    setSortDirection('desc');
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery) count++;
    if (selectedFolder) count++;
    if (selectedTags.size > 0) count += selectedTags.size;
    if (showFavorites) count++;
    if (sortBy !== 'updated' || sortDirection !== 'desc') count++;
    return count;
  }, [searchQuery, selectedFolder, selectedTags, showFavorites, sortBy, sortDirection]);

  const sortOptions = [
    { value: 'name', label: 'Name', icon: FileText },
    { value: 'updated', label: 'Last Updated', icon: Clock },
    { value: 'created', label: 'Date Created', icon: Calendar },
    { value: 'popularity', label: 'Popularity', icon: TrendingUp }
  ];

  return (
    <div className="p-8">
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200">
        {/* Header */}
        <div className="p-6 border-b border-neutral-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold text-neutral-900">Prompts</h1>
              <p className="text-sm text-neutral-600 mt-1">
                Organize and manage your AI prompt templates
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button size="sm" variant="outline" className="border-neutral-300">
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
              <Button size="sm" variant="outline" className="border-neutral-300">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Link href={`/${workspaceSlug}/prompts/new`}>
                <Button size="sm" className="bg-neutral-900 hover:bg-neutral-800 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  New Prompt
                </Button>
              </Link>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by title, description, or content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900"
              />
            </div>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={`border-neutral-300 ${activeFilterCount > 0 ? 'bg-neutral-100' : ''}`}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-neutral-900 text-white text-xs rounded">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-4 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
              <div className="grid grid-cols-4 gap-4">
                {/* Favorites Filter */}
                <div>
                  <label className="text-xs font-medium text-neutral-700 mb-2 block">
                    Favorites
                  </label>
                  <Button
                    size="sm"
                    variant={showFavorites ? "default" : "outline"}
                    onClick={() => setShowFavorites(!showFavorites)}
                    className="w-full"
                  >
                    <Star className={`w-4 h-4 mr-2 ${showFavorites ? 'fill-current' : ''}`} />
                    {showFavorites ? 'Showing Favorites' : 'All Prompts'}
                  </Button>
                </div>

                {/* Folder Filter */}
                <div>
                  <label className="text-xs font-medium text-neutral-700 mb-2 block">
                    Folder
                  </label>
                  <select
                    value={selectedFolder || ''}
                    onChange={(e) => setSelectedFolder(e.target.value || null)}
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  >
                    <option value="">All folders</option>
                    {folders.map(folder => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tags Filter */}
                <div>
                  <label className="text-xs font-medium text-neutral-700 mb-2 block">
                    Tags ({selectedTags.size} selected)
                  </label>
                  <div className="relative">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full justify-between"
                      onClick={(e) => {
                        const dropdown = e.currentTarget.nextElementSibling;
                        if (dropdown) {
                          dropdown.classList.toggle('hidden');
                        }
                      }}
                    >
                      <span className="truncate">
                        {selectedTags.size === 0 
                          ? 'Select tags' 
                          : `${selectedTags.size} tag${selectedTags.size > 1 ? 's' : ''} selected`
                        }
                      </span>
                      <ChevronDown className="w-4 h-4 ml-2 flex-shrink-0" />
                    </Button>
                    <div className="hidden absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                      {allTags.map(tag => (
                        <label
                          key={tag}
                          className="flex items-center px-3 py-2 hover:bg-neutral-50 cursor-pointer"
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
                            className="mr-2"
                          />
                          <Hash className="w-3 h-3 mr-1 text-neutral-400" />
                          <span className="text-sm">{tag}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Sort Options */}
                <div>
                  <label className="text-xs font-medium text-neutral-700 mb-2 block">
                    Sort by
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                      className="flex-1 px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    >
                      {sortOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                      className="px-2"
                    >
                      {sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Clear Filters */}
              {activeFilterCount > 0 && (
                <div className="mt-4 flex justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={clearAllFilters}
                    className="text-neutral-600 hover:text-neutral-900"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear all filters
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bulk Actions Bar */}
        {showBulkActions && (
          <div className="px-6 py-3 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-neutral-700">
                {selectedPrompts.size} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline">
                <Move className="w-4 h-4 mr-2" />
                Move
              </Button>
              <Button size="sm" variant="outline">
                <Tag className="w-4 h-4 mr-2" />
                Tag
              </Button>
              <Button size="sm" variant="outline">
                <Star className="w-4 h-4 mr-2" />
                Favorite
              </Button>
              <Button size="sm" variant="outline">
                <Users className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={handleBulkDelete}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => {
                  setSelectedPrompts(new Set());
                  setShowBulkActions(false);
                }}
                className="ml-2"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200">
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedPrompts.size === filteredAndSortedPrompts.length && filteredAndSortedPrompts.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-neutral-300"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Folder
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Tags
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Updated
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {filteredAndSortedPrompts.map((prompt) => {
                const folder = folders.find(f => f.id === prompt.folder_id);
                return (
                  <tr 
                    key={prompt.id} 
                    className={`hover:bg-neutral-50 transition-colors ${
                      selectedPrompts.has(prompt.id) ? 'bg-neutral-50' : ''
                    }`}
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedPrompts.has(prompt.id)}
                        onChange={(e) => handleSelectPrompt(prompt.id, e.target.checked)}
                        className="rounded border-neutral-300"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <Link 
                          href={`/${workspaceSlug}/prompts/${prompt.slug}`}
                          className="text-sm font-medium text-neutral-900 hover:text-neutral-600 transition-colors"
                        >
                          {prompt.name}
                        </Link>
                        {prompt.description && (
                          <p className="text-xs text-neutral-500 mt-1">
                            {prompt.description}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {folder ? (
                        <div className="flex items-center gap-2">
                          <FolderOpen className="w-4 h-4 text-neutral-400" />
                          <span className="text-sm text-neutral-600">{folder.name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {prompt.tags && prompt.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {prompt.tags.map(tag => (
                            <span 
                              key={tag}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-neutral-100 text-neutral-700 rounded text-xs"
                            >
                              <Hash className="w-3 h-3" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-neutral-600">
                        {formatDistanceToNow(new Date(prompt.updated_at), { addSuffix: true })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded transition-colors"
                          title="Copy"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <Link href={`/${workspaceSlug}/prompts/${prompt.slug}/edit`}>
                          <button 
                            className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </Link>
                        <button 
                          className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded transition-colors"
                          title="Share"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleToggleFavorite(prompt.id, prompt.is_favorite || false)}
                          className={`p-1.5 rounded transition-colors ${
                            prompt.is_favorite 
                              ? 'text-yellow-500 hover:bg-neutral-100' 
                              : 'text-neutral-400 hover:text-yellow-500 hover:bg-neutral-100'
                          }`}
                          title="Favorite"
                        >
                          <Star className={`w-4 h-4 ${prompt.is_favorite ? 'fill-current' : ''}`} />
                        </button>
                        <button 
                          onClick={() => handleDelete(prompt.id)}
                          className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-neutral-100 rounded transition-colors"
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
        </div>

        {/* Empty State */}
        {filteredAndSortedPrompts.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-neutral-500 mb-4">
              {activeFilterCount > 0 
                ? 'No prompts match your filters' 
                : 'No prompts found'
              }
            </p>
            {activeFilterCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={clearAllFilters}
              >
                Clear filters
              </Button>
            )}
          </div>
        )}

        {/* Results Summary */}
        {filteredAndSortedPrompts.length > 0 && (
          <div className="px-6 py-3 border-t border-neutral-200 text-sm text-neutral-600">
            Showing {filteredAndSortedPrompts.length} of {prompts.length} prompts
          </div>
        )}
      </div>
    </div>
  );
}