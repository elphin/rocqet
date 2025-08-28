'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Plus, MoreVertical, Edit2, Trash2 } from 'lucide-react';
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
}

interface FolderTreeProps {
  workspaceId: string;
  selectedFolderId?: string | null;
  onFolderSelect?: (folderId: string | null) => void;
  onCreateFolder?: (parentId?: string) => void;
  onEditFolder?: (folder: FolderNode) => void;
  onDeleteFolder?: (folderId: string) => void;
}

export function FolderTree({
  workspaceId,
  selectedFolderId,
  onFolderSelect,
  onCreateFolder,
  onEditFolder,
  onDeleteFolder
}: FolderTreeProps) {
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFolders();
  }, [workspaceId]);

  const loadFolders = async () => {
    try {
      const response = await fetch(`/api/folders?workspace_id=${workspaceId}`);
      if (response.ok) {
        const data = await response.json();
        const tree = buildFolderTree(data);
        setFolders(tree);
      }
    } catch (error) {
      console.error('Error loading folders:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildFolderTree = (flatFolders: FolderNode[]): FolderNode[] => {
    const folderMap = new Map<string, FolderNode>();
    const rootFolders: FolderNode[] = [];

    // First pass: create all folder nodes
    flatFolders.forEach(folder => {
      folderMap.set(folder.id, { ...folder, children: [] });
    });

    // Second pass: build tree structure
    flatFolders.forEach(folder => {
      const node = folderMap.get(folder.id)!;
      if (folder.parent_id && folderMap.has(folder.parent_id)) {
        const parent = folderMap.get(folder.parent_id)!;
        if (!parent.children) parent.children = [];
        parent.children.push(node);
      } else {
        rootFolders.push(node);
      }
    });

    return rootFolders;
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

  const renderFolder = (folder: FolderNode, level: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolderId === folder.id;
    const hasChildren = folder.children && folder.children.length > 0;

    return (
      <div key={folder.id}>
        <div
          className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 hover:bg-gray-100 ${
            isSelected ? 'bg-blue-50 text-blue-700' : ''
          }`}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
        >
          <button
            onClick={() => toggleExpanded(folder.id)}
            className="p-0.5 hover:bg-gray-200 rounded"
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
              <span className="text-xs text-gray-500">({folder.prompt_count})</span>
            )}
          </button>

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
        </div>
        
        {isExpanded && hasChildren && (
          <div>
            {folder.children!.map(child => renderFolder(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-4 text-sm text-gray-500">Loading folders...</div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="mb-2 flex items-center justify-between px-2">
        <h3 className="text-xs font-semibold uppercase text-gray-500">Folders</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => onCreateFolder?.()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      
      <button
        onClick={() => onFolderSelect?.(null)}
        className={`w-full flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100 text-left ${
          selectedFolderId === null ? 'bg-blue-50 text-blue-700' : ''
        }`}
      >
        <Folder className="h-4 w-4" />
        <span className="text-sm font-medium">All Prompts</span>
      </button>

      {folders.map(folder => renderFolder(folder))}
    </div>
  );
}