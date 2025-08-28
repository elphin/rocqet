-- Add documentation column to prompt_chains if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompt_chains' 
    AND column_name = 'documentation'
  ) THEN
    ALTER TABLE prompt_chains 
    ADD COLUMN documentation JSONB DEFAULT '{}';
  END IF;
END $$;

-- Update the steps column to include provider and model per step
-- This is already JSONB so we can store complex data

-- Create chain_runs table to track executions
CREATE TABLE IF NOT EXISTS chain_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chain_id UUID NOT NULL REFERENCES prompt_chains(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Execution data
  input_data JSONB,
  output_data JSONB,
  step_outputs JSONB[], -- Array of outputs from each step
  
  -- Metadata
  status TEXT CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  error_message TEXT,
  execution_time_ms INTEGER,
  total_tokens INTEGER,
  total_cost DECIMAL(10, 4),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_chain_runs_chain_id ON chain_runs(chain_id);
CREATE INDEX IF NOT EXISTS idx_chain_runs_workspace_id ON chain_runs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_chain_runs_user_id ON chain_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_chain_runs_status ON chain_runs(status);

-- Enable RLS
ALTER TABLE chain_runs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chain_runs
DROP POLICY IF EXISTS "Workspace members can view chain runs" ON chain_runs;
CREATE POLICY "Workspace members can view chain runs" ON chain_runs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = chain_runs.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create chain runs" ON chain_runs;
CREATE POLICY "Users can create chain runs" ON chain_runs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = chain_runs.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own chain runs" ON chain_runs;
CREATE POLICY "Users can update their own chain runs" ON chain_runs
  FOR UPDATE USING (
    user_id = auth.uid()
  );