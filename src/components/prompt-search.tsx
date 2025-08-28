'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, X, Folder, Tag, Calendar, SortAsc } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { debounce } from 'lodash';

interface PromptSearchProps {
  onSearch: (query: string) => void;
  onFilter: (filters: FilterOptions) => void;
  folders?: any[];
  tags?: string[];
}

interface FilterOptions {
  folder?: string;
  tags?: string[];
  dateRange?: { from: Date; to: Date };
  sortBy?: 'name' | 'updated' | 'usage' | 'created';
  sortOrder?: 'asc' | 'desc';
}

export function PromptSearch({ onSearch, onFilter, folders = [], tags = [] }: PromptSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    sortBy: 'updated',
    sortOrder: 'desc'
  });
  
  // Debounced search
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      onSearch(query);
    }, 300),
    []
  );
  
  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery]);
  
  const handleFilterChange = (newFilters: Partial<FilterOptions>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
    onFilter(updated);
  };
  
  const clearFilters = () => {
    const defaultFilters = { sortBy: 'updated' as const, sortOrder: 'desc' as const };
    setFilters(defaultFilters);
    onFilter(defaultFilters);
    setSearchQuery('');
    onSearch('');
  };
  
  const activeFilterCount = [
    filters.folder,
    filters.tags?.length,
    filters.dateRange
  ].filter(Boolean).length;
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search prompts..."
            className="pl-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="relative"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>
      
      {showFilters && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900">Filters</h3>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Clear all
              </button>
            )}
          </div>
          
          {/* Sort Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <SortAsc className="inline h-4 w-4 mr-1" />
              Sort by
            </label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange({ sortBy: e.target.value as any })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="name">Name</option>
                <option value="updated">Last Updated</option>
                <option value="created">Created Date</option>
                <option value="usage">Usage Count</option>
              </select>
              <select
                value={filters.sortOrder}
                onChange={(e) => handleFilterChange({ sortOrder: e.target.value as any })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
          </div>
          
          {/* Folder Filter */}
          {folders.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Folder className="inline h-4 w-4 mr-1" />
                Folder
              </label>
              <select
                value={filters.folder || ''}
                onChange={(e) => handleFilterChange({ folder: e.target.value || undefined })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">All folders</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {/* Tag Filter */}
          {tags.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Tag className="inline h-4 w-4 mr-1" />
                Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      const currentTags = filters.tags || [];
                      const newTags = currentTags.includes(tag)
                        ? currentTags.filter(t => t !== tag)
                        : [...currentTags, tag];
                      handleFilterChange({ tags: newTags.length > 0 ? newTags : undefined });
                    }}
                    className={`rounded-full px-3 py-1 text-sm transition-colors ${
                      filters.tags?.includes(tag)
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="inline h-4 w-4 mr-1" />
              Date Range
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                onChange={(e) => {
                  const from = e.target.value ? new Date(e.target.value) : undefined;
                  handleFilterChange({
                    dateRange: from && filters.dateRange?.to
                      ? { from, to: filters.dateRange.to }
                      : undefined
                  });
                }}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                type="date"
                onChange={(e) => {
                  const to = e.target.value ? new Date(e.target.value) : undefined;
                  handleFilterChange({
                    dateRange: to && filters.dateRange?.from
                      ? { from: filters.dateRange.from, to }
                      : undefined
                  });
                }}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}