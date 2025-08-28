-- Add sort_order column to folders table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'folders' 
    AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE folders 
    ADD COLUMN sort_order INTEGER DEFAULT 0;
    
    -- Create an index for better performance
    CREATE INDEX IF NOT EXISTS idx_folders_sort_order 
    ON folders(workspace_id, sort_order);
  END IF;
END $$;

-- Update existing folders with initial sort order based on creation date
UPDATE folders 
SET sort_order = sub.rn - 1
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY workspace_id ORDER BY created_at) as rn
  FROM folders
  WHERE sort_order IS NULL OR sort_order = 0
) sub
WHERE folders.id = sub.id;