import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { validateWorkspaceAccess } from '@/lib/workspace/validate';
import { TrashPageClient } from './trash-page-client';

export default async function TrashPage({
  params
}: {
  params: Promise<{ workspace: string }>
}) {
  const { workspace: workspaceSlug } = await params;
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/auth/signin');
    return null;
  }

  // Validate workspace access
  const membership = await validateWorkspaceAccess(workspaceSlug, user.id);
  
  if (!membership) {
    redirect('/');
    return null;
  }

  const workspace = membership.workspaces;

  // Get deleted prompts (within 30 days)
  const { data: deletedPrompts, error } = await supabase
    .from('prompts')
    .select('*')
    .eq('workspace_id', workspace.id)
    .not('deleted_at', 'is', null)
    .gte('deleted_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .order('deleted_at', { ascending: false });

  if (error) {
    console.error('Error fetching deleted prompts:', error);
  }

  // Get folders for restoration
  const { data: folders } = await supabase
    .from('folders')
    .select('*')
    .eq('workspace_id', workspace.id)
    .order('name', { ascending: true });

  return (
    <TrashPageClient 
      deletedPrompts={deletedPrompts || []} 
      folders={folders || []}
      workspaceSlug={workspaceSlug}
      workspaceId={workspace.id}
    />
  );
}