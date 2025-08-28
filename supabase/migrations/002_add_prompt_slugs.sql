-- Add slug column to prompts table
ALTER TABLE prompts 
ADD COLUMN IF NOT EXISTS slug VARCHAR(255);

-- Create index for unique slug per workspace
CREATE INDEX IF NOT EXISTS prompts_workspace_slug_idx 
ON prompts(workspace_id, slug);

-- Temporarily allow NULL values to populate existing records
-- We'll update this after generating slugs for existing prompts