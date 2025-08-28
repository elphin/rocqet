-- Complete setup script for tier management system
-- Run this in Supabase SQL Editor

-- 1. First, run the subscription tiers migration
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

-- 2. Now create the tier configuration tables
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
)
ON CONFLICT (tier_name) DO NOTHING;

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

-- 3. Enable RLS
ALTER TABLE workspace_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE tier_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev_tier_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- 4. Create policies
-- Policies for workspace_usage
CREATE POLICY "Workspace members can view usage" ON workspace_usage
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

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

-- 5. Add tracking columns for invites
ALTER TABLE workspace_invites
ADD COLUMN IF NOT EXISTS accepted_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

-- 6. Success message
DO $$
BEGIN
  RAISE NOTICE 'Tier management system setup complete!';
  RAISE NOTICE 'Now run the make-admin script to grant yourself admin access.';
END $$;