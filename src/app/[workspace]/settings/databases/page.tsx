import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { validateWorkspaceAccess } from '@/lib/workspace/validate';
import DatabaseManagerClient from './databases-client';

export default async function DatabasesPage({
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

  // Debug: log the actual tier
  console.log('Workspace tier:', workspace.subscription_tier);

  // Check if user has pro or business tier (not enterprise)
  if (!['pro', 'business'].includes(workspace.subscription_tier)) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="text-center">
            <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-neutral-600 dark:text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
              Database Connections
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-8 max-w-md mx-auto">
              Connect your own databases to use in prompts and chains. This feature is available for Pro and Business workspaces.
            </p>
            <Link
              href={`/${workspaceSlug}/settings/billing`}
              className="inline-block bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 px-6 py-3 rounded-xl font-medium transition-colors"
            >
              Upgrade to Pro
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Get existing database connections
  const { data: connections } = await supabase
    .from('database_connections')
    .select('*')
    .eq('workspace_id', workspace.id)
    .order('created_at', { ascending: false });

  return (
    <DatabaseManagerClient
      workspaceId={workspace.id}
      workspaceSlug={workspaceSlug}
      initialConnections={connections || []}
    />
  );
}