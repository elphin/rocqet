import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { validateWorkspaceAccess } from '@/lib/workspace/validate';
import { PromptsPageClient } from './prompts-page-with-bulk';
import { tierLimits } from '@/lib/tier-limits';

export default async function PromptsPage({
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
  // TypeScript workaround - we know workspace exists after membership validation
  const workspaceData = workspace as any;

  // Get prompts count for pagination (exclude soft-deleted)
  const { count } = await supabase
    .from('prompts')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceData.id)
    .is('deleted_at', null);

  // Get first page of prompts (limit 50, exclude soft-deleted)
  const pageSize = 50;
  const { data: prompts, error: promptsError } = await supabase
    .from('prompts')
    .select('*')
    .eq('workspace_id', workspaceData.id)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .range(0, pageSize - 1);

  if (promptsError) {
    console.error('Error fetching prompts:', promptsError);
  }

  // Get all folders for the workspace
  const { data: folders, error: foldersError } = await supabase
    .from('folders')
    .select('*')
    .eq('workspace_id', workspaceData.id)
    .order('name', { ascending: true });

  if (foldersError) {
    console.error('Error fetching folders:', foldersError);
  }

  // Get tier limits
  const tier = workspaceData.subscription_tier || 'starter';
  const limits = tierLimits[tier as keyof typeof tierLimits];

  return (
    <PromptsPageClient 
      initialPrompts={prompts || []} 
      folders={folders || []}
      workspaceSlug={workspaceSlug}
      workspaceId={workspaceData.id}
      workspaceTier={tier}
      totalCount={count || 0}
      pageSize={pageSize}
      promptLimit={limits.prompts}
    />
  );
}