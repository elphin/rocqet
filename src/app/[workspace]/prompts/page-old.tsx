import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { validateWorkspaceAccess } from '@/lib/workspace/validate';
import { PromptsTable } from './prompts-table';

export default async function PromptsPage({
  params
}: {
  params: { workspace: string }
}) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/auth/signin');
  }

  // Validate workspace access
  const membership = await validateWorkspaceAccess(params.workspace, user.id);
  
  if (!membership) {
    redirect('/');
  }

  const workspace = membership.workspaces;

  // Get all prompts for the workspace
  const { data: prompts, error } = await supabase
    .from('prompts')
    .select('*')
    .eq('workspace_id', workspace.id)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching prompts:', error);
  }

  // For now, we'll use the prompts without the relations
  const transformedPrompts = prompts || [];

  return (
    <div className="p-8">
      <PromptsTable 
        prompts={transformedPrompts} 
        workspaceSlug={params.workspace}
      />
    </div>
  );
}