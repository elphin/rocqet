'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Copy, 
  Edit, 
  Share2, 
  Star, 
  Trash2,
  FolderOpen,
  Hash,
  MoreVertical,
  Search,
  ChevronDown,
  Plus,
  Upload,
  Download,
  Move,
  Tag,
  Users,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

interface Prompt {
  id: string;
  name: string;
  slug: string;
  description?: string;
  folder?: { id: string; name: string };
  tags?: { id: string; name: string; color: string }[];
  updated_at: string;
  is_favorite?: boolean;
}

interface PromptsTableProps {
  prompts: Prompt[];
  workspaceSlug: string;
  onRefresh?: () => void;
}

export function PromptsTable({ prompts, workspaceSlug, onRefresh }: PromptsTableProps) {
  const [selectedPrompts, setSelectedPrompts] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [folderFilter, setFolderFilter] = useState('all');
  const [sortBy, setSortBy] = useState('updated');
  const [showBulkActions, setShowBulkActions] = useState(false);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPrompts(new Set(prompts.map(p => p.id)));
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

  const handleCancelSelection = () => {
    setSelectedPrompts(new Set());
    setShowBulkActions(false);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedPrompts.size} prompts?`)) return;
    // Implement bulk delete
    console.log('Bulk delete:', Array.from(selectedPrompts));
    handleCancelSelection();
  };

  const filteredPrompts = prompts.filter(prompt => 
    prompt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    prompt.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-neutral-200">
      {/* Header */}
      <div className="p-4 border-b border-neutral-200">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-semibold text-neutral-900">Prompts</h1>
            <p className="text-xs text-neutral-600 mt-0.5">
              Organize and manage your AI prompt templates
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm" variant="outline" className="border-neutral-300">
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              Import
            </Button>
            <Button size="sm" variant="outline" className="border-neutral-300">
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Export
            </Button>
            <Button size="sm" className="bg-primary hover:bg-primary-dark text-white">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              New Prompt
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-neutral-400 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Search prompts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
          <Button size="sm" variant="outline" className="border-neutral-300">
            <Star className="w-3.5 h-3.5 mr-1.5" />
            Favorites
          </Button>
          <div className="relative">
            <Button size="sm" variant="outline" className="border-neutral-300">
              All folders
              <ChevronDown className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </div>
          <Button size="sm" variant="outline" className="border-neutral-300">
            <Hash className="w-3.5 h-3.5 mr-1.5" />
            Tags
          </Button>
          <div className="relative">
            <Button size="sm" variant="outline" className="border-neutral-300">
              Recently updated
              <ChevronDown className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {showBulkActions && (
        <div className="px-4 py-2 bg-primary-pale border-b border-primary-light/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-primary-dark">
              {selectedPrompts.size} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="border-primary-light text-primary">
              <Move className="w-4 h-4 mr-2" />
              Move
            </Button>
            <Button size="sm" variant="outline" className="border-primary-light text-primary">
              <Tag className="w-4 h-4 mr-2" />
              Tag
            </Button>
            <Button size="sm" variant="outline" className="border-primary-light text-primary">
              <Star className="w-4 h-4 mr-2" />
              Favorite
            </Button>
            <Button size="sm" variant="outline" className="border-primary-light text-primary">
              <Users className="w-4 h-4 mr-2" />
              Share to Team
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="border-error text-error hover:bg-error hover:text-white"
              onClick={handleBulkDelete}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete ({selectedPrompts.size})
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={handleCancelSelection}
              className="ml-2"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel Selection
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-200">
              <th className="px-4 py-2 text-left">
                <input
                  type="checkbox"
                  checked={selectedPrompts.size === prompts.length && prompts.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-4 h-4 text-primary border-neutral-300 rounded focus:ring-primary"
                />
              </th>
              <th className="px-4 py-2 text-left text-[10px] font-medium text-neutral-500 uppercase tracking-wider">
                Title
              </th>
              <th className="px-4 py-2 text-left text-[10px] font-medium text-neutral-500 uppercase tracking-wider">
                Folder
              </th>
              <th className="px-4 py-2 text-left text-[10px] font-medium text-neutral-500 uppercase tracking-wider">
                Tags
              </th>
              <th className="px-4 py-2 text-left text-[10px] font-medium text-neutral-500 uppercase tracking-wider">
                Updated
              </th>
              <th className="px-4 py-2 text-right text-[10px] font-medium text-neutral-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {filteredPrompts.map((prompt) => (
              <tr 
                key={prompt.id} 
                className={`hover:bg-neutral-50 transition-colors ${
                  selectedPrompts.has(prompt.id) ? 'bg-primary-pale/30' : ''
                }`}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedPrompts.has(prompt.id)}
                    onChange={(e) => handleSelectPrompt(prompt.id, e.target.checked)}
                    className="w-4 h-4 text-primary border-neutral-300 rounded focus:ring-primary"
                  />
                </td>
                <td className="px-4 py-3">
                  <div>
                    <Link 
                      href={`/${workspaceSlug}/prompts/${prompt.slug}`}
                      className="text-sm text-neutral-900 font-medium hover:text-primary transition-colors"
                    >
                      {prompt.name}
                    </Link>
                    {prompt.description && (
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {prompt.description}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {prompt.folder ? (
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-3.5 h-3.5 text-neutral-400" />
                      <span className="text-xs text-neutral-600">{prompt.folder.name}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-neutral-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {prompt.tags && prompt.tags.length > 0 ? (
                    <div className="flex items-center gap-2">
                      {prompt.tags.map(tag => (
                        <span 
                          key={tag.id}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium"
                          style={{ 
                            backgroundColor: tag.color + '20',
                            color: tag.color 
                          }}
                        >
                          <Hash className="w-3 h-3" />
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-neutral-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-neutral-600">
                    {formatDistanceToNow(new Date(prompt.updated_at), { addSuffix: true })}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button 
                      className="p-1.5 text-neutral-400 hover:text-primary hover:bg-neutral-100 rounded-md transition-colors"
                      title="Copy"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button 
                      className="p-1.5 text-neutral-400 hover:text-primary hover:bg-neutral-100 rounded-md transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      className="p-1.5 text-neutral-400 hover:text-primary hover:bg-neutral-100 rounded-md transition-colors"
                      title="Share"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button 
                      className={`p-1.5 rounded-md transition-colors ${
                        prompt.is_favorite 
                          ? 'text-warning hover:bg-neutral-100' 
                          : 'text-neutral-400 hover:text-warning hover:bg-neutral-100'
                      }`}
                      title="Favorite"
                    >
                      <Star className={`w-4 h-4 ${prompt.is_favorite ? 'fill-current' : ''}`} />
                    </button>
                    <button 
                      className="p-1.5 text-neutral-400 hover:text-error hover:bg-neutral-100 rounded-md transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {filteredPrompts.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-neutral-500">No prompts found</p>
        </div>
      )}
    </div>
  );
}