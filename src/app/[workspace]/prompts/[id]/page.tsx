import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { validateWorkspaceAccess } from '@/lib/workspace/validate';
import { PromptDetailClient } from '@/components/prompt-detail-client-new';

export default async function PromptDetailPage({
  params
}: {
  params: Promise<{ workspace: string; id: string }> // 'id' is actually the slug now
}) {
  const { workspace: workspaceSlug, id } = await params;
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

  // Get prompt details by slug ONLY - without user joins for now
  const { data: prompt, error } = await supabase
    .from('prompts')
    .select('*')
    .eq('slug', id) // id is actually the slug
    .eq('workspace_id', workspace.id)
    .single();

  console.log('Prompt lookup result:', { 
    slug: id,
    workspaceId: workspace.id,
    found: !!prompt,
    error
  });

  if (!prompt || error) {
    console.error('Prompt not found, redirecting to list');
    redirect(`/${workspaceSlug}/prompts`);
  }

  // Get version history - without user joins for now
  const { data: versions } = await supabase
    .from('prompt_versions')
    .select('*')
    .eq('prompt_id', prompt.id) // Use actual prompt ID for relations
    .order('version', { ascending: false })
    .limit(5);

  // Get recent runs
  const { data: runs } = await supabase
    .from('prompt_runs')
    .select('*')
    .eq('prompt_id', prompt.id) // Use actual prompt ID for relations
    .order('executed_at', { ascending: false })
    .limit(5);

  return (
    <PromptDetailClient
      prompt={prompt}
      versions={versions}
      runs={runs}
      membership={membership}
      workspace={workspace}
      params={{ workspace: workspaceSlug, id }}
    />
  );
}