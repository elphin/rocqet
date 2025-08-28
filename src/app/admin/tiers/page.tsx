import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { TierConfigClient } from './client';

export default async function AdminTiersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }
  
  // Check if user is admin
  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('*')
    .eq('user_id', user.id)
    .single();
  
  if (!adminUser || !adminUser.can_manage_tiers) {
    redirect('/');
  }
  
  // Get tier configurations
  const { data: tiers } = await supabase
    .from('tier_configurations')
    .select('*')
    .order('monthly_price', { ascending: true });
  
  return <TierConfigClient tiers={tiers || []} isAdmin={true} />;
}