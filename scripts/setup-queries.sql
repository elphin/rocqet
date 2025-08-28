-- Query Management Tables for ROCQET
-- Safe migration script with IF NOT EXISTS checks

-- Main queries table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'queries') THEN
    CREATE TABLE queries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      connection_id UUID NOT NULL REFERENCES database_connections(id) ON DELETE CASCADE,
      
      -- Basic info
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL,
      description TEXT,
      
      -- Query content
      sql_template TEXT NOT NULL,
      variables_schema JSONB DEFAULT '[]'::jsonb,
      
      -- Organization
      folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
      tags TEXT[] DEFAULT '{}',
      is_favorite BOOLEAN DEFAULT false,
      
      -- Security
      is_read_only BOOLEAN DEFAULT true,
      requires_approval BOOLEAN DEFAULT false,
      allowed_users UUID[] DEFAULT '{}',
      
      -- Metadata
      created_by UUID NOT NULL REFERENCES auth.users(id),
      updated_by UUID NOT NULL REFERENCES auth.users(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    -- Create unique index
    CREATE UNIQUE INDEX queries_workspace_slug_unique ON queries(workspace_id, slug);
    
    -- Create other indexes
    CREATE INDEX idx_queries_workspace ON queries(workspace_id);
    CREATE INDEX idx_queries_connection ON queries(connection_id);
    CREATE INDEX idx_queries_folder ON queries(folder_id);
    CREATE INDEX idx_queries_tags ON queries USING GIN(tags);
  END IF;
END $$;

-- Query execution history
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'query_runs') THEN
    CREATE TABLE query_runs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      query_id UUID NOT NULL REFERENCES queries(id) ON DELETE CASCADE,
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES auth.users(id),
      
      -- Execution details
      parameters JSONB,
      sql_executed TEXT NOT NULL,
      
      -- Results
      status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'success', 'error')),
      rows_returned INTEGER,
      rows_affected INTEGER,
      execution_time_ms INTEGER,
      error_message TEXT,
      result_data JSONB,
      
      -- Chain context
      chain_run_id UUID,
      step_id UUID,
      
      executed_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    -- Create indexes
    CREATE INDEX idx_query_runs_query ON query_runs(query_id);
    CREATE INDEX idx_query_runs_workspace ON query_runs(workspace_id);
    CREATE INDEX idx_query_runs_user ON query_runs(user_id);
    CREATE INDEX idx_query_runs_status ON query_runs(status);
    CREATE INDEX idx_query_runs_executed ON query_runs(executed_at DESC);
  END IF;
END $$;

-- Query versions
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'query_versions') THEN
    CREATE TABLE query_versions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      query_id UUID NOT NULL REFERENCES queries(id) ON DELETE CASCADE,
      version INTEGER NOT NULL,
      
      -- Version content
      sql_template TEXT NOT NULL,
      variables_schema JSONB,
      change_description TEXT,
      
      -- Metadata
      created_by UUID NOT NULL REFERENCES auth.users(id),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    -- Create unique index
    CREATE UNIQUE INDEX query_versions_unique ON query_versions(query_id, version);
    
    -- Create other indexes
    CREATE INDEX idx_query_versions_query ON query_versions(query_id);
  END IF;
END $$;

-- Query cache
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'query_cache') THEN
    CREATE TABLE query_cache (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      query_id UUID NOT NULL REFERENCES queries(id) ON DELETE CASCADE,
      parameters_hash VARCHAR(64) NOT NULL,
      
      -- Cached data
      result_data JSONB NOT NULL,
      result_count INTEGER,
      
      -- Cache management
      cached_at TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ
    );
    
    -- Create unique index
    CREATE UNIQUE INDEX query_cache_unique ON query_cache(query_id, parameters_hash);
    
    -- Create other indexes
    CREATE INDEX idx_query_cache_expires ON query_cache(expires_at);
  END IF;
END $$;

-- Query snippets
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'query_snippets') THEN
    CREATE TABLE query_snippets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL,
      description TEXT,
      sql_snippet TEXT NOT NULL,
      
      created_by UUID NOT NULL REFERENCES auth.users(id),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    -- Create unique index
    CREATE UNIQUE INDEX snippets_workspace_slug_unique ON query_snippets(workspace_id, slug);
    
    -- Create other indexes
    CREATE INDEX idx_snippets_workspace ON query_snippets(workspace_id);
  END IF;
END $$;

-- Row Level Security Policies

-- Enable RLS
ALTER TABLE queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_snippets ENABLE ROW LEVEL SECURITY;

-- Queries policies
DROP POLICY IF EXISTS "Users can view queries in their workspaces" ON queries;
CREATE POLICY "Users can view queries in their workspaces" ON queries
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create queries in their workspaces" ON queries;
CREATE POLICY "Users can create queries in their workspaces" ON queries
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'member')
    )
  );

DROP POLICY IF EXISTS "Users can update their own queries" ON queries;
CREATE POLICY "Users can update their own queries" ON queries
  FOR UPDATE USING (
    created_by = auth.uid() OR
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can delete their own queries" ON queries;
CREATE POLICY "Users can delete their own queries" ON queries
  FOR DELETE USING (
    created_by = auth.uid() OR
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- Query runs policies
DROP POLICY IF EXISTS "Users can view query runs in their workspaces" ON query_runs;
CREATE POLICY "Users can view query runs in their workspaces" ON query_runs
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create query runs" ON query_runs;
CREATE POLICY "Users can create query runs" ON query_runs
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Query versions policies
DROP POLICY IF EXISTS "Users can view query versions" ON query_versions;
CREATE POLICY "Users can view query versions" ON query_versions
  FOR SELECT USING (
    query_id IN (
      SELECT id FROM queries WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can create query versions" ON query_versions;
CREATE POLICY "Users can create query versions" ON query_versions
  FOR INSERT WITH CHECK (
    query_id IN (
      SELECT id FROM queries WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'member')
      )
    )
  );

-- Snippets policies
DROP POLICY IF EXISTS "Users can view snippets in their workspaces" ON query_snippets;
CREATE POLICY "Users can view snippets in their workspaces" ON query_snippets
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage snippets" ON query_snippets;
CREATE POLICY "Users can manage snippets" ON query_snippets
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Cache policies
DROP POLICY IF EXISTS "Users can view cache" ON query_cache;
CREATE POLICY "Users can view cache" ON query_cache
  FOR SELECT USING (
    query_id IN (
      SELECT id FROM queries WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "System can manage cache" ON query_cache;
CREATE POLICY "System can manage cache" ON query_cache
  FOR ALL USING (true);