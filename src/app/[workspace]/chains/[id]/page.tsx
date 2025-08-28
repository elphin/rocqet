import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ChainRunner } from '@/components/chain-runner';

interface PageProps {
  params: Promise<{ workspace: string; id: string }>;
}

export default async function ChainDetailPage({ params }: PageProps) {
  const { workspace: workspaceSlug, id } = await params;
  const supabase = await createClient();

  // Get user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    redirect(`/auth/signin?returnTo=/${workspaceSlug}/chains/${id}`);
    return null; // Help TypeScript understand flow
  }

  // Get workspace with membership check
  const { data: workspace, error: wsError } = await supabase
    .from('workspaces')
    .select('*')
    .eq('slug', workspaceSlug)
    .single();

  if (wsError || !workspace) {
    redirect(`/dashboard`);
    return null;
  }

  // TypeScript workaround - we know workspace exists after the check
  const workspaceData = workspace as any;

  // Check membership
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('*')
    .eq('workspace_id', workspaceData.id)
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    redirect(`/dashboard`);
    return null;
  }

  // Get chain - try by slug first, then by ID
  let chain = null;
  let error = null;

  // First try as slug
  const slugResult = await supabase
    .from('chains')
    .select('*')
    .eq('slug', id)
    .eq('workspace_id', workspaceData.id)
    .single();
  
  const slugData = slugResult.data as any;
  if (slugData) {
    chain = slugData;
  } else {
    // Try as ID
    const idResult = await supabase
      .from('chains')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', workspaceData.id)
      .single();
    
    chain = idResult.data as any;
    error = idResult.error;
  }

  if (!chain || error) {
    redirect(`/${workspaceSlug}/chains`);
    return null;
  }

  // Now TypeScript knows chain is not null - fetch related data
  const chainData = chain;
  const steps = (chainData.steps as any[]) || [];
  
  // Get prompts used in this chain
  const promptIds = steps
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
    .eq('chain_id', chainData.id)
    .order('started_at', { ascending: false })
    .limit(10);

  return (
    <ChainRunner
      chain={chainData}
      prompts={prompts || []}
      runs={runs || []}
      workspaceSlug={workspaceSlug}
    />
  );
}