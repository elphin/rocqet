import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AiProvidersClient } from './client';

export const metadata: Metadata = {
  title: 'AI Providers - ROCQET',
  description: 'Manage your AI provider API keys',
};

export default async function AiProvidersPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth/signin');
  }

  // Get user's AI keys
  const { data: userKeys } = await supabase
    .from('user_ai_keys')
    .select('*')
    .eq('user_id', user.id)
    .order('provider', { ascending: true })
    .order('is_default', { ascending: false });

  // Check if user is admin
  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('is_super_admin')
    .eq('user_id', user.id)
    .single();

  // Get system keys if admin
  let systemKeys = [];
  if (adminUser?.is_super_admin) {
    const { data: sysKeys } = await supabase
      .from('system_ai_keys')
      .select('*')
      .order('provider');
    systemKeys = sysKeys || [];
  }

  // Get available models
  const { data: models } = await supabase
    .from('ai_models')
    .select('*')
    .eq('is_active', true)
    .order('provider')
    .order('model_name');

  // Get usage stats
  const { data: userUsage } = await supabase
    .from('system_key_usage')
    .select('*')
    .eq('user_id', user.id);

  return (
    <AiProvidersClient
      userKeys={userKeys || []}
      systemKeys={systemKeys}
      models={models || []}
      isAdmin={adminUser?.is_super_admin || false}
      userUsage={userUsage || []}
      userEmail={user.email || ''}
    />
  );
}