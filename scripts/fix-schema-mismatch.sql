-- Fix schema mismatch: rename 'plan' to 'subscription_tier'
-- Safe migration that checks current state first

DO $$ 
BEGIN
  -- Check if plan column exists and subscription_tier doesn't
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workspaces' AND column_name = 'plan'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workspaces' AND column_name = 'subscription_tier'  
  ) THEN
    -- Rename column
    ALTER TABLE workspaces RENAME COLUMN plan TO subscription_tier;
    
    -- Update 'free' to 'starter' to match new naming convention
    UPDATE workspaces 
    SET subscription_tier = 'starter'
    WHERE subscription_tier = 'free';
    
    -- Drop old constraint if exists
    ALTER TABLE workspaces DROP CONSTRAINT IF EXISTS workspaces_plan_check;
    
    -- Add new constraint for valid values
    ALTER TABLE workspaces 
    ADD CONSTRAINT workspaces_subscription_tier_check 
    CHECK (subscription_tier IN ('starter', 'pro', 'team', 'enterprise'));
    
    RAISE NOTICE 'Successfully renamed plan to subscription_tier';
    
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workspaces' AND column_name = 'subscription_tier'
  ) THEN
    -- Column already renamed, just ensure constraint and values are correct
    
    -- Update any remaining 'free' values
    UPDATE workspaces 
    SET subscription_tier = 'starter'
    WHERE subscription_tier = 'free';
    
    -- Ensure constraint exists
    ALTER TABLE workspaces DROP CONSTRAINT IF EXISTS workspaces_subscription_tier_check;
    ALTER TABLE workspaces 
    ADD CONSTRAINT workspaces_subscription_tier_check 
    CHECK (subscription_tier IN ('starter', 'pro', 'team', 'enterprise'));
    
    RAISE NOTICE 'subscription_tier column already exists, updated constraints';
  ELSE
    RAISE NOTICE 'Neither plan nor subscription_tier column found, skipping migration';
  END IF;
END $$;

-- Verify the change
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'workspaces' 
  AND column_name IN ('plan', 'subscription_tier');