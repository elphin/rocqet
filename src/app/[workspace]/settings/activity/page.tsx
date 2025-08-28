import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { validateWorkspaceAccess } from '@/lib/workspace/validate';
import { ActivityClient } from './client';

export default async function ActivityPage({
  params
}: {
  params: Promise<{ workspace: string }>
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

  // Get recent audit logs
  const { data: auditLogs } = await supabase
    .from('audit_logs_with_users')
    .select('*')
    .eq('workspace_id', workspace.id)
    .order('created_at', { ascending: false })
    .limit(100);

  // Get activity summary
  const { data: activitySummary } = await supabase
    .from('user_activity_summary')
    .select('*')
    .eq('workspace_id', workspace.id);

  return (
    <ActivityClient 
      workspace={workspace}
      membership={membership}
      auditLogs={auditLogs || []}
      activitySummary={activitySummary || []}
      params={{ workspace: workspaceSlug }}
    />
  );
}