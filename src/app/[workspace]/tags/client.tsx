'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Hash, 
  Plus, 
  Edit2, 
  Trash2, 
  FileText,
  Search,
  ChevronDown,
  ChevronUp,
  Calendar,
  Palette,
  CheckCircle,
  XCircle,
  Merge,
  Copy,
  BarChart3
} from 'lucide-react';
import { toast } from '@/lib/toast-config';
import { formatDate } from '@/lib/utils/date';
import { hasPermission } from '@/lib/permissions';
import { PopularTags } from '@/components/popular-tags';

interface Tag {
  id: string;
  name: string;
  color: string;
  description?: string;
  created_at: string;
  prompt_count: number;
}

interface TagsClientProps {
  workspace: any;
  tags: Tag[];
  userRole: string;
}

type SortField = 'name' | 'prompt_count' | 'created_at';
type SortDirection = 'asc' | 'desc';

const DEFAULT_COLORS = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Green
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange
];

export function TagsClient({ workspace, tags, userRole }: TagsClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagDescription, setNewTagDescription] = useState('');
  const [newTagColor, setNewTagColor] = useState(DEFAULT_COLORS[0]);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editColor, setEditColor] = useState('');
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<string | null>(null);
  const [filterOptions, setFilterOptions] = useState({
    showUnused: true,
    showUsed: true,
    minPrompts: 0,
    maxPrompts: Infinity,
    selectedColors: new Set<string>()
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const router = useRouter();

  const canCreate = hasPermission(userRole as any, 'prompts.create');
  const canEdit = hasPermission(userRole as any, 'prompts.edit');
  const canDelete = hasPermission(userRole as any, 'prompts.delete');

  const filteredTags = tags.filter(tag => {
    // Search query filter
    const matchesSearch = tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tag.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    // Advanced filters
    if (!filterOptions.showUnused && tag.prompt_count === 0) return false;
    if (!filterOptions.showUsed && tag.prompt_count > 0) return false;
    if (tag.prompt_count < filterOptions.minPrompts) return false;
    if (tag.prompt_count > filterOptions.maxPrompts) return false;
    if (filterOptions.selectedColors.size > 0 && !filterOptions.selectedColors.has(tag.color)) return false;
    
    return true;
  });

  // Sort tags
  const sortedTags = [...filteredTags].sort((a, b) => {
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];
    
    if (sortField === 'created_at') {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    }
    
    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }
    
    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      toast.error('Please enter a tag name');
      return;
    }

    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspace.id,
          name: newTagName,
          description: newTagDescription,
          color: newTagColor
        })
      });

      if (!response.ok) throw new Error('Failed to create tag');

      toast.success('Tag created successfully');
      setIsCreating(false);
      setNewTagName('');
      setNewTagDescription('');
      setNewTagColor(DEFAULT_COLORS[0]);
      router.refresh();
    } catch (error) {
      toast.error('Failed to create tag');
    }
  };

  const handleUpdateTag = async (tagId: string) => {
    try {
      const response = await fetch(`/api/tags/${tagId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          description: editDescription,
          color: editColor
        })
      });

      if (!response.ok) throw new Error('Failed to update tag');

      toast.success('Tag updated successfully');
      setEditingTag(null);
      setShowColorPicker(null);
      router.refresh();
    } catch (error) {
      toast.error('Failed to update tag');
    }
  };

  const handleDeleteTag = async (tagId: string, tagName: string) => {
    if (!confirm(`Delete tag "${tagName}"? This will remove it from all prompts.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/tags/${tagId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete tag');

      toast.success('Tag deleted successfully');
      router.refresh();
    } catch (error) {
      toast.error('Failed to delete tag');
    }
  };

  const startEdit = (tag: Tag) => {
    setEditingTag(tag.id);
    setEditName(tag.name);
    setEditDescription(tag.description || '');
    setEditColor(tag.color);
  };

  const cancelEdit = () => {
    setEditingTag(null);
    setEditName('');
    setEditDescription('');
    setEditColor('');
    setShowColorPicker(null);
  };

  const toggleTagSelection = (tagId: string) => {
    const newSelection = new Set(selectedTags);
    if (newSelection.has(tagId)) {
      newSelection.delete(tagId);
    } else {
      newSelection.add(tagId);
    }
    setSelectedTags(newSelection);
  };

  const selectAllTags = () => {
    if (selectedTags.size === sortedTags.length) {
      setSelectedTags(new Set());
    } else {
      setSelectedTags(new Set(sortedTags.map(t => t.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTags.size === 0) return;
    
    if (!confirm(`Delete ${selectedTags.size} tags? This will remove them from all prompts.`)) {
      return;
    }

    try {
      const response = await fetch('/api/tags/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          tagIds: Array.from(selectedTags),
          workspaceId: workspace.id
        })
      });

      if (!response.ok) throw new Error('Failed to delete tags');

      toast.success(`${selectedTags.size} tags deleted successfully`);
      setSelectedTags(new Set());
      setBulkAction(null);
      router.refresh();
    } catch (error) {
      toast.error('Failed to delete tags');
    }
  };

  const handleMergeTags = async () => {
    if (selectedTags.size < 2 || !mergeTargetId) return;

    const sourceTagIds = Array.from(selectedTags).filter(id => id !== mergeTargetId);
    
    if (!confirm(`Merge ${sourceTagIds.length} tags into the selected target tag?`)) {
      return;
    }

    try {
      const response = await fetch('/api/tags/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'merge',
          tagIds: [],
          workspaceId: workspace.id,
          data: {
            targetTagId: mergeTargetId,
            sourceTagIds
          }
        })
      });

      if (!response.ok) throw new Error('Failed to merge tags');

      toast.success(`${sourceTagIds.length} tags merged successfully`);
      setSelectedTags(new Set());
      setBulkAction(null);
      setMergeTargetId(null);
      router.refresh();
    } catch (error) {
      toast.error('Failed to merge tags');
    }
  };

  const handleBulkColorUpdate = async (color: string) => {
    if (selectedTags.size === 0) return;

    try {
      const response = await fetch('/api/tags/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-color',
          tagIds: Array.from(selectedTags),
          workspaceId: workspace.id,
          data: { color }
        })
      });

      if (!response.ok) throw new Error('Failed to update tag colors');

      toast.success(`${selectedTags.size} tags updated successfully`);
      setSelectedTags(new Set());
      setBulkAction(null);
      router.refresh();
    } catch (error) {
      toast.error('Failed to update tag colors');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-gray-100">Tags</h1>
              <p className="text-sm text-neutral-600 dark:text-gray-400 mt-1">
                Organize and categorize your prompts with tags
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push(`/${workspace.slug}/tags/analytics`)}
              className="border-neutral-200 dark:border-neutral-700"
            >
              <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
              View Analytics
            </Button>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xs border border-neutral-200 dark:border-neutral-800 p-4 mb-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 max-w-sm">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-neutral-400 dark:text-gray-500 w-3.5 h-3.5" />
                <Input
                  type="text"
                  placeholder="Search tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-7 text-sm bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                />
              </div>
            </div>
            
            {/* Bulk Actions */}
            {selectedTags.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-600 dark:text-gray-400">
                  {selectedTags.size} selected
                </span>
                {canDelete && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleBulkDelete}
                      className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Delete
                    </Button>
                    {selectedTags.size >= 2 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setBulkAction('merge')}
                        className="border-neutral-200 dark:border-neutral-700"
                      >
                        <Merge className="w-3.5 h-3.5 mr-1" />
                        Merge
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setBulkAction('color')}
                      className="border-neutral-200 dark:border-neutral-700"
                    >
                      <Palette className="w-3.5 h-3.5 mr-1" />
                      Color
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedTags(new Set())}
                >
                  <XCircle className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
            
            {canCreate && (
              <Button
                size="sm"
                onClick={() => setIsCreating(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                New Tag
              </Button>
            )}
          </div>
        </div>

        {/* Create New Tag Form */}
        {isCreating && (
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xs border border-neutral-200 dark:border-neutral-800 p-4 mb-6">
            <h3 className="text-sm font-medium mb-3 text-neutral-900 dark:text-gray-100">Create New Tag</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-gray-300 mb-1">
                    Tag Name
                  </label>
                  <Input
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="e.g., Important"
                    className="h-7 text-sm bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-gray-300 mb-1">
                    Color
                  </label>
                  <div className="flex gap-1">
                    {DEFAULT_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => setNewTagColor(color)}
                        className={`w-7 h-7 rounded-md border-2 ${
                          newTagColor === color 
                            ? 'border-neutral-900 dark:border-gray-100' 
                            : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-gray-300 mb-1">
                  Description (optional)
                </label>
                <Input
                  value={newTagDescription}
                  onChange={(e) => setNewTagDescription(e.target.value)}
                  placeholder="Brief description of this tag"
                  className="h-7 text-sm bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleCreateTag}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Create Tag
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsCreating(false);
                    setNewTagName('');
                    setNewTagDescription('');
                    setNewTagColor(DEFAULT_COLORS[0]);
                  }}
                  className="border-neutral-200 dark:border-neutral-700"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tags Table */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xs border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                {canDelete && (
                  <th className="w-10 p-4">
                    <input
                      type="checkbox"
                      checked={selectedTags.size === sortedTags.length && sortedTags.length > 0}
                      onChange={selectAllTags}
                      className="rounded border-neutral-300 dark:border-neutral-600"
                    />
                  </th>
                )}
                <th className="text-left p-4">
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center gap-1 text-xs font-medium text-neutral-700 dark:text-gray-300 hover:text-neutral-900 dark:hover:text-gray-100"
                  >
                    Tag Name
                    {sortField === 'name' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                </th>
                <th className="text-left p-4 hidden md:table-cell">
                  <span className="text-xs font-medium text-neutral-700 dark:text-gray-300">Description</span>
                </th>
                <th className="text-left p-4">
                  <button
                    onClick={() => handleSort('prompt_count')}
                    className="flex items-center gap-1 text-xs font-medium text-neutral-700 dark:text-gray-300 hover:text-neutral-900 dark:hover:text-gray-100"
                  >
                    Prompts
                    {sortField === 'prompt_count' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                </th>
                <th className="text-left p-4">
                  <button
                    onClick={() => handleSort('created_at')}
                    className="flex items-center gap-1 text-xs font-medium text-neutral-700 dark:text-gray-300 hover:text-neutral-900 dark:hover:text-gray-100"
                  >
                    Created
                    {sortField === 'created_at' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                </th>
                {(canEdit || canDelete) && (
                  <th className="text-right p-4">
                    <span className="text-xs font-medium text-neutral-700 dark:text-gray-300">Actions</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {sortedTags.map((tag) => (
                <tr 
                  key={tag.id} 
                  className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                >
                  {canDelete && (
                    <td className="w-10 p-4">
                      <input
                        type="checkbox"
                        checked={selectedTags.has(tag.id)}
                        onChange={() => toggleTagSelection(tag.id)}
                        className="rounded border-neutral-300 dark:border-neutral-600"
                      />
                    </td>
                  )}
                  <td className="p-4">
                    {editingTag === tag.id ? (
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <button
                            onClick={() => setShowColorPicker(showColorPicker === tag.id ? null : tag.id)}
                            className="w-6 h-6 rounded-md border border-neutral-300 dark:border-neutral-600"
                            style={{ backgroundColor: editColor }}
                          />
                          {showColorPicker === tag.id && (
                            <div className="absolute z-10 top-8 left-0 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 p-2">
                              <div className="flex gap-1">
                                {DEFAULT_COLORS.map(color => (
                                  <button
                                    key={color}
                                    onClick={() => {
                                      setEditColor(color);
                                      setShowColorPicker(null);
                                    }}
                                    className={`w-6 h-6 rounded-md border-2 ${
                                      editColor === color 
                                        ? 'border-neutral-900 dark:border-gray-100' 
                                        : 'border-transparent'
                                    }`}
                                    style={{ backgroundColor: color }}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-7 text-sm bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 flex-1"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span 
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ 
                            backgroundColor: `${tag.color}20`,
                            color: tag.color
                          }}
                        >
                          <Hash className="w-3 h-3 mr-1" />
                          {tag.name}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="p-4 hidden md:table-cell">
                    {editingTag === tag.id ? (
                      <Input
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Add description..."
                        className="h-7 text-sm bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                      />
                    ) : (
                      <span className="text-sm text-neutral-600 dark:text-gray-400">
                        {tag.description || '-'}
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <FileText className="w-3 h-3 text-neutral-400 dark:text-gray-500" />
                      <span className="text-sm text-neutral-600 dark:text-gray-400">
                        {tag.prompt_count}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-neutral-400 dark:text-gray-500" />
                      <span className="text-sm text-neutral-600 dark:text-gray-400">
                        {formatDate(tag.created_at)}
                      </span>
                    </div>
                  </td>
                  {(canEdit || canDelete) && (
                    <td className="p-4 text-right">
                      {editingTag === tag.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleUpdateTag(tag.id)}
                            className="h-7 px-2 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEdit}
                            className="h-7 px-2 text-xs border-neutral-200 dark:border-neutral-700"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          {canEdit && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEdit(tag)}
                              className="h-7 w-7 p-0"
                            >
                              <Edit2 className="w-3 h-3 text-neutral-600 dark:text-gray-400" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteTag(tag.id, tag.name)}
                              className="h-7 w-7 p-0"
                            >
                              <Trash2 className="w-3 h-3 text-red-600 dark:text-red-400" />
                            </Button>
                          )}
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Empty State */}
          {sortedTags.length === 0 && (
            <div className="p-12">
              {!searchQuery && tags.length === 0 ? (
                // Show popular tags when no tags exist at all
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <Hash className="w-12 h-12 text-neutral-400 dark:text-gray-500 mx-auto mb-3" />
                    <h3 className="text-sm font-medium text-neutral-900 dark:text-gray-100 mb-1">
                      No tags yet
                    </h3>
                    <p className="text-xs text-neutral-600 dark:text-gray-400">
                      Get started with popular tags or create your own
                    </p>
                  </div>
                  
                  <PopularTags 
                    workspaceId={workspace.id}
                    onTagsCreated={() => router.refresh()}
                  />
                  
                  <div className="text-center pt-4 border-t border-gray-200 dark:border-neutral-800">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                      Or create your own custom tag
                    </p>
                    {canCreate && (
                      <Button
                        size="sm"
                        onClick={() => setIsCreating(true)}
                        variant="outline"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1.5" />
                        Create Custom Tag
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                // Show normal empty state when searching or filtering
                <div className="text-center">
                  <Hash className="w-12 h-12 text-neutral-400 dark:text-gray-500 mx-auto mb-3" />
                  <h3 className="text-sm font-medium text-neutral-900 dark:text-gray-100 mb-1">
                    {searchQuery ? 'No tags found' : 'No matching tags'}
                  </h3>
                  <p className="text-xs text-neutral-600 dark:text-gray-400 mb-4">
                    {searchQuery
                      ? 'Try adjusting your search'
                      : 'Try adjusting your filters'}
                  </p>
                  {!searchQuery && canCreate && (
                    <Button
                      size="sm"
                      onClick={() => setIsCreating(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1.5" />
                      Create New Tag
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Merge Tags Modal */}
        {bulkAction === 'merge' && selectedTags.size >= 2 && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4 text-neutral-900 dark:text-gray-100">
                Merge Tags
              </h3>
              <p className="text-sm text-neutral-600 dark:text-gray-400 mb-4">
                Select the target tag that will remain after merging:
              </p>
              <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                {Array.from(selectedTags).map(tagId => {
                  const tag = tags.find(t => t.id === tagId);
                  if (!tag) return null;
                  return (
                    <label
                      key={tag.id}
                      className="flex items-center gap-2 p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="mergeTarget"
                        value={tag.id}
                        checked={mergeTargetId === tag.id}
                        onChange={() => setMergeTargetId(tag.id)}
                        className="text-blue-600"
                      />
                      <span 
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ 
                          backgroundColor: `${tag.color}20`,
                          color: tag.color
                        }}
                      >
                        <Hash className="w-3 h-3 mr-1" />
                        {tag.name}
                      </span>
                      <span className="text-xs text-neutral-500 dark:text-gray-500">
                        ({tag.prompt_count} prompts)
                      </span>
                    </label>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleMergeTags}
                  disabled={!mergeTargetId}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Merge Tags
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setBulkAction(null);
                    setMergeTargetId(null);
                  }}
                  className="border-neutral-200 dark:border-neutral-700"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Color Update Modal */}
        {bulkAction === 'color' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4 text-neutral-900 dark:text-gray-100">
                Update Tag Colors
              </h3>
              <p className="text-sm text-neutral-600 dark:text-gray-400 mb-4">
                Choose a new color for {selectedTags.size} selected tags:
              </p>
              <div className="grid grid-cols-8 gap-2 mb-4">
                {DEFAULT_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => handleBulkColorUpdate(color)}
                    className="w-10 h-10 rounded-md border-2 border-transparent hover:border-neutral-900 dark:hover:border-gray-100 transition-colors"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setBulkAction(null)}
                className="w-full border-neutral-200 dark:border-neutral-700"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}