-- Add slug column to prompts table
ALTER TABLE prompts 
ADD COLUMN IF NOT EXISTS slug VARCHAR(255);

-- Create index for unique slug per workspace
CREATE INDEX IF NOT EXISTS prompts_workspace_slug_idx 
ON prompts(workspace_id, slug);

-- Message
SELECT 'Migration completed! Now visit /api/fix-prompt-slugs to generate slugs for existing prompts.' as message;