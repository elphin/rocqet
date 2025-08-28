import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { validateWorkspaceAccess } from '@/lib/workspace/validate';
import { ApiKeysClient } from './client';

export const metadata: Metadata = {
  title: 'API Keys - ROCQET',
  description: 'Manage your workspace API keys',
};

export default async function ApiKeysPage({
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
              API Keys
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-8 max-w-md mx-auto">
              Generate API keys to integrate ROCQET with your applications. This feature is available for Pro and Business workspaces.
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

  // Check user permissions - only owners and admins can manage API keys
  if (!['owner', 'admin'].includes(membership.role)) {
    redirect(`/${workspaceSlug}/prompts`);
    return null;
  }

  // Get existing API keys
  const { data: keys } = await supabase
    .from('api_keys')
    .select(`
      id,
      name,
      description,
      key_prefix,
      last_four,
      scopes,
      status,
      last_used_at,
      created_at,
      expires_at,
      rate_limit_per_minute,
      rate_limit_per_hour,
      rate_limit_per_day
    `)
    .eq('workspace_id', workspace.id)
    .order('created_at', { ascending: false });

  // Get usage stats for each key
  const keysWithStats = await Promise.all((keys || []).map(async (key) => {
    const { data: usage } = await supabase
      .from('api_key_usage')
      .select('id')
      .eq('api_key_id', key.id)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    return {
      ...key,
      usage_last_24h: usage?.length || 0
    };
  }));

  return (
    <ApiKeysClient 
      workspace={workspace} 
      membership={membership}
      keys={keysWithStats}
      params={{ workspace: workspaceSlug }}
    />
  );
}