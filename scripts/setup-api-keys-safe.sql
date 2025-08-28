-- Setup API Keys Management System (Safe Version)

-- 1. Create api_keys table if not exists
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Key identification
  name VARCHAR(255) NOT NULL,
  description TEXT,
  key_prefix VARCHAR(10) NOT NULL, -- First few chars for identification (e.g., "rk_live_")
  key_hash VARCHAR(255) NOT NULL UNIQUE, -- SHA256 hash of the actual key
  last_four VARCHAR(4) NOT NULL, -- Last 4 chars for identification
  
  -- Permissions and scopes
  scopes JSONB DEFAULT '["read"]', -- Array of scopes: read, write, delete
  allowed_ips JSONB DEFAULT '[]', -- Array of allowed IP addresses (empty = all)
  allowed_origins JSONB DEFAULT '[]', -- Array of allowed origins for CORS
  
  -- Rate limiting
  rate_limit_per_minute INTEGER DEFAULT 60,
  rate_limit_per_hour INTEGER DEFAULT 1000,
  rate_limit_per_day INTEGER DEFAULT 10000,
  
  -- Status and metadata
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  last_used_ip INET,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID,
  revoke_reason TEXT
);

-- Create indexes if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_api_keys_workspace_id') THEN
    CREATE INDEX idx_api_keys_workspace_id ON api_keys(workspace_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_api_keys_key_hash') THEN
    CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_api_keys_status') THEN
    CREATE INDEX idx_api_keys_status ON api_keys(status);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_api_keys_created_by') THEN
    CREATE INDEX idx_api_keys_created_by ON api_keys(created_by);
  END IF;
END $$;

-- 2. Create api_key_usage table for tracking
CREATE TABLE IF NOT EXISTS api_key_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  
  -- Request details
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  
  -- Metadata
  ip_address INET,
  user_agent TEXT,
  request_body_size INTEGER,
  response_body_size INTEGER,
  error_message TEXT,
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for usage tracking
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_api_key_usage_api_key_id') THEN
    CREATE INDEX idx_api_key_usage_api_key_id ON api_key_usage(api_key_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_api_key_usage_created_at') THEN
    CREATE INDEX idx_api_key_usage_created_at ON api_key_usage(created_at DESC);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_api_key_usage_endpoint') THEN
    CREATE INDEX idx_api_key_usage_endpoint ON api_key_usage(endpoint);
  END IF;
END $$;

-- 3. Create rate_limit_buckets table for distributed rate limiting
CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  
  -- Bucket identification
  bucket_type VARCHAR(20) NOT NULL CHECK (bucket_type IN ('minute', 'hour', 'day')),
  bucket_key VARCHAR(50) NOT NULL, -- Format: YYYY-MM-DD-HH-MI for minute, etc.
  
  -- Counters
  request_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- Unique constraint to prevent duplicate buckets
  UNIQUE(api_key_id, bucket_type, bucket_key)
);

-- Create indexes for rate limiting
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_rate_limit_buckets_api_key_id') THEN
    CREATE INDEX idx_rate_limit_buckets_api_key_id ON rate_limit_buckets(api_key_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_rate_limit_buckets_expires_at') THEN
    CREATE INDEX idx_rate_limit_buckets_expires_at ON rate_limit_buckets(expires_at);
  END IF;
END $$;

-- 4. Enable RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_key_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_buckets ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for api_keys
DROP POLICY IF EXISTS "Workspace admins can view api keys" ON api_keys;
CREATE POLICY "Workspace admins can view api keys" ON api_keys
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = api_keys.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Workspace admins can create api keys" ON api_keys;
CREATE POLICY "Workspace admins can create api keys" ON api_keys
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = api_keys.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Workspace admins can update api keys" ON api_keys;
CREATE POLICY "Workspace admins can update api keys" ON api_keys
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = api_keys.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Workspace admins can delete api keys" ON api_keys;
CREATE POLICY "Workspace admins can delete api keys" ON api_keys
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = api_keys.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin')
    )
  );

-- 6. Create RLS policies for api_key_usage
DROP POLICY IF EXISTS "Workspace members can view api key usage" ON api_key_usage;
CREATE POLICY "Workspace members can view api key usage" ON api_key_usage
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM api_keys
      JOIN workspace_members ON workspace_members.workspace_id = api_keys.workspace_id
      WHERE api_keys.id = api_key_usage.api_key_id
      AND workspace_members.user_id = auth.uid()
    )
  );

-- 7. Create function to validate API key
CREATE OR REPLACE FUNCTION validate_api_key(
  key_hash_param VARCHAR
)
RETURNS TABLE (
  valid BOOLEAN,
  api_key_id UUID,
  workspace_id UUID,
  scopes JSONB,
  rate_limit_per_minute INTEGER,
  message TEXT
) AS $$
DECLARE
  key_record RECORD;
BEGIN
  -- Find the API key
  SELECT * INTO key_record
  FROM api_keys
  WHERE key_hash = key_hash_param
  AND status = 'active';
  
  -- Check if key exists
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, NULL::JSONB, NULL::INTEGER, 'Invalid API key';
    RETURN;
  END IF;
  
  -- Check if key is expired
  IF key_record.expires_at IS NOT NULL AND key_record.expires_at < NOW() THEN
    -- Update status to expired
    UPDATE api_keys SET status = 'expired' WHERE id = key_record.id;
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, NULL::JSONB, NULL::INTEGER, 'API key has expired';
    RETURN;
  END IF;
  
  -- Update last used timestamp
  UPDATE api_keys 
  SET last_used_at = NOW()
  WHERE id = key_record.id;
  
  -- Return success
  RETURN QUERY SELECT 
    TRUE, 
    key_record.id,
    key_record.workspace_id,
    key_record.scopes,
    key_record.rate_limit_per_minute,
    'Valid API key';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create function to check rate limits
CREATE OR REPLACE FUNCTION check_rate_limit(
  api_key_id_param UUID,
  request_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  allowed BOOLEAN,
  remaining_minute INTEGER,
  remaining_hour INTEGER,
  remaining_day INTEGER
) AS $$
DECLARE
  key_record RECORD;
  minute_bucket VARCHAR;
  hour_bucket VARCHAR;
  day_bucket VARCHAR;
  minute_count INTEGER;
  hour_count INTEGER;
  day_count INTEGER;
BEGIN
  -- Get API key limits
  SELECT * INTO key_record
  FROM api_keys
  WHERE id = api_key_id_param;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0, 0, 0;
    RETURN;
  END IF;
  
  -- Calculate bucket keys
  minute_bucket := TO_CHAR(request_time, 'YYYY-MM-DD-HH24-MI');
  hour_bucket := TO_CHAR(request_time, 'YYYY-MM-DD-HH24');
  day_bucket := TO_CHAR(request_time, 'YYYY-MM-DD');
  
  -- Get or create minute bucket
  INSERT INTO rate_limit_buckets (api_key_id, bucket_type, bucket_key, request_count, expires_at)
  VALUES (api_key_id_param, 'minute', minute_bucket, 0, request_time + INTERVAL '1 minute')
  ON CONFLICT (api_key_id, bucket_type, bucket_key) DO NOTHING;
  
  SELECT request_count INTO minute_count
  FROM rate_limit_buckets
  WHERE api_key_id = api_key_id_param
  AND bucket_type = 'minute'
  AND bucket_key = minute_bucket;
  
  -- Similar for hour and day buckets
  INSERT INTO rate_limit_buckets (api_key_id, bucket_type, bucket_key, request_count, expires_at)
  VALUES (api_key_id_param, 'hour', hour_bucket, 0, request_time + INTERVAL '1 hour')
  ON CONFLICT (api_key_id, bucket_type, bucket_key) DO NOTHING;
  
  SELECT request_count INTO hour_count
  FROM rate_limit_buckets
  WHERE api_key_id = api_key_id_param
  AND bucket_type = 'hour'
  AND bucket_key = hour_bucket;
  
  INSERT INTO rate_limit_buckets (api_key_id, bucket_type, bucket_key, request_count, expires_at)
  VALUES (api_key_id_param, 'day', day_bucket, 0, request_time + INTERVAL '1 day')
  ON CONFLICT (api_key_id, bucket_type, bucket_key) DO NOTHING;
  
  SELECT request_count INTO day_count
  FROM rate_limit_buckets
  WHERE api_key_id = api_key_id_param
  AND bucket_type = 'day'
  AND bucket_key = day_bucket;
  
  -- Check limits
  IF minute_count >= key_record.rate_limit_per_minute OR
     hour_count >= key_record.rate_limit_per_hour OR
     day_count >= key_record.rate_limit_per_day THEN
    RETURN QUERY SELECT 
      FALSE,
      GREATEST(0, key_record.rate_limit_per_minute - minute_count),
      GREATEST(0, key_record.rate_limit_per_hour - hour_count),
      GREATEST(0, key_record.rate_limit_per_day - day_count);
    RETURN;
  END IF;
  
  -- Increment counters
  UPDATE rate_limit_buckets SET request_count = request_count + 1
  WHERE api_key_id = api_key_id_param
  AND bucket_type = 'minute' AND bucket_key = minute_bucket;
  
  UPDATE rate_limit_buckets SET request_count = request_count + 1
  WHERE api_key_id = api_key_id_param
  AND bucket_type = 'hour' AND bucket_key = hour_bucket;
  
  UPDATE rate_limit_buckets SET request_count = request_count + 1
  WHERE api_key_id = api_key_id_param
  AND bucket_type = 'day' AND bucket_key = day_bucket;
  
  -- Return success with remaining limits
  RETURN QUERY SELECT 
    TRUE,
    key_record.rate_limit_per_minute - minute_count - 1,
    key_record.rate_limit_per_hour - hour_count - 1,
    key_record.rate_limit_per_day - day_count - 1;
END;
$$ LANGUAGE plpgsql;

-- 9. Create cleanup function for expired buckets
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limit_buckets()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limit_buckets
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON api_keys TO authenticated;
GRANT ALL ON api_key_usage TO authenticated;
GRANT ALL ON rate_limit_buckets TO authenticated;
GRANT EXECUTE ON FUNCTION validate_api_key(VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION check_rate_limit(UUID, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_rate_limit_buckets() TO authenticated;

-- Success message
SELECT 'API Key management system setup complete!' as status;