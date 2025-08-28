-- Add subscription tier to workspaces
ALTER TABLE workspaces
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'business')),
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'trialing', 'past_due', 'canceled', 'paused')),
ADD COLUMN IF NOT EXISTS subscription_period TEXT DEFAULT 'monthly' CHECK (subscription_period IN ('monthly', 'yearly')),
ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Create usage tracking table
CREATE TABLE IF NOT EXISTS workspace_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  prompts_count INTEGER DEFAULT 0,
  test_runs_count INTEGER DEFAULT 0,
  api_calls_count INTEGER DEFAULT 0,
  storage_bytes BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, month)
);

-- Create subscription history table for audit
CREATE TABLE IF NOT EXISTS subscription_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  tier TEXT NOT NULL,
  status TEXT NOT NULL,
  period TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create feature flags table for gradual rollouts
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  enabled BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, feature_key)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_workspaces_subscription_tier ON workspaces(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_workspaces_subscription_status ON workspaces(subscription_status);
CREATE INDEX IF NOT EXISTS idx_workspace_usage_month ON workspace_usage(workspace_id, month);
CREATE INDEX IF NOT EXISTS idx_subscription_history_workspace ON subscription_history(workspace_id, started_at DESC);

-- Enable RLS
ALTER TABLE workspace_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Policies for workspace_usage
CREATE POLICY "Workspace members can view usage" ON workspace_usage
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can update usage" ON workspace_usage
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policies for subscription_history
CREATE POLICY "Workspace owners can view subscription history" ON subscription_history
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Policies for feature_flags
CREATE POLICY "Workspace members can view feature flags" ON feature_flags
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Function to check if a workspace can use a feature based on tier
CREATE OR REPLACE FUNCTION check_tier_limit(
  p_workspace_id UUID,
  p_feature TEXT,
  p_current_count INTEGER DEFAULT 0
) RETURNS JSONB AS $$
DECLARE
  v_tier TEXT;
  v_limit INTEGER;
  v_result JSONB;
BEGIN
  -- Get workspace tier
  SELECT subscription_tier INTO v_tier
  FROM workspaces
  WHERE id = p_workspace_id;
  
  -- Define limits based on tier and feature
  CASE p_feature
    WHEN 'prompts' THEN
      CASE v_tier
        WHEN 'free' THEN v_limit := 25;
        ELSE v_limit := NULL; -- unlimited
      END CASE;
    WHEN 'workspaces' THEN
      CASE v_tier
        WHEN 'free' THEN v_limit := 1;
        WHEN 'pro' THEN v_limit := 3;
        ELSE v_limit := NULL; -- unlimited
      END CASE;
    WHEN 'team_members' THEN
      CASE v_tier
        WHEN 'free' THEN v_limit := 1;
        WHEN 'pro' THEN v_limit := 5;
        ELSE v_limit := NULL; -- unlimited
      END CASE;
    WHEN 'test_runs' THEN
      CASE v_tier
        WHEN 'free' THEN v_limit := 100;
        WHEN 'pro' THEN v_limit := 5000;
        ELSE v_limit := NULL; -- unlimited
      END CASE;
    ELSE
      v_limit := NULL;
  END CASE;
  
  -- Build result
  IF v_limit IS NULL THEN
    v_result := jsonb_build_object(
      'allowed', true,
      'unlimited', true,
      'tier', v_tier
    );
  ELSE
    v_result := jsonb_build_object(
      'allowed', p_current_count < v_limit,
      'limit', v_limit,
      'current', p_current_count,
      'remaining', GREATEST(0, v_limit - p_current_count),
      'tier', v_tier
    );
  END IF;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function to increment usage
CREATE OR REPLACE FUNCTION increment_usage(
  p_workspace_id UUID,
  p_metric TEXT,
  p_amount INTEGER DEFAULT 1
) RETURNS VOID AS $$
DECLARE
  v_current_month DATE;
BEGIN
  v_current_month := DATE_TRUNC('month', NOW());
  
  INSERT INTO workspace_usage (workspace_id, month, prompts_count, test_runs_count, api_calls_count)
  VALUES (p_workspace_id, v_current_month, 0, 0, 0)
  ON CONFLICT (workspace_id, month) DO NOTHING;
  
  CASE p_metric
    WHEN 'prompts' THEN
      UPDATE workspace_usage
      SET prompts_count = prompts_count + p_amount,
          updated_at = NOW()
      WHERE workspace_id = p_workspace_id AND month = v_current_month;
    WHEN 'test_runs' THEN
      UPDATE workspace_usage
      SET test_runs_count = test_runs_count + p_amount,
          updated_at = NOW()
      WHERE workspace_id = p_workspace_id AND month = v_current_month;
    WHEN 'api_calls' THEN
      UPDATE workspace_usage
      SET api_calls_count = api_calls_count + p_amount,
          updated_at = NOW()
      WHERE workspace_id = p_workspace_id AND month = v_current_month;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to track prompt creation
CREATE OR REPLACE FUNCTION track_prompt_creation() RETURNS TRIGGER AS $$
BEGIN
  PERFORM increment_usage(NEW.workspace_id, 'prompts', 1);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_prompt_creation_trigger
  AFTER INSERT ON prompts
  FOR EACH ROW
  EXECUTE FUNCTION track_prompt_creation();