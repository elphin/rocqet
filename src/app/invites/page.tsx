import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { InvitesClient } from './client';

export default async function InvitesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/auth/signin');
  }

  // Get pending invites for this user
  const { data: invites } = await supabase
    .from('workspace_invites')
    .select(`
      *,
      workspaces (
        id,
        name,
        slug,
        logo_url,
        subscription_tier
      )
    `)
    .eq('email', user.email)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  // Get workspaces user is already a member of
  const { data: memberships } = await supabase
    .from('workspace_members')
    .select(`
      workspace_id,
      role,
      workspaces (
        id,
        name,
        slug
      )
    `)
    .eq('user_id', user.id);

  return <InvitesClient invites={invites || []} memberships={memberships || []} user={user} />;
}