'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  FileText, 
  Settings, 
  Link2,
  Trash2,
  Database,
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Folder,
  Search,
  Sparkles,
  Command,
  Settings2
} from 'lucide-react';
import { WorkspaceSwitcher } from './workspace-switcher';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FolderItem {
  id: string;
  name: string;
  prompt_count?: number;
  parent_id?: string | null;
  children?: FolderItem[];
}

interface WorkspaceSidebarProps {
  workspace: any;
  membership: any;
  user: any;
}

export function WorkspaceSidebarV2({ workspace, membership, user }: WorkspaceSidebarProps) {
  const pathname = usePathname();
  const workspaceSlug = workspace.slug;
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [foldersExpanded, setFoldersExpanded] = useState(true);
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadFolders();
    
    // Set up an interval to refresh folders periodically
    const interval = setInterval(() => {
      loadFolders();
    }, 5000); // Refresh every 5 seconds
    
    // Listen for custom events from folder management
    const handleFoldersUpdate = () => {
      loadFolders();
    };
    
    window.addEventListener('folders-updated', handleFoldersUpdate);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('folders-updated', handleFoldersUpdate);
    };
  }, [workspace.id]);

  const loadFolders = async () => {
    try {
      const response = await fetch(`/api/folders?workspace_id=${workspace.id}`);
      if (response.ok) {
        const data = await response.json();
        // Sort by sort_order if available, otherwise by name
        const sortedData = data.sort((a: FolderItem, b: FolderItem) => {
          // Check if sort_order exists on both items
          if ('sort_order' in a && 'sort_order' in b) {
            return (a as any).sort_order - (b as any).sort_order;
          }
          // Fallback to name sorting
          return a.name.localeCompare(b.name);
        });
        setFolders(sortedData);
      }
    } catch (error) {
      console.error('Error loading folders:', error);
    }
  };

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  // Primary navigation items - core features
  const primaryNavigation = [
    { 
      name: 'Dashboard', 
      href: `/${workspaceSlug}/dashboard`, 
      icon: LayoutDashboard,
      description: 'Overview & analytics'
    },
    { 
      name: 'Prompts', 
      href: `/${workspaceSlug}/prompts`, 
      icon: FileText,
      description: 'Manage prompts'
    },
    { 
      name: 'Chains', 
      href: `/${workspaceSlug}/chains`, 
      icon: Link2,
      description: 'Workflow automation'
    },
  ];

  const FolderTreeItem = ({ folder, level = 0 }: { folder: FolderItem; level?: number }) => {
    const isExpanded = expandedFolders.has(folder.id);
    const hasChildren = folder.children && folder.children.length > 0;
    const folderHref = `/${workspaceSlug}/prompts?folder=${folder.id}`;
    const isActiveFolder = pathname.includes(`folder=${folder.id}`);

    return (
      <div className="select-none">
        <div
          className={cn(
            "group flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer transition-all duration-200",
            isActiveFolder 
              ? "bg-neutral-900/10 dark:bg-neutral-100/10" 
              : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
          )}
          style={{ paddingLeft: `${8 + level * 16}px` }}
        >
          {/* Expand/Collapse Button */}
          <button
            onClick={() => toggleFolder(folder.id)}
            className={cn(
              "p-0.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700",
              !hasChildren && "invisible"
            )}
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3 text-neutral-500" />
            ) : (
              <ChevronRight className="w-3 h-3 text-neutral-500" />
            )}
          </button>

          {/* Folder Link */}
          <Link
            href={folderHref}
            className="flex items-center gap-2 flex-1 min-w-0"
          >
            {isExpanded ? (
              <FolderOpen className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400 flex-shrink-0" />
            ) : (
              <Folder className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400 flex-shrink-0" />
            )}
            <span className={cn(
              "text-sm truncate capitalize",
              isActiveFolder 
                ? "font-medium text-neutral-900 dark:text-neutral-100" 
                : "text-neutral-700 dark:text-neutral-300"
            )}>
              {folder.name}
            </span>
            {folder.prompt_count !== undefined && folder.prompt_count > 0 && (
              <span className="text-[10px] text-neutral-500 dark:text-neutral-500 ml-auto">
                {folder.prompt_count}
              </span>
            )}
          </Link>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="mt-0.5">
            {folder.children!.map((child) => (
              <FolderTreeItem key={child.id} folder={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-72 md:flex-col h-screen sticky top-0">
        <div className="flex flex-col flex-grow border-r border-neutral-200/50 dark:border-neutral-800 bg-white dark:bg-neutral-950">
          
          {/* Workspace Switcher */}
          <div className="p-3 border-b border-neutral-200/50 dark:border-neutral-800">
            <WorkspaceSwitcher currentWorkspace={workspace} />
          </div>

          {/* Quick Search */}
          <div className="p-3 border-b border-neutral-200/50 dark:border-neutral-800">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-neutral-400 w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full pl-8 pr-8 py-1.5 text-sm bg-neutral-100 dark:bg-neutral-900 border-0 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-neutral-400">
                <Command className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Main Navigation */}
          <nav className="px-3 py-4 space-y-1">
            <div className="mb-2">
              <h3 className="px-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">
                Workspace
              </h3>
            </div>
            {primaryNavigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-all duration-200",
                  isActive(item.href)
                    ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
                    : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900"
                )}
              >
                <item.icon className={cn(
                  "mr-2.5 h-4 w-4 transition-colors",
                  isActive(item.href) 
                    ? "text-white dark:text-neutral-900" 
                    : "text-neutral-500 dark:text-neutral-400"
                )} />
                <span className="flex-1">{item.name}</span>
                {item.name === 'Prompts' && (
                  <Sparkles className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
                )}
              </Link>
            ))}
          </nav>

          {/* Organization Section - Scrollable */}
          <div className="flex-1 overflow-y-auto px-3 pb-4">
            {/* Folders Section */}
            <div className="mb-4">
              <div className="flex items-center justify-between px-2 mb-2">
                <button
                  onClick={() => setFoldersExpanded(!foldersExpanded)}
                  className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                >
                  {foldersExpanded ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                  Folders
                </button>
                <Link 
                  href={`/${workspaceSlug}/folders`}
                  className="p-0.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded block"
                >
                  <Settings2 className="w-3 h-3 text-neutral-500" />
                </Link>
              </div>
              
              {foldersExpanded && (
                <div className="space-y-0.5">
                  {folders.length > 0 ? (
                    folders.map((folder) => (
                      <FolderTreeItem key={folder.id} folder={folder} />
                    ))
                  ) : (
                    <div className="px-2 py-2 text-xs text-neutral-500 dark:text-neutral-500">
                      No folders yet
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* Bottom Section */}
          <div className="border-t border-neutral-200/50 dark:border-neutral-800 p-3 space-y-1">
            <div>
              <button
                onClick={() => setSettingsExpanded(!settingsExpanded)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2 py-2 text-sm font-medium rounded-md transition-all",
                  pathname.includes('/settings') || pathname.includes('/queries')
                    ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
                    : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900"
                )}
              >
                {settingsExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                <Settings className="h-4 w-4" />
                <span className="flex-1 text-left">Settings</span>
              </button>
              
              {settingsExpanded && (
                <div className="mt-1 ml-6 space-y-1">
                  <Link
                    href={`/${workspaceSlug}/settings`}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-all",
                      isActive(`/${workspaceSlug}/settings`)
                        ? "bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                        : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900"
                    )}
                  >
                    <span>General</span>
                  </Link>
                  
                  <Link
                    href={`/${workspaceSlug}/queries`}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-all",
                      isActive(`/${workspaceSlug}/queries`)
                        ? "bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                        : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900"
                    )}
                  >
                    <Database className="h-3.5 w-3.5" />
                    <span>Data Connections</span>
                  </Link>
                </div>
              )}
            </div>
            
            <Link
              href={`/${workspaceSlug}/trash`}
              className={cn(
                "flex items-center gap-2.5 px-2 py-2 text-sm font-medium rounded-md transition-all",
                isActive(`/${workspaceSlug}/trash`)
                  ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
                  : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900"
              )}
            >
              <Trash2 className="h-4 w-4" />
              <span>Trash</span>
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}