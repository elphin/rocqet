-- Fix tags table structure
-- Ensure the tags table has the correct columns and constraints

-- First check if the table exists and create if not
CREATE TABLE IF NOT EXISTS tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  color VARCHAR(7) DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint for workspace_id + name combination
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'tags_workspace_id_name_key'
  ) THEN
    ALTER TABLE tags ADD CONSTRAINT tags_workspace_id_name_key UNIQUE (workspace_id, name);
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tags_workspace_id ON tags(workspace_id);

-- Enable RLS
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view tags in their workspace" ON tags;
DROP POLICY IF EXISTS "Users can create tags in their workspace" ON tags;
DROP POLICY IF EXISTS "Users can update tags in their workspace" ON tags;
DROP POLICY IF EXISTS "Users can delete tags in their workspace" ON tags;

-- Create RLS policies
CREATE POLICY "Users can view tags in their workspace" ON tags
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = tags.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create tags in their workspace" ON tags
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = tags.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY "Users can update tags in their workspace" ON tags
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = tags.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can delete tags in their workspace" ON tags
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = tags.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin')
    )
  );

-- Create prompt_tags junction table if it doesn't exist
CREATE TABLE IF NOT EXISTS prompt_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(prompt_id, tag_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_prompt_tags_prompt_id ON prompt_tags(prompt_id);
CREATE INDEX IF NOT EXISTS idx_prompt_tags_tag_id ON prompt_tags(tag_id);

-- Enable RLS on prompt_tags
ALTER TABLE prompt_tags ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view prompt_tags in their workspace" ON prompt_tags;
DROP POLICY IF EXISTS "Users can manage prompt_tags for their prompts" ON prompt_tags;

-- Create RLS policies for prompt_tags
CREATE POLICY "Users can view prompt_tags in their workspace" ON prompt_tags
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM prompts
      JOIN workspace_members ON workspace_members.workspace_id = prompts.workspace_id
      WHERE prompts.id = prompt_tags.prompt_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage prompt_tags for their prompts" ON prompt_tags
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM prompts
      JOIN workspace_members ON workspace_members.workspace_id = prompts.workspace_id
      WHERE prompts.id = prompt_tags.prompt_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin', 'member')
    )
  );

-- Add some sample tags for testing (optional)
-- INSERT INTO tags (workspace_id, name, color) 
-- SELECT DISTINCT workspace_id, 'api', '#3B82F6' FROM workspaces
-- WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = 'api' AND workspace_id = workspaces.id);

GRANT ALL ON tags TO authenticated;
GRANT ALL ON prompt_tags TO authenticated;