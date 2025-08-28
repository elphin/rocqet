import { createClient } from '@/lib/supabase/server';

export async function validateWorkspaceAccess(workspaceSlug: string, userId: string) {
  const supabase = await createClient();
  
  // Check if user has access to this workspace
  const { data: memberships, error } = await supabase
    .from('workspace_members')
    .select(`
      workspace_id,
      role,
      workspaces!inner (
        id,
        slug,
        name,
        subscription_tier
      )
    `)
    .eq('user_id', userId)
    .eq('workspaces.slug', workspaceSlug)
    .limit(1);
  
  if (error) {
    console.error('Error validating workspace access:', error);
    return null;
  }

  return memberships && memberships.length > 0 ? memberships[0] : null;
}

export async function getUserWorkspaces(userId: string) {
  const supabase = await createClient();
  
  const { data: memberships } = await supabase
    .from('workspace_members')
    .select(`
      role,
      joined_at,
      workspaces (
        id,
        slug,
        name,
        logo_url
      )
    `)
    .eq('user_id', userId)
    .order('joined_at', { ascending: false });

  return memberships?.map(m => ({
    ...m.workspaces,
    role: m.role,
    joinedAt: m.joined_at
  })) || [];
}