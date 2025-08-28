import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { validateWorkspaceAccess } from '@/lib/workspace/validate';
import { AiProvidersClient } from './client';

export const metadata: Metadata = {
  title: 'AI Providers - Settings - ROCQET',
  description: 'Manage your AI provider API keys',
};

export default async function AiProvidersPage({
  params
}: {
  params: Promise<{ workspace: string }>;
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

  // Get workspace API keys
  const { data: workspaceKeys } = await supabase
    .from('workspace_ai_keys')
    .select('*')
    .eq('workspace_id', workspace.id)
    .order('provider', { ascending: true })
    .order('is_default', { ascending: false });

  // Get user's personal keys (fallback)
  const { data: userKeys } = await supabase
    .from('user_ai_keys')
    .select('*')
    .eq('user_id', user.id)
    .order('provider', { ascending: true })
    .order('is_default', { ascending: false });

  // Check if user is workspace admin
  const isWorkspaceAdmin = membership.role === 'owner' || membership.role === 'admin';

  // Get available models
  const { data: models } = await supabase
    .from('ai_models')
    .select('*')
    .eq('is_active', true)
    .order('provider')
    .order('model_name');

  // Get usage stats for this workspace
  const { data: workspaceUsage } = await supabase
    .from('prompt_runs')
    .select('id, created_at, tokens_used, cost')
    .eq('workspace_id', workspace.id)
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <AiProvidersClient
      workspaceKeys={workspaceKeys || []}
      userKeys={userKeys || []}
      models={models || []}
      isWorkspaceAdmin={isWorkspaceAdmin}
      workspaceUsage={workspaceUsage || []}
      workspaceId={workspace.id}
      workspaceName={workspace.name}
    />
  );
}