-- Create chains table if not exists
CREATE TABLE IF NOT EXISTS chains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  trigger TEXT NOT NULL DEFAULT 'manual',
  trigger_config JSONB,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes if not exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_chains_workspace_id') THEN
    CREATE INDEX idx_chains_workspace_id ON chains(workspace_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_chains_created_by') THEN
    CREATE INDEX idx_chains_created_by ON chains(created_by);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_chains_active') THEN
    CREATE INDEX idx_chains_active ON chains(active);
  END IF;
END $$;

-- Create chain_executions table if not exists
CREATE TABLE IF NOT EXISTS chain_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_id UUID NOT NULL REFERENCES chains(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  inputs JSONB,
  outputs JSONB,
  error TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  executed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for chain_executions
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_chain_executions_chain_id') THEN
    CREATE INDEX idx_chain_executions_chain_id ON chain_executions(chain_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_chain_executions_workspace_id') THEN
    CREATE INDEX idx_chain_executions_workspace_id ON chain_executions(workspace_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_chain_executions_status') THEN
    CREATE INDEX idx_chain_executions_status ON chain_executions(status);
  END IF;
END $$;

-- Create chain_versions table if not exists
CREATE TABLE IF NOT EXISTS chain_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_id UUID NOT NULL REFERENCES chains(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  steps JSONB NOT NULL,
  trigger TEXT NOT NULL,
  trigger_config JSONB,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for chain_versions
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_chain_versions_chain_id') THEN
    CREATE INDEX idx_chain_versions_chain_id ON chain_versions(chain_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_chain_versions_version') THEN
    CREATE INDEX idx_chain_versions_version ON chain_versions(chain_id, version);
  END IF;
END $$;

-- Create chain_webhook_logs table if not exists
CREATE TABLE IF NOT EXISTS chain_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_id UUID NOT NULL REFERENCES chains(id) ON DELETE CASCADE,
  execution_id UUID REFERENCES chain_executions(id) ON DELETE CASCADE,
  method TEXT NOT NULL,
  headers JSONB,
  body JSONB,
  response JSONB,
  status_code INTEGER,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for chain_webhook_logs
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_chain_webhook_logs_chain_id') THEN
    CREATE INDEX idx_chain_webhook_logs_chain_id ON chain_webhook_logs(chain_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_chain_webhook_logs_execution_id') THEN
    CREATE INDEX idx_chain_webhook_logs_execution_id ON chain_webhook_logs(execution_id);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE chains ENABLE ROW LEVEL SECURITY;
ALTER TABLE chain_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chain_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chain_webhook_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for chains
DROP POLICY IF EXISTS "Users can view chains in their workspaces" ON chains;
CREATE POLICY "Users can view chains in their workspaces" ON chains
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = chains.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create chains in their workspaces" ON chains;
CREATE POLICY "Users can create chains in their workspaces" ON chains
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = chains.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin', 'member')
    )
  );

DROP POLICY IF EXISTS "Users can update chains in their workspaces" ON chains;
CREATE POLICY "Users can update chains in their workspaces" ON chains
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = chains.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin', 'member')
    )
  );

DROP POLICY IF EXISTS "Users can delete chains in their workspaces" ON chains;
CREATE POLICY "Users can delete chains in their workspaces" ON chains
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = chains.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin')
    )
  );

-- Create RLS policies for chain_executions
DROP POLICY IF EXISTS "Users can view executions in their workspaces" ON chain_executions;
CREATE POLICY "Users can view executions in their workspaces" ON chain_executions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = chain_executions.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create executions in their workspaces" ON chain_executions;
CREATE POLICY "Users can create executions in their workspaces" ON chain_executions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = chain_executions.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

-- Create RLS policies for chain_versions
DROP POLICY IF EXISTS "Users can view versions in their workspaces" ON chain_versions;
CREATE POLICY "Users can view versions in their workspaces" ON chain_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chains
      JOIN workspace_members ON workspace_members.workspace_id = chains.workspace_id
      WHERE chains.id = chain_versions.chain_id
      AND workspace_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create versions in their workspaces" ON chain_versions;
CREATE POLICY "Users can create versions in their workspaces" ON chain_versions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM chains
      JOIN workspace_members ON workspace_members.workspace_id = chains.workspace_id
      WHERE chains.id = chain_versions.chain_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin', 'member')
    )
  );

-- Create RLS policies for chain_webhook_logs
DROP POLICY IF EXISTS "Users can view webhook logs in their workspaces" ON chain_webhook_logs;
CREATE POLICY "Users can view webhook logs in their workspaces" ON chain_webhook_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chains
      JOIN workspace_members ON workspace_members.workspace_id = chains.workspace_id
      WHERE chains.id = chain_webhook_logs.chain_id
      AND workspace_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role can insert webhook logs" ON chain_webhook_logs;
CREATE POLICY "Service role can insert webhook logs" ON chain_webhook_logs
  FOR INSERT WITH CHECK (true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for chains table
DROP TRIGGER IF EXISTS update_chains_updated_at ON chains;
CREATE TRIGGER update_chains_updated_at
  BEFORE UPDATE ON chains
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();