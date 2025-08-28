import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { WorkspaceSidebarV3 } from '@/components/workspace-sidebar-v3';
import { AppHeader } from '@/components/layout/AppHeader';
import { TierSwitcher } from '@/components/tier-switcher';

export default async function WorkspaceLayout({
  children,
  params
}: {
  children: React.ReactNode;
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

  // TypeScript workaround - we know workspace exists after the check
  const workspaceData = workspace as any;

  // Get user's role in workspace
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceData.id)
    .eq('user_id', user.id)
    .single();

  return (
    <>
      <AppHeader />
      <div className="flex h-screen bg-gray-50 pt-14">
        <WorkspaceSidebarV3 
          workspace={workspaceData} 
          membership={membership} 
          user={user} 
        />
        
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="h-full">
            {children}
          </div>
        </main>
      </div>
      
      {/* Tier Switcher for Development */}
      <TierSwitcher 
        workspaceId={workspaceData.id} 
        currentTier={workspaceData.plan || workspaceData.subscription_tier || 'free'} 
      />
    </>
  );
}