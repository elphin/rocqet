import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { TagsClient } from './client';

export default async function TagsPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: workspaceSlug } = await params;
  const supabase = await createClient();
  
  // Get user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
    return null;
  }

  // Get workspace
  const { data: membership } = await supabase
    .from('workspace_members')
    .select(`
      workspace_id,
      role,
      workspaces!inner (
        id,
        name,
        slug
      )
    `)
    .eq('user_id', user.id)
    .eq('workspaces.slug', workspaceSlug)
    .single();

  if (!membership) {
    redirect('/');
    return null;
  }

  // Get tags with prompt count
  const { data: tags } = await supabase
    .from('tags')
    .select(`
      *,
      prompt_tags (
        prompt_id
      )
    `)
    .eq('workspace_id', membership.workspace_id)
    .order('name');

  // Format tags with prompt count
  const formattedTags = tags?.map(tag => ({
    ...tag,
    prompt_count: tag.prompt_tags?.length || 0,
    prompt_tags: undefined // Remove the raw data
  })) || [];

  return (
    <TagsClient 
      workspace={membership.workspaces}
      tags={formattedTags}
      userRole={membership.role}
    />
  );
}