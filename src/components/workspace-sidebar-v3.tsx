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
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Folder,
  Hash,
  Star,
  Settings2,
  FileCode,
  Activity,
  Users,
  Shield,
  Crown,
  User,
  Library
} from 'lucide-react';
import { WorkspaceSwitcher } from './workspace-switcher';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

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

export function WorkspaceSidebarV3({ workspace, membership, user }: WorkspaceSidebarProps) {
  const pathname = usePathname();
  const workspaceSlug = workspace.slug;
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [foldersExpanded, setFoldersExpanded] = useState(false);

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

  const FolderTreeItem = ({ folder, level = 0 }: { folder: FolderItem; level?: number }) => {
    const isExpanded = expandedFolders.has(folder.id);
    const hasChildren = folder.children && folder.children.length > 0;
    const folderHref = `/${workspaceSlug}/prompts?folder=${folder.id}`;
    const isActiveFolder = pathname.includes(`folder=${folder.id}`);

    return (
      <div className="select-none">
        <div
          className={cn(
            "group flex items-center gap-1 px-3 py-1.5 rounded-md cursor-pointer transition-all duration-150",
            isActiveFolder 
              ? "bg-neutral-900/10 dark:bg-neutral-100/10" 
              : "hover:bg-neutral-200 dark:hover:bg-neutral-800"
          )}
          style={{ paddingLeft: `${12 + level * 16}px` }}
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
              "text-sm truncate capitalize transition-transform duration-150 group-hover:translate-x-1",
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
        <AnimatePresence initial={false}>
          {hasChildren && isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="mt-0.5">
                {folder.children!.map((child) => (
                  <FolderTreeItem key={child.id} folder={child} level={level + 1} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
            
            {/* Role Badge */}
            {!workspace.is_personal && membership?.role && (
              <div className="mt-2 px-3">
                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800">
                  {membership.role === 'owner' && (
                    <>
                      <Crown className="h-3 w-3 text-yellow-600 dark:text-yellow-500" />
                      <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Owner</span>
                    </>
                  )}
                  {membership.role === 'admin' && (
                    <>
                      <Shield className="h-3 w-3 text-blue-600 dark:text-blue-500" />
                      <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Admin</span>
                    </>
                  )}
                  {membership.role === 'editor' && (
                    <>
                      <User className="h-3 w-3 text-green-600 dark:text-green-500" />
                      <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Editor</span>
                    </>
                  )}
                  {membership.role === 'viewer' && (
                    <>
                      <User className="h-3 w-3 text-neutral-600 dark:text-neutral-400" />
                      <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Viewer</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Main Content - Scrollable */}
          <div className="flex-1 overflow-y-auto">
            <nav className="p-3 space-y-1">
              
              {/* Dashboard */}
              <Link
                href={`/${workspaceSlug}/dashboard`}
                className={cn(
                  "group relative flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-md transition-all duration-150",
                  isActive(`/${workspaceSlug}/dashboard`)
                    ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
                    : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800"
                )}
              >
                <LayoutDashboard className="h-4 w-4 flex-shrink-0" />
                <span className="transition-transform duration-150 group-hover:translate-x-1">Dashboard</span>
              </Link>

              {/* Folders Section - Collapsible */}
              <div className="mt-4">
                <button
                  onClick={() => setFoldersExpanded(!foldersExpanded)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                >
                  {foldersExpanded ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                  <span>Folders</span>
                </button>
                
                <AnimatePresence initial={false}>
                  {foldersExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 space-y-0.5">
                        {folders.length > 0 ? (
                          folders.map((folder) => (
                            <FolderTreeItem key={folder.id} folder={folder} />
                          ))
                        ) : (
                          <div className="px-3 py-2 text-xs text-neutral-500 dark:text-neutral-500">
                            No folders yet
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* All Prompts */}
              <Link
                href={`/${workspaceSlug}/prompts`}
                className={cn(
                  "group flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-md transition-all duration-150",
                  isActive(`/${workspaceSlug}/prompts`)
                    ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
                    : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800"
                )}
              >
                <FileText className="h-4 w-4 flex-shrink-0" />
                <span className="transition-transform duration-150 group-hover:translate-x-1">All Prompts</span>
              </Link>

              {/* Chains */}
              <Link
                href={`/${workspaceSlug}/chains`}
                className={cn(
                  "group flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-md transition-all duration-150",
                  isActive(`/${workspaceSlug}/chains`)
                    ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
                    : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800"
                )}
              >
                <Link2 className="h-4 w-4 flex-shrink-0" />
                <span className="transition-transform duration-150 group-hover:translate-x-1">Chains</span>
              </Link>

              {/* Templates */}
              <Link
                href="/templates"
                className={cn(
                  "group flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-md transition-all duration-150",
                  pathname.startsWith('/templates')
                    ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
                    : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800"
                )}
              >
                <Library className="h-4 w-4 flex-shrink-0" />
                <span className="transition-transform duration-150 group-hover:translate-x-1">Templates</span>
              </Link>

              {/* Tags */}
              <Link
                href={`/${workspaceSlug}/tags`}
                className={cn(
                  "group flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-md transition-all duration-150",
                  isActive(`/${workspaceSlug}/tags`)
                    ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
                    : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800"
                )}
              >
                <Hash className="h-4 w-4 flex-shrink-0" />
                <span className="transition-transform duration-150 group-hover:translate-x-1">Tags</span>
              </Link>

              {/* Favorites */}
              <Link
                href={`/${workspaceSlug}/favorites`}
                className={cn(
                  "group flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-md transition-all duration-150",
                  isActive(`/${workspaceSlug}/favorites`)
                    ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
                    : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800"
                )}
              >
                <Star className="h-4 w-4 flex-shrink-0" />
                <span className="transition-transform duration-150 group-hover:translate-x-1">Favorites</span>
              </Link>

              {/* Manage Folders */}
              <Link
                href={`/${workspaceSlug}/folders`}
                className={cn(
                  "group flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-md transition-all duration-150",
                  isActive(`/${workspaceSlug}/folders`)
                    ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
                    : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800"
                )}
              >
                <Settings2 className="h-4 w-4 flex-shrink-0" />
                <span className="transition-transform duration-150 group-hover:translate-x-1">Manage Folders</span>
              </Link>

              {/* Templates */}
              <Link
                href={`/${workspaceSlug}/templates`}
                className={cn(
                  "group flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-md transition-all duration-150",
                  isActive(`/${workspaceSlug}/templates`)
                    ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
                    : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800"
                )}
              >
                <FileCode className="h-4 w-4 flex-shrink-0" />
                <span className="transition-transform duration-150 group-hover:translate-x-1">Templates</span>
              </Link>

              {/* AI Usage */}
              <Link
                href={`/${workspaceSlug}/usage`}
                className={cn(
                  "group flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-md transition-all duration-150",
                  isActive(`/${workspaceSlug}/usage`)
                    ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
                    : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800"
                )}
              >
                <Activity className="h-4 w-4 flex-shrink-0" />
                <span className="transition-transform duration-150 group-hover:translate-x-1">AI Usage</span>
              </Link>

              {/* Teams */}
              <Link
                href={`/${workspaceSlug}/settings/team`}
                className={cn(
                  "group flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-md transition-all duration-150",
                  isActive(`/${workspaceSlug}/settings/team`)
                    ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
                    : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800"
                )}
              >
                <Users className="h-4 w-4 flex-shrink-0" />
                <span className="transition-transform duration-150 group-hover:translate-x-1">Teams</span>
              </Link>

              {/* Trash */}
              <Link
                href={`/${workspaceSlug}/trash`}
                className={cn(
                  "group flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-md transition-all duration-150",
                  isActive(`/${workspaceSlug}/trash`)
                    ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
                    : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800"
                )}
              >
                <Trash2 className="h-4 w-4 flex-shrink-0" />
                <span className="transition-transform duration-150 group-hover:translate-x-1">Trash</span>
              </Link>
            </nav>
          </div>

          {/* Settings - Fixed at bottom */}
          <div className="border-t border-neutral-200/50 dark:border-neutral-800 p-3">
            <Link
              href={`/${workspaceSlug}/settings`}
              className={cn(
                "group flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-md transition-all duration-150",
                pathname.includes('/settings')
                  ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
                  : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800"
              )}
            >
              <Settings className="h-4 w-4 flex-shrink-0" />
              <span className="transition-transform duration-150 group-hover:translate-x-1">Settings</span>
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}