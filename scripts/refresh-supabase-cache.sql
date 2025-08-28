-- Refresh Supabase schema cache
-- This forces Supabase to reload the table definitions

-- Method 1: Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

-- Method 2: Touch the table to trigger cache refresh
-- Add a comment to force schema reload
COMMENT ON TABLE workspace_api_keys IS 'API keys for workspace - cache refreshed';