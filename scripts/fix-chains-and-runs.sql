-- Migration: Fix chains slugs and create prompt_chain_runs table
-- Date: 2025-08-24
-- Purpose: Add slug to chains and create missing runs table

-- ========================================
-- 1. Add slug to prompt_chains table
-- ========================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompt_chains' 
    AND column_name = 'slug'
  ) THEN
    ALTER TABLE prompt_chains 
    ADD COLUMN slug VARCHAR(255);
    
    -- Create unique index for workspace + slug
    CREATE UNIQUE INDEX idx_prompt_chains_workspace_slug 
    ON prompt_chains(workspace_id, slug);
    
    COMMENT ON COLUMN prompt_chains.slug IS 'URL-friendly unique identifier within workspace';
  END IF;
END $$;

-- Update existing chains with slugs based on name
UPDATE prompt_chains 
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(name, '[^a-zA-Z0-9\s-]', '', 'g'),  -- Remove special chars
      '\s+', '-', 'g'  -- Replace spaces with dashes
    ),
    '-+', '-', 'g'  -- Replace multiple dashes with single dash
  )
)
WHERE slug IS NULL;

-- ========================================
-- 2. Create prompt_chain_runs table
-- ========================================
CREATE TABLE IF NOT EXISTS prompt_chain_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chain_id UUID NOT NULL REFERENCES prompt_chains(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Execution Details
  input JSONB,  -- Changed from inputs to input to match code
  output JSONB,  -- Changed from outputs to output to match code
  step_results JSONB,  -- Results from each step
  
  -- Performance
  total_tokens INTEGER,
  total_cost INTEGER,  -- In cents
  execution_time INTEGER,  -- In ms
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- pending, running, completed, failed
  error TEXT,
  failed_at_step INTEGER,
  
  -- Tracking
  executed_by UUID,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_prompt_chain_runs_chain 
ON prompt_chain_runs(chain_id);

CREATE INDEX IF NOT EXISTS idx_prompt_chain_runs_workspace 
ON prompt_chain_runs(workspace_id);

CREATE INDEX IF NOT EXISTS idx_prompt_chain_runs_status 
ON prompt_chain_runs(status);

CREATE INDEX IF NOT EXISTS idx_prompt_chain_runs_created 
ON prompt_chain_runs(created_at DESC);

-- ========================================
-- 3. Add RLS policies
-- ========================================
ALTER TABLE prompt_chain_runs ENABLE ROW LEVEL SECURITY;

-- Users can view runs in their workspace
CREATE POLICY "View chain runs" ON prompt_chain_runs
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Users can create runs in their workspace
CREATE POLICY "Create chain runs" ON prompt_chain_runs
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Users can update their own runs
CREATE POLICY "Update own chain runs" ON prompt_chain_runs
  FOR UPDATE
  USING (
    executed_by = auth.uid() OR
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ========================================
-- 4. Helper function to generate unique slug
-- ========================================
CREATE OR REPLACE FUNCTION generate_unique_slug(
  p_name TEXT,
  p_workspace_id UUID,
  p_table_name TEXT DEFAULT 'prompt_chains'
)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
  exists_check BOOLEAN;
BEGIN
  -- Generate base slug from name
  base_slug := LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(p_name, '[^a-zA-Z0-9\s-]', '', 'g'),
        '\s+', '-', 'g'
      ),
      '-+', '-', 'g'
    )
  );
  
  -- Ensure it's not empty
  IF base_slug = '' OR base_slug IS NULL THEN
    base_slug := 'chain';
  END IF;
  
  final_slug := base_slug;
  
  -- Check for uniqueness and add counter if needed
  LOOP
    IF p_table_name = 'prompt_chains' THEN
      SELECT EXISTS(
        SELECT 1 FROM prompt_chains 
        WHERE workspace_id = p_workspace_id 
        AND slug = final_slug
      ) INTO exists_check;
    END IF;
    
    EXIT WHEN NOT exists_check;
    
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 5. Trigger to auto-generate slug on insert
-- ========================================
CREATE OR REPLACE FUNCTION auto_generate_chain_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_unique_slug(NEW.name, NEW.workspace_id, 'prompt_chains');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_generate_chain_slug_trigger ON prompt_chains;
CREATE TRIGGER auto_generate_chain_slug_trigger
  BEFORE INSERT ON prompt_chains
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_chain_slug();

-- ========================================
-- 6. Add audit fields to prompt_chains
-- ========================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompt_chains' 
    AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE prompt_chains 
    ADD COLUMN deleted_at TIMESTAMP,
    ADD COLUMN deleted_by UUID;
  END IF;
END $$;

-- ========================================
-- 7. Grant permissions
-- ========================================
GRANT ALL ON prompt_chain_runs TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

COMMENT ON TABLE prompt_chain_runs IS 'Execution history for prompt chains';
COMMENT ON COLUMN prompt_chains.slug IS 'URL-friendly identifier for chains';

-- ========================================
-- 8. Fix any duplicate slugs (if they exist)
-- ========================================
WITH duplicates AS (
  SELECT 
    id,
    name,
    workspace_id,
    slug,
    ROW_NUMBER() OVER (PARTITION BY workspace_id, slug ORDER BY created_at) as rn
  FROM prompt_chains
  WHERE slug IS NOT NULL
)
UPDATE prompt_chains pc
SET slug = pc.slug || '-' || d.rn
FROM duplicates d
WHERE pc.id = d.id AND d.rn > 1;