-- Script to make a user admin
-- Run this AFTER running setup-tiers-complete.sql

-- First, find your user ID
WITH user_lookup AS (
  SELECT id 
  FROM auth.users 
  WHERE email = 'YOUR_EMAIL' -- CHANGE THIS TO YOUR EMAIL!
  LIMIT 1
)
-- Insert or update admin user
INSERT INTO admin_users (user_id, is_super_admin, can_manage_tiers, can_view_analytics)
SELECT id, true, true, true
FROM user_lookup
ON CONFLICT (user_id) 
DO UPDATE SET 
  is_super_admin = true,
  can_manage_tiers = true,
  can_view_analytics = true;

-- To verify:
-- SELECT * FROM admin_users JOIN auth.users ON admin_users.user_id = auth.users.id;