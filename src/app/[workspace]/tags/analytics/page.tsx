import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { TagAnalyticsClient } from './client';

export default async function TagAnalyticsPage({
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

  // Get comprehensive tag analytics
  const { data: tags } = await supabase
    .from('tags')
    .select(`
      *,
      prompt_tags (
        prompt_id,
        prompts (
          id,
          name,
          slug,
          usage_count,
          last_used_at,
          created_at,
          updated_at
        )
      )
    `)
    .eq('workspace_id', membership.workspace_id)
    .order('name');

  // Get tag usage over time (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: recentActivity } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('workspace_id', membership.workspace_id)
    .in('entity_type', ['tag', 'prompt'])
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: false });

  // Calculate analytics
  const analytics = calculateTagAnalytics(tags || [], recentActivity || []);

  return (
    <TagAnalyticsClient 
      workspace={membership.workspaces}
      analytics={analytics}
      userRole={membership.role}
    />
  );
}

function calculateTagAnalytics(tags: any[], activities: any[]) {
  // Most used tags
  const tagUsage = tags.map(tag => ({
    id: tag.id,
    name: tag.name,
    color: tag.color,
    promptCount: tag.prompt_tags?.length || 0,
    totalUsage: tag.prompt_tags?.reduce((sum: number, pt: any) => 
      sum + (pt.prompts?.usage_count || 0), 0) || 0,
    lastUsed: tag.prompt_tags?.reduce((latest: string | null, pt: any) => {
      const lastUsed = pt.prompts?.last_used_at;
      if (!lastUsed) return latest;
      if (!latest) return lastUsed;
      return new Date(lastUsed) > new Date(latest) ? lastUsed : latest;
    }, null),
    prompts: tag.prompt_tags?.map((pt: any) => pt.prompts).filter(Boolean) || []
  }));

  // Sort by different metrics
  const mostUsedTags = [...tagUsage].sort((a, b) => b.totalUsage - a.totalUsage).slice(0, 10);
  const mostPopularTags = [...tagUsage].sort((a, b) => b.promptCount - a.promptCount).slice(0, 10);
  const recentlyUsedTags = [...tagUsage]
    .filter(t => t.lastUsed)
    .sort((a, b) => new Date(b.lastUsed!).getTime() - new Date(a.lastUsed!).getTime())
    .slice(0, 10);

  // Tag growth over time
  const tagActivities = activities.filter(a => a.entity_type === 'tag');
  const tagGrowth = calculateGrowthData(tagActivities);

  // Unused tags
  const unusedTags = tagUsage.filter(t => t.promptCount === 0);

  // Tag relationships (tags that appear together)
  const tagRelationships = calculateTagRelationships(tags);

  return {
    totalTags: tags.length,
    totalTaggedPrompts: new Set(tags.flatMap(t => t.prompt_tags?.map((pt: any) => pt.prompt_id) || [])).size,
    mostUsedTags,
    mostPopularTags,
    recentlyUsedTags,
    unusedTags,
    tagGrowth,
    tagRelationships,
    allTags: tagUsage
  };
}

function calculateGrowthData(activities: any[]) {
  const dailyData: Record<string, number> = {};
  
  activities.forEach(activity => {
    const date = new Date(activity.created_at).toISOString().split('T')[0];
    if (activity.action === 'tag_created') {
      dailyData[date] = (dailyData[date] || 0) + 1;
    } else if (activity.action === 'tag_deleted') {
      dailyData[date] = (dailyData[date] || 0) - 1;
    }
  });

  // Convert to array and sort by date
  return Object.entries(dailyData)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function calculateTagRelationships(tags: any[]) {
  const relationships: Record<string, Record<string, number>> = {};
  
  // Group prompts by their tags
  const promptToTags: Record<string, string[]> = {};
  
  tags.forEach(tag => {
    tag.prompt_tags?.forEach((pt: any) => {
      if (!promptToTags[pt.prompt_id]) {
        promptToTags[pt.prompt_id] = [];
      }
      promptToTags[pt.prompt_id].push(tag.id);
    });
  });

  // Calculate co-occurrence
  Object.values(promptToTags).forEach(tagIds => {
    if (tagIds.length > 1) {
      for (let i = 0; i < tagIds.length; i++) {
        for (let j = i + 1; j < tagIds.length; j++) {
          const tag1 = tagIds[i];
          const tag2 = tagIds[j];
          
          if (!relationships[tag1]) relationships[tag1] = {};
          if (!relationships[tag2]) relationships[tag2] = {};
          
          relationships[tag1][tag2] = (relationships[tag1][tag2] || 0) + 1;
          relationships[tag2][tag1] = (relationships[tag2][tag1] || 0) + 1;
        }
      }
    }
  });

  return relationships;
}