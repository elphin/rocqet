'use client';

import { useState, useEffect } from 'react';
import { Reorder, motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Plus, MoreVertical, Edit2, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface FolderNode {
  id: string;
  name: string;
  parent_id: string | null;
  workspace_id: string;
  prompt_count?: number;
  children?: FolderNode[];
  order?: number;
}

interface FolderTreeDraggableProps {
  workspaceId: string;
  selectedFolderId?: string | null;
  onFolderSelect?: (folderId: string | null) => void;
  onCreateFolder?: (parentId?: string) => void;
  onEditFolder?: (folder: FolderNode) => void;
  onDeleteFolder?: (folderId: string) => void;
  onReorderFolders?: (folders: FolderNode[]) => void;
}

export function FolderTreeDraggable({
  workspaceId,
  selectedFolderId,
  onFolderSelect,
  onCreateFolder,
  onEditFolder,
  onDeleteFolder,
  onReorderFolders,
  mockData // Allow passing mock data for testing
}: FolderTreeDraggableProps & { mockData?: FolderNode[] }) {
  const [folders, setFolders] = useState<FolderNode[]>(mockData || []);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(!mockData);

  useEffect(() => {
    if (!mockData) {
      loadFolders();
    }
  }, [workspaceId, mockData]);

  const loadFolders = async () => {
    try {
      const response = await fetch(`/api/folders?workspace_id=${workspaceId}`);
      if (response.ok) {
        const data = await response.json();
        // Sort by order if available, otherwise by name
        const sortedData = data.sort((a: FolderNode, b: FolderNode) => {
          if (a.order !== undefined && b.order !== undefined) {
            return a.order - b.order;
          }
          return a.name.localeCompare(b.name);
        });
        setFolders(sortedData);
      }
    } catch (error) {
      console.error('Error loading folders:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleReorder = (newOrder: FolderNode[]) => {
    setFolders(newOrder);
    // Update order in database
    onReorderFolders?.(newOrder);
  };

  const FolderItem = ({ folder }: { folder: FolderNode }) => {
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolderId === folder.id;
    const hasChildren = folder.children && folder.children.length > 0;

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
          isSelected ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : ''
        }`}
      >
        {/* Drag Handle */}
        <div className="cursor-move opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="h-4 w-4 text-neutral-400" />
        </div>

        {/* Expand/Collapse Button */}
        <button
          onClick={() => toggleExpanded(folder.id)}
          className="p-0.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded"
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )
          ) : (
            <div className="w-3" />
          )}
        </button>
        
        {/* Folder Button */}
        <button
          onClick={() => onFolderSelect?.(folder.id)}
          className="flex items-center gap-2 flex-1 text-left"
        >
          {isExpanded ? (
            <FolderOpen className="h-4 w-4" />
          ) : (
            <Folder className="h-4 w-4" />
          )}
          <span className="text-sm font-medium">{folder.name}</span>
          {folder.prompt_count !== undefined && folder.prompt_count > 0 && (
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              ({folder.prompt_count})
            </span>
          )}
        </button>

        {/* Actions Menu */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onCreateFolder?.(folder.id)}>
                <Plus className="mr-2 h-4 w-4" />
                New Subfolder
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEditFolder?.(folder)}>
                <Edit2 className="mr-2 h-4 w-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDeleteFolder?.(folder.id)}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="p-4 text-sm text-neutral-500 dark:text-neutral-400">
        Loading folders...
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="mb-2 flex items-center justify-between px-2">
        <h3 className="text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">
          Folders
        </h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => onCreateFolder?.()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      
      {/* All Prompts (not draggable) */}
      <button
        onClick={() => onFolderSelect?.(null)}
        className={`w-full flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left ${
          selectedFolderId === null ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : ''
        }`}
      >
        <div className="w-4" /> {/* Spacer for alignment */}
        <div className="w-3" /> {/* Spacer for alignment */}
        <Folder className="h-4 w-4" />
        <span className="text-sm font-medium">All Prompts</span>
      </button>

      {/* Draggable Folders */}
      <Reorder.Group 
        axis="y" 
        values={folders} 
        onReorder={handleReorder}
        className="space-y-1"
      >
        <AnimatePresence>
          {folders.map((folder) => (
            <Reorder.Item 
              key={folder.id} 
              value={folder}
              dragTransition={{
                bounceStiffness: 200,
                bounceDamping: 25
              }}
              whileDrag={{ 
                scale: 1.02,
                boxShadow: "0 10px 20px rgba(0,0,0,0.1)",
                zIndex: 100
              }}
            >
              <FolderItem folder={folder} />
            </Reorder.Item>
          ))}
        </AnimatePresence>
      </Reorder.Group>
    </div>
  );
}