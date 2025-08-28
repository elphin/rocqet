-- Add columns to track who accepted/rejected invites and when
ALTER TABLE workspace_invites
ADD COLUMN IF NOT EXISTS accepted_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

-- Enable RLS on workspace_invites if not already enabled
ALTER TABLE workspace_invites ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view invites sent to their email
CREATE POLICY "Users can view their own invites" ON workspace_invites
  FOR SELECT
  USING (
    email = auth.jwt() ->> 'email'
    OR invited_by = auth.uid()
    OR workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Create policy for workspace members to manage invites
CREATE POLICY "Workspace admins can manage invites" ON workspace_invites
  FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- Create policy for users to accept/reject their own invites
CREATE POLICY "Users can accept their own invites" ON workspace_invites
  FOR UPDATE
  USING (email = auth.jwt() ->> 'email')
  WITH CHECK (email = auth.jwt() ->> 'email');