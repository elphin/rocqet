-- Reset and setup team management system

-- Drop existing tables and functions
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS workspace_invites CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_invites();
DROP FUNCTION IF EXISTS accept_workspace_invite(VARCHAR, UUID);

-- 1. Create workspace_invites table with correct structure
CREATE TABLE workspace_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  token VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  invited_by UUID NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_workspace_invites_workspace_id ON workspace_invites(workspace_id);
CREATE INDEX idx_workspace_invites_token ON workspace_invites(token);
CREATE INDEX idx_workspace_invites_email ON workspace_invites(email);
CREATE INDEX idx_workspace_invites_status ON workspace_invites(status);

-- 2. Create activity_logs table
CREATE TABLE activity_logs (
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

-- Create indexes
CREATE INDEX idx_activity_logs_workspace_id ON activity_logs(workspace_id);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_action ON activity_logs(action);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- 3. Enable RLS
ALTER TABLE workspace_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for invites
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

CREATE POLICY "Anyone with token can view invite" ON workspace_invites
  FOR SELECT
  USING (true);

-- 5. Create RLS policies for activity logs
CREATE POLICY "Workspace members can view activity logs" ON activity_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = activity_logs.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

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

-- Grant permissions
GRANT ALL ON workspace_invites TO authenticated;
GRANT ALL ON activity_logs TO authenticated;

SELECT 'Team management reset and setup complete!' as status;