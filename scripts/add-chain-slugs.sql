-- Add slug column to chains table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chains' 
    AND column_name = 'slug'
  ) THEN
    ALTER TABLE chains 
    ADD COLUMN slug TEXT;
  END IF;
END $$;

-- Generate slugs for existing chains (if any)
UPDATE chains 
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(name, '[^a-zA-Z0-9\s-]', '', 'g'),
      '\s+', '-', 'g'
    ),
    '-+', '-', 'g'
  )
) || '-' || SUBSTR(id::TEXT, 1, 8)
WHERE slug IS NULL;

-- Make slug not null after populating
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chains' 
    AND column_name = 'slug'
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE chains 
    ALTER COLUMN slug SET NOT NULL;
  END IF;
END $$;

-- Create unique index for workspace + slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_chains_workspace_slug 
ON chains(workspace_id, slug);