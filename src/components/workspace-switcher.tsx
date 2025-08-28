'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ChevronDown, Plus, Building2, Check, Settings, User, Users, Building } from 'lucide-react';
import Link from 'next/link';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  role?: string;
  workspace_type?: 'personal' | 'team' | 'organization';
  is_personal?: boolean;
  member_count?: number;
}

export function WorkspaceSwitcher({ currentWorkspace }: { currentWorkspace: Workspace }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: memberships } = await supabase
      .from('workspace_members')
      .select(`
        role,
        workspaces (
          id,
          name,
          slug,
          logo_url,
          workspace_type,
          is_personal
        )
      `)
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false });

    if (memberships) {
      // Get member counts for each workspace
      const workspaceIds = memberships.map(m => m.workspaces.id);
      const { data: memberCounts } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .in('workspace_id', workspaceIds);
      
      const countMap = memberCounts?.reduce((acc, item) => {
        acc[item.workspace_id] = (acc[item.workspace_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const workspaceList = memberships.map(m => ({
        ...m.workspaces,
        role: m.role,
        member_count: countMap[m.workspaces.id] || 1
      })) as Workspace[];
      
      // Sort: personal workspaces first, then teams
      workspaceList.sort((a, b) => {
        if (a.is_personal && !b.is_personal) return -1;
        if (!a.is_personal && b.is_personal) return 1;
        return 0;
      });
      
      setWorkspaces(workspaceList);
    }
    setLoading(false);
  };

  const switchWorkspace = (workspace: Workspace) => {
    // Replace the workspace slug in the current path
    const pathParts = pathname.split('/');
    pathParts[1] = workspace.slug;
    const newPath = pathParts.join('/');
    router.push(newPath);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors flex-1"
        >
          <div className="h-8 w-8 rounded-md bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            {currentWorkspace.logo_url ? (
              <img src={currentWorkspace.logo_url} alt={currentWorkspace.name} className="h-6 w-6" />
            ) : currentWorkspace.is_personal ? (
              <User className="h-4 w-4 text-white" />
            ) : currentWorkspace.workspace_type === 'organization' ? (
              <Building className="h-4 w-4 text-white" />
            ) : (
              <Users className="h-4 w-4 text-white" />
            )}
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{currentWorkspace.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">/{currentWorkspace.slug}</p>
          </div>
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        
        <Link
          href={`/${currentWorkspace.slug}/settings/workspace`}
          className="p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
          title="Workspace Settings"
        >
          <Settings className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        </Link>
      </div>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-lg bg-white shadow-lg border border-gray-200 py-1">
            {loading ? (
              <div className="px-3 py-2 text-sm text-gray-500">Loading...</div>
            ) : (
              <>
                {/* Personal Workspaces */}
                {workspaces.some(w => w.is_personal) && (
                  <>
                    <div className="px-3 py-1">
                      <p className="text-xs font-medium text-gray-500 uppercase">Personal</p>
                    </div>
                    {workspaces.filter(w => w.is_personal).map((workspace) => (
                      <button
                        key={workspace.id}
                        onClick={() => switchWorkspace(workspace)}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors w-full"
                      >
                        <div className="h-8 w-8 rounded-md bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                          {workspace.logo_url ? (
                            <img src={workspace.logo_url} alt={workspace.name} className="h-6 w-6" />
                          ) : (
                            <User className="h-4 w-4 text-white" />
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium text-gray-900">{workspace.name}</p>
                          <p className="text-xs text-gray-500">Free • Personal</p>
                        </div>
                        {workspace.id === currentWorkspace.id && (
                          <Check className="h-4 w-4 text-blue-600" />
                        )}
                      </button>
                    ))}
                  </>
                )}
                
                {/* Team Workspaces */}
                {workspaces.some(w => !w.is_personal) && (
                  <>
                    <div className="px-3 py-1">
                      <p className="text-xs font-medium text-gray-500 uppercase">Teams</p>
                    </div>
                    {workspaces.filter(w => !w.is_personal).map((workspace) => (
                      <button
                        key={workspace.id}
                        onClick={() => switchWorkspace(workspace)}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors w-full"
                      >
                        <div className="h-8 w-8 rounded-md bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                          {workspace.logo_url ? (
                            <img src={workspace.logo_url} alt={workspace.name} className="h-6 w-6" />
                          ) : workspace.workspace_type === 'organization' ? (
                            <Building className="h-4 w-4 text-white" />
                          ) : (
                            <Users className="h-4 w-4 text-white" />
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium text-gray-900">{workspace.name}</p>
                          <p className="text-xs text-gray-500">
                            {workspace.role} • {workspace.member_count} member{workspace.member_count !== 1 ? 's' : ''}
                          </p>
                        </div>
                        {workspace.id === currentWorkspace.id && (
                          <Check className="h-4 w-4 text-blue-600" />
                        )}
                      </button>
                    ))}
                  </>
                )}
                <div className="border-t border-gray-100 mt-1 pt-1">
                  <Link
                    href="/workspace/new"
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors w-full"
                    onClick={() => setIsOpen(false)}
                  >
                    <div className="h-8 w-8 rounded-md border-2 border-dashed border-gray-300 flex items-center justify-center">
                      <Plus className="h-4 w-4 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-600">Create workspace</p>
                  </Link>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}