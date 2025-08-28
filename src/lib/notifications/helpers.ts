import { SupabaseClient } from '@supabase/supabase-js';

export type NotificationType = 
  | 'invite_received'
  | 'invite_accepted'
  | 'member_joined'
  | 'member_left'
  | 'prompt_shared'
  | 'chain_shared'
  | 'mention'
  | 'comment'
  | 'version_update'
  | 'limit_warning'
  | 'limit_reached'
  | 'subscription_update'
  | 'payment_failed'
  | 'system_announcement'
  | 'workspace_update';

interface NotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  workspaceId?: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

/**
 * Create a notification for a user
 */
export async function createNotification(
  supabase: SupabaseClient,
  payload: NotificationPayload
) {
  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: payload.userId,
      workspace_id: payload.workspaceId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      entity_type: payload.entityType,
      entity_id: payload.entityId,
      action_url: payload.actionUrl,
      metadata: payload.metadata || {}
    });

  if (error) {
    console.error('Failed to create notification:', error);
    throw error;
  }
}

/**
 * Notify user when they receive a workspace invite
 */
export async function notifyInviteReceived(
  supabase: SupabaseClient,
  inviteeId: string,
  workspaceName: string,
  inviterName: string,
  workspaceId: string
) {
  await createNotification(supabase, {
    userId: inviteeId,
    type: 'invite_received',
    title: 'Workspace Invitation',
    message: `${inviterName} invited you to join "${workspaceName}"`,
    workspaceId,
    actionUrl: '/invites',
    metadata: {
      inviter_name: inviterName,
      workspace_name: workspaceName
    }
  });
}

/**
 * Notify workspace owner when someone accepts their invite
 */
export async function notifyInviteAccepted(
  supabase: SupabaseClient,
  ownerId: string,
  memberName: string,
  workspaceName: string,
  workspaceId: string
) {
  await createNotification(supabase, {
    userId: ownerId,
    type: 'invite_accepted',
    title: 'Invitation Accepted',
    message: `${memberName} joined "${workspaceName}"`,
    workspaceId,
    actionUrl: `/${workspaceId}/members`,
    metadata: {
      member_name: memberName,
      workspace_name: workspaceName
    }
  });
}

/**
 * Notify workspace members when someone joins
 */
export async function notifyMemberJoined(
  supabase: SupabaseClient,
  workspaceId: string,
  newMemberId: string,
  newMemberName: string
) {
  // Get all workspace members except the new member
  const { data: members } = await supabase
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', workspaceId)
    .neq('user_id', newMemberId);

  if (!members) return;

  // Get workspace info
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('name')
    .eq('id', workspaceId)
    .single();

  const notifications = members.map(member => ({
    userId: member.user_id,
    type: 'member_joined' as NotificationType,
    title: 'New Team Member',
    message: `${newMemberName} joined "${workspace?.name}"`,
    workspaceId,
    actionUrl: `/${workspaceId}/members`,
    metadata: {
      member_name: newMemberName,
      workspace_name: workspace?.name
    }
  }));

  // Create notifications for all members
  for (const notification of notifications) {
    await createNotification(supabase, notification);
  }
}

/**
 * Notify when a prompt is shared
 */
export async function notifyPromptShared(
  supabase: SupabaseClient,
  recipientId: string,
  sharerName: string,
  promptName: string,
  promptId: string,
  workspaceId: string
) {
  await createNotification(supabase, {
    userId: recipientId,
    type: 'prompt_shared',
    title: 'Prompt Shared',
    message: `${sharerName} shared "${promptName}" with you`,
    workspaceId,
    entityType: 'prompt',
    entityId: promptId,
    actionUrl: `/${workspaceId}/prompts/${promptId}`,
    metadata: {
      sharer_name: sharerName,
      prompt_name: promptName
    }
  });
}

/**
 * Notify when approaching tier limits
 */
export async function notifyLimitWarning(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string,
  limitType: 'prompts' | 'storage' | 'api_calls',
  currentUsage: number,
  limit: number
) {
  const percentage = Math.round((currentUsage / limit) * 100);
  
  await createNotification(supabase, {
    userId,
    type: 'limit_warning',
    title: 'Usage Warning',
    message: `You've used ${percentage}% of your ${limitType} limit (${currentUsage}/${limit})`,
    workspaceId,
    actionUrl: `/${workspaceId}/settings/billing`,
    metadata: {
      limit_type: limitType,
      current_usage: currentUsage,
      limit,
      percentage
    }
  });
}

/**
 * Notify when tier limit is reached
 */
export async function notifyLimitReached(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string,
  limitType: 'prompts' | 'storage' | 'api_calls'
) {
  await createNotification(supabase, {
    userId,
    type: 'limit_reached',
    title: 'Limit Reached',
    message: `You've reached your ${limitType} limit. Upgrade to continue.`,
    workspaceId,
    actionUrl: `/${workspaceId}/settings/billing`,
    metadata: {
      limit_type: limitType
    }
  });
}

/**
 * Mark notifications as read
 */
export async function markNotificationsRead(
  supabase: SupabaseClient,
  userId: string,
  notificationIds: string[]
) {
  const { error } = await supabase
    .from('notifications')
    .update({ 
      is_read: true, 
      read_at: new Date().toISOString() 
    })
    .eq('user_id', userId)
    .in('id', notificationIds);

  if (error) {
    console.error('Failed to mark notifications as read:', error);
    throw error;
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsRead(
  supabase: SupabaseClient,
  userId: string,
  workspaceId?: string
) {
  let query = supabase
    .from('notifications')
    .update({ 
      is_read: true, 
      read_at: new Date().toISOString() 
    })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId);
  }

  const { error } = await query;

  if (error) {
    console.error('Failed to mark all notifications as read:', error);
    throw error;
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(
  supabase: SupabaseClient,
  userId: string,
  workspaceId?: string
): Promise<number> {
  let query = supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false)
    .eq('is_archived', false);

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId);
  }

  const { count } = await query;
  return count || 0;
}

/**
 * Check if user has notification preferences set
 */
export async function ensureNotificationPreferences(
  supabase: SupabaseClient,
  userId: string
) {
  const { data: preferences } = await supabase
    .from('notification_preferences')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (!preferences) {
    // Create default preferences
    await supabase
      .from('notification_preferences')
      .insert({
        user_id: userId,
        email_enabled: true,
        email_invites: true,
        email_mentions: true,
        email_updates: true,
        email_marketing: false,
        email_digest: true,
        email_digest_frequency: 'daily',
        app_invites: true,
        app_mentions: true,
        app_comments: true,
        app_updates: true,
        app_limit_warnings: true,
        app_system: true,
        sound_enabled: true,
        desktop_enabled: false
      });
  }
}