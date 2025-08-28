-- Update tier pricing to new structure
-- Starter: €0
-- Pro: €9
-- Team: €15 per seat with volume discounts

-- Update tier configurations
UPDATE tier_configurations 
SET 
  monthly_price = 0,
  yearly_price = 0,
  description = 'Perfect for individuals getting started',
  limits = jsonb_set(
    jsonb_set(
      jsonb_set(limits, '{prompts}', '25'),
      '{workspaces}', '1'
    ),
    '{teamMembers}', '1'
  ),
  features = jsonb_set(
    features,
    '{teamFeatures}', 'false'
  )
WHERE tier_name = 'starter';

UPDATE tier_configurations 
SET 
  monthly_price = 9,
  yearly_price = 90,
  description = 'For professionals who need unlimited prompts',
  limits = jsonb_set(
    jsonb_set(
      jsonb_set(limits, '{prompts}', '-1'),
      '{workspaces}', '1'
    ),
    '{teamMembers}', '1'
  ),
  features = jsonb_set(
    features,
    '{teamFeatures}', 'false'
  )
WHERE tier_name = 'pro';

UPDATE tier_configurations 
SET 
  monthly_price = 15,
  yearly_price = 150,
  description = 'For teams that need collaboration',
  limits = jsonb_set(
    jsonb_set(
      jsonb_set(limits, '{prompts}', '-1'),
      '{workspaces}', '-1'
    ),
    '{minSeats}', '1'
  ),
  features = jsonb_set(
    features,
    '{teamFeatures}', 'true'
  )
WHERE tier_name = 'team';

-- Create volume discount table for team tier
CREATE TABLE IF NOT EXISTS team_volume_discounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  min_seats INTEGER NOT NULL,
  max_seats INTEGER,
  discount_percentage INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(min_seats)
);

-- Insert volume discounts
INSERT INTO team_volume_discounts (min_seats, max_seats, discount_percentage) 
VALUES 
  (1, 9, 0),      -- 1-9 seats: no discount
  (10, 19, 10),   -- 10-19 seats: 10% off
  (20, 49, 15),   -- 20-49 seats: 15% off
  (50, NULL, 20)  -- 50+ seats: 20% off
ON CONFLICT (min_seats) 
DO UPDATE SET 
  max_seats = EXCLUDED.max_seats,
  discount_percentage = EXCLUDED.discount_percentage,
  updated_at = NOW();

-- Add Stripe fields to accounts table for seat management
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'accounts' 
    AND column_name = 'total_seats_purchased'
  ) THEN
    ALTER TABLE accounts 
    ADD COLUMN total_seats_purchased INTEGER DEFAULT 1;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'accounts' 
    AND column_name = 'stripe_price_id'
  ) THEN
    ALTER TABLE accounts 
    ADD COLUMN stripe_price_id TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'accounts' 
    AND column_name = 'stripe_product_id'
  ) THEN
    ALTER TABLE accounts 
    ADD COLUMN stripe_product_id TEXT;
  END IF;
END $$;

-- Create function to calculate team price with discounts
CREATE OR REPLACE FUNCTION calculate_team_price(seats INTEGER, period TEXT DEFAULT 'monthly')
RETURNS NUMERIC AS $$
DECLARE
  base_price NUMERIC;
  discount_pct INTEGER;
  final_price NUMERIC;
BEGIN
  -- Get base price
  IF period = 'yearly' THEN
    base_price := 150;
  ELSE
    base_price := 15;
  END IF;
  
  -- Get discount percentage
  SELECT discount_percentage INTO discount_pct
  FROM team_volume_discounts
  WHERE seats >= min_seats 
    AND (seats <= max_seats OR max_seats IS NULL)
  ORDER BY min_seats DESC
  LIMIT 1;
  
  -- Calculate final price
  final_price := seats * base_price * (1 - (COALESCE(discount_pct, 0) / 100.0));
  
  RETURN final_price;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION calculate_team_price IS 'Calculates team subscription price with volume discounts';
COMMENT ON TABLE team_volume_discounts IS 'Volume discount tiers for team subscriptions';
COMMENT ON COLUMN accounts.total_seats_purchased IS 'Total number of seats purchased for this account (seat pool)';
COMMENT ON COLUMN accounts.stripe_price_id IS 'Stripe Price ID for subscription';
COMMENT ON COLUMN accounts.stripe_product_id IS 'Stripe Product ID for subscription';