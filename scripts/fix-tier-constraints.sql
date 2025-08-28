-- Fix tier constraints to accept both old and new values during migration

-- First, drop the existing constraints
DO $$ 
BEGIN
  -- Drop subscription_tier constraint on workspaces
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'workspaces' 
    AND column_name = 'subscription_tier'
  ) THEN
    ALTER TABLE workspaces DROP CONSTRAINT IF EXISTS workspaces_subscription_tier_check;
  END IF;

  -- Drop tier_name constraint on tier_configurations
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'tier_configurations' 
    AND column_name = 'tier_name'
  ) THEN
    ALTER TABLE tier_configurations DROP CONSTRAINT IF EXISTS tier_configurations_tier_name_check;
  END IF;

  -- Drop override_tier constraint on dev_tier_overrides
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'dev_tier_overrides' 
    AND column_name = 'override_tier'
  ) THEN
    ALTER TABLE dev_tier_overrides DROP CONSTRAINT IF EXISTS dev_tier_overrides_override_tier_check;
  END IF;
END $$;

-- Add new constraints that accept both old and new values
ALTER TABLE workspaces 
ADD CONSTRAINT workspaces_subscription_tier_check 
CHECK (subscription_tier IN ('free', 'pro', 'business', 'starter', 'team'));

ALTER TABLE tier_configurations 
ADD CONSTRAINT tier_configurations_tier_name_check 
CHECK (tier_name IN ('free', 'pro', 'business', 'starter', 'team'));

ALTER TABLE dev_tier_overrides 
ADD CONSTRAINT dev_tier_overrides_override_tier_check 
CHECK (override_tier IN ('free', 'pro', 'business', 'starter', 'team'));

-- Update existing data to use new tier names
UPDATE workspaces 
SET subscription_tier = 
  CASE subscription_tier
    WHEN 'free' THEN 'starter'
    WHEN 'business' THEN 'team'
    ELSE subscription_tier
  END
WHERE subscription_tier IN ('free', 'business');

UPDATE tier_configurations 
SET tier_name = 
  CASE tier_name
    WHEN 'free' THEN 'starter'
    WHEN 'business' THEN 'team'
    ELSE tier_name
  END
WHERE tier_name IN ('free', 'business');

UPDATE dev_tier_overrides 
SET override_tier = 
  CASE override_tier
    WHEN 'free' THEN 'starter'
    WHEN 'business' THEN 'team'
    ELSE override_tier
  END
WHERE override_tier IN ('free', 'business');

-- Now we can safely update constraints to only accept new values
ALTER TABLE workspaces 
DROP CONSTRAINT workspaces_subscription_tier_check,
ADD CONSTRAINT workspaces_subscription_tier_check 
CHECK (subscription_tier IN ('starter', 'pro', 'team'));

ALTER TABLE tier_configurations 
DROP CONSTRAINT tier_configurations_tier_name_check,
ADD CONSTRAINT tier_configurations_tier_name_check 
CHECK (tier_name IN ('starter', 'pro', 'team'));

ALTER TABLE dev_tier_overrides 
DROP CONSTRAINT dev_tier_overrides_override_tier_check,
ADD CONSTRAINT dev_tier_overrides_override_tier_check 
CHECK (override_tier IN ('starter', 'pro', 'team'));