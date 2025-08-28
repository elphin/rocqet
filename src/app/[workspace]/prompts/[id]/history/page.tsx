import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { validateWorkspaceAccess } from '@/lib/workspace/validate';
import { VersionHistoryClient } from '@/components/version-history-client';

export default async function PromptHistoryPage({
  params
}: {
  params: Promise<{ workspace: string; id: string }>
}) {
  const { workspace: workspaceSlug, id } = await params;
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/auth/signin');
  }

  const membership = await validateWorkspaceAccess(workspaceSlug, user.id);
  
  if (!membership) {
    redirect('/');
  }

  const workspace = membership.workspaces;

  // Get prompt details by slug
  const { data: prompt, error } = await supabase
    .from('prompts')
    .select('*')
    .eq('slug', id)
    .eq('workspace_id', workspace.id)
    .single();

  if (!prompt || error) {
    redirect(`/${workspaceSlug}/prompts`);
  }

  // Get all versions
  const { data: versions } = await supabase
    .from('prompt_versions')
    .select('*')
    .eq('prompt_id', prompt.id)
    .order('version', { ascending: false });

  return (
    <VersionHistoryClient
      prompt={prompt}
      versions={versions || []}
      workspace={workspace}
      membership={membership}
      params={{ workspace: workspaceSlug, id }}
    />
  );
}