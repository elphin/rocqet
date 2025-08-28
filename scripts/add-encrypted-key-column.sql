-- Add encrypted_key column to workspace_api_keys table
DO $$ 
BEGIN
  -- Check if encrypted_key column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workspace_api_keys' 
    AND column_name = 'encrypted_key'
  ) THEN
    ALTER TABLE workspace_api_keys 
    ADD COLUMN encrypted_key TEXT;
  END IF;
  
  -- Check if key column exists before trying to migrate data
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workspace_api_keys' 
    AND column_name = 'key'
  ) THEN
    -- Update existing rows to move key to encrypted_key if needed
    UPDATE workspace_api_keys 
    SET encrypted_key = key 
    WHERE encrypted_key IS NULL AND key IS NOT NULL;
    
    -- Drop the old key column after migration
    ALTER TABLE workspace_api_keys 
    DROP COLUMN key;
  END IF;
  
  -- Add key_preview column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workspace_api_keys' 
    AND column_name = 'key_preview'
  ) THEN
    ALTER TABLE workspace_api_keys 
    ADD COLUMN key_preview VARCHAR(20);
  END IF;
  
  -- Make encrypted_key NOT NULL if it exists and has nullable = YES
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workspace_api_keys' 
    AND column_name = 'encrypted_key'
    AND is_nullable = 'YES'
  ) THEN
    -- First ensure all rows have a value (only if there are rows)
    IF EXISTS (SELECT 1 FROM workspace_api_keys WHERE encrypted_key IS NULL) THEN
      UPDATE workspace_api_keys 
      SET encrypted_key = 'placeholder_to_be_replaced' 
      WHERE encrypted_key IS NULL;
    END IF;
    
    -- Then make it NOT NULL
    ALTER TABLE workspace_api_keys 
    ALTER COLUMN encrypted_key SET NOT NULL;
  END IF;
END $$;