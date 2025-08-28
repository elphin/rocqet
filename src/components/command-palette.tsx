'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  FileText, 
  Plus, 
  Settings, 
  User, 
  Home,
  FolderOpen,
  Command,
  ArrowRight
} from 'lucide-react';

interface CommandItem {
  id: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
  keywords?: string[];
  shortcut?: string;
}

interface CommandPaletteProps {
  workspace: string;
  prompts?: any[];
}

export function CommandPalette({ workspace, prompts = [] }: CommandPaletteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();

  // Define all available commands
  const staticCommands: CommandItem[] = [
    {
      id: 'new-prompt',
      title: 'Create New Prompt',
      description: 'Start building a new AI prompt',
      icon: <Plus className="h-4 w-4" />,
      action: () => router.push(`/${workspace}/prompts/new`),
      keywords: ['new', 'create', 'add'],
      shortcut: '⌘N'
    },
    {
      id: 'dashboard',
      title: 'Go to Dashboard',
      description: 'View your workspace dashboard',
      icon: <Home className="h-4 w-4" />,
      action: () => router.push(`/${workspace}/dashboard`),
      keywords: ['home', 'overview']
    },
    {
      id: 'all-prompts',
      title: 'View All Prompts',
      description: 'Browse your prompt library',
      icon: <FolderOpen className="h-4 w-4" />,
      action: () => router.push(`/${workspace}/prompts`),
      keywords: ['browse', 'list', 'all']
    },
    {
      id: 'settings',
      title: 'Workspace Settings',
      description: 'Manage workspace configuration',
      icon: <Settings className="h-4 w-4" />,
      action: () => router.push(`/${workspace}/settings`),
      keywords: ['config', 'preferences']
    },
    {
      id: 'profile',
      title: 'Profile Settings',
      description: 'Update your profile',
      icon: <User className="h-4 w-4" />,
      action: () => router.push(`/${workspace}/profile`),
      keywords: ['account', 'user']
    }
  ];

  // Create commands from prompts
  const promptCommands: CommandItem[] = prompts.map(prompt => ({
    id: `prompt-${prompt.id}`,
    title: prompt.name,
    description: prompt.description || 'Open this prompt',
    icon: <FileText className="h-4 w-4" />,
    action: () => router.push(`/${workspace}/prompts/${prompt.slug}`),
    keywords: [prompt.name.toLowerCase(), ...(prompt.description?.toLowerCase().split(' ') || [])]
  }));

  // Combine all commands
  const allCommands = [...staticCommands, ...promptCommands];

  // Filter commands based on search
  const filteredCommands = search
    ? allCommands.filter(cmd => {
        const searchLower = search.toLowerCase();
        return (
          cmd.title.toLowerCase().includes(searchLower) ||
          cmd.description?.toLowerCase().includes(searchLower) ||
          cmd.keywords?.some(k => k.includes(searchLower))
        );
      })
    : allCommands.slice(0, 5); // Show top 5 when no search

  // Keyboard event handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open with Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }

      // Close with Escape
      if (e.key === 'Escape') {
        setIsOpen(false);
      }

      // Navigate with arrow keys when open
      if (isOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(i => (i + 1) % filteredCommands.length);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(i => (i - 1 + filteredCommands.length) % filteredCommands.length);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
            setIsOpen(false);
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex]);

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Reset when closed
  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 animate-in fade-in duration-200"
        onClick={() => setIsOpen(false)}
      />

      {/* Command Palette */}
      <div className="fixed inset-x-0 top-20 z-50 mx-auto max-w-2xl animate-in slide-in-from-top duration-200">
        <div className="mx-4 overflow-hidden rounded-xl bg-white shadow-2xl border border-gray-200">
          {/* Search Input */}
          <div className="flex items-center border-b border-gray-200 px-4">
            <Search className="h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type a command or search..."
              className="flex-1 px-3 py-4 text-sm placeholder-gray-400 focus:outline-none"
              autoFocus
            />
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <kbd className="rounded bg-gray-100 px-2 py-1 font-mono">ESC</kbd>
              <span>to close</span>
            </div>
          </div>

          {/* Commands List */}
          <div className="max-h-96 overflow-y-auto py-2">
            {filteredCommands.length > 0 ? (
              filteredCommands.map((command, index) => (
                <button
                  key={command.id}
                  onClick={() => {
                    command.action();
                    setIsOpen(false);
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    index === selectedIndex
                      ? 'bg-blue-50 text-blue-900'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    index === selectedIndex ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    {command.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{command.title}</p>
                      {command.shortcut && (
                        <kbd className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono">
                          {command.shortcut}
                        </kbd>
                      )}
                    </div>
                    {command.description && (
                      <p className="text-xs text-gray-500 truncate">{command.description}</p>
                    )}
                  </div>
                  {index === selectedIndex && (
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              ))
            ) : (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-gray-500">No results found</p>
                <p className="mt-1 text-xs text-gray-400">Try searching for something else</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 px-4 py-2">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="rounded bg-gray-100 px-1.5 py-0.5 font-mono">↑↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded bg-gray-100 px-1.5 py-0.5 font-mono">↵</kbd>
                  Select
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Command className="h-3 w-3" />
                <span>Command Palette</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}