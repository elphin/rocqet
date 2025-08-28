-- Add prompt-specific settings to templates table
-- These match the fields we have in the prompts table

-- Add AI model settings
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompt_templates' 
    AND column_name = 'model'
  ) THEN
    ALTER TABLE prompt_templates 
    ADD COLUMN model VARCHAR(100) DEFAULT 'gpt-4';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompt_templates' 
    AND column_name = 'temperature'
  ) THEN
    ALTER TABLE prompt_templates 
    ADD COLUMN temperature INTEGER DEFAULT 7;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompt_templates' 
    AND column_name = 'max_tokens'
  ) THEN
    ALTER TABLE prompt_templates 
    ADD COLUMN max_tokens INTEGER;
  END IF;
END $$;

-- Add parameters for platform-specific settings
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompt_templates' 
    AND column_name = 'parameters'
  ) THEN
    ALTER TABLE prompt_templates 
    ADD COLUMN parameters JSONB DEFAULT '{}';
  END IF;
END $$;

-- Add when_to_use field for guidance
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompt_templates' 
    AND column_name = 'when_to_use'
  ) THEN
    ALTER TABLE prompt_templates 
    ADD COLUMN when_to_use TEXT;
  END IF;
END $$;

-- Add link to original prompt (for tracking updates)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompt_templates' 
    AND column_name = 'source_prompt_id'
  ) THEN
    ALTER TABLE prompt_templates 
    ADD COLUMN source_prompt_id UUID REFERENCES prompts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add shortcode (matching prompts table)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompt_templates' 
    AND column_name = 'shortcode'
  ) THEN
    ALTER TABLE prompt_templates 
    ADD COLUMN shortcode VARCHAR(255);
  END IF;
END $$;

-- Add tracking for imported prompts (in prompts table)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompts' 
    AND column_name = 'imported_from_template_id'
  ) THEN
    ALTER TABLE prompts 
    ADD COLUMN imported_from_template_id UUID REFERENCES prompt_templates(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_templates_source_prompt ON prompt_templates(source_prompt_id);
CREATE INDEX IF NOT EXISTS idx_prompts_imported_from ON prompts(imported_from_template_id);

-- Update existing templates with default model settings
UPDATE prompt_templates 
SET model = 'gpt-4', temperature = 7 
WHERE model IS NULL;