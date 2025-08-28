import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { WorkspaceSidebarV3 } from '@/components/workspace-sidebar-v3';
import { AppHeader } from '@/components/layout/AppHeader';

export default async function TemplatesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/auth/signin');
    return null;
  }

  // Get user's workspaces to determine which one to show in sidebar
  const { data: memberships } = await supabase
    .from('workspace_members')
    .select('*, workspaces(*)')
    .eq('user_id', user.id);

  if (!memberships || memberships.length === 0) {
    redirect('/onboarding');
    return null;
  }

  // Use the first workspace or the personal workspace for sidebar context
  const primaryMembership = memberships.find(m => m.workspaces?.workspace_type === 'personal') || memberships[0];
  const workspace = primaryMembership.workspaces;

  return (
    <>
      <AppHeader />
      <div className="flex h-screen bg-gray-50 pt-14">
        <WorkspaceSidebarV3 
          workspace={workspace} 
          membership={primaryMembership} 
          user={user}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="h-full">
            {children}
          </div>
        </main>
      </div>
    </>
  );
}