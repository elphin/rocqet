import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { NewWorkspaceClient } from './new-workspace-client';

export default async function NewWorkspacePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/auth/signin');
    return null;
  }

  // Check if user already has workspaces
  const { data: memberships, error } = await supabase
    .from('workspace_members')
    .select(`
      role,
      workspaces (
        id,
        name,
        slug,
        subscription_tier
      )
    `)
    .eq('user_id', user.id);

  // Check if any existing workspace is on free tier
  const freeWorkspaces = memberships?.filter(m => 
    m.workspaces?.subscription_tier === 'free' || !m.workspaces?.subscription_tier
  );

  // If user has a free workspace, they cannot create another
  if (freeWorkspaces && freeWorkspaces.length > 0) {
    const existingWorkspace = freeWorkspaces[0].workspaces;
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="text-center">
            <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-neutral-600 dark:text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
              Multiple Workspaces
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-8 max-w-md mx-auto">
              Free tier includes one workspace. Upgrade to Pro or Business to create multiple workspaces for different teams or projects.
            </p>
            <div className="space-y-3">
              <Link
                href={`/${existingWorkspace.slug}/settings/billing`}
                className="inline-block bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 px-6 py-3 rounded-xl font-medium transition-colors"
              >
                Upgrade to Pro
              </Link>
              <div>
                <Link
                  href={`/${existingWorkspace.slug}/prompts`}
                  className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 underline"
                >
                  Go to existing workspace
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // User can create a new workspace (either has no workspaces or has pro/business)
  return <NewWorkspaceClient />;
}