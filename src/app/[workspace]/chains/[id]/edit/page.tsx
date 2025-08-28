import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { validateWorkspaceAccess } from '@/lib/workspace/validate';
import { ChainEditorClient } from './chain-editor-client';

export default async function EditChainPage({
  params
}: {
  params: Promise<{ workspace: string; id: string }>
}) {
  const { workspace: workspaceSlug, id: slugOrId } = await params;
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

  // Get chain details (try by slug first, then by id for backwards compatibility)
  let { data: chain, error } = await supabase
    .from('chains')
    .select('*')
    .eq('slug', slugOrId)
    .eq('workspace_id', workspace.id)
    .single();

  // If not found by slug, try by ID (for backwards compatibility)
  if (!chain) {
    const result = await supabase
      .from('chains')
      .select('*')
      .eq('id', slugOrId)
      .eq('workspace_id', workspace.id)
      .single();
    chain = result.data;
    error = result.error;
  }

  if (!chain || error) {
    redirect(`/${workspaceSlug}/chains`);
  }

  // Get all prompts for this workspace
  const { data: prompts } = await supabase
    .from('prompts')
    .select('id, name, description, variables')
    .eq('workspace_id', workspace.id)
    .order('name');

  // Get queries and connections for advanced chains
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

  const { data: connections } = await supabase
    .from('database_connections')
    .select('id, name, type, read_only')
    .eq('workspace_id', workspace.id)
    .order('name');

  // Detect if this is an advanced chain
  const isAdvancedChain = chain.steps && Array.isArray(chain.steps) && 
    chain.steps.some((step: any) => 
      step.type && ['condition', 'loop', 'switch', 'api_call', 'database', 'code', 'approval', 'webhook'].includes(step.type)
    );

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ChainEditorClient
          isAdvancedChain={isAdvancedChain}
          workspaceId={workspace.id}
          workspaceSlug={workspaceSlug}
          availablePrompts={prompts || []}
          availableQueries={queries || []}
          availableConnections={connections || []}
          existingChain={chain}
        />
      </div>
    </div>
  );
}