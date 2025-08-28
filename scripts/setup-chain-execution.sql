-- Add missing columns to prompt_chains table if they don't exist
DO $$ 
BEGIN
  -- Add run_count if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompt_chains' 
    AND column_name = 'run_count'
  ) THEN
    ALTER TABLE prompt_chains 
    ADD COLUMN run_count INTEGER DEFAULT 0;
  END IF;

  -- Add last_run_at if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompt_chains' 
    AND column_name = 'last_run_at'
  ) THEN
    ALTER TABLE prompt_chains 
    ADD COLUMN last_run_at TIMESTAMP;
  END IF;
END $$;

-- Create prompt_chain_steps table if not exists
CREATE TABLE IF NOT EXISTS prompt_chain_steps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chain_id UUID REFERENCES prompt_chains(id) ON DELETE CASCADE,
  prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  input_mapping JSONB DEFAULT '{}',
  output_key TEXT,
  parallel_group INTEGER,
  retry_config JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes if not exist
CREATE INDEX IF NOT EXISTS idx_chain_steps_chain ON prompt_chain_steps(chain_id);
CREATE INDEX IF NOT EXISTS idx_chain_steps_order ON prompt_chain_steps(chain_id, step_order);

-- Create chain_runs table if not exists
CREATE TABLE IF NOT EXISTS chain_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chain_id UUID REFERENCES prompt_chains(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Execution details
  input JSONB,
  output JSONB,
  steps JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'running', -- running, success, partial, error
  error TEXT,
  
  -- Metrics
  total_tokens INTEGER,
  total_cost DECIMAL(10,4),
  duration_ms INTEGER,
  
  -- Metadata
  executed_by UUID NOT NULL,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_chain_runs_chain ON chain_runs(chain_id);
CREATE INDEX IF NOT EXISTS idx_chain_runs_workspace ON chain_runs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_chain_runs_status ON chain_runs(status);
CREATE INDEX IF NOT EXISTS idx_chain_runs_created_at ON chain_runs(created_at DESC);

-- Add chain_run_id to prompt_runs if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompt_runs' 
    AND column_name = 'chain_run_id'
  ) THEN
    ALTER TABLE prompt_runs 
    ADD COLUMN chain_run_id UUID REFERENCES chain_runs(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index for chain_run_id
CREATE INDEX IF NOT EXISTS idx_prompt_runs_chain_run ON prompt_runs(chain_run_id);

-- Create workspace_api_keys table if not exists
CREATE TABLE IF NOT EXISTS workspace_api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Key details
  name TEXT NOT NULL,
  provider TEXT NOT NULL, -- openai, anthropic, etc.
  api_key TEXT NOT NULL, -- Should be encrypted in production
  
  -- Configuration
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  
  -- Usage tracking
  last_used_at TIMESTAMP,
  usage_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_workspace_api_keys_workspace ON workspace_api_keys(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_api_keys_provider ON workspace_api_keys(workspace_id, provider);

-- Ensure only one default key per workspace
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_workspace_api_keys_default'
  ) THEN
    CREATE UNIQUE INDEX idx_workspace_api_keys_default 
    ON workspace_api_keys(workspace_id) 
    WHERE is_default = true;
  END IF;
END $$;

-- Grant permissions
GRANT ALL ON prompt_chain_steps TO authenticated;
GRANT ALL ON chain_runs TO authenticated;
GRANT ALL ON workspace_api_keys TO authenticated;

-- Row Level Security
ALTER TABLE prompt_chain_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE chain_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies for prompt_chain_steps
DROP POLICY IF EXISTS "Users can view chain steps in their workspace" ON prompt_chain_steps;
CREATE POLICY "Users can view chain steps in their workspace"
  ON prompt_chain_steps FOR SELECT
  USING (
    chain_id IN (
      SELECT id FROM prompt_chains
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members
        WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can manage chain steps in their workspace" ON prompt_chain_steps;
CREATE POLICY "Users can manage chain steps in their workspace"
  ON prompt_chain_steps FOR ALL
  USING (
    chain_id IN (
      SELECT id FROM prompt_chains
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'member')
      )
    )
  );

-- RLS Policies for chain_runs
DROP POLICY IF EXISTS "Users can view chain runs in their workspace" ON chain_runs;
CREATE POLICY "Users can view chain runs in their workspace"
  ON chain_runs FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create chain runs in their workspace" ON chain_runs;
CREATE POLICY "Users can create chain runs in their workspace"
  ON chain_runs FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'member')
    )
  );

-- RLS Policies for workspace_api_keys
DROP POLICY IF EXISTS "Users can view API keys in their workspace" ON workspace_api_keys;
CREATE POLICY "Users can view API keys in their workspace"
  ON workspace_api_keys FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can manage API keys in their workspace" ON workspace_api_keys;
CREATE POLICY "Users can manage API keys in their workspace"
  ON workspace_api_keys FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );