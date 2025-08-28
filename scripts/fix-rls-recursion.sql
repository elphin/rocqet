-- Fix RLS recursion issue for tier_configurations
-- The problem is that tier_configurations policies reference admin_users
-- which might have its own RLS that creates a loop

-- First, drop the problematic policies
DROP POLICY IF EXISTS "Anyone can view active tier configurations" ON tier_configurations;
DROP POLICY IF EXISTS "Admins can manage tier configurations" ON tier_configurations;

-- Create simpler policies that don't cause recursion
-- Allow everyone to read active tiers (no auth check needed for public pricing)
CREATE POLICY "Public read active tiers" 
ON tier_configurations 
FOR SELECT 
USING (active = true);

-- For admin operations, use a simpler check without recursion
-- We'll check the auth.uid() directly against admin_users without RLS
CREATE POLICY "Admin full access to tiers" 
ON tier_configurations 
FOR ALL 
TO authenticated
USING (
  auth.uid() IN (
    SELECT user_id FROM admin_users WHERE can_manage_tiers = true
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT user_id FROM admin_users WHERE can_manage_tiers = true
  )
);