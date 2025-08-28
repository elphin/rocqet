import { createClient } from '@/lib/supabase/server';

export type ActivityType = 
  | 'prompt_created'
  | 'prompt_updated'
  | 'prompt_deleted'
  | 'prompt_run'
  | 'prompt_forked'
  | 'folder_created'
  | 'folder_updated'
  | 'folder_deleted'
  | 'tag_created'
  | 'tag_updated'
  | 'tag_deleted'
  | 'member_invited'
  | 'member_joined'
  | 'member_left'
  | 'api_key_created'
  | 'api_key_deleted';

interface ActivityMetadata {
  promptId?: string;
  promptName?: string;
  folderId?: string;
  folderName?: string;
  tagId?: string;
  tagName?: string;
  memberId?: string;
  memberEmail?: string;
  apiKeyId?: string;
  version?: number;
  provider?: string;
  [key: string]: any;
}

export async function logActivity(
  workspaceId: string,
  userId: string,
  type: ActivityType,
  metadata?: ActivityMetadata
) {
  try {
    const supabase = await createClient();
    
    await supabase.from('activities').insert({
      workspace_id: workspaceId,
      user_id: userId,
      type,
      metadata: metadata || {},
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

export async function getRecentActivities(
  workspaceId: string,
  limit: number = 20
) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('activities')
    .select(`
      *,
      users:user_id (
        id,
        email,
        metadata
      )
    `)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(limit);
    
  if (error) {
    console.error('Failed to fetch activities:', error);
    return [];
  }
  
  return data;
}

export async function getActivityStats(
  workspaceId: string,
  startDate?: Date,
  endDate?: Date
) {
  const supabase = await createClient();
  
  let query = supabase
    .from('activities')
    .select('type, created_at')
    .eq('workspace_id', workspaceId);
    
  if (startDate) {
    query = query.gte('created_at', startDate.toISOString());
  }
  
  if (endDate) {
    query = query.lte('created_at', endDate.toISOString());
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Failed to fetch activity stats:', error);
    return null;
  }
  
  // Group activities by type
  const stats = data.reduce((acc, activity) => {
    acc[activity.type] = (acc[activity.type] || 0) + 1;
    return acc;
  }, {} as Record<ActivityType, number>);
  
  // Group activities by day for chart
  const dailyStats = data.reduce((acc, activity) => {
    const day = new Date(activity.created_at).toDateString();
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return {
    byType: stats,
    byDay: dailyStats,
    total: data.length
  };
}