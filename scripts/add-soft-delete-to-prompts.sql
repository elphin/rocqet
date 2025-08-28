-- Migration: Add soft delete columns to prompts table
-- Date: 2025-08-24
-- Purpose: Enable soft delete functionality for prompts (move to trash instead of hard delete)

-- Add soft delete columns if they don't exist
DO $$ 
BEGIN
  -- Add deleted_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompts' 
    AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE prompts 
    ADD COLUMN deleted_at TIMESTAMP;
    
    COMMENT ON COLUMN prompts.deleted_at IS 'Timestamp when the prompt was soft deleted';
  END IF;

  -- Add deleted_by column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompts' 
    AND column_name = 'deleted_by'
  ) THEN
    ALTER TABLE prompts 
    ADD COLUMN deleted_by UUID;
    
    COMMENT ON COLUMN prompts.deleted_by IS 'User ID who deleted the prompt';
  END IF;

  -- Add original_folder_id column (to restore to correct folder)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompts' 
    AND column_name = 'original_folder_id'
  ) THEN
    ALTER TABLE prompts 
    ADD COLUMN original_folder_id UUID;
    
    COMMENT ON COLUMN prompts.original_folder_id IS 'Original folder ID before deletion (for restore)';
  END IF;
END $$;

-- Create index for faster trash queries
CREATE INDEX IF NOT EXISTS idx_prompts_deleted_at 
ON prompts(deleted_at) 
WHERE deleted_at IS NOT NULL;

-- Create index for workspace trash queries
CREATE INDEX IF NOT EXISTS idx_prompts_workspace_deleted 
ON prompts(workspace_id, deleted_at);

-- Update RLS policies to exclude soft-deleted items by default
-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Workspace members can view prompts" ON prompts;

-- Create new policy that excludes soft-deleted items
CREATE POLICY "Workspace members can view prompts" ON prompts
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
    -- Exclude soft-deleted items unless specifically querying trash
    AND (deleted_at IS NULL OR current_setting('app.include_deleted', true) = 'true')
  );

-- Create a view for trash items
CREATE OR REPLACE VIEW prompts_trash AS
SELECT * FROM prompts 
WHERE deleted_at IS NOT NULL 
  AND deleted_at > (CURRENT_TIMESTAMP - INTERVAL '30 days');

-- Grant permissions on the trash view
GRANT SELECT ON prompts_trash TO authenticated;

-- Function to permanently delete old soft-deleted items (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_deleted_prompts()
RETURNS void AS $$
BEGIN
  -- Permanently delete items soft-deleted more than 30 days ago
  DELETE FROM prompts 
  WHERE deleted_at IS NOT NULL 
    AND deleted_at < (CURRENT_TIMESTAMP - INTERVAL '30 days');
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a scheduled job to run cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-deleted-prompts', '0 2 * * *', 'SELECT cleanup_old_deleted_prompts();');

COMMENT ON TABLE prompts IS 'Prompts table with soft delete support. Items with deleted_at set are in trash.';