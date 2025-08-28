'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  ChevronDown,
  Plus,
  Search,
  Moon,
  Sun,
  Settings,
  LogOut,
  User,
  HelpCircle,
  Command,
  X
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { NotificationBell } from '@/components/notifications/notification-bell';

export function AppHeader() {
  const [user, setUser] = useState<any>(null);
  const [currentWorkspace, setCurrentWorkspace] = useState<any>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    // Get user and workspaces
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        
        // Get user's workspaces
        const { data: memberships } = await supabase
          .from('workspace_members')
          .select(`
            workspace_id,
            role,
            workspaces (
              id,
              name,
              slug,
              logo_url
            )
          `)
          .eq('user_id', user.id);
        
        if (memberships) {
          const workspaceList = memberships.map(m => m.workspaces);
          
          // Get current workspace from URL
          const pathSegments = pathname.split('/');
          const workspaceSlug = pathSegments[1];
          const current = workspaceList.find(w => w.slug === workspaceSlug);
          setCurrentWorkspace(current);
        }
      }
    };
    
    fetchData();
  }, [pathname]);

  useEffect(() => {
    // Load theme preference
    const theme = localStorage.getItem('theme') || 'light';
    const isDark = theme === 'dark';
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    console.log('Toggling dark mode:', { current: darkMode, new: newMode });
    setDarkMode(newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
    
    // Force immediate update
    const root = document.documentElement;
    if (newMode) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };


  return (
    <header className="h-14 border-b bg-white dark:bg-neutral-900 dark:border-neutral-800 fixed top-0 left-0 right-0 z-40">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        {/* Left: Logo */}
        <div className="flex items-center gap-4">
          <Link href={currentWorkspace ? `/${currentWorkspace.slug}/dashboard` : '/'} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">R</span>
            </div>
            <span className="font-semibold text-neutral-900 dark:text-white hidden sm:block">ROCQET</span>
          </Link>
        </div>

        {/* Center: Search (hidden on mobile) */}
        <div className="hidden md:flex flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search prompts... (⌘K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 ${searchQuery ? 'pr-10' : 'pr-3'} py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-0.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-full transition-colors"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300" />
              </button>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Quick Create */}
          {currentWorkspace && (
            <Link href={`/${currentWorkspace.slug}/prompts/new`}>
              <Button variant="primaryCta" size="sm">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                <span className="hidden sm:inline">New Prompt</span>
              </Button>
            </Link>
          )}

          {/* Notifications */}
          <NotificationBell />

          {/* Help */}
          <Button size="icon" variant="ghost">
            <HelpCircle className="h-4 w-4" />
          </Button>

          {/* Dark Mode Toggle */}
          <Button size="icon" variant="ghost" onClick={toggleDarkMode}>
            {darkMode ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <div className="w-8 h-8 bg-primary-pale rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-neutral-500 hidden sm:block" />
            </button>

            {showProfileDropdown && (
              <div className="absolute top-full right-0 mt-1 w-56 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 py-1">
                <div className="px-3 py-2 border-b border-neutral-200 dark:border-neutral-700">
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">
                    {user?.email}
                  </p>
                </div>
                <Link
                  href="/settings/profile"
                  className="w-full px-3 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-700 flex items-center gap-2 text-sm"
                >
                  <User className="h-4 w-4" />
                  Profile Settings
                </Link>
                <Link
                  href="/settings/account"
                  className="w-full px-3 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-700 flex items-center gap-2 text-sm"
                >
                  <Settings className="h-4 w-4" />
                  Account Settings
                </Link>
                <button
                  onClick={() => {/* Show command palette */}}
                  className="w-full px-3 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-700 flex items-center gap-2 text-sm"
                >
                  <Command className="h-4 w-4" />
                  Command Palette
                  <span className="ml-auto text-xs text-neutral-500">⌘K</span>
                </button>
                <div className="border-t border-neutral-200 dark:border-neutral-700 mt-1 pt-1">
                  <button
                    onClick={handleSignOut}
                    className="w-full px-3 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-700 flex items-center gap-2 text-sm text-error"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}