import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { BillingClient } from './client-new';

export default async function BillingPage({
  params
}: {
  params: Promise<{ workspace: string }>
}) {
  const { workspace: workspaceSlug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }
  
  // Get workspace
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
    redirect('/');
  }
  
  // Get membership
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspace.id)
    .eq('user_id', user.id)
    .single();
  
  // Get tier configurations
  const { data: tiers, error: tiersError } = await supabase
    .from('tier_configurations')
    .select('*')
    .eq('active', true)
    .order('monthly_price', { ascending: true });
  
  console.log('Tiers query result:', { tiers, tiersError });
  
  // Get current usage
  const currentMonth = new Date();
  currentMonth.setDate(1);
  currentMonth.setHours(0, 0, 0, 0);
  
  const { data: usage } = await supabase
    .from('workspace_usage')
    .select('*')
    .eq('workspace_id', workspace.id)
    .eq('month', currentMonth.toISOString().split('T')[0])
    .single();
  
  // Count team members
  const { count: memberCount } = await supabase
    .from('workspace_members')
    .select('id', { count: 'exact' })
    .eq('workspace_id', workspace.id);
  
  // Count prompts
  const { count: promptCount } = await supabase
    .from('prompts')
    .select('id', { count: 'exact' })
    .eq('workspace_id', workspace.id);
  
  return (
    <BillingClient 
      workspace={workspace}
      membership={membership}
      tiers={tiers || []}
      usage={{
        prompts: promptCount || 0,
        teamMembers: memberCount || 0,
        testRuns: usage?.test_runs_count || 0
      }}
      params={{ workspace: workspaceSlug }}
    />
  );
}