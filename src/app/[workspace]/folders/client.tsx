'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  FolderOpen, 
  Plus, 
  Edit2, 
  Trash2, 
  FileText,
  Search,
  ChevronDown,
  ChevronUp,
  Calendar,
  GripVertical
} from 'lucide-react';
import { toast } from '@/lib/toast-config';
import { formatDate } from '@/lib/utils/date';
import { hasPermission } from '@/lib/permissions';
import { Reorder, motion } from 'framer-motion';

interface Folder {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at?: string;
  prompt_count: number;
  sort_order?: number;
}

interface FoldersClientProps {
  workspace: any;
  folders: Folder[];
  userRole: string;
}

type SortField = 'name' | 'prompt_count' | 'created_at';
type SortDirection = 'asc' | 'desc';


export function FoldersClient({ workspace, folders, userRole }: FoldersClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDescription, setNewFolderDescription] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [folderList, setFolderList] = useState(folders);
  const router = useRouter();

  // Update folderList when folders prop changes
  useEffect(() => {
    setFolderList(folders);
  }, [folders]);

  const canCreate = hasPermission(userRole as any, 'prompts.create');
  const canEdit = hasPermission(userRole as any, 'prompts.edit');
  const canDelete = hasPermission(userRole as any, 'prompts.delete');

  const filteredFolders = folderList.filter(folder =>
    folder.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    folder.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort folders - don't sort when dragging
  const sortedFolders = [...filteredFolders].sort((a, b) => {
    // First sort by sort_order if available
    if (a.sort_order !== undefined && b.sort_order !== undefined) {
      return a.sort_order - b.sort_order;
    }
    
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

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error('Please enter a folder name');
      return;
    }

    try {
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspace.id,
          name: newFolderName,
          description: newFolderDescription
        })
      });

      if (!response.ok) throw new Error('Failed to create folder');

      const newFolder = await response.json();
      
      // Add the new folder to the list immediately
      const folderWithCount = {
        ...newFolder,
        prompt_count: 0,
        sort_order: folderList.length
      };
      setFolderList([...folderList, folderWithCount]);

      toast.success('Folder created successfully');
      setIsCreating(false);
      setNewFolderName('');
      setNewFolderDescription('');
    } catch (error) {
      toast.error('Failed to create folder');
    }
  };

  const handleUpdateFolder = async (folderId: string) => {
    try {
      const response = await fetch(`/api/folders/${folderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          description: editDescription
        })
      });

      if (!response.ok) throw new Error('Failed to update folder');

      // Update the folder in the list immediately
      setFolderList(folderList.map(folder => 
        folder.id === folderId 
          ? { ...folder, name: editName, description: editDescription }
          : folder
      ));

      toast.success('Folder updated successfully');
      setEditingFolder(null);
    } catch (error) {
      toast.error('Failed to update folder');
    }
  };

  const handleDeleteFolder = async (folderId: string, folderName: string) => {
    // Use regular confirm dialog to avoid type issues with toast.custom
    const confirmed = window.confirm(`Delete folder "${folderName}"? Prompts in this folder will not be deleted.`);
    
    if (!confirmed) return;
    
    try {
      const response = await fetch(`/api/folders/${folderId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete folder');

      // Remove the folder from the list immediately
      setFolderList(folderList.filter(folder => folder.id !== folderId));

      toast.success('Folder deleted successfully');
    } catch (error) {
      toast.error('Failed to delete folder');
    }
  };

  const startEdit = (folder: Folder) => {
    setEditingFolder(folder.id);
    setEditName(folder.name);
    setEditDescription(folder.description || '');
  };

  const cancelEdit = () => {
    setEditingFolder(null);
    setEditName('');
    setEditDescription('');
  };

  const handleReorder = async (newIds: string[]) => {
    // Map IDs back to folder objects preserving the full list
    const reorderedFiltered = newIds.map(id => sortedFolders.find(f => f.id === id)!).filter(Boolean);
    
    // Update the full folder list maintaining non-filtered items
    const newFolderList = folderList.map(folder => {
      const index = reorderedFiltered.findIndex(f => f.id === folder.id);
      if (index !== -1) {
        return { ...folder, sort_order: index };
      }
      return folder;
    });
    
    // Sort by the new order
    newFolderList.sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));
    
    // Update local state immediately for smooth UX
    setFolderList(newFolderList);

    // Update sort order in database
    try {
      await fetch('/api/folders/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspace.id,
          folders: reorderedFiltered.map((f, i) => ({ id: f.id, sort_order: i }))
        })
      });
      
      // Trigger event to update sidebar
      window.dispatchEvent(new Event('folders-updated'));
    } catch (error) {
      toast.error('Failed to update folder order');
      // Revert on error
      setFolderList(folders);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-gray-100">Folders</h1>
          <p className="text-sm text-neutral-600 dark:text-gray-400 mt-1">
            Organize your prompts into folders
          </p>
        </div>

        {/* Actions Bar */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xs border border-neutral-200 dark:border-neutral-800 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-sm">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-neutral-400 dark:text-gray-500 w-3.5 h-3.5" />
                <Input
                  type="text"
                  placeholder="Search folders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-7 text-sm bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                />
              </div>
            </div>
            {canCreate && (
              <Button
                size="sm"
                onClick={() => setIsCreating(true)}
                className="bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-white dark:text-neutral-900"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                New Folder
              </Button>
            )}
          </div>
        </div>

        {/* Create New Folder Form */}
        {isCreating && (
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xs border border-neutral-200 dark:border-neutral-800 p-4 mb-6">
            <h3 className="text-sm font-medium mb-3 text-neutral-900 dark:text-gray-100">Create New Folder</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-gray-300 mb-1">
                  Folder Name
                </label>
                <Input
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g., Marketing Templates"
                  className="h-7 text-sm bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-gray-300 mb-1">
                  Description (optional)
                </label>
                <Input
                  value={newFolderDescription}
                  onChange={(e) => setNewFolderDescription(e.target.value)}
                  placeholder="Brief description of this folder"
                  className="h-7 text-sm bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleCreateFolder}
                  className="bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-white dark:text-neutral-900"
                >
                  Create Folder
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsCreating(false);
                    setNewFolderName('');
                    setNewFolderDescription('');
                  }}
                  className="border-neutral-200 dark:border-neutral-700"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Folders List */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xs border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          {/* Header */}
          <div className="flex items-center border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
            <div className="w-10 p-4">
              <span className="sr-only">Drag Handle</span>
            </div>
            <div className="flex-1 p-4">
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center gap-1 text-xs font-medium text-neutral-700 dark:text-gray-300 hover:text-neutral-900 dark:hover:text-gray-100"
                  >
                    Folder Name
                    {sortField === 'name' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
            </div>
            <div className="flex-1 p-4 hidden md:block">
              <span className="text-xs font-medium text-neutral-700 dark:text-gray-300">Description</span>
            </div>
            <div className="w-24 p-4">
                  <button
                    onClick={() => handleSort('prompt_count')}
                    className="flex items-center gap-1 text-xs font-medium text-neutral-700 dark:text-gray-300 hover:text-neutral-900 dark:hover:text-gray-100"
                  >
                    Prompts
                    {sortField === 'prompt_count' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
            </div>
            <div className="w-32 p-4">
                  <button
                    onClick={() => handleSort('created_at')}
                    className="flex items-center gap-1 text-xs font-medium text-neutral-700 dark:text-gray-300 hover:text-neutral-900 dark:hover:text-gray-100"
                  >
                    Created
                    {sortField === 'created_at' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
            </div>
            {(canEdit || canDelete) && (
              <div className="w-32 p-4 text-right">
                <span className="text-xs font-medium text-neutral-700 dark:text-gray-300">Actions</span>
              </div>
            )}
          </div>

          {/* Folder Items */}
          <Reorder.Group
            axis="y"
            values={sortedFolders.map(f => f.id)}
            onReorder={handleReorder}
            as="ul"
            style={{ margin: 0, padding: 0 }}
          >
            {sortedFolders.map((folder) => {
              const isEditing = editingFolder === folder.id;
              
              return (
                <Reorder.Item
                  key={folder.id}
                  value={folder.id}
                  id={folder.id}
                  className="list-none relative m-0 p-0 w-full"
                  layout
                  layoutId={folder.id}
                >
                  <div
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors group cursor-grab active:cursor-grabbing active:opacity-90 active:bg-neutral-100 dark:active:bg-neutral-700 w-full"
                  >
                    <div className="flex items-center border-b border-neutral-100 dark:border-neutral-800 w-full">
                      <div className="w-10 p-4">
                        <GripVertical className="w-4 h-4 text-neutral-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity" />
                      </div>
                      <div className="flex-1 p-4">
                        {isEditing ? (
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-7 text-sm bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                            autoFocus
                            onPointerDown={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <FolderOpen className="w-4 h-4 text-blue-500" />
                            <span className="text-sm font-medium text-neutral-900 dark:text-gray-100">
                              {folder.name}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 p-4 hidden md:block">
                        {isEditing ? (
                          <Input
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            placeholder="Add description..."
                            className="h-7 text-sm bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                            onPointerDown={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span className="text-sm text-neutral-600 dark:text-gray-400">
                            {folder.description || '-'}
                          </span>
                        )}
                      </div>
                      <div className="w-24 p-4">
                        <div className="flex items-center gap-1">
                          <FileText className="w-3 h-3 text-neutral-400 dark:text-gray-500" />
                          <span className="text-sm text-neutral-600 dark:text-gray-400">
                            {folder.prompt_count}
                          </span>
                        </div>
                      </div>
                      <div className="w-32 p-4">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-neutral-400 dark:text-gray-500" />
                          <span className="text-sm text-neutral-600 dark:text-gray-400">
                            {formatDate(folder.created_at)}
                          </span>
                        </div>
                      </div>
                      {(canEdit || canDelete) && (
                        <div className="w-32 p-4 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleUpdateFolder(folder.id)}
                                className="h-7 px-2 text-xs bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-white dark:text-neutral-900"
                                onPointerDown={(e) => e.stopPropagation()}
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={cancelEdit}
                                className="h-7 px-2 text-xs border-neutral-200 dark:border-neutral-700"
                                onPointerDown={(e) => e.stopPropagation()}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div 
                              className="flex items-center justify-end gap-1"
                              onPointerDown={(e) => e.stopPropagation()}
                            >
                              {canEdit && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => startEdit(folder)}
                                  className="h-7 w-7 p-0"
                                >
                                  <Edit2 className="w-3 h-3 text-neutral-600 dark:text-gray-400" />
                                </Button>
                              )}
                              {canDelete && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteFolder(folder.id, folder.name)}
                                  className="h-7 w-7 p-0"
                                >
                                  <Trash2 className="w-3 h-3 text-red-600 dark:text-red-400" />
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Reorder.Item>
              );
            })}
          </Reorder.Group>

          {/* Empty State */}
          {sortedFolders.length === 0 && (
            <div className="p-12 text-center">
              <FolderOpen className="w-12 h-12 text-neutral-400 dark:text-gray-500 mx-auto mb-3" />
              <h3 className="text-sm font-medium text-neutral-900 dark:text-gray-100 mb-1">
                {searchQuery ? 'No folders found' : 'No folders yet'}
              </h3>
              <p className="text-xs text-neutral-600 dark:text-gray-400 mb-4">
                {searchQuery
                  ? 'Try adjusting your search'
                  : 'Create your first folder to organize your prompts'}
              </p>
              {!searchQuery && canCreate && (
                <Button
                  size="sm"
                  onClick={() => setIsCreating(true)}
                  className="bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-white dark:text-neutral-900"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Create First Folder
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}