import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { validateWorkspaceAccess } from '@/lib/workspace/validate';
import { ChainBuilderNew } from '@/components/chain-builder-new';

export default async function NewChainPage({
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
    .select('id, name, description, variables')
    .eq('workspace_id', workspace.id)
    .order('name');

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ChainBuilderNew
          workspaceId={workspace.id}
          workspaceSlug={workspaceSlug}
          availablePrompts={prompts || []}
          mode="create"
        />
      </div>
    </div>
  );
}