-- Add new fields for storing default prompt settings
-- These allow users to save their preferred model/provider/settings from test runs

-- Add provider field (OpenAI, Anthropic, Google, etc)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompts' 
    AND column_name = 'default_provider'
  ) THEN
    ALTER TABLE prompts 
    ADD COLUMN default_provider VARCHAR(50);
  END IF;
END $$;

-- Add max tokens field for token limit settings
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompts' 
    AND column_name = 'default_max_tokens'
  ) THEN
    ALTER TABLE prompts 
    ADD COLUMN default_max_tokens INTEGER;
  END IF;
END $$;

-- Note: model and temperature fields already exist in the schema
-- model: varchar(100) default 'gpt-4'
-- temperature: integer default 7 (divide by 10 for actual value)

-- Add top_p field for nucleus sampling
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompts' 
    AND column_name = 'default_top_p'
  ) THEN
    ALTER TABLE prompts 
    ADD COLUMN default_top_p INTEGER DEFAULT 10; -- Stored as integer*10 for precision
  END IF;
END $$;

-- Add frequency penalty field
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompts' 
    AND column_name = 'default_frequency_penalty'
  ) THEN
    ALTER TABLE prompts 
    ADD COLUMN default_frequency_penalty INTEGER DEFAULT 0; -- Stored as integer*10
  END IF;
END $$;

-- Add presence penalty field
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompts' 
    AND column_name = 'default_presence_penalty'
  ) THEN
    ALTER TABLE prompts 
    ADD COLUMN default_presence_penalty INTEGER DEFAULT 0; -- Stored as integer*10
  END IF;
END $$;

-- Add index for provider field for better query performance
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'prompts' 
    AND indexname = 'prompts_provider_idx'
  ) THEN
    CREATE INDEX prompts_provider_idx ON prompts(default_provider);
  END IF;
END $$;