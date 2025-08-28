-- Create tags table if it doesn't exist (must be created before folders)
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#3B82F6',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, name)
);

-- Create folders table if it doesn't exist
CREATE TABLE IF NOT EXISTS folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Add missing columns to prompts table if they don't exist

-- Add shortcode column
ALTER TABLE prompts 
ADD COLUMN IF NOT EXISTS shortcode VARCHAR(50);

-- Add visibility column
ALTER TABLE prompts 
ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'private';

-- Add is_favorite column
ALTER TABLE prompts 
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;

-- Add folder_id column with foreign key
ALTER TABLE prompts 
ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;

-- Add views column
ALTER TABLE prompts 
ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;

-- Add uses column
ALTER TABLE prompts 
ADD COLUMN IF NOT EXISTS uses INTEGER DEFAULT 0;

-- Add favorites_count column
ALTER TABLE prompts 
ADD COLUMN IF NOT EXISTS favorites_count INTEGER DEFAULT 0;

-- Add shares_count column
ALTER TABLE prompts 
ADD COLUMN IF NOT EXISTS shares_count INTEGER DEFAULT 0;

-- Create prompt_tags table if it doesn't exist (after tags table is created)
CREATE TABLE IF NOT EXISTS prompt_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(prompt_id, tag_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_prompts_shortcode ON prompts(workspace_id, shortcode);
CREATE INDEX IF NOT EXISTS idx_prompts_visibility ON prompts(visibility);
CREATE INDEX IF NOT EXISTS idx_prompts_is_favorite ON prompts(is_favorite);
CREATE INDEX IF NOT EXISTS idx_prompts_folder_id ON prompts(folder_id);
CREATE INDEX IF NOT EXISTS idx_prompt_tags_prompt_id ON prompt_tags(prompt_id);
CREATE INDEX IF NOT EXISTS idx_prompt_tags_tag_id ON prompt_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_folders_workspace_id ON folders(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tags_workspace_id ON tags(workspace_id);