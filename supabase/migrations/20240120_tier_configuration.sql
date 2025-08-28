-- Create tier configuration table for dynamic tier management
CREATE TABLE IF NOT EXISTS tier_configurations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tier_name TEXT NOT NULL CHECK (tier_name IN ('free', 'pro', 'business')),
  display_name TEXT NOT NULL,
  monthly_price INTEGER NOT NULL DEFAULT 0,
  yearly_price INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  features JSONB NOT NULL DEFAULT '{}',
  limits JSONB NOT NULL DEFAULT '{}',
  highlighted BOOLEAN DEFAULT false,
  cta TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tier_name)
);

-- Insert default tier configurations
INSERT INTO tier_configurations (tier_name, display_name, monthly_price, yearly_price, description, features, limits, cta) VALUES
(
  'free',
  'Free',
  0,
  0,
  'Perfect for individuals getting started with prompt management',
  '{
    "sharedPrompts": true,
    "privateFolders": false,
    "teamCollaboration": false,
    "guestAccess": false,
    "batchTesting": false,
    "analytics": false,
    "auditLog": false,
    "customBranding": false,
    "sso": false,
    "apiAccess": false,
    "webhooks": false
  }'::jsonb,
  '{
    "prompts": 25,
    "versions": 5,
    "workspaces": 1,
    "teamMembers": 1,
    "testRuns": 100,
    "aiModels": ["gpt-3.5-turbo", "claude-3-haiku"]
  }'::jsonb,
  'Start Free'
),
(
  'pro',
  'Pro',
  29,
  290,
  'For professionals and small teams who need more power',
  '{
    "sharedPrompts": true,
    "privateFolders": true,
    "teamCollaboration": true,
    "guestAccess": true,
    "batchTesting": true,
    "analytics": true,
    "auditLog": false,
    "customBranding": false,
    "sso": false,
    "apiAccess": true,
    "webhooks": false
  }'::jsonb,
  '{
    "prompts": -1,
    "versions": -1,
    "workspaces": 3,
    "teamMembers": 5,
    "testRuns": 5000,
    "aiModels": ["gpt-3.5-turbo", "gpt-4", "claude-3-haiku", "claude-3-sonnet", "claude-3-opus"]
  }'::jsonb,
  'Start Pro Trial'
),
(
  'business',
  'Business',
  99,
  990,
  'For teams and organizations that need enterprise features',
  '{
    "sharedPrompts": true,
    "privateFolders": true,
    "teamCollaboration": true,
    "guestAccess": true,
    "batchTesting": true,
    "analytics": true,
    "auditLog": true,
    "customBranding": true,
    "sso": true,
    "apiAccess": true,
    "webhooks": true
  }'::jsonb,
  '{
    "prompts": -1,
    "versions": -1,
    "workspaces": -1,
    "teamMembers": -1,
    "testRuns": -1,
    "aiModels": ["all"]
  }'::jsonb,
  'Contact Sales'
);

-- Create development tier overrides table for testing
CREATE TABLE IF NOT EXISTS dev_tier_overrides (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  override_tier TEXT CHECK (override_tier IN ('free', 'pro', 'business')),
  enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id)
);

-- Create admin users table for tier management access
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_super_admin BOOLEAN DEFAULT false,
  can_manage_tiers BOOLEAN DEFAULT true,
  can_view_analytics BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE tier_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev_tier_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Policies for tier_configurations (read-only for everyone, write for admins)
CREATE POLICY "Everyone can view tier configurations" ON tier_configurations
  FOR SELECT
  USING (active = true);

CREATE POLICY "Admins can manage tier configurations" ON tier_configurations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid() 
      AND can_manage_tiers = true
    )
  );

-- Policies for dev_tier_overrides
CREATE POLICY "Workspace owners can manage dev overrides" ON dev_tier_overrides
  FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() 
      AND role = 'owner'
    )
  );

-- Policies for admin_users
CREATE POLICY "Only super admins can manage admin users" ON admin_users
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid() 
      AND is_super_admin = true
    )
  );

-- Function to get effective tier (considering dev override)
CREATE OR REPLACE FUNCTION get_effective_tier(p_workspace_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_override_tier TEXT;
  v_actual_tier TEXT;
  v_override_enabled BOOLEAN;
BEGIN
  -- Check for dev override first
  SELECT override_tier, enabled INTO v_override_tier, v_override_enabled
  FROM dev_tier_overrides
  WHERE workspace_id = p_workspace_id;
  
  IF v_override_enabled AND v_override_tier IS NOT NULL THEN
    RETURN v_override_tier;
  END IF;
  
  -- Return actual tier
  SELECT subscription_tier INTO v_actual_tier
  FROM workspaces
  WHERE id = p_workspace_id;
  
  RETURN COALESCE(v_actual_tier, 'free');
END;
$$ LANGUAGE plpgsql;

-- Function to get tier configuration with limits
CREATE OR REPLACE FUNCTION get_tier_config(p_tier_name TEXT)
RETURNS JSONB AS $$
DECLARE
  v_config JSONB;
BEGIN
  SELECT jsonb_build_object(
    'tier_name', tier_name,
    'display_name', display_name,
    'monthly_price', monthly_price,
    'yearly_price', yearly_price,
    'description', description,
    'features', features,
    'limits', limits,
    'highlighted', highlighted,
    'cta', cta
  ) INTO v_config
  FROM tier_configurations
  WHERE tier_name = p_tier_name
  AND active = true;
  
  RETURN v_config;
END;
$$ LANGUAGE plpgsql;

-- Note: -1 in limits means unlimited