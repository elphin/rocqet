-- Upgrade a specific workspace to pro tier
-- Replace 'your-workspace-slug' with the actual workspace slug

UPDATE workspaces 
SET subscription_tier = 'pro'
WHERE slug = 'elphinstone';

-- Verify the update
SELECT id, name, slug, subscription_tier 
FROM workspaces 
WHERE slug = 'elphinstone';