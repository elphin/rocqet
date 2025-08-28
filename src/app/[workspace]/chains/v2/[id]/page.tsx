import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { validateWorkspaceAccess } from '@/lib/workspace/validate';
import ChainExecutionPanel from './chain-execution-panel';

export default async function ChainDetailPageV2({
  params
}: {
  params: Promise<{ workspace: string; id: string }>
}) {
  const { workspace: workspaceSlug, id: slugOrId } = await params;
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
  // TypeScript workaround - we know workspace exists after membership validation
  const workspaceData = workspace as any;

  // Get chain details (try by slug first, then by id for backwards compatibility)
  let { data: chain, error } = await supabase
    .from('chains')
    .select('*')
    .eq('slug', slugOrId)
    .eq('workspace_id', workspaceData.id)
    .single();

  // If not found by slug, try by ID (for backwards compatibility)
  if (!chain) {
    const result = await supabase
      .from('chains')
      .select('*')
      .eq('id', slugOrId)
      .eq('workspace_id', workspaceData.id)
      .single();
    chain = result.data;
    error = result.error;
  }

  if (!chain || error) {
    redirect(`/${workspaceSlug}/chains`);
    return null;
  }

  // TypeScript workaround - we know chain exists after the check
  const chainData = chain as any;

  // Get recent executions
  const { data: executions } = await supabase
    .from('chain_runs')
    .select(`
      id,
      status,
      started_at,
      completed_at,
      execution_time_ms,
      error
    `)
    .eq('chain_id', chainData.id)
    .order('started_at', { ascending: false })
    .limit(10);

  // Get all prompts and queries for variable mapping
  const { data: prompts } = await supabase
    .from('prompts')
    .select('id, name, variables')
    .eq('workspace_id', workspaceData.id)
    .order('name');

  const { data: queries } = await supabase
    .from('queries')
    .select('id, name, variables_schema')
    .eq('workspace_id', workspaceData.id)
    .order('name');

  return (
    <ChainExecutionPanel
      chain={chainData}
      executions={executions || []}
      prompts={prompts || []}
      queries={queries || []}
      workspaceSlug={workspaceSlug}
    />
  );
}