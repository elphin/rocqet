-- Rename key_preview to masked_key for consistency
DO $$ 
BEGIN
  -- Check if key_preview exists and masked_key doesn't
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workspace_api_keys' 
    AND column_name = 'key_preview'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workspace_api_keys' 
    AND column_name = 'masked_key'
  ) THEN
    ALTER TABLE workspace_api_keys 
    RENAME COLUMN key_preview TO masked_key;
  END IF;
  
  -- If masked_key doesn't exist at all, create it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workspace_api_keys' 
    AND column_name = 'masked_key'
  ) THEN
    ALTER TABLE workspace_api_keys 
    ADD COLUMN masked_key VARCHAR(20);
  END IF;
END $$;