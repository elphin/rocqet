import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AcceptInviteClient } from './client';

export default async function AcceptInvitePage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get the invite details
  const { data: invite } = await supabase
    .from('workspace_invites')
    .select(`
      *,
      workspaces (
        id,
        name,
        slug
      )
    `)
    .eq('id', id)
    .eq('status', 'pending')
    .single();

  if (!invite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid or Expired Invite</h1>
          <p className="text-gray-600 mb-4">This invitation link is no longer valid.</p>
          {!user && (
            <a href="/login" className="text-blue-600 hover:underline">
              Sign in to continue
            </a>
          )}
        </div>
      </div>
    );
  }

  // Check if invite has expired
  if (new Date(invite.expires_at) < new Date()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invite Expired</h1>
          <p className="text-gray-600">This invitation has expired. Please request a new one.</p>
        </div>
      </div>
    );
  }

  // If user is not logged in, redirect to login with return URL
  if (!user) {
    redirect(`/login?redirect=/invite/${id}`);
    return null;
  }

  // Check if user is already a member
  const { data: existingMember } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', invite.workspace_id)
    .eq('user_id', user.id)
    .single();

  if (existingMember) {
    redirect(`/${invite.workspaces.slug}`);
    return null;
  }

  return <AcceptInviteClient invite={invite} user={user} />;
}