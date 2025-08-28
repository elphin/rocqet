import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { validateWorkspaceAccess } from '@/lib/workspace/validate';
import { SettingsSidebar } from '@/components/settings-sidebar';

export default async function SettingsLayout({
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
  }

  // Validate workspace access
  const membership = await validateWorkspaceAccess(workspaceSlug, user.id);
  
  if (!membership) {
    redirect('/');
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <SettingsSidebar workspaceSlug={workspaceSlug} />
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}