import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { NewPromptClient } from './client';
import { canCreatePrompt } from '@/lib/tier-limits';

export default async function NewPromptDirectPage({
  params
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: workspaceSlug } = await params;
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/auth/signin');
    return null;
  }

  // Get workspace details and membership
  const { data: membership } = await supabase
    .from('workspace_members')
    .select(`
      workspace_id,
      role,
      workspaces!inner (
        id,
        name,
        slug,
        subscription_tier
      )
    `)
    .eq('user_id', user.id)
    .eq('workspaces.slug', workspaceSlug)
    .single();

  if (!membership) {
    redirect('/dashboard');
    return null;
  }

  // Check if user can create more prompts
  const workspace = membership.workspaces;
  const tierCheck = await canCreatePrompt(
    workspace.id,
    workspace.subscription_tier as any,
    supabase
  );

  if (!tierCheck.allowed) {
    // Redirect to prompts page with error message
    redirect(`/${workspaceSlug}/prompts?error=limit_reached&message=${encodeURIComponent(tierCheck.reason || '')}`);
  }

  // Load folders and tags for the workspace
  const [foldersResponse, tagsResponse] = await Promise.all([
    supabase
      .from('folders')
      .select('id, name')
      .eq('workspace_id', membership.workspace_id)
      .order('name'),
    supabase
      .from('tags')
      .select('id, name, color')
      .eq('workspace_id', membership.workspace_id)
      .order('name')
  ]);

  return (
    <NewPromptClient
      workspace={membership.workspaces}
      workspaceSlug={workspaceSlug}
      userRole={membership.role}
      folders={foldersResponse.data || []}
      tags={tagsResponse.data || []}
    />
  );
}