-- Create database type enum if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'database_type') THEN
    CREATE TYPE database_type AS ENUM (
      'postgresql',
      'mysql',
      'mongodb',
      'redis',
      'elasticsearch',
      'clickhouse',
      'snowflake',
      'bigquery',
      'redshift',
      'dynamodb',
      'cosmosdb',
      'firebase',
      'supabase',
      'custom'
    );
  END IF;
END $$;

-- Create database_connections table if not exists
CREATE TABLE IF NOT EXISTS database_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type database_type NOT NULL,
  
  -- Connection details
  host TEXT,
  port TEXT,
  database TEXT,
  username TEXT,
  password TEXT, -- Encrypted
  
  -- Alternative connection method
  connection_string TEXT, -- Encrypted
  ssl_enabled BOOLEAN DEFAULT false,
  ssl_config JSONB,
  
  -- Connection pooling
  pool_min TEXT DEFAULT '2',
  pool_max TEXT DEFAULT '10',
  connection_timeout TEXT DEFAULT '30000',
  
  -- Advanced options
  options JSONB,
  
  -- Security restrictions
  read_only BOOLEAN DEFAULT true,
  allowed_operations JSONB DEFAULT '["select"]'::jsonb,
  ip_whitelist JSONB,
  
  -- Monitoring
  last_tested_at TIMESTAMP WITH TIME ZONE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  test_status TEXT,
  test_message TEXT,
  
  -- Metadata
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for database_connections
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_database_connections_workspace_id') THEN
    CREATE INDEX idx_database_connections_workspace_id ON database_connections(workspace_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_database_connections_type') THEN
    CREATE INDEX idx_database_connections_type ON database_connections(type);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_database_connections_is_active') THEN
    CREATE INDEX idx_database_connections_is_active ON database_connections(is_active);
  END IF;
END $$;

-- Create database_connection_logs table if not exists
CREATE TABLE IF NOT EXISTS database_connection_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES database_connections(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  
  -- Query details
  operation TEXT NOT NULL,
  query TEXT,
  query_hash TEXT,
  
  -- Performance metrics
  execution_time TEXT,
  rows_affected TEXT,
  bytes_transferred TEXT,
  
  -- Result
  status TEXT NOT NULL,
  error TEXT,
  
  -- Context
  chain_id UUID,
  prompt_id UUID,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for database_connection_logs
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_database_connection_logs_connection_id') THEN
    CREATE INDEX idx_database_connection_logs_connection_id ON database_connection_logs(connection_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_database_connection_logs_workspace_id') THEN
    CREATE INDEX idx_database_connection_logs_workspace_id ON database_connection_logs(workspace_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_database_connection_logs_user_id') THEN
    CREATE INDEX idx_database_connection_logs_user_id ON database_connection_logs(user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_database_connection_logs_created_at') THEN
    CREATE INDEX idx_database_connection_logs_created_at ON database_connection_logs(created_at DESC);
  END IF;
END $$;

-- Create database_schemas table if not exists
CREATE TABLE IF NOT EXISTS database_schemas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES database_connections(id) ON DELETE CASCADE,
  
  -- Schema information
  schema_name TEXT,
  table_name TEXT,
  columns JSONB,
  indexes JSONB,
  constraints JSONB,
  
  -- Metadata
  row_count TEXT,
  size_bytes TEXT,
  
  last_synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for database_schemas
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_database_schemas_connection_id') THEN
    CREATE INDEX idx_database_schemas_connection_id ON database_schemas(connection_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_database_schemas_table_name') THEN
    CREATE INDEX idx_database_schemas_table_name ON database_schemas(connection_id, schema_name, table_name);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE database_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE database_connection_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE database_schemas ENABLE ROW LEVEL SECURITY;

-- RLS Policies for database_connections
DROP POLICY IF EXISTS "Users can view connections in their workspaces" ON database_connections;
CREATE POLICY "Users can view connections in their workspaces" ON database_connections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = database_connections.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create connections in pro workspaces" ON database_connections;
CREATE POLICY "Users can create connections in pro workspaces" ON database_connections
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      JOIN workspaces ON workspaces.id = workspace_members.workspace_id
      WHERE workspace_members.workspace_id = database_connections.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin', 'member')
      AND workspaces.subscription_tier IN ('pro', 'business')
    )
  );

DROP POLICY IF EXISTS "Users can update connections in their workspaces" ON database_connections;
CREATE POLICY "Users can update connections in their workspaces" ON database_connections
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = database_connections.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin', 'member')
    )
  );

DROP POLICY IF EXISTS "Users can delete connections in their workspaces" ON database_connections;
CREATE POLICY "Users can delete connections in their workspaces" ON database_connections
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = database_connections.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin')
    )
  );

-- RLS Policies for database_connection_logs
DROP POLICY IF EXISTS "Users can view logs in their workspaces" ON database_connection_logs;
CREATE POLICY "Users can view logs in their workspaces" ON database_connection_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = database_connection_logs.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "System can insert logs" ON database_connection_logs;
CREATE POLICY "System can insert logs" ON database_connection_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = database_connection_logs.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

-- RLS Policies for database_schemas
DROP POLICY IF EXISTS "Users can view schemas in their connections" ON database_schemas;
CREATE POLICY "Users can view schemas in their connections" ON database_schemas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM database_connections
      JOIN workspace_members ON workspace_members.workspace_id = database_connections.workspace_id
      WHERE database_connections.id = database_schemas.connection_id
      AND workspace_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "System can manage schemas" ON database_schemas;
CREATE POLICY "System can manage schemas" ON database_schemas
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM database_connections
      JOIN workspace_members ON workspace_members.workspace_id = database_connections.workspace_id
      WHERE database_connections.id = database_schemas.connection_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin', 'member')
    )
  );

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_database_connections_updated_at ON database_connections;
CREATE TRIGGER update_database_connections_updated_at
  BEFORE UPDATE ON database_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();