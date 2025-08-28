import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { validateWorkspaceAccess } from '@/lib/workspace/validate';
import { ChainRunner } from '@/components/chain-runner';

export default async function ChainDetailPage({
  params
}: {
  params: Promise<{ workspace: string; id: string }>
}) {
  const { workspace: workspaceSlug, id: slugOrId } = await params;
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

  // Get chain details (try by slug first, then by id for backwards compatibility)
  let { data: chain, error } = await supabase
    .from('chains')
    .select('*')
    .eq('slug', slugOrId)
    .eq('workspace_id', workspace.id)
    .single();

  // If not found by slug, try by ID (for backwards compatibility)
  if (!chain) {
    const result = await supabase
      .from('chains')
      .select('*')
      .eq('id', slugOrId)
      .eq('workspace_id', workspace.id)
      .single();
    chain = result.data;
    error = result.error;
  }

  if (!chain || error) {
    redirect(`/${workspaceSlug}/chains`);
  }

  // Get prompts used in this chain
  const promptIds = (chain.steps as any[])
    .map(step => step.config?.promptId || step.promptId)
    .filter(Boolean);
  const { data: prompts } = promptIds.length > 0 
    ? await supabase
        .from('prompts')
        .select('*')
        .in('id', promptIds)
    : { data: [] };

  // Get recent executions
  const { data: runs } = await supabase
    .from('chain_executions')
    .select('*')
    .eq('chain_id', chain.id)
    .order('started_at', { ascending: false })
    .limit(10);

  return (
    <ChainRunner
      chain={chain}
      prompts={prompts || []}
      runs={runs || []}
      workspaceSlug={workspaceSlug}
    />
  );
}