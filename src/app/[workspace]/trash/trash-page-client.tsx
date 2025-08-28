'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  Trash2, 
  RefreshCw, 
  Clock, 
  FolderOpen,
  AlertCircle,
  Search,
  X,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/lib/toast-config';
import Link from 'next/link';

interface DeletedPrompt {
  id: string;
  name: string;
  slug: string;
  description?: string;
  deleted_at: string;
  deleted_by?: string;
  original_folder_id?: string;
  folder_id?: string;
  tags?: string[];
}

interface Folder {
  id: string;
  name: string;
}

interface TrashPageClientProps {
  deletedPrompts: DeletedPrompt[];
  folders: Folder[];
  workspaceSlug: string;
  workspaceId: string;
}

export function TrashPageClient({ 
  deletedPrompts: initialPrompts, 
  folders,
  workspaceSlug,
  workspaceId 
}: TrashPageClientProps) {
  const [deletedPrompts, setDeletedPrompts] = useState<DeletedPrompt[]>(initialPrompts);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPrompts, setSelectedPrompts] = useState<Set<string>>(new Set());
  const [isRestoring, setIsRestoring] = useState(false);
  
  const supabase = createClient();

  // Filter prompts based on search
  const filteredPrompts = deletedPrompts.filter(prompt => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      prompt.name.toLowerCase().includes(query) ||
      prompt.description?.toLowerCase().includes(query)
    );
  });

  // Calculate days until permanent deletion
  const getDaysRemaining = (deletedAt: string) => {
    const deletedDate = new Date(deletedAt);
    const expiryDate = new Date(deletedDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysRemaining);
  };

  // Restore single prompt
  const handleRestore = async (promptId: string) => {
    setIsRestoring(true);
    const loadingToast = toast.loading('Restoring prompt...');
    
    try {
      const prompt = deletedPrompts.find(p => p.id === promptId);
      
      // Restore: clear deleted_at and restore original folder
      const { error } = await supabase
        .from('prompts')
        .update({ 
          deleted_at: null,
          deleted_by: null,
          folder_id: prompt?.original_folder_id || null,
          original_folder_id: null
        })
        .eq('id', promptId);

      if (error) throw error;

      // Remove from UI
      setDeletedPrompts(deletedPrompts.filter(p => p.id !== promptId));
      
      toast.dismiss(loadingToast);
      toast.success(
        'Prompt restored',
        `"${prompt?.name}" has been restored to ${prompt?.original_folder_id ? 'its original folder' : 'the workspace'}`
      );
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Failed to restore prompt');
    } finally {
      setIsRestoring(false);
    }
  };

  // Restore multiple prompts
  const handleBulkRestore = async () => {
    if (selectedPrompts.size === 0) return;
    
    setIsRestoring(true);
    const loadingToast = toast.loading(`Restoring ${selectedPrompts.size} prompts...`);
    
    try {
      // Get original folder info for each prompt
      const promptsToRestore = deletedPrompts.filter(p => selectedPrompts.has(p.id));
      
      // Restore all selected prompts
      for (const prompt of promptsToRestore) {
        const { error } = await supabase
          .from('prompts')
          .update({ 
            deleted_at: null,
            deleted_by: null,
            folder_id: prompt.original_folder_id || null,
            original_folder_id: null
          })
          .eq('id', prompt.id);
          
        if (error) throw error;
      }

      // Remove from UI
      setDeletedPrompts(deletedPrompts.filter(p => !selectedPrompts.has(p.id)));
      setSelectedPrompts(new Set());
      
      toast.dismiss(loadingToast);
      toast.success(
        `${selectedPrompts.size} prompts restored`,
        'They have been returned to their original locations'
      );
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Failed to restore prompts');
    } finally {
      setIsRestoring(false);
    }
  };

  // Permanently delete (only for admin/owner)
  const handlePermanentDelete = async (promptId: string) => {
    const confirmed = window.confirm(
      'Are you sure? This will permanently delete this prompt and cannot be undone.'
    );
    
    if (!confirmed) return;
    
    const loadingToast = toast.loading('Permanently deleting...');
    
    try {
      const { error } = await supabase
        .from('prompts')
        .delete()
        .eq('id', promptId);

      if (error) throw error;

      setDeletedPrompts(deletedPrompts.filter(p => p.id !== promptId));
      
      toast.dismiss(loadingToast);
      toast.success('Permanently deleted');
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Failed to delete permanently');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPrompts(new Set(filteredPrompts.map(p => p.id)));
    } else {
      setSelectedPrompts(new Set());
    }
  };

  const handleSelectPrompt = (promptId: string) => {
    const newSelected = new Set(selectedPrompts);
    if (newSelected.has(promptId)) {
      newSelected.delete(promptId);
    } else {
      newSelected.add(promptId);
    }
    setSelectedPrompts(newSelected);
  };

  return (
    <div className="flex-1 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Trash2 className="w-8 h-8 text-gray-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Trash</h1>
          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded text-sm">
            {deletedPrompts.length} items
          </span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Items in trash are automatically deleted after 30 days
        </p>
      </div>

      {/* Actions Bar */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search trash..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 ${searchQuery ? 'pr-10' : 'pr-3'} py-2 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 bg-white dark:bg-neutral-800`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-full"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>

          {/* Bulk actions */}
          {selectedPrompts.size > 0 && (
            <div className="flex items-center gap-2">
              <Button
                onClick={handleBulkRestore}
                disabled={isRestoring}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Restore {selectedPrompts.size} items
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedPrompts(new Set())}
              >
                Clear selection
              </Button>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <AlertCircle className="w-4 h-4" />
          <span>Items are permanently deleted after 30 days</span>
        </div>
      </div>

      {/* Content */}
      {filteredPrompts.length === 0 ? (
        <div className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-800 p-12">
          <div className="text-center">
            <Trash2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              {searchQuery ? 'No items found' : 'Trash is empty'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {searchQuery 
                ? 'Try adjusting your search query' 
                : 'Deleted items will appear here for 30 days before permanent deletion'}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-800 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-neutral-950 border-b border-gray-200 dark:border-neutral-800">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedPrompts.size === filteredPrompts.length && filteredPrompts.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Original Folder
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Deleted
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Days Remaining
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-neutral-800">
              {filteredPrompts.map(prompt => {
                const folder = folders.find(f => f.id === prompt.original_folder_id);
                const daysRemaining = getDaysRemaining(prompt.deleted_at);
                
                return (
                  <tr key={prompt.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedPrompts.has(prompt.id)}
                        onChange={() => handleSelectPrompt(prompt.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {prompt.name}
                        </p>
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
                        <span className="text-sm text-gray-400">Root</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {formatDistanceToNow(new Date(prompt.deleted_at), { addSuffix: true })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        daysRemaining <= 7 
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' 
                          : daysRemaining <= 14 
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {daysRemaining} days
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleRestore(prompt.id)}
                          disabled={isRestoring}
                          className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                          title="Restore"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handlePermanentDelete(prompt.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                          title="Delete permanently"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}