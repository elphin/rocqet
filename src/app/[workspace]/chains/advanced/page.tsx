import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { validateWorkspaceAccess } from '@/lib/workspace/validate';
import PremiumChainBuilderV2 from '@/components/chain-builder-premium-v2';

export default async function NewAdvancedChainPage({
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
    .select('id, name, description, variables, content')
    .eq('workspace_id', workspace.id)
    .order('name');

  // Get all queries for this workspace
  const { data: queries } = await supabase
    .from('queries')
    .select(`
      id,
      name,
      description,
      sql_template,
      variables_schema,
      connection_id,
      database_connections (
        id,
        name,
        type
      )
    `)
    .eq('workspace_id', workspace.id)
    .order('name');

  // Get all database connections for this workspace
  const { data: connections } = await supabase
    .from('database_connections')
    .select('id, name, type, read_only')
    .eq('workspace_id', workspace.id)
    .order('name');

  return (
    <PremiumChainBuilderV2
      workspaceId={workspace.id}
      workspaceSlug={workspaceSlug}
      availablePrompts={prompts || []}
      availableQueries={queries || []}
      availableConnections={connections || []}
      mode="create"
    />
  );
}