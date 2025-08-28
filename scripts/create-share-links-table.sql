-- Create share_links table for managing public prompt shares
CREATE TABLE IF NOT EXISTS share_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  slug VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  max_views INTEGER,
  current_views INTEGER DEFAULT 0,
  allow_copying BOOLEAN DEFAULT true,
  show_variables BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_share_links_slug ON share_links(slug);
CREATE INDEX IF NOT EXISTS idx_share_links_prompt_id ON share_links(prompt_id);
CREATE INDEX IF NOT EXISTS idx_share_links_workspace_id ON share_links(workspace_id);
CREATE INDEX IF NOT EXISTS idx_share_links_expires_at ON share_links(expires_at);
CREATE INDEX IF NOT EXISTS idx_share_links_is_active ON share_links(is_active);

-- Enable RLS
ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;

-- Policy for workspace members to manage share links
CREATE POLICY "Workspace members can manage share links" ON share_links
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = share_links.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

-- Policy for public access to active share links (read-only)
CREATE POLICY "Public can view active share links" ON share_links
  FOR SELECT
  USING (
    is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_views IS NULL OR current_views < max_views)
  );