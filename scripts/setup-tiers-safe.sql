-- Safe setup script that checks if objects already exist

-- Add columns to workspaces if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspaces' AND column_name = 'subscription_tier') THEN
    ALTER TABLE workspaces ADD COLUMN subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'business'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspaces' AND column_name = 'subscription_status') THEN
    ALTER TABLE workspaces ADD COLUMN subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'trialing', 'past_due', 'canceled', 'paused'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspaces' AND column_name = 'subscription_period') THEN
    ALTER TABLE workspaces ADD COLUMN subscription_period TEXT DEFAULT 'monthly' CHECK (subscription_period IN ('monthly', 'yearly'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspaces' AND column_name = 'subscription_started_at') THEN
    ALTER TABLE workspaces ADD COLUMN subscription_started_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspaces' AND column_name = 'subscription_ends_at') THEN
    ALTER TABLE workspaces ADD COLUMN subscription_ends_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspaces' AND column_name = 'trial_ends_at') THEN
    ALTER TABLE workspaces ADD COLUMN trial_ends_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspaces' AND column_name = 'stripe_customer_id') THEN
    ALTER TABLE workspaces ADD COLUMN stripe_customer_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspaces' AND column_name = 'stripe_subscription_id') THEN
    ALTER TABLE workspaces ADD COLUMN stripe_subscription_id TEXT;
  END IF;
END $$;

-- Create tier_configurations table if it doesn't exist
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

-- Insert default tier configurations (or update if they exist)
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
)
ON CONFLICT (tier_name) 
DO UPDATE SET
  display_name = EXCLUDED.display_name,
  monthly_price = EXCLUDED.monthly_price,
  yearly_price = EXCLUDED.yearly_price,
  description = EXCLUDED.description,
  features = EXCLUDED.features,
  limits = EXCLUDED.limits,
  cta = EXCLUDED.cta,
  updated_at = NOW();

-- Create dev_tier_overrides table if it doesn't exist
CREATE TABLE IF NOT EXISTS dev_tier_overrides (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  override_tier TEXT CHECK (override_tier IN ('free', 'pro', 'business')),
  enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id)
);

-- Create admin_users table if it doesn't exist
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_super_admin BOOLEAN DEFAULT false,
  can_manage_tiers BOOLEAN DEFAULT true,
  can_view_analytics BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS (safe to run multiple times)
ALTER TABLE tier_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev_tier_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Everyone can view tier configurations" ON tier_configurations;
DROP POLICY IF EXISTS "Admins can manage tier configurations" ON tier_configurations;
DROP POLICY IF EXISTS "Workspace owners can manage dev overrides" ON dev_tier_overrides;
DROP POLICY IF EXISTS "Only super admins can manage admin users" ON admin_users;

-- Create policies
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

CREATE POLICY "Workspace owners can manage dev overrides" ON dev_tier_overrides
  FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() 
      AND role = 'owner'
    )
  );

CREATE POLICY "Only super admins can manage admin users" ON admin_users
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid() 
      AND is_super_admin = true
    )
  );

-- Add columns to workspace_invites if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspace_invites' AND column_name = 'accepted_by') THEN
    ALTER TABLE workspace_invites ADD COLUMN accepted_by UUID REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspace_invites' AND column_name = 'accepted_at') THEN
    ALTER TABLE workspace_invites ADD COLUMN accepted_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspace_invites' AND column_name = 'rejected_by') THEN
    ALTER TABLE workspace_invites ADD COLUMN rejected_by UUID REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspace_invites' AND column_name = 'rejected_at') THEN
    ALTER TABLE workspace_invites ADD COLUMN rejected_at TIMESTAMPTZ;
  END IF;
END $$;