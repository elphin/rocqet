-- Fix unique constraint issue before running migrations
-- Drop the problematic constraint if it exists
DROP INDEX IF EXISTS idx_workspace_api_keys_default;

-- Also check and drop if it exists as a constraint
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'idx_workspace_api_keys_default'
  ) THEN
    ALTER TABLE workspace_api_keys 
    DROP CONSTRAINT idx_workspace_api_keys_default;
  END IF;
END $$;

-- Fix duplicate default keys in workspace_api_keys
-- Keep only the most recent default key per workspace
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'workspace_api_keys'
  ) THEN
    WITH ranked_keys AS (
      SELECT id, workspace_id, is_default,
             ROW_NUMBER() OVER (PARTITION BY workspace_id ORDER BY created_at DESC) as rn
      FROM workspace_api_keys
      WHERE is_default = true
    )
    UPDATE workspace_api_keys
    SET is_default = false
    WHERE id IN (
      SELECT id FROM ranked_keys WHERE rn > 1
    );
  END IF;
END $$;