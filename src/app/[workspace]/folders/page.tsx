import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { FoldersClient } from './client';

export default async function FoldersPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: workspaceSlug } = await params;
  const supabase = await createClient();
  
  // Get user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth/signin');
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
  }

  // Get folders
  const { data: folders } = await supabase
    .from('folders')
    .select('*')
    .eq('workspace_id', membership.workspace_id)
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true });

  // Get prompts count per folder
  const { data: prompts } = await supabase
    .from('prompts')
    .select('folder_id')
    .eq('workspace_id', membership.workspace_id);

  const folderCounts = prompts?.reduce((acc: any, prompt: any) => {
    if (prompt.folder_id) {
      acc[prompt.folder_id] = (acc[prompt.folder_id] || 0) + 1;
    }
    return acc;
  }, {});

  const foldersWithCounts = folders?.map(folder => ({
    ...folder,
    prompt_count: folderCounts?.[folder.id] || 0
  })) || [];

  return (
    <FoldersClient 
      workspace={membership.workspaces}
      folders={foldersWithCounts}
      userRole={membership.role}
    />
  );
}