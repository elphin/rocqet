import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { validateWorkspaceAccess } from '@/lib/workspace/validate';
import ChainBuilderSmooth from '@/components/chain-builder-smooth';

export default async function TestSmoothChainPage({
  params
}: {
  params: Promise<{ workspace: string }>
}) {
  const { workspace: workspaceSlug } = await params;
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/auth/signin');
  }

  // Validate workspace access
  const membership = await validateWorkspaceAccess(workspaceSlug, user.id);
  
  if (!membership) {
    redirect('/');
  }

  const workspace = membership.workspaces;

  // Get all prompts for this workspace (for selection in chain builder)
  const { data: prompts } = await supabase
    .from('prompts')
    .select('id, name, description, variables, content')
    .eq('workspace_id', workspace.id)
    .order('name');

  return (
    <ChainBuilderSmooth
      workspaceId={workspace.id}
      workspaceSlug={workspaceSlug}
      availablePrompts={prompts || []}
      mode="create"
    />
  );
}