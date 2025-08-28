-- Add slug column to templates
DO $$ 
BEGIN
  -- Add slug column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompt_templates' 
    AND column_name = 'slug'
  ) THEN
    ALTER TABLE prompt_templates 
    ADD COLUMN slug VARCHAR(255);
    
    -- Create index for slug lookups
    CREATE INDEX IF NOT EXISTS idx_prompt_templates_slug ON prompt_templates(slug);
    
    -- Add unique constraint on slug
    ALTER TABLE prompt_templates 
    ADD CONSTRAINT prompt_templates_slug_unique UNIQUE (slug);
  END IF;
END $$;

-- Generate slugs for existing templates
UPDATE prompt_templates
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(title, '[^a-zA-Z0-9\s-]', '', 'g'),
      '\s+', '-', 'g'
    ),
    '-+', '-', 'g'
  ) || '-' || SUBSTRING(id::text, 1, 8)
)
WHERE slug IS NULL;

-- Make slug NOT NULL after populating
DO $$ 
BEGIN
  -- Only add NOT NULL if it's not already set
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompt_templates' 
    AND column_name = 'slug'
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE prompt_templates 
    ALTER COLUMN slug SET NOT NULL;
  END IF;
END $$;