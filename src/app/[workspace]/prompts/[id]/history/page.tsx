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
    return null;
  }

  const membership = await validateWorkspaceAccess(workspaceSlug, user.id);
  
  if (!membership) {
    redirect('/');
    return null;
  }

  const workspace = membership.workspaces;
  // TypeScript workaround - we know workspace exists after membership validation
  const workspaceData = workspace as any;

  // Get prompt details by slug
  const { data: prompt, error } = await supabase
    .from('prompts')
    .select('*')
    .eq('slug', id)
    .eq('workspace_id', workspaceData.id)
    .single();

  if (!prompt || error) {
    redirect(`/${workspaceSlug}/prompts`);
    return null;
  }

  // TypeScript workaround - we know prompt exists after the check
  const promptData = prompt as any;

  // Get all versions
  const { data: versions } = await supabase
    .from('prompt_versions')
    .select('*')
    .eq('prompt_id', promptData.id)
    .order('version', { ascending: false });

  return (
    <VersionHistoryClient
      prompt={promptData}
      versions={versions || []}
      workspace={workspaceData}
      membership={membership}
      params={{ workspace: workspaceSlug, id }}
    />
  );
}