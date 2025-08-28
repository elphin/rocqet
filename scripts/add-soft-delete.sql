-- Add soft delete columns to prompts table
-- This allows us to keep deleted prompts in a "trash" for 30 days

-- Add deleted_at column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompts' 
    AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE prompts 
    ADD COLUMN deleted_at timestamp with time zone DEFAULT NULL;
  END IF;
END $$;

-- Add deleted_by column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompts' 
    AND column_name = 'deleted_by'
  ) THEN
    ALTER TABLE prompts 
    ADD COLUMN deleted_by uuid DEFAULT NULL;
  END IF;
END $$;

-- Add original_folder_id to remember where to restore
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompts' 
    AND column_name = 'original_folder_id'
  ) THEN
    ALTER TABLE prompts 
    ADD COLUMN original_folder_id uuid DEFAULT NULL;
  END IF;
END $$;

-- Create index for faster trash queries
CREATE INDEX IF NOT EXISTS prompts_deleted_at_idx ON prompts(deleted_at) WHERE deleted_at IS NOT NULL;

-- Create a function to automatically clean up items older than 30 days
CREATE OR REPLACE FUNCTION clean_old_trash()
RETURNS void AS $$
BEGIN
  DELETE FROM prompts 
  WHERE deleted_at IS NOT NULL 
  AND deleted_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a scheduled job to run cleanup daily (requires pg_cron extension)
-- SELECT cron.schedule('clean-trash', '0 0 * * *', 'SELECT clean_old_trash();');

-- Update RLS policies to exclude soft-deleted items by default
DROP POLICY IF EXISTS "Users can view their workspace prompts" ON prompts;

CREATE POLICY "Users can view their workspace prompts"
  ON prompts FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
    -- Only show non-deleted prompts by default
    AND deleted_at IS NULL
  );

-- Create a separate policy for viewing trash items
CREATE POLICY "Users can view their workspace trash"
  ON prompts FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
    -- This will be used on the trash page
    AND deleted_at IS NOT NULL
  );

-- Update policy for soft delete (not actual delete)
DROP POLICY IF EXISTS "Members can delete prompts" ON prompts;

CREATE POLICY "Members can soft delete prompts"
  ON prompts FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'member')
    )
  );

-- Policy for permanent delete (only for system cleanup)
CREATE POLICY "System can permanently delete old trash"
  ON prompts FOR DELETE
  USING (
    deleted_at IS NOT NULL 
    AND deleted_at < NOW() - INTERVAL '30 days'
  );