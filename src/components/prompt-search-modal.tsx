'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  X, 
  Folder, 
  Tag, 
  Clock, 
  Star,
  FileText,
  ChevronRight,
  ChevronDown,
  Filter,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import debounce from 'lodash/debounce';
import { toast } from '@/lib/toast-config';

interface Prompt {
  id: string;
  name: string;
  description: string | null;
  content: string;
  tags: string[] | null;
  folder_id: string | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  folders?: {
    id: string;
    name: string;
  };
}

interface PromptSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (prompt: Prompt) => void;
  workspaceId: string;
  selectedTags?: string[];
  selectedFolderId?: string | null;
}

export function PromptSearchModal({
  isOpen,
  onClose,
  onSelect,
  workspaceId,
  selectedTags = [],
  selectedFolderId = null
}: PromptSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [filteredPrompts, setFilteredPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(false);
  const [folders, setFolders] = useState<any[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [filterTags, setFilterTags] = useState<string[]>(selectedTags);
  const [filterFolderId, setFilterFolderId] = useState<string | null>(selectedFolderId);
  const [showFilters, setShowFilters] = useState(false);
  const [showTagsDropdown, setShowTagsDropdown] = useState(false);
  const [showFoldersDropdown, setShowFoldersDropdown] = useState(false);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.tags-dropdown') && !target.closest('.folders-dropdown')) {
        setShowTagsDropdown(false);
        setShowFoldersDropdown(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Load prompts, folders, and tags
  useEffect(() => {
    if (!isOpen) return;
    
    const loadData = async () => {
      setLoading(true);
      const supabase = createClient();

      console.log('Loading prompts for workspace:', workspaceId);

      // Load prompts (without folder join for now)
      const { data: promptsData, error: promptsError } = await supabase
        .from('prompts')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('updated_at', { ascending: false });

      console.log('Prompts query result:', { data: promptsData, error: promptsError });

      if (promptsError) {
        console.error('Error loading prompts:', promptsError);
        toast.error('Failed to load prompts');
      }

      if (promptsData && promptsData.length > 0) {
        console.log(`Found ${promptsData.length} prompts`);
        console.log('First prompt example:', promptsData[0]);
        setPrompts(promptsData);
        setFilteredPrompts(promptsData);

        // Extract unique tags - check both tags and tag field
        const allTags = new Set<string>();
        promptsData.forEach(prompt => {
          // Try both tags and tag field
          const promptTags = prompt.tags || prompt.tag || [];
          if (Array.isArray(promptTags) && promptTags.length > 0) {
            promptTags.forEach(tag => allTags.add(tag));
          }
        });
        console.log('Extracted tags:', Array.from(allTags));
        setTags(Array.from(allTags).sort());
      } else {
        console.log('No prompts found');
        setPrompts([]);
        setFilteredPrompts([]);
      }

      // Load folders
      const { data: foldersData } = await supabase
        .from('folders')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('name');

      if (foldersData) {
        setFolders(foldersData);
      }

      setLoading(false);
    };

    loadData();
  }, [isOpen, workspaceId]);

  // Debounced search function
  const performSearch = useCallback(
    debounce((query: string, tags: string[], folderId: string | null) => {
      let filtered = prompts;

      // Filter by search query
      if (query) {
        const lowerQuery = query.toLowerCase();
        filtered = filtered.filter(prompt => 
          prompt.name.toLowerCase().includes(lowerQuery) ||
          prompt.description?.toLowerCase().includes(lowerQuery) ||
          prompt.content.toLowerCase().includes(lowerQuery) ||
          prompt.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
        );
      }

      // Filter by tags
      if (tags.length > 0) {
        filtered = filtered.filter(prompt =>
          tags.every(tag => prompt.tags?.includes(tag))
        );
      }

      // Filter by folder
      if (folderId) {
        filtered = filtered.filter(prompt => prompt.folder_id === folderId);
      }

      setFilteredPrompts(filtered);
    }, 300),
    [prompts]
  );

  // Handle search and filter changes
  useEffect(() => {
    performSearch(searchQuery, filterTags, filterFolderId);
  }, [searchQuery, filterTags, filterFolderId, performSearch]);

  const toggleTag = (tag: string) => {
    setFilterTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleSelect = (prompt: Prompt) => {
    onSelect(prompt);
    onClose();
    // Reset state
    setSearchQuery('');
    setFilterTags([]);
    setFilterFolderId(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 p-4 sm:p-6 md:p-8 overflow-y-auto"
          onClick={onClose}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-4xl min-h-[200px] bg-white dark:bg-neutral-900 rounded-lg shadow-2xl flex flex-col mt-[5vh] mb-8 relative"
            onClick={(e) => e.stopPropagation()}
          >
        {/* Header - Sticky */}
        <div className="sticky top-0 z-10 bg-white dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-800 rounded-t-lg">
          <div className="flex items-center justify-between p-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Select a Prompt
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modern filter bar with dropdowns */}
          <div className="flex items-center gap-3 px-4 pb-4">
            {/* Search Field */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search prompts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Tags Dropdown */}
            <div className="relative tags-dropdown">
              <button
                onClick={() => {
                  setShowTagsDropdown(!showTagsDropdown);
                  setShowFoldersDropdown(false);
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
              >
                <Tag className="w-4 h-4 text-gray-500" />
                <span className="text-gray-700 dark:text-gray-300">
                  {filterTags.length > 0 ? `${filterTags.length} tag${filterTags.length !== 1 ? 's' : ''}` : 'Tags'}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
                {filterTags.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                    {filterTags.length}
                  </span>
                )}
              </button>
              
              {/* Tags Dropdown Content */}
              {showTagsDropdown && (
                <div className="absolute top-full mt-2 right-0 w-64 bg-white dark:bg-neutral-900 rounded-lg shadow-lg border border-gray-200 dark:border-neutral-700 z-[110] max-h-[300px] overflow-hidden flex flex-col">
                  <div className="p-3 border-b border-gray-200 dark:border-neutral-700">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Select tags</span>
                      {filterTags.length > 0 && (
                        <button
                          onClick={() => setFilterTags([])}
                          className="text-xs text-blue-600 hover:text-blue-700"
                        >
                          Clear all
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto p-2">
                    {tags.length > 0 ? (
                      tags.map(tag => (
                        <label
                          key={tag}
                          className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-neutral-800 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={filterTags.includes(tag)}
                            onChange={() => toggleTag(tag)}
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

            {/* Folders Dropdown */}
            <div className="relative folders-dropdown">
              <button
                onClick={() => {
                  setShowFoldersDropdown(!showFoldersDropdown);
                  setShowTagsDropdown(false);
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
              >
                <Folder className="w-4 h-4 text-gray-500" />
                <span className="text-gray-700 dark:text-gray-300">
                  {filterFolderId ? folders.find(f => f.id === filterFolderId)?.name : 'All folders'}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              
              {/* Folders Dropdown Content */}
              {showFoldersDropdown && (
                <div className="absolute top-full mt-2 right-0 w-64 bg-white dark:bg-neutral-900 rounded-lg shadow-lg border border-gray-200 dark:border-neutral-700 z-50">
                  <div className="p-3 border-b border-gray-200 dark:border-neutral-700">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Select folder</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto p-2">
                    <button
                      onClick={() => {
                        setFilterFolderId(null);
                        setShowFoldersDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-50 dark:hover:bg-neutral-800 ${
                        !filterFolderId ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      All folders
                    </button>
                    {folders.map(folder => (
                      <button
                        key={folder.id}
                        onClick={() => {
                          setFilterFolderId(folder.id);
                          setShowFoldersDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-50 dark:hover:bg-neutral-800 ${
                          filterFolderId === folder.id ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {folder.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Active filters summary */}
          {(searchQuery || filterTags.length > 0 || filterFolderId) && (
            <div className="px-4 py-2 bg-gray-50 dark:bg-neutral-800/50 border-t border-gray-200 dark:border-neutral-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <span>Active filters:</span>
                  {searchQuery && (
                    <span className="px-2 py-0.5 bg-white dark:bg-neutral-900 rounded">
                      Search: "{searchQuery}"
                    </span>
                  )}
                  {filterTags.length > 0 && (
                    <span className="px-2 py-0.5 bg-white dark:bg-neutral-900 rounded">
                      {filterTags.length} tag{filterTags.length !== 1 ? 's' : ''}
                    </span>
                  )}
                  {filterFolderId && (
                    <span className="px-2 py-0.5 bg-white dark:bg-neutral-900 rounded">
                      Folder: {folders.find(f => f.id === filterFolderId)?.name}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterTags([]);
                    setFilterFolderId(null);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Clear all
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Prompt List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Loading prompts...</p>
            </div>
          ) : filteredPrompts.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery || filterTags.length > 0 || filterFolderId
                  ? 'No prompts match your criteria'
                  : 'No prompts available'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPrompts.map(prompt => (
                <button
                  key={prompt.id}
                  onClick={() => handleSelect(prompt)}
                  className="w-full text-left p-4 bg-gray-50 dark:bg-neutral-800 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {prompt.is_favorite && (
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        )}
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">
                          {prompt.name}
                        </h3>
                      </div>
                      
                      {prompt.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {prompt.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 mt-2">
                        {prompt.folder_id && folders.find(f => f.id === prompt.folder_id) && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Folder className="w-3 h-3" />
                            {folders.find(f => f.id === prompt.folder_id)?.name}
                          </span>
                        )}
                        
                        {prompt.tags && prompt.tags.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Tag className="w-3 h-3 text-gray-400" />
                            <div className="flex gap-1">
                              {prompt.tags.slice(0, 3).map(tag => (
                                <span
                                  key={tag}
                                  className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-neutral-700 rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                              {prompt.tags.length > 3 && (
                                <span className="text-xs text-gray-500">
                                  +{prompt.tags.length - 3}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(prompt.updated_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    
                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-4" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-neutral-800">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              {filteredPrompts.length} of {prompts.length} prompts
            </span>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}