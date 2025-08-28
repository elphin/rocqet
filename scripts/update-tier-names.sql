-- Update tier names from old to new structure
-- free -> starter
-- business -> team
-- pro stays pro

-- First update the check constraint to allow both old and new values
DO $$ 
BEGIN
  -- Drop old constraint if exists
  ALTER TABLE workspaces 
  DROP CONSTRAINT IF EXISTS workspaces_subscription_tier_check;
  
  -- Add temporary constraint that allows both old and new values
  ALTER TABLE workspaces 
  ADD CONSTRAINT workspaces_subscription_tier_check 
  CHECK (subscription_tier IN ('free', 'starter', 'pro', 'business', 'team', 'enterprise'));
END $$;

-- Now update workspaces table
UPDATE workspaces 
SET subscription_tier = 'starter'
WHERE subscription_tier = 'free';

UPDATE workspaces 
SET subscription_tier = 'team'
WHERE subscription_tier = 'business';

-- Update tier_configurations constraint first
DO $$ 
BEGIN
  -- Drop old constraint if exists
  ALTER TABLE tier_configurations 
  DROP CONSTRAINT IF EXISTS tier_configurations_tier_name_check;
  
  -- Add temporary constraint that allows both old and new values
  ALTER TABLE tier_configurations 
  ADD CONSTRAINT tier_configurations_tier_name_check 
  CHECK (tier_name IN ('free', 'starter', 'pro', 'business', 'team', 'enterprise'));
END $$;

-- Update tier_configurations table
UPDATE tier_configurations 
SET 
  tier_name = 'starter',
  display_name = 'Starter',
  description = 'Perfect for individuals getting started with prompt management'
WHERE tier_name = 'free';

UPDATE tier_configurations 
SET 
  tier_name = 'team',
  display_name = 'Team',
  description = 'For teams that need collaboration and advanced features',
  monthly_price = 99,
  yearly_price = 990,
  limits = jsonb_set(
    jsonb_set(limits, '{teamMembers}', '2'),
    '{minSeats}', '2'
  )
WHERE tier_name = 'business';

-- Now update tier_configurations constraint to only allow new values
DO $$ 
BEGIN
  -- Drop temporary constraint
  ALTER TABLE tier_configurations 
  DROP CONSTRAINT IF EXISTS tier_configurations_tier_name_check;
  
  -- Add final constraint with only new values
  ALTER TABLE tier_configurations 
  ADD CONSTRAINT tier_configurations_tier_name_check 
  CHECK (tier_name IN ('starter', 'pro', 'team', 'enterprise'));
END $$;

-- Now update the constraint to only allow new values
DO $$ 
BEGIN
  -- Drop temporary constraint
  ALTER TABLE workspaces 
  DROP CONSTRAINT IF EXISTS workspaces_subscription_tier_check;
  
  -- Add final constraint with only new values
  ALTER TABLE workspaces 
  ADD CONSTRAINT workspaces_subscription_tier_check 
  CHECK (subscription_tier IN ('starter', 'pro', 'team', 'enterprise'));
END $$;

-- Update workspace_type constraint as well
DO $$ 
BEGIN
  -- Drop old constraint if exists
  ALTER TABLE workspaces 
  DROP CONSTRAINT IF EXISTS workspaces_workspace_type_check;
  
  -- Add new constraint
  ALTER TABLE workspaces 
  ADD CONSTRAINT workspaces_workspace_type_check 
  CHECK (workspace_type IN ('personal', 'team', 'organization'));
END $$;

-- Add parent_account_id for team workspace seat pool management
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workspaces' 
    AND column_name = 'parent_account_id'
  ) THEN
    ALTER TABLE workspaces 
    ADD COLUMN parent_account_id UUID;
    
    COMMENT ON COLUMN workspaces.parent_account_id IS 'For team workspaces, points to the account that owns the seat pool';
  END IF;
END $$;

-- Create accounts table for seat pool management
CREATE TABLE IF NOT EXISTS accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  subscription_tier TEXT NOT NULL CHECK (subscription_tier IN ('starter', 'pro', 'team', 'enterprise')),
  total_seats INTEGER DEFAULT 1,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT DEFAULT 'active',
  subscription_started_at TIMESTAMPTZ DEFAULT NOW(),
  subscription_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(owner_id, subscription_tier)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_accounts_owner_id ON accounts(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_parent_account_id ON workspaces(parent_account_id);

-- Enable RLS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for accounts
DROP POLICY IF EXISTS "Users can view their own accounts" ON accounts;
CREATE POLICY "Users can view their own accounts" ON accounts
  FOR SELECT
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own accounts" ON accounts;
CREATE POLICY "Users can update their own accounts" ON accounts
  FOR UPDATE
  USING (owner_id = auth.uid());

-- Update tier configurations with correct features and limits
UPDATE tier_configurations 
SET 
  features = '{
    "prompts": 25,
    "versionsPerPrompt": 5,
    "testRuns": 100,
    "folders": true,
    "publicSharing": true,
    "privateFolders": false,
    "apiAccess": false,
    "analytics": false,
    "teamCollaboration": false,
    "advancedAI": false
  }'::jsonb,
  limits = '{
    "prompts": 25,
    "versions": 5,
    "workspaces": 1,
    "teamMembers": 1,
    "testRuns": 100,
    "aiModels": ["gpt-3.5-turbo", "claude-3-haiku"]
  }'::jsonb
WHERE tier_name = 'starter';

UPDATE tier_configurations 
SET 
  features = '{
    "prompts": -1,
    "versionsPerPrompt": -1,
    "testRuns": 5000,
    "folders": true,
    "subfolders": true,
    "publicSharing": true,
    "privateFolders": true,
    "apiAccess": true,
    "analytics": true,
    "teamCollaboration": false,
    "advancedAI": true,
    "exportImport": true,
    "customVariables": true,
    "guestUser": 1
  }'::jsonb,
  limits = '{
    "prompts": -1,
    "versions": -1,
    "workspaces": 1,
    "teamMembers": 1,
    "guestUsers": 1,
    "testRuns": 5000,
    "aiModels": ["all"]
  }'::jsonb,
  monthly_price = 19,
  yearly_price = 190
WHERE tier_name = 'pro';

UPDATE tier_configurations 
SET 
  features = '{
    "prompts": -1,
    "versionsPerPrompt": -1,
    "testRuns": -1,
    "folders": true,
    "subfolders": true,
    "publicSharing": true,
    "privateFolders": true,
    "apiAccess": true,
    "analytics": true,
    "advancedAnalytics": true,
    "teamCollaboration": true,
    "advancedAI": true,
    "exportImport": true,
    "customVariables": true,
    "auditLog": true,
    "activityFeed": true,
    "webhooks": true,
    "customBranding": true,
    "prioritySupport": true,
    "seatManagement": true
  }'::jsonb,
  limits = '{
    "prompts": -1,
    "versions": -1,
    "workspaces": -1,
    "minSeats": 2,
    "maxSeats": -1,
    "testRuns": -1,
    "aiModels": ["all"],
    "basePrice": 99,
    "pricePerSeat": 20,
    "includedSeats": 2
  }'::jsonb
WHERE tier_name = 'team';