-- Enable Realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Create trigger function for new notifications
CREATE OR REPLACE FUNCTION notify_new_notification()
RETURNS trigger AS $$
BEGIN
  -- Broadcast notification to the user's channel
  PERFORM pg_notify(
    'notification_' || NEW.user_id::text,
    json_build_object(
      'id', NEW.id,
      'type', NEW.type,
      'title', NEW.title,
      'message', NEW.message,
      'created_at', NEW.created_at
    )::text
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS on_notification_created ON notifications;
CREATE TRIGGER on_notification_created
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_notification();

-- Create function to get user's notification stats
CREATE OR REPLACE FUNCTION get_notification_stats(p_user_id UUID)
RETURNS TABLE (
  total_count INTEGER,
  unread_count INTEGER,
  recent_count INTEGER
) AS $$
BEGIN
  -- Check if is_archived column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' 
    AND column_name = 'is_archived'
  ) THEN
    RETURN QUERY
    SELECT 
      COUNT(*)::INTEGER as total_count,
      COUNT(*) FILTER (WHERE is_read = false)::INTEGER as unread_count,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours')::INTEGER as recent_count
    FROM notifications
    WHERE user_id = p_user_id
    AND is_archived = false;
  ELSE
    RETURN QUERY
    SELECT 
      COUNT(*)::INTEGER as total_count,
      COUNT(*) FILTER (WHERE is_read = false)::INTEGER as unread_count,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours')::INTEGER as recent_count
    FROM notifications
    WHERE user_id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to broadcast activity to workspace members
CREATE OR REPLACE FUNCTION broadcast_workspace_activity()
RETURNS trigger AS $$
DECLARE
  member_record RECORD;
BEGIN
  -- Get all workspace members
  FOR member_record IN
    SELECT user_id 
    FROM workspace_members 
    WHERE workspace_id = NEW.workspace_id
  LOOP
    -- Send notification to each member's channel
    PERFORM pg_notify(
      'activity_' || member_record.user_id::text,
      json_build_object(
        'workspace_id', NEW.workspace_id,
        'actor_name', NEW.actor_name,
        'action', NEW.action,
        'entity_type', NEW.entity_type,
        'entity_name', NEW.entity_name,
        'created_at', NEW.created_at
      )::text
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create new one for activity feed
DROP TRIGGER IF EXISTS on_activity_created ON activity_feed;
CREATE TRIGGER on_activity_created
  AFTER INSERT ON activity_feed
  FOR EACH ROW
  EXECUTE FUNCTION broadcast_workspace_activity();

-- Enable Realtime for activity feed table
ALTER PUBLICATION supabase_realtime ADD TABLE activity_feed;

-- Create view for user's notification summary (check if is_archived column exists)
DO $$
BEGIN
  -- Check if is_archived column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' 
    AND column_name = 'is_archived'
  ) THEN
    -- Create view with is_archived filter
    CREATE OR REPLACE VIEW user_notification_summary AS
    SELECT 
      n.user_id,
      COUNT(*) as total_notifications,
      COUNT(*) FILTER (WHERE n.is_read = false) as unread_count,
      COUNT(*) FILTER (WHERE n.type = 'invite_received') as pending_invites,
      COUNT(*) FILTER (WHERE n.type IN ('limit_warning', 'limit_reached')) as limit_warnings,
      MAX(n.created_at) as latest_notification
    FROM notifications n
    WHERE n.is_archived = false
    GROUP BY n.user_id;
  ELSE
    -- Create view without is_archived filter
    CREATE OR REPLACE VIEW user_notification_summary AS
    SELECT 
      n.user_id,
      COUNT(*) as total_notifications,
      COUNT(*) FILTER (WHERE n.is_read = false) as unread_count,
      COUNT(*) FILTER (WHERE n.type = 'invite_received') as pending_invites,
      COUNT(*) FILTER (WHERE n.type IN ('limit_warning', 'limit_reached')) as limit_warnings,
      MAX(n.created_at) as latest_notification
    FROM notifications n
    GROUP BY n.user_id;
  END IF;
END $$;

-- Grant access to the view
GRANT SELECT ON user_notification_summary TO authenticated;