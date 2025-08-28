import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { validateWorkspaceAccess } from '@/lib/workspace/validate';
import { TeamSettingsClient } from './client-new';

export default async function TeamSettingsPage({
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

  // Check if workspace has pro or business tier
  if (!['pro', 'business'].includes(workspace.subscription_tier)) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="text-center">
            <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-neutral-600 dark:text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
              Team Collaboration
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-8 max-w-md mx-auto">
              Invite team members to collaborate on prompts and chains. This feature is available for Pro and Business workspaces.
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

  // Check if user has admin/owner role
  if (membership.role !== 'owner' && membership.role !== 'admin') {
    redirect(`/${workspaceSlug}/dashboard`);
    return null;
  }

  // Get all team members
  const { data: members } = await supabase
    .from('workspace_members')
    .select(`
      id,
      role,
      joined_at,
      user_id,
      users:user_id (
        id,
        email,
        created_at
      )
    `)
    .eq('workspace_id', workspace.id)
    .order('joined_at', { ascending: true });

  // Get pending invites
  const { data: invites } = await supabase
    .from('workspace_invites')
    .select('*')
    .eq('workspace_id', workspace.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  return (
    <TeamSettingsClient
      workspace={workspace}
      membership={membership}
      user={user}
      members={members || []}
      invites={invites || []}
      params={{ workspace: workspaceSlug }}
    />
  );
}