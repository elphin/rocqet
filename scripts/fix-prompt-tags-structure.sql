-- Fix prompt_tags table structure
-- Remove unnecessary workspace_id column from prompt_tags

-- First, backup the existing data
CREATE TEMP TABLE prompt_tags_backup AS 
SELECT prompt_id, tag_id, created_at 
FROM prompt_tags;

-- Drop the existing table
DROP TABLE IF EXISTS prompt_tags CASCADE;

-- Recreate with correct structure
CREATE TABLE prompt_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(prompt_id, tag_id)
);

-- Restore the data
INSERT INTO prompt_tags (prompt_id, tag_id, created_at)
SELECT DISTINCT prompt_id, tag_id, created_at 
FROM prompt_tags_backup
WHERE prompt_id IS NOT NULL 
AND tag_id IS NOT NULL;

-- Create indexes
CREATE INDEX idx_prompt_tags_prompt_id ON prompt_tags(prompt_id);
CREATE INDEX idx_prompt_tags_tag_id ON prompt_tags(tag_id);

-- Enable RLS
ALTER TABLE prompt_tags ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
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

-- Grant permissions
GRANT ALL ON prompt_tags TO authenticated;

-- Show results
SELECT 'prompt_tags fixed - removed workspace_id column' as status;