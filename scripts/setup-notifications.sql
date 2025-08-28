-- Notification System Schema

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Recipient
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Notification details
  type TEXT NOT NULL, -- invite, mention, share, update, system, limit_warning, etc.
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Related entities (optional)
  entity_type TEXT, -- prompt, chain, workspace, team_member, etc.
  entity_id UUID,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  action_url TEXT, -- Where to go when clicked
  
  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  is_archived BOOLEAN DEFAULT false,
  archived_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Optional expiration
  
  -- Indexes for performance
  CONSTRAINT notifications_type_check CHECK (
    type IN (
      'invite_received',
      'invite_accepted', 
      'member_joined',
      'member_left',
      'prompt_shared',
      'chain_shared',
      'mention',
      'comment',
      'version_update',
      'limit_warning',
      'limit_reached',
      'subscription_update',
      'payment_failed',
      'system_announcement',
      'workspace_update'
    )
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_workspace_id ON notifications(workspace_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- Notification preferences per user
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Email preferences
  email_enabled BOOLEAN DEFAULT true,
  email_invites BOOLEAN DEFAULT true,
  email_mentions BOOLEAN DEFAULT true,
  email_updates BOOLEAN DEFAULT true,
  email_marketing BOOLEAN DEFAULT false,
  email_digest BOOLEAN DEFAULT true,
  email_digest_frequency TEXT DEFAULT 'daily' CHECK (email_digest_frequency IN ('daily', 'weekly', 'never')),
  
  -- In-app preferences
  app_invites BOOLEAN DEFAULT true,
  app_mentions BOOLEAN DEFAULT true,
  app_comments BOOLEAN DEFAULT true,
  app_updates BOOLEAN DEFAULT true,
  app_limit_warnings BOOLEAN DEFAULT true,
  app_system BOOLEAN DEFAULT true,
  
  -- Sound/Desktop
  sound_enabled BOOLEAN DEFAULT true,
  desktop_enabled BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Activity feed for workspace (public activities)
CREATE TABLE IF NOT EXISTS activity_feed (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Actor
  actor_id UUID NOT NULL REFERENCES auth.users(id),
  actor_name TEXT NOT NULL,
  actor_avatar TEXT,
  
  -- Action
  action TEXT NOT NULL, -- created, updated, deleted, shared, commented, etc.
  entity_type TEXT NOT NULL, -- prompt, chain, folder, etc.
  entity_id UUID,
  entity_name TEXT,
  
  -- Additional context
  metadata JSONB DEFAULT '{}',
  
  -- Visibility
  is_public BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for activity feed
CREATE INDEX IF NOT EXISTS idx_activity_workspace_id ON activity_feed(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_actor_id ON activity_feed(actor_id);
CREATE INDEX IF NOT EXISTS idx_activity_entity ON activity_feed(entity_type, entity_id);

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_workspace_id UUID DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_action_url TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (
    user_id,
    workspace_id,
    type,
    title,
    message,
    entity_type,
    entity_id,
    action_url,
    metadata
  ) VALUES (
    p_user_id,
    p_workspace_id,
    p_type,
    p_title,
    p_message,
    p_entity_type,
    p_entity_id,
    p_action_url,
    p_metadata
  ) RETURNING id INTO v_notification_id;
  
  -- Trigger real-time update (if using Supabase Realtime)
  PERFORM pg_notify(
    'notification_created',
    json_build_object(
      'user_id', p_user_id,
      'notification_id', v_notification_id
    )::text
  );
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- Function to create activity feed entry
CREATE OR REPLACE FUNCTION create_activity(
  p_workspace_id UUID,
  p_actor_id UUID,
  p_actor_name TEXT,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_entity_name TEXT,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_activity_id UUID;
BEGIN
  INSERT INTO activity_feed (
    workspace_id,
    actor_id,
    actor_name,
    action,
    entity_type,
    entity_id,
    entity_name,
    metadata
  ) VALUES (
    p_workspace_id,
    p_actor_id,
    p_actor_name,
    p_action,
    p_entity_type,
    p_entity_id,
    p_entity_name,
    p_metadata
  ) RETURNING id INTO v_activity_id;
  
  RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark notifications as read
CREATE OR REPLACE FUNCTION mark_notifications_read(
  p_user_id UUID,
  p_notification_ids UUID[]
) RETURNS INTEGER AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  UPDATE notifications
  SET 
    is_read = true,
    read_at = NOW()
  WHERE 
    user_id = p_user_id
    AND id = ANY(p_notification_ids)
    AND is_read = false;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view own preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can manage own preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Workspace members can view activity" ON activity_feed;

-- Notifications: Users can only see their own
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Notification preferences: Users manage their own
CREATE POLICY "Users can view own preferences" ON notification_preferences
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own preferences" ON notification_preferences
  FOR ALL USING (user_id = auth.uid());

-- Activity feed: Visible to workspace members
CREATE POLICY "Workspace members can view activity" ON activity_feed
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Create default preferences for existing users
INSERT INTO notification_preferences (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;