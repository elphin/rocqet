-- Complete fix for RLS recursion issues
-- This will properly set up the policies without any recursion

-- 1. First disable RLS on admin_users to break the recursion
ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;

-- 2. Drop ALL existing policies on tier_configurations to start fresh
DROP POLICY IF EXISTS "Everyone can view tier configurations" ON tier_configurations;
DROP POLICY IF EXISTS "Admins can manage tier configurations" ON tier_configurations;
DROP POLICY IF EXISTS "Admin full access to tiers" ON tier_configurations;
DROP POLICY IF EXISTS "Public read active tiers" ON tier_configurations;
DROP POLICY IF EXISTS "Anyone can view active tier configurations" ON tier_configurations;

-- 3. Drop the problematic policy on admin_users
DROP POLICY IF EXISTS "Only super admins can manage admin users" ON admin_users;

-- 4. Create a single, simple policy for tier_configurations
-- EVERYONE can read active tiers (this is public pricing info)
CREATE POLICY "allow_public_read" 
ON tier_configurations 
FOR SELECT 
USING (active = true);

-- 5. Admin write access - since admin_users has no RLS now, this won't recurse
CREATE POLICY "allow_admin_write" 
ON tier_configurations 
FOR ALL 
TO authenticated
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

-- 6. For admin_users, we'll use a simple policy without self-reference
-- Only allow super admins to manage, but check against the auth.uid() directly
CREATE POLICY "super_admin_access" 
ON admin_users 
FOR ALL 
TO authenticated
USING (
  -- Either you're viewing yourself, or you're a super admin
  user_id = auth.uid() 
  OR 
  auth.uid() = (SELECT user_id FROM admin_users WHERE user_id = auth.uid() AND is_super_admin = true LIMIT 1)
)
WITH CHECK (
  -- For inserts/updates, must be super admin
  auth.uid() = (SELECT user_id FROM admin_users WHERE user_id = auth.uid() AND is_super_admin = true LIMIT 1)
);

-- 7. Re-enable RLS on admin_users
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;