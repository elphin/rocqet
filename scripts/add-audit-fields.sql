-- Migration: Add comprehensive audit fields to all tables
-- Date: 2025-08-24
-- Purpose: Track who created, updated, and deleted records for better team accountability

-- ========================================
-- PROMPTS TABLE - Add audit fields
-- ========================================
DO $$ 
BEGIN
  -- Add created_by if not exists (likely already exists)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompts' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE prompts ADD COLUMN created_by UUID;
  END IF;

  -- Add updated_by for tracking last editor
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompts' AND column_name = 'updated_by'
  ) THEN
    ALTER TABLE prompts ADD COLUMN updated_by UUID;
  END IF;

  -- These timestamps likely exist but let's ensure
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompts' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE prompts ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompts' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE prompts ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
  END IF;
END $$;

-- ========================================
-- FOLDERS TABLE - Add audit fields
-- ========================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'folders' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE folders ADD COLUMN created_by UUID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'folders' AND column_name = 'updated_by'
  ) THEN
    ALTER TABLE folders ADD COLUMN updated_by UUID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'folders' AND column_name = 'deleted_by'
  ) THEN
    ALTER TABLE folders ADD COLUMN deleted_by UUID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'folders' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE folders ADD COLUMN deleted_at TIMESTAMP;
  END IF;
END $$;

-- ========================================
-- WORKSPACE_API_KEYS TABLE - Add audit fields
-- ========================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workspace_api_keys' AND column_name = 'updated_by'
  ) THEN
    ALTER TABLE workspace_api_keys ADD COLUMN updated_by UUID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workspace_api_keys' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE workspace_api_keys ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workspace_api_keys' AND column_name = 'deleted_by'
  ) THEN
    ALTER TABLE workspace_api_keys ADD COLUMN deleted_by UUID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workspace_api_keys' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE workspace_api_keys ADD COLUMN deleted_at TIMESTAMP;
  END IF;
END $$;

-- ========================================
-- AUDIT LOG TABLE - Central audit trail
-- ========================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- What was affected
  workspace_id UUID NOT NULL,
  entity_type TEXT NOT NULL, -- 'prompt', 'folder', 'api_key', 'workspace', etc.
  entity_id UUID NOT NULL,
  entity_name TEXT, -- Human readable name for quick reference
  
  -- What happened
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'restore', 'share', 'unshare', etc.
  changes JSONB, -- Detailed changes in JSON format
  
  -- Who did it
  user_id UUID NOT NULL,
  user_email TEXT, -- Store email for quick reference (denormalized)
  user_role TEXT, -- Role at time of action
  
  -- Context
  ip_address TEXT,
  user_agent TEXT,
  session_id TEXT,
  
  -- When
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_workspace ON audit_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- ========================================
-- FUNCTION: Auto-update updated_at timestamp
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for auto-updating updated_at
DROP TRIGGER IF EXISTS update_prompts_updated_at ON prompts;
CREATE TRIGGER update_prompts_updated_at
  BEFORE UPDATE ON prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_folders_updated_at ON folders;
CREATE TRIGGER update_folders_updated_at
  BEFORE UPDATE ON folders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workspace_api_keys_updated_at ON workspace_api_keys;
CREATE TRIGGER update_workspace_api_keys_updated_at
  BEFORE UPDATE ON workspace_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- FUNCTION: Create audit log entry
-- ========================================
CREATE OR REPLACE FUNCTION create_audit_log(
  p_workspace_id UUID,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_entity_name TEXT,
  p_action TEXT,
  p_changes JSONB,
  p_user_id UUID
)
RETURNS void AS $$
BEGIN
  INSERT INTO audit_logs (
    workspace_id,
    entity_type,
    entity_id,
    entity_name,
    action,
    changes,
    user_id,
    created_at
  ) VALUES (
    p_workspace_id,
    p_entity_type,
    p_entity_id,
    p_entity_name,
    p_action,
    p_changes,
    p_user_id,
    NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- VIEW: Audit logs with user details
-- ========================================
CREATE OR REPLACE VIEW audit_logs_with_users AS
SELECT 
  al.*,
  u.email as performer_email,
  u.raw_user_meta_data->>'full_name' as performer_name,
  wm.role as performer_role
FROM audit_logs al
LEFT JOIN auth.users u ON al.user_id = u.id
LEFT JOIN workspace_members wm ON al.user_id = wm.user_id AND al.workspace_id = wm.workspace_id
ORDER BY al.created_at DESC;

-- Grant permissions
GRANT SELECT ON audit_logs_with_users TO authenticated;
GRANT INSERT ON audit_logs TO authenticated;

-- ========================================
-- RLS Policies for audit_logs
-- ========================================
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can view audit logs for their workspaces
CREATE POLICY "View workspace audit logs" ON audit_logs
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Users can insert audit logs for their workspaces
CREATE POLICY "Create audit logs" ON audit_logs
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- ========================================
-- HELPER VIEW: Recent activity per workspace
-- ========================================
CREATE OR REPLACE VIEW recent_workspace_activity AS
SELECT 
  workspace_id,
  entity_type,
  entity_name,
  action,
  user_email,
  created_at,
  ROW_NUMBER() OVER (PARTITION BY workspace_id ORDER BY created_at DESC) as row_num
FROM audit_logs
WHERE created_at > NOW() - INTERVAL '7 days';

-- ========================================
-- HELPER VIEW: User activity summary
-- ========================================
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT 
  workspace_id,
  user_id,
  user_email,
  COUNT(*) as total_actions,
  COUNT(CASE WHEN action = 'create' THEN 1 END) as creates,
  COUNT(CASE WHEN action = 'update' THEN 1 END) as updates,
  COUNT(CASE WHEN action = 'delete' THEN 1 END) as deletes,
  MAX(created_at) as last_activity
FROM audit_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY workspace_id, user_id, user_email;

-- Comments for documentation
COMMENT ON TABLE audit_logs IS 'Central audit trail for all workspace activities';
COMMENT ON COLUMN audit_logs.entity_type IS 'Type of entity affected (prompt, folder, api_key, etc.)';
COMMENT ON COLUMN audit_logs.action IS 'Action performed (create, update, delete, restore, share, etc.)';
COMMENT ON COLUMN audit_logs.changes IS 'JSON object with before/after values for updates';

-- ========================================
-- SAMPLE: How to use in application
-- ========================================
-- When creating a prompt:
-- INSERT INTO audit_logs (workspace_id, entity_type, entity_id, entity_name, action, user_id)
-- VALUES ($1, 'prompt', $2, $3, 'create', $4);

-- When updating a prompt:
-- INSERT INTO audit_logs (workspace_id, entity_type, entity_id, entity_name, action, changes, user_id)
-- VALUES ($1, 'prompt', $2, $3, 'update', '{"before": {...}, "after": {...}}'::jsonb, $4);

-- When deleting a prompt:
-- INSERT INTO audit_logs (workspace_id, entity_type, entity_id, entity_name, action, user_id)
-- VALUES ($1, 'prompt', $2, $3, 'delete', $4);