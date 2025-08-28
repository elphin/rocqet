'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { CommandPalette } from './command-palette';

export function GlobalCommandPalette() {
  const pathname = usePathname();
  const router = useRouter();
  const [workspace, setWorkspace] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<any[]>([]);

  useEffect(() => {
    // Extract workspace from pathname
    const pathParts = pathname.split('/');
    const firstSegment = pathParts[1];
    
    // List of non-workspace routes to exclude
    const nonWorkspaceRoutes = [
      'auth', 
      'templates', 
      'api', 
      'admin', 
      'settings',
      'onboarding',
      'dashboard',
      'notifications',
      'invites',
      'account',
      'share'
    ];
    
    if (firstSegment && !nonWorkspaceRoutes.includes(firstSegment)) {
      setWorkspace(firstSegment);
      // Load prompts for this workspace
      loadPrompts(firstSegment);
    } else {
      setWorkspace(null);
      setPrompts([]);
    }
  }, [pathname]);

  const loadPrompts = async (workspaceSlug: string) => {
    try {
      // We'll need to get the workspace ID first
      const response = await fetch(`/api/workspace-prompts?slug=${workspaceSlug}`);
      if (response.ok) {
        const data = await response.json();
        setPrompts(data.prompts || []);
      } else if (response.status === 404) {
        // Workspace not found, clear prompts silently
        setPrompts([]);
      }
    } catch (error) {
      // Silently handle errors for non-workspace routes
      setPrompts([]);
    }
  };

  if (!workspace) return null;

  return <CommandPalette workspace={workspace} prompts={prompts} />;
}