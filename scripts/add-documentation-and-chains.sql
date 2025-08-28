-- Add documentation fields to prompts table
DO $$ 
BEGIN
  -- Add when_to_use column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompts' 
    AND column_name = 'when_to_use'
  ) THEN
    ALTER TABLE prompts ADD COLUMN when_to_use TEXT;
  END IF;

  -- Add example_input column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompts' 
    AND column_name = 'example_input'
  ) THEN
    ALTER TABLE prompts ADD COLUMN example_input JSONB DEFAULT '{}';
  END IF;

  -- Add example_output column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompts' 
    AND column_name = 'example_output'
  ) THEN
    ALTER TABLE prompts ADD COLUMN example_output TEXT;
  END IF;

  -- Add requirements column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompts' 
    AND column_name = 'requirements'
  ) THEN
    ALTER TABLE prompts ADD COLUMN requirements JSONB DEFAULT '[]';
  END IF;

  -- Add warnings column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompts' 
    AND column_name = 'warnings'
  ) THEN
    ALTER TABLE prompts ADD COLUMN warnings JSONB DEFAULT '[]';
  END IF;

  -- Add related_prompts column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompts' 
    AND column_name = 'related_prompts'
  ) THEN
    ALTER TABLE prompts ADD COLUMN related_prompts JSONB DEFAULT '[]';
  END IF;
END $$;

-- Create prompt_chains table
CREATE TABLE IF NOT EXISTS prompt_chains (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Basic Info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Chain Configuration
  steps JSONB NOT NULL DEFAULT '[]',
  default_inputs JSONB DEFAULT '{}',
  
  -- Stats
  run_count INTEGER DEFAULT 0,
  last_run_at TIMESTAMP,
  average_execution_time INTEGER,
  
  -- Metadata
  tags JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  
  created_by UUID NOT NULL,
  updated_by UUID,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for prompt_chains
CREATE INDEX IF NOT EXISTS prompt_chains_workspace_idx ON prompt_chains(workspace_id);
CREATE INDEX IF NOT EXISTS prompt_chains_created_by_idx ON prompt_chains(created_by);

-- Create prompt_chain_runs table
CREATE TABLE IF NOT EXISTS prompt_chain_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chain_id UUID NOT NULL REFERENCES prompt_chains(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Execution Details
  inputs JSONB NOT NULL,
  outputs JSONB NOT NULL,
  step_results JSONB NOT NULL,
  
  -- Performance
  total_tokens INTEGER,
  total_cost INTEGER,
  execution_time INTEGER,
  
  -- Status
  status VARCHAR(50) NOT NULL,
  error TEXT,
  failed_at_step INTEGER,
  
  executed_by UUID NOT NULL,
  executed_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for prompt_chain_runs
CREATE INDEX IF NOT EXISTS prompt_chain_runs_chain_idx ON prompt_chain_runs(chain_id);
CREATE INDEX IF NOT EXISTS prompt_chain_runs_workspace_idx ON prompt_chain_runs(workspace_id);
CREATE INDEX IF NOT EXISTS prompt_chain_runs_executed_at_idx ON prompt_chain_runs(executed_at);

-- Enable RLS for new tables
ALTER TABLE prompt_chains ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_chain_runs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for prompt_chains
CREATE POLICY "Users can view chains in their workspaces" ON prompt_chains
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create chains in their workspaces" ON prompt_chains
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY "Users can update chains in their workspaces" ON prompt_chains
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY "Users can delete chains in their workspaces" ON prompt_chains
  FOR DELETE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- Create RLS policies for prompt_chain_runs
CREATE POLICY "Users can view chain runs in their workspaces" ON prompt_chain_runs
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create chain runs in their workspaces" ON prompt_chain_runs
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'member')
    )
  );