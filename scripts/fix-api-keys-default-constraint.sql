-- Fix the default key constraint issue
DO $$ 
BEGIN
  -- First, drop the problematic unique constraint if it exists
  IF EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'idx_workspace_api_keys_default'
  ) THEN
    ALTER TABLE workspace_api_keys 
    DROP CONSTRAINT idx_workspace_api_keys_default;
  END IF;
  
  -- Also check for index with same name
  IF EXISTS (
    SELECT 1 
    FROM pg_indexes 
    WHERE indexname = 'idx_workspace_api_keys_default'
  ) THEN
    DROP INDEX idx_workspace_api_keys_default;
  END IF;
  
  -- Create a partial unique index that allows multiple non-default keys
  -- but only one default key per workspace+provider combination
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_indexes 
    WHERE indexname = 'idx_workspace_api_keys_one_default_per_provider'
  ) THEN
    CREATE UNIQUE INDEX idx_workspace_api_keys_one_default_per_provider 
    ON workspace_api_keys (workspace_id, provider) 
    WHERE is_default = true;
  END IF;
  
  -- Ensure only one default per workspace+provider
  -- Reset any duplicates first
  UPDATE workspace_api_keys k1
  SET is_default = false
  WHERE is_default = true
  AND EXISTS (
    SELECT 1 
    FROM workspace_api_keys k2 
    WHERE k2.workspace_id = k1.workspace_id 
    AND k2.provider = k1.provider 
    AND k2.is_default = true 
    AND k2.created_at < k1.created_at
  );
  
END $$;