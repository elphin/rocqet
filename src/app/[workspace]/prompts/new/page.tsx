import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { validateWorkspaceAccess } from '@/lib/workspace/validate';

export default async function NewPromptPage({
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

  // Redirect to the direct new prompt page (server-rendered for faster loading)
  redirect(`/${workspaceSlug}/prompts/new/direct`);
}