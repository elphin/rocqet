import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserWorkspaces } from '@/lib/workspace/validate';

export default async function Home() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/auth/signin');
  }

  // Get user's workspaces
  const workspaces = await getUserWorkspaces(user.id);
  
  if (workspaces.length === 0) {
    // No workspace yet, create one
    redirect('/onboarding');
  }
  
  // Redirect to most recently used workspace
  const defaultWorkspace = workspaces[0];
  redirect(`/${defaultWorkspace.slug}/dashboard`);
}