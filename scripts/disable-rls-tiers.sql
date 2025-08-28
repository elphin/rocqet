-- Completely disable RLS on tier_configurations
-- Since pricing tiers are public information, we don't need RLS for reading
-- We'll handle admin restrictions in the application layer

-- Drop all policies first
DROP POLICY IF EXISTS "allow_admin_write" ON tier_configurations;
DROP POLICY IF EXISTS "allow_public_read" ON tier_configurations;

-- Disable RLS entirely on this table
ALTER TABLE tier_configurations DISABLE ROW LEVEL SECURITY;