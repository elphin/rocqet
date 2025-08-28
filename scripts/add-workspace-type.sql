-- Add workspace type fields to distinguish personal vs team workspaces

-- Add workspace_type column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workspaces' 
    AND column_name = 'workspace_type'
  ) THEN
    ALTER TABLE workspaces 
    ADD COLUMN workspace_type TEXT DEFAULT 'team' 
    CHECK (workspace_type IN ('personal', 'team', 'organization'));
  END IF;
END $$;

-- Add is_personal column for quick filtering
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workspaces' 
    AND column_name = 'is_personal'
  ) THEN
    ALTER TABLE workspaces 
    ADD COLUMN is_personal BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add default_workspace_id to users table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'default_workspace_id'
  ) THEN
    ALTER TABLE users 
    ADD COLUMN default_workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Update existing workspaces: mark single-member workspaces as personal
UPDATE workspaces w
SET 
  workspace_type = 'personal',
  is_personal = true
WHERE (
  SELECT COUNT(*) 
  FROM workspace_members wm 
  WHERE wm.workspace_id = w.id
) = 1
AND w.workspace_type = 'team';

-- Add comments
COMMENT ON COLUMN workspaces.workspace_type IS 'Type of workspace: personal (single user), team (multiple users), or organization (enterprise)';
COMMENT ON COLUMN workspaces.is_personal IS 'Quick flag to identify personal workspaces';
COMMENT ON COLUMN users.default_workspace_id IS 'User preferred default workspace when logging in';