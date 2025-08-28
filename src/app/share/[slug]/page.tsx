import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SharedPromptView } from '@/components/shared-prompt-view';

export default async function SharedPromptPage({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params;
  const supabase = await createClient();

  // Get share link details
  const { data: shareLink, error: linkError } = await supabase
    .from('share_links')
    .select(`
      *,
      prompts (
        id,
        name,
        description,
        content,
        model,
        temperature,
        max_tokens,
        top_p,
        tags,
        visibility
      )
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (linkError || !shareLink) {
    redirect('/404');
    return null;
  }

  // Check if link is expired
  if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
    redirect('/404');
    return null;
  }

  // Check if max views reached
  if (shareLink.max_views && shareLink.current_views >= shareLink.max_views) {
    redirect('/404');
    return null;
  }

  // Increment view count
  await supabase
    .from('share_links')
    .update({ 
      current_views: shareLink.current_views + 1,
      last_accessed_at: new Date().toISOString()
    })
    .eq('id', shareLink.id);

  return (
    <SharedPromptView
      prompt={shareLink.prompts}
      shareSettings={{
        allowCopying: shareLink.allow_copying,
        showVariables: shareLink.show_variables,
        hasPassword: !!shareLink.password_hash,
        passwordHash: shareLink.password_hash
      }}
    />
  );
}