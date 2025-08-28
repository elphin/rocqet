-- Setup complete team management system

-- 1. Create workspace_invites table
CREATE TABLE IF NOT EXISTS workspace_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  token VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  invited_by UUID NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_pending_invite UNIQUE(workspace_id, email, status)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_workspace_invites_workspace_id ON workspace_invites(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_invites_token ON workspace_invites(token);
CREATE INDEX IF NOT EXISTS idx_workspace_invites_email ON workspace_invites(email);
CREATE INDEX IF NOT EXISTS idx_workspace_invites_status ON workspace_invites(status);

-- 2. Create activity_logs table for tracking team actions
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for activity logs
CREATE INDEX IF NOT EXISTS idx_activity_logs_workspace_id ON activity_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- 3. Add missing columns to workspace_members if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workspace_members' 
    AND column_name = 'invited_by'
  ) THEN
    ALTER TABLE workspace_members ADD COLUMN invited_by UUID;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workspace_members' 
    AND column_name = 'invite_accepted_at'
  ) THEN
    ALTER TABLE workspace_members ADD COLUMN invite_accepted_at TIMESTAMPTZ;
  END IF;
END $$;

-- 4. Enable RLS on invites table
ALTER TABLE workspace_invites ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Workspace admins can view invites" ON workspace_invites;
DROP POLICY IF EXISTS "Workspace admins can create invites" ON workspace_invites;
DROP POLICY IF EXISTS "Workspace admins can update invites" ON workspace_invites;
DROP POLICY IF EXISTS "Anyone with token can view invite" ON workspace_invites;

-- Create RLS policies for invites
CREATE POLICY "Workspace admins can view invites" ON workspace_invites
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspace_invites.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Workspace admins can create invites" ON workspace_invites
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspace_invites.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Workspace admins can update invites" ON workspace_invites
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspace_invites.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin')
    )
  );

-- Policy for accepting invites (anyone with valid token)
CREATE POLICY "Anyone with token can view invite" ON workspace_invites
  FOR SELECT
  USING (true); -- Token validation happens in application

-- 5. Enable RLS on activity_logs
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Workspace members can view activity logs" ON activity_logs;
DROP POLICY IF EXISTS "System can insert activity logs" ON activity_logs;

-- Create RLS policies for activity logs
CREATE POLICY "Workspace members can view activity logs" ON activity_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = activity_logs.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

-- Allow authenticated users to insert their own activity
CREATE POLICY "System can insert activity logs" ON activity_logs
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = activity_logs.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

-- 6. Create function to clean up expired invites
CREATE OR REPLACE FUNCTION cleanup_expired_invites()
RETURNS void AS $$
BEGIN
  UPDATE workspace_invites
  SET status = 'expired'
  WHERE status = 'pending'
  AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- 7. Create function to accept invite and create membership
CREATE OR REPLACE FUNCTION accept_workspace_invite(
  invite_token VARCHAR,
  user_id_param UUID
)
RETURNS TABLE (
  success BOOLEAN,
  workspace_id UUID,
  message TEXT
) AS $$
DECLARE
  invite_record RECORD;
  existing_member RECORD;
BEGIN
  -- Clean up expired invites first
  PERFORM cleanup_expired_invites();
  
  -- Get the invite
  SELECT * INTO invite_record
  FROM workspace_invites
  WHERE token = invite_token
  AND status = 'pending';
  
  -- Check if invite exists and is valid
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Invalid or expired invitation';
    RETURN;
  END IF;
  
  -- Check if user is already a member
  SELECT * INTO existing_member
  FROM workspace_members
  WHERE workspace_id = invite_record.workspace_id
  AND user_id = user_id_param;
  
  IF FOUND THEN
    -- Update the invite status
    UPDATE workspace_invites
    SET status = 'accepted', accepted_at = NOW()
    WHERE id = invite_record.id;
    
    RETURN QUERY SELECT TRUE, invite_record.workspace_id, 'You are already a member of this workspace';
    RETURN;
  END IF;
  
  -- Create workspace membership
  INSERT INTO workspace_members (
    workspace_id,
    user_id,
    role,
    invited_by,
    invite_accepted_at
  ) VALUES (
    invite_record.workspace_id,
    user_id_param,
    invite_record.role,
    invite_record.invited_by,
    NOW()
  );
  
  -- Update invite status
  UPDATE workspace_invites
  SET status = 'accepted', accepted_at = NOW()
  WHERE id = invite_record.id;
  
  -- Log the activity
  INSERT INTO activity_logs (
    workspace_id,
    user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    invite_record.workspace_id,
    user_id_param,
    'invite_accepted',
    'workspace_invite',
    invite_record.id,
    jsonb_build_object('role', invite_record.role, 'email', invite_record.email)
  );
  
  RETURN QUERY SELECT TRUE, invite_record.workspace_id, 'Successfully joined workspace';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT ALL ON workspace_invites TO authenticated;
GRANT ALL ON activity_logs TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_invites() TO authenticated;
GRANT EXECUTE ON FUNCTION accept_workspace_invite(VARCHAR, UUID) TO authenticated;

-- Success message
SELECT 'Team management system setup complete!' as status;