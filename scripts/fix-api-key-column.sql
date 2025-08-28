-- Fix workspace_api_keys table structure
DO $$ 
BEGIN
  -- First, check if api_key column exists and has NOT NULL constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workspace_api_keys' 
    AND column_name = 'api_key'
    AND is_nullable = 'NO'
  ) THEN
    -- Make api_key nullable first
    ALTER TABLE workspace_api_keys 
    ALTER COLUMN api_key DROP NOT NULL;
  END IF;
  
  -- Now check if we need to drop api_key column
  -- Only drop if encrypted_key exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workspace_api_keys' 
    AND column_name = 'encrypted_key'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workspace_api_keys' 
    AND column_name = 'api_key'
  ) THEN
    -- Drop the api_key column since we use encrypted_key
    ALTER TABLE workspace_api_keys 
    DROP COLUMN api_key;
  END IF;
  
  -- Ensure encrypted_key is NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workspace_api_keys' 
    AND column_name = 'encrypted_key'
    AND is_nullable = 'YES'
  ) THEN
    -- Update any NULL values first
    UPDATE workspace_api_keys 
    SET encrypted_key = 'placeholder' 
    WHERE encrypted_key IS NULL;
    
    -- Then make it NOT NULL
    ALTER TABLE workspace_api_keys 
    ALTER COLUMN encrypted_key SET NOT NULL;
  END IF;
END $$;