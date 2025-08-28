/**
 * Workspace Type Definitions
 * Centralized types for workspace-related data structures
 */

export interface Workspace {
  id: string;
  slug: string;
  name: string;
  subscription_tier: 'starter' | 'pro' | 'team' | 'enterprise';
  logo_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface WorkspaceMembership {
  workspace_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  workspaces: Workspace;
  joined_at?: string;
}

export interface WorkspaceWithRole extends Workspace {
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joinedAt?: string;
}

// Type guard functions
export function isWorkspace(obj: any): obj is Workspace {
  return obj && 
    typeof obj.id === 'string' && 
    typeof obj.slug === 'string' &&
    typeof obj.name === 'string';
}

export function isWorkspaceMembership(obj: any): obj is WorkspaceMembership {
  return obj && 
    typeof obj.workspace_id === 'string' &&
    obj.workspaces &&
    isWorkspace(obj.workspaces);
}