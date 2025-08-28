-- Fix RLS policies for tier_configurations
-- The table should be readable by everyone

-- First check if RLS is enabled
ALTER TABLE tier_configurations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Everyone can view tier configurations" ON tier_configurations;
DROP POLICY IF EXISTS "Admins can manage tier configurations" ON tier_configurations;

-- Create a simple read policy that allows everyone to read active tiers
CREATE POLICY "Anyone can view active tier configurations" 
ON tier_configurations 
FOR SELECT 
USING (active = true);

-- Create admin policy for all operations
CREATE POLICY "Admins can manage tier configurations" 
ON tier_configurations 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid() 
    AND can_manage_tiers = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid() 
    AND can_manage_tiers = true
  )
);