-- Add advanced features to prompt_chains table
DO $$ 
BEGIN
  -- Add triggers column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompt_chains' 
    AND column_name = 'triggers'
  ) THEN
    ALTER TABLE prompt_chains 
    ADD COLUMN triggers JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- Add error_handling column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompt_chains' 
    AND column_name = 'error_handling'
  ) THEN
    ALTER TABLE prompt_chains 
    ADD COLUMN error_handling JSONB DEFAULT '{}'::jsonb;
  END IF;

  -- Add retry_policy column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompt_chains' 
    AND column_name = 'retry_policy'
  ) THEN
    ALTER TABLE prompt_chains 
    ADD COLUMN retry_policy JSONB DEFAULT '{}'::jsonb;
  END IF;

  -- Add notifications column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompt_chains' 
    AND column_name = 'notifications'
  ) THEN
    ALTER TABLE prompt_chains 
    ADD COLUMN notifications JSONB DEFAULT '{}'::jsonb;
  END IF;

  -- Add variables column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompt_chains' 
    AND column_name = 'variables'
  ) THEN
    ALTER TABLE prompt_chains 
    ADD COLUMN variables JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- Add max_execution_time column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompt_chains' 
    AND column_name = 'max_execution_time'
  ) THEN
    ALTER TABLE prompt_chains 
    ADD COLUMN max_execution_time INTEGER;
  END IF;

  -- Add max_parallel_steps column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompt_chains' 
    AND column_name = 'max_parallel_steps'
  ) THEN
    ALTER TABLE prompt_chains 
    ADD COLUMN max_parallel_steps INTEGER DEFAULT 5;
  END IF;

  -- Add require_approval column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompt_chains' 
    AND column_name = 'require_approval'
  ) THEN
    ALTER TABLE prompt_chains 
    ADD COLUMN require_approval BOOLEAN DEFAULT false;
  END IF;

  -- Add approvers column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompt_chains' 
    AND column_name = 'approvers'
  ) THEN
    ALTER TABLE prompt_chains 
    ADD COLUMN approvers JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- Add success_count column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompt_chains' 
    AND column_name = 'success_count'
  ) THEN
    ALTER TABLE prompt_chains 
    ADD COLUMN success_count INTEGER DEFAULT 0;
  END IF;

  -- Add failure_count column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompt_chains' 
    AND column_name = 'failure_count'
  ) THEN
    ALTER TABLE prompt_chains 
    ADD COLUMN failure_count INTEGER DEFAULT 0;
  END IF;

  -- Add last_success_at column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompt_chains' 
    AND column_name = 'last_success_at'
  ) THEN
    ALTER TABLE prompt_chains 
    ADD COLUMN last_success_at TIMESTAMP;
  END IF;

  -- Add last_failure_at column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompt_chains' 
    AND column_name = 'last_failure_at'
  ) THEN
    ALTER TABLE prompt_chains 
    ADD COLUMN last_failure_at TIMESTAMP;
  END IF;

  -- Add total_cost column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompt_chains' 
    AND column_name = 'total_cost'
  ) THEN
    ALTER TABLE prompt_chains 
    ADD COLUMN total_cost INTEGER DEFAULT 0;
  END IF;

  -- Add total_tokens column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompt_chains' 
    AND column_name = 'total_tokens'
  ) THEN
    ALTER TABLE prompt_chains 
    ADD COLUMN total_tokens INTEGER DEFAULT 0;
  END IF;

  -- Add SLA columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompt_chains' 
    AND column_name = 'sla_target'
  ) THEN
    ALTER TABLE prompt_chains 
    ADD COLUMN sla_target INTEGER,
    ADD COLUMN sla_compliance INTEGER,
    ADD COLUMN p95_execution_time INTEGER,
    ADD COLUMN p99_execution_time INTEGER;
  END IF;

  -- Add version control columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompt_chains' 
    AND column_name = 'version'
  ) THEN
    ALTER TABLE prompt_chains 
    ADD COLUMN version INTEGER DEFAULT 1,
    ADD COLUMN published_version INTEGER,
    ADD COLUMN is_draft BOOLEAN DEFAULT true;
  END IF;

  -- Add category and template columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompt_chains' 
    AND column_name = 'category'
  ) THEN
    ALTER TABLE prompt_chains 
    ADD COLUMN category VARCHAR(100),
    ADD COLUMN is_template BOOLEAN DEFAULT false,
    ADD COLUMN template_category VARCHAR(100);
  END IF;

  -- Add scheduling columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompt_chains' 
    AND column_name = 'schedule'
  ) THEN
    ALTER TABLE prompt_chains 
    ADD COLUMN schedule JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN next_run_at TIMESTAMP;
  END IF;

  -- Add access control columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompt_chains' 
    AND column_name = 'visibility'
  ) THEN
    ALTER TABLE prompt_chains 
    ADD COLUMN visibility VARCHAR(20) DEFAULT 'private',
    ADD COLUMN allowed_users JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN allowed_roles JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS prompt_chains_active_idx ON prompt_chains(is_active);
CREATE INDEX IF NOT EXISTS prompt_chains_template_idx ON prompt_chains(is_template);
CREATE INDEX IF NOT EXISTS prompt_chains_next_run_idx ON prompt_chains(next_run_at);

-- Enhance prompt_chain_runs table
DO $$ 
BEGIN
  -- Add variables column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompt_chain_runs' 
    AND column_name = 'variables'
  ) THEN
    ALTER TABLE prompt_chain_runs 
    ADD COLUMN variables JSONB DEFAULT '{}'::jsonb;
  END IF;

  -- Add step metrics columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompt_chain_runs' 
    AND column_name = 'total_steps'
  ) THEN
    ALTER TABLE prompt_chain_runs 
    ADD COLUMN total_steps INTEGER,
    ADD COLUMN completed_steps INTEGER,
    ADD COLUMN skipped_steps INTEGER,
    ADD COLUMN failed_steps INTEGER,
    ADD COLUMN parallel_executions INTEGER;
  END IF;

  -- Add debug information columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompt_chain_runs' 
    AND column_name = 'execution_path'
  ) THEN
    ALTER TABLE prompt_chain_runs 
    ADD COLUMN execution_path JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN branching_decisions JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN loop_iterations JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN debug_log JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- Add error tracking columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompt_chain_runs' 
    AND column_name = 'errors'
  ) THEN
    ALTER TABLE prompt_chain_runs 
    ADD COLUMN errors JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN retry_attempts JSONB DEFAULT '{}'::jsonb;
  END IF;

  -- Update status column to support more states
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompt_chain_runs' 
    AND column_name = 'failed_at_step'
  ) THEN
    ALTER TABLE prompt_chain_runs 
    ADD COLUMN failed_at_step VARCHAR(255);
  END IF;

  -- Add trigger context columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompt_chain_runs' 
    AND column_name = 'trigger_type'
  ) THEN
    ALTER TABLE prompt_chain_runs 
    ADD COLUMN trigger_type VARCHAR(50),
    ADD COLUMN trigger_data JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN parent_run_id UUID;
  END IF;

  -- Add timestamp columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompt_chain_runs' 
    AND column_name = 'started_at'
  ) THEN
    ALTER TABLE prompt_chain_runs 
    ADD COLUMN started_at TIMESTAMP,
    ADD COLUMN completed_at TIMESTAMP;
  END IF;
END $$;

-- Create indexes for enhanced columns
CREATE INDEX IF NOT EXISTS prompt_chain_runs_status_idx ON prompt_chain_runs(status);
CREATE INDEX IF NOT EXISTS prompt_chain_runs_parent_idx ON prompt_chain_runs(parent_run_id);

-- Create chain_alerts table
CREATE TABLE IF NOT EXISTS chain_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  chain_id UUID REFERENCES prompt_chains(id) ON DELETE CASCADE,
  
  -- Alert Configuration
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL, -- failure, sla_breach, cost_threshold, error_rate
  severity VARCHAR(20) NOT NULL, -- low, medium, high, critical
  
  -- Conditions
  conditions JSONB NOT NULL, -- Alert trigger conditions
  threshold INTEGER, -- Numeric threshold value
  time_window INTEGER, -- Time window in seconds for rate-based alerts
  
  -- Actions
  actions JSONB NOT NULL, -- [{type: 'email', recipients: []}, {type: 'webhook', url: ''}]
  cooldown_period INTEGER DEFAULT 300, -- Seconds before re-triggering
  
  -- State
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMP,
  trigger_count INTEGER DEFAULT 0,
  
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for chain_alerts
CREATE INDEX IF NOT EXISTS chain_alerts_workspace_idx ON chain_alerts(workspace_id);
CREATE INDEX IF NOT EXISTS chain_alerts_chain_idx ON chain_alerts(chain_id);
CREATE INDEX IF NOT EXISTS chain_alerts_active_idx ON chain_alerts(is_active);

-- Create chain_alert_history table
CREATE TABLE IF NOT EXISTS chain_alert_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id UUID REFERENCES chain_alerts(id) ON DELETE CASCADE NOT NULL,
  chain_run_id UUID REFERENCES prompt_chain_runs(id) ON DELETE SET NULL,
  
  -- Alert Details
  triggered_at TIMESTAMP DEFAULT NOW() NOT NULL,
  alert_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  
  -- Context
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb, -- Additional context data
  metrics JSONB DEFAULT '{}'::jsonb, -- Metrics at time of alert
  
  -- Actions Taken
  actions_executed JSONB DEFAULT '[]'::jsonb,
  action_results JSONB DEFAULT '{}'::jsonb,
  
  -- Resolution
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID,
  acknowledged_at TIMESTAMP,
  notes TEXT
);

-- Create indexes for chain_alert_history
CREATE INDEX IF NOT EXISTS chain_alert_history_alert_idx ON chain_alert_history(alert_id);
CREATE INDEX IF NOT EXISTS chain_alert_history_run_idx ON chain_alert_history(chain_run_id);
CREATE INDEX IF NOT EXISTS chain_alert_history_triggered_idx ON chain_alert_history(triggered_at);

-- Create chain_templates table
CREATE TABLE IF NOT EXISTS chain_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Template Info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  icon VARCHAR(50),
  
  -- Template Content
  steps JSONB NOT NULL, -- Template chain steps
  variables JSONB DEFAULT '[]'::jsonb, -- Required variables
  default_inputs JSONB DEFAULT '{}'::jsonb,
  documentation TEXT,
  examples JSONB DEFAULT '[]'::jsonb,
  
  -- Marketplace
  is_public BOOLEAN DEFAULT false,
  is_official BOOLEAN DEFAULT false, -- Official ROCQET templates
  price INTEGER DEFAULT 0, -- In cents, 0 = free
  
  -- Usage & Ratings
  usage_count INTEGER DEFAULT 0,
  fork_count INTEGER DEFAULT 0,
  rating INTEGER, -- Average rating * 10
  review_count INTEGER DEFAULT 0,
  
  -- Metadata
  tags JSONB DEFAULT '[]'::jsonb,
  requirements JSONB DEFAULT '[]'::jsonb, -- Required integrations/permissions
  version VARCHAR(20) DEFAULT '1.0.0',
  
  created_by UUID NOT NULL,
  updated_by UUID,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for chain_templates
CREATE INDEX IF NOT EXISTS chain_templates_category_idx ON chain_templates(category);
CREATE INDEX IF NOT EXISTS chain_templates_public_idx ON chain_templates(is_public);
-- Only create rating index if column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chain_templates' 
    AND column_name = 'rating'
  ) THEN
    CREATE INDEX IF NOT EXISTS chain_templates_rating_idx ON chain_templates(rating);
  END IF;
END $$;

-- Add RLS policies for new tables
ALTER TABLE chain_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE chain_alert_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE chain_templates ENABLE ROW LEVEL SECURITY;

-- Chain alerts policies
DROP POLICY IF EXISTS "Users can view alerts in their workspace" ON chain_alerts;
CREATE POLICY "Users can view alerts in their workspace" ON chain_alerts
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create alerts in their workspace" ON chain_alerts;
CREATE POLICY "Users can create alerts in their workspace" ON chain_alerts
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update alerts in their workspace" ON chain_alerts;
CREATE POLICY "Users can update alerts in their workspace" ON chain_alerts
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete alerts in their workspace" ON chain_alerts;
CREATE POLICY "Users can delete alerts in their workspace" ON chain_alerts
  FOR DELETE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Chain alert history policies
DROP POLICY IF EXISTS "Users can view alert history in their workspace" ON chain_alert_history;
CREATE POLICY "Users can view alert history in their workspace" ON chain_alert_history
  FOR SELECT USING (
    alert_id IN (
      SELECT id FROM chain_alerts 
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Chain templates policies
DROP POLICY IF EXISTS "Anyone can view public templates" ON chain_templates;
CREATE POLICY "Anyone can view public templates" ON chain_templates
  FOR SELECT USING (is_public = true);

DROP POLICY IF EXISTS "Users can view templates in their workspace" ON chain_templates;
CREATE POLICY "Users can view templates in their workspace" ON chain_templates
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create templates in their workspace" ON chain_templates;
CREATE POLICY "Users can create templates in their workspace" ON chain_templates
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update templates in their workspace" ON chain_templates;
CREATE POLICY "Users can update templates in their workspace" ON chain_templates
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete templates in their workspace" ON chain_templates;
CREATE POLICY "Users can delete templates in their workspace" ON chain_templates
  FOR DELETE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Grant permissions
GRANT ALL ON chain_alerts TO authenticated;
GRANT ALL ON chain_alert_history TO authenticated;
GRANT ALL ON chain_templates TO authenticated;

-- Add helpful comments
COMMENT ON TABLE chain_alerts IS 'Alert configurations for monitoring chain executions';
COMMENT ON TABLE chain_alert_history IS 'Historical record of triggered alerts';
COMMENT ON TABLE chain_templates IS 'Reusable chain templates for marketplace';
COMMENT ON COLUMN prompt_chains.triggers IS 'Webhook, schedule, and event triggers for automatic execution';
COMMENT ON COLUMN prompt_chains.error_handling IS 'Global error handling configuration for the chain';
COMMENT ON COLUMN prompt_chains.retry_policy IS 'Global retry configuration for failed steps';
COMMENT ON COLUMN prompt_chains.sla_target IS 'Target execution time in milliseconds for SLA monitoring';
COMMENT ON COLUMN prompt_chain_runs.execution_path IS 'Ordered list of step IDs showing actual execution flow';
COMMENT ON COLUMN prompt_chain_runs.branching_decisions IS 'Record of all conditional and switch decisions made';
COMMENT ON COLUMN prompt_chain_runs.debug_log IS 'Detailed debug messages from execution engine';