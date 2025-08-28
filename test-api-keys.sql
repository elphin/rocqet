-- Check if workspace_api_keys table has data
SELECT 
    id,
    workspace_id,
    name,
    provider,
    masked_key,
    is_default,
    last_used_at,
    created_at
FROM workspace_api_keys
ORDER BY created_at DESC
LIMIT 10;

-- Check workspace details
SELECT 
    id,
    name,
    slug
FROM workspaces
WHERE slug = 'elphinstone';