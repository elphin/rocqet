-- Add seats and tier information to workspaces table

-- Add seats column to workspaces table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workspaces' 
    AND column_name = 'seats'
  ) THEN
    ALTER TABLE workspaces 
    ADD COLUMN seats INTEGER DEFAULT 1;
  END IF;
END $$;

-- Add max_seats column (based on tier)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workspaces' 
    AND column_name = 'max_seats'
  ) THEN
    ALTER TABLE workspaces 
    ADD COLUMN max_seats INTEGER DEFAULT 1;
  END IF;
END $$;

-- Add display_name column for workspace display name
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workspaces' 
    AND column_name = 'display_name'
  ) THEN
    ALTER TABLE workspaces 
    ADD COLUMN display_name TEXT;
  END IF;
END $$;

-- Update existing workspaces based on their tier
UPDATE workspaces 
SET 
  seats = CASE 
    WHEN subscription_tier = 'free' THEN 1
    WHEN subscription_tier = 'pro' THEN 1
    ELSE COALESCE(seats, 1)
  END,
  max_seats = CASE
    WHEN subscription_tier = 'free' THEN 1
    WHEN subscription_tier = 'pro' THEN 1
    WHEN subscription_tier = 'professional' THEN 10
    WHEN subscription_tier = 'business' THEN 50
    WHEN subscription_tier = 'enterprise' THEN 999
    ELSE 1
  END
WHERE seats IS NULL OR max_seats IS NULL;

-- Add comment
COMMENT ON COLUMN workspaces.seats IS 'Current number of seats allocated to this workspace';
COMMENT ON COLUMN workspaces.max_seats IS 'Maximum seats allowed based on subscription tier';
COMMENT ON COLUMN workspaces.display_name IS 'Display name that can be changed (slug remains fixed)';