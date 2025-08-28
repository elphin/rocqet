import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { WorkspaceSettingsClient } from './client';

export default async function WorkspaceSettingsPage({
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

  // Get workspace details
  const { data: workspace } = await supabase
    .from('workspaces')
    .select(`
      *,
      workspace_members!inner(*)
    `)
    .eq('slug', workspaceSlug)
    .eq('workspace_members.user_id', user.id)
    .single();

  if (!workspace) {
    redirect('/dashboard');
    return null;
  }

  // Get user's role in workspace
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspace.id)
    .eq('user_id', user.id)
    .single();

  // Only admins can access workspace settings
  if (membership?.role !== 'admin' && membership?.role !== 'owner') {
    redirect(`/${workspaceSlug}/dashboard`);
    return null;
  }

  // Get current member count
  const { count: memberCount } = await supabase
    .from('workspace_members')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspace.id);

  return (
    <WorkspaceSettingsClient 
      workspace={workspace}
      memberCount={memberCount || 1}
      userRole={membership?.role || 'member'}
    />
  );
}