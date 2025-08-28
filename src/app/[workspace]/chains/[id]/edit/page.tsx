import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ChainBuilderNew as ChainEditorClient } from '@/components/chain-builder-new';

interface PageProps {
  params: Promise<{ workspace: string; id: string }>;
}

export default async function ChainEditPage({ params }: PageProps) {
  const { workspace: workspaceSlug, id: slugOrId } = await params;
  const supabase = await createClient();

  // Get user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    redirect(`/auth/signin?returnTo=/${workspaceSlug}/chains/${slugOrId}/edit`);
    return null;
  }

  // Get workspace
  const { data: workspace, error: wsError } = await supabase
    .from('workspaces')
    .select('*')
    .eq('slug', workspaceSlug)
    .single();

  if (wsError || !workspace) {
    redirect('/dashboard');
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
    redirect('/dashboard');
    return null;
  }

  // Get chain by slug or ID
  let chain = null;
  
  // Try slug first
  const { data: slugData } = await supabase
    .from('chains')
    .select('*')
    .eq('slug', slugOrId)
    .eq('workspace_id', workspaceData.id)
    .single();

  if (slugData) {
    chain = slugData;
  } else {
    // Try ID
    const { data: idData } = await supabase
      .from('chains')
      .select('*')
      .eq('id', slugOrId)
      .eq('workspace_id', workspaceData.id)
      .single();
    chain = idData;
  }

  if (!chain) {
    redirect(`/${workspaceSlug}/chains`);
    return null;
  }

  // Now we have a valid chain - fetch related data
  const chainData = chain as any;
  
  // Get all prompts for this workspace
  const { data: prompts } = await supabase
    .from('prompts')
    .select('id, name, description, variables')
    .eq('workspace_id', workspaceData.id)
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
    .eq('workspace_id', workspaceData.id)
    .order('name');

  const { data: connections } = await supabase
    .from('database_connections')
    .select('id, name, type, read_only')
    .eq('workspace_id', workspaceData.id)
    .order('name');

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ChainEditorClient
          mode="edit"
          workspaceId={workspaceData.id}
          workspaceSlug={workspaceSlug}
          availablePrompts={prompts || []}
          existingChain={chainData}
        />
      </div>
    </div>
  );
}