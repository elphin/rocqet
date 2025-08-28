-- AI Provider API Keys Management System
-- This handles API keys for AI services (OpenAI, Claude, Gemini, etc.)

-- 1. Create enum for AI providers
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ai_provider') THEN
    CREATE TYPE ai_provider AS ENUM (
      'openai',
      'anthropic', 
      'google',
      'cohere',
      'mistral',
      'groq',
      'together',
      'replicate'
    );
  END IF;
END $$;

-- 2. Create table for user AI provider keys
CREATE TABLE IF NOT EXISTS user_ai_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Provider information
  provider ai_provider NOT NULL,
  key_name VARCHAR(255) NOT NULL, -- User-friendly name like "Personal OpenAI"
  encrypted_key TEXT NOT NULL, -- Encrypted API key
  key_hint VARCHAR(20), -- Last 4 chars for identification (e.g., "...abc123")
  
  -- Configuration
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false, -- Default key for this provider
  
  -- Usage tracking
  last_used_at TIMESTAMPTZ,
  usage_count INTEGER DEFAULT 0,
  last_error TEXT,
  last_error_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create table for system-wide fallback keys (admin only)
CREATE TABLE IF NOT EXISTS system_ai_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Provider information
  provider ai_provider NOT NULL UNIQUE,
  encrypted_key TEXT NOT NULL,
  key_hint VARCHAR(20),
  
  -- Usage limits for free tier users
  daily_limit INTEGER DEFAULT 10, -- Requests per day per user
  monthly_limit INTEGER DEFAULT 100, -- Requests per month per user
  
  -- Configuration
  is_active BOOLEAN DEFAULT true,
  allowed_models JSONB DEFAULT '[]', -- Which models can be used
  
  -- Admin who added this
  added_by UUID NOT NULL REFERENCES auth.users(id),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create usage tracking for system keys
CREATE TABLE IF NOT EXISTS system_key_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider ai_provider NOT NULL,
  
  -- Usage counters
  daily_count INTEGER DEFAULT 0,
  monthly_count INTEGER DEFAULT 0,
  last_reset_daily DATE DEFAULT CURRENT_DATE,
  last_reset_monthly DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE),
  
  -- Track what was used
  last_used_at TIMESTAMPTZ,
  last_model_used VARCHAR(100),
  
  UNIQUE(user_id, provider)
);

-- 5. Create available models table
CREATE TABLE IF NOT EXISTS ai_models (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider ai_provider NOT NULL,
  model_id VARCHAR(100) NOT NULL, -- e.g., "gpt-4", "claude-3-opus"
  model_name VARCHAR(255) NOT NULL, -- Display name
  model_category VARCHAR(50), -- chat, completion, embedding, image
  
  -- Capabilities
  max_tokens INTEGER,
  supports_functions BOOLEAN DEFAULT false,
  supports_vision BOOLEAN DEFAULT false,
  supports_streaming BOOLEAN DEFAULT true,
  
  -- Cost (for tracking/limits)
  cost_per_1k_input DECIMAL(10, 6),
  cost_per_1k_output DECIMAL(10, 6),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_deprecated BOOLEAN DEFAULT false,
  deprecation_date DATE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(provider, model_id)
);

-- 6. Create indexes
CREATE INDEX IF NOT EXISTS idx_user_ai_keys_user_id ON user_ai_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ai_keys_provider ON user_ai_keys(provider);
CREATE INDEX IF NOT EXISTS idx_user_ai_keys_active ON user_ai_keys(is_active);
-- Partial unique index: only one default key per provider per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_default_provider ON user_ai_keys(user_id, provider) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_system_key_usage_user_id ON system_key_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_system_key_usage_provider ON system_key_usage(provider);

-- 7. Enable RLS
ALTER TABLE user_ai_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_ai_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_key_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies for user_ai_keys
DROP POLICY IF EXISTS "Users can view own AI keys" ON user_ai_keys;
CREATE POLICY "Users can view own AI keys" ON user_ai_keys
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own AI keys" ON user_ai_keys;
CREATE POLICY "Users can create own AI keys" ON user_ai_keys
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own AI keys" ON user_ai_keys;
CREATE POLICY "Users can update own AI keys" ON user_ai_keys
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own AI keys" ON user_ai_keys;
CREATE POLICY "Users can delete own AI keys" ON user_ai_keys
  FOR DELETE
  USING (auth.uid() = user_id);

-- 9. Create RLS policies for system_ai_keys
DROP POLICY IF EXISTS "Only admins can manage system keys" ON system_ai_keys;
CREATE POLICY "Only admins can manage system keys" ON system_ai_keys
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_super_admin = true
    )
  );

DROP POLICY IF EXISTS "All users can view active system keys" ON system_ai_keys;
CREATE POLICY "All users can view active system keys" ON system_ai_keys
  FOR SELECT
  USING (is_active = true);

-- 10. Create RLS policies for system_key_usage
DROP POLICY IF EXISTS "Users can view own system key usage" ON system_key_usage;
CREATE POLICY "Users can view own system key usage" ON system_key_usage
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own system key usage" ON system_key_usage;
CREATE POLICY "Users can update own system key usage" ON system_key_usage
  FOR ALL
  USING (auth.uid() = user_id);

-- 11. Create RLS policies for ai_models
DROP POLICY IF EXISTS "Everyone can view AI models" ON ai_models;
CREATE POLICY "Everyone can view AI models" ON ai_models
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Only admins can manage AI models" ON ai_models;
CREATE POLICY "Only admins can manage AI models" ON ai_models
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- 12. Function to check available AI provider for user
CREATE OR REPLACE FUNCTION get_available_ai_key(
  user_id_param UUID,
  provider_param ai_provider
)
RETURNS TABLE (
  key_id UUID,
  key_type VARCHAR(10), -- 'user' or 'system'
  encrypted_key TEXT,
  daily_limit INTEGER,
  monthly_limit INTEGER,
  current_daily_usage INTEGER,
  current_monthly_usage INTEGER
) AS $$
DECLARE
  user_key RECORD;
  system_key RECORD;
  usage_record RECORD;
BEGIN
  -- First check for user's own key
  SELECT * INTO user_key
  FROM user_ai_keys
  WHERE user_id = user_id_param
    AND provider = provider_param
    AND is_active = true
    AND (is_default = true OR is_active = true)
  ORDER BY is_default DESC, created_at DESC
  LIMIT 1;
  
  IF FOUND THEN
    -- User has their own key
    RETURN QUERY SELECT 
      user_key.id,
      'user'::VARCHAR(10),
      user_key.encrypted_key,
      NULL::INTEGER,
      NULL::INTEGER,
      NULL::INTEGER,
      NULL::INTEGER;
    RETURN;
  END IF;
  
  -- Check for system key
  SELECT * INTO system_key
  FROM system_ai_keys
  WHERE provider = provider_param
    AND is_active = true;
  
  IF NOT FOUND THEN
    -- No key available
    RETURN;
  END IF;
  
  -- Check usage limits for system key
  SELECT * INTO usage_record
  FROM system_key_usage
  WHERE user_id = user_id_param
    AND provider = provider_param;
  
  -- Reset daily counter if needed
  IF usage_record.last_reset_daily < CURRENT_DATE THEN
    UPDATE system_key_usage
    SET daily_count = 0,
        last_reset_daily = CURRENT_DATE
    WHERE user_id = user_id_param
      AND provider = provider_param;
    usage_record.daily_count := 0;
  END IF;
  
  -- Reset monthly counter if needed
  IF usage_record.last_reset_monthly < DATE_TRUNC('month', CURRENT_DATE) THEN
    UPDATE system_key_usage
    SET monthly_count = 0,
        last_reset_monthly = DATE_TRUNC('month', CURRENT_DATE)
    WHERE user_id = user_id_param
      AND provider = provider_param;
    usage_record.monthly_count := 0;
  END IF;
  
  -- Create usage record if doesn't exist
  IF NOT FOUND THEN
    INSERT INTO system_key_usage (user_id, provider)
    VALUES (user_id_param, provider_param)
    ON CONFLICT (user_id, provider) DO NOTHING;
    usage_record.daily_count := 0;
    usage_record.monthly_count := 0;
  END IF;
  
  RETURN QUERY SELECT 
    system_key.id,
    'system'::VARCHAR(10),
    system_key.encrypted_key,
    system_key.daily_limit,
    system_key.monthly_limit,
    COALESCE(usage_record.daily_count, 0),
    COALESCE(usage_record.monthly_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Function to increment usage counter
CREATE OR REPLACE FUNCTION increment_ai_usage(
  user_id_param UUID,
  provider_param ai_provider,
  key_type_param VARCHAR(10),
  model_used VARCHAR(100) DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  IF key_type_param = 'user' THEN
    -- Update user key usage
    UPDATE user_ai_keys
    SET usage_count = usage_count + 1,
        last_used_at = NOW()
    WHERE user_id = user_id_param
      AND provider = provider_param
      AND is_active = true;
  ELSE
    -- Update system key usage
    INSERT INTO system_key_usage (
      user_id, 
      provider, 
      daily_count, 
      monthly_count,
      last_used_at,
      last_model_used
    )
    VALUES (
      user_id_param, 
      provider_param, 
      1, 
      1,
      NOW(),
      model_used
    )
    ON CONFLICT (user_id, provider) 
    DO UPDATE SET
      daily_count = CASE 
        WHEN system_key_usage.last_reset_daily < CURRENT_DATE 
        THEN 1 
        ELSE system_key_usage.daily_count + 1 
      END,
      monthly_count = CASE 
        WHEN system_key_usage.last_reset_monthly < DATE_TRUNC('month', CURRENT_DATE)
        THEN 1 
        ELSE system_key_usage.monthly_count + 1 
      END,
      last_reset_daily = CASE 
        WHEN system_key_usage.last_reset_daily < CURRENT_DATE 
        THEN CURRENT_DATE 
        ELSE system_key_usage.last_reset_daily 
      END,
      last_reset_monthly = CASE 
        WHEN system_key_usage.last_reset_monthly < DATE_TRUNC('month', CURRENT_DATE)
        THEN DATE_TRUNC('month', CURRENT_DATE)
        ELSE system_key_usage.last_reset_monthly 
      END,
      last_used_at = NOW(),
      last_model_used = COALESCE(model_used, system_key_usage.last_model_used);
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Insert default AI models
INSERT INTO ai_models (provider, model_id, model_name, model_category, max_tokens, supports_functions, supports_vision, cost_per_1k_input, cost_per_1k_output)
VALUES 
  -- OpenAI
  ('openai', 'gpt-4-turbo-preview', 'GPT-4 Turbo', 'chat', 128000, true, true, 0.01, 0.03),
  ('openai', 'gpt-4', 'GPT-4', 'chat', 8192, true, false, 0.03, 0.06),
  ('openai', 'gpt-3.5-turbo', 'GPT-3.5 Turbo', 'chat', 16385, true, false, 0.0005, 0.0015),
  ('openai', 'gpt-4o', 'GPT-4o', 'chat', 128000, true, true, 0.005, 0.015),
  ('openai', 'gpt-4o-mini', 'GPT-4o Mini', 'chat', 128000, true, true, 0.00015, 0.0006),
  
  -- Anthropic
  ('anthropic', 'claude-3-opus-20240229', 'Claude 3 Opus', 'chat', 200000, true, true, 0.015, 0.075),
  ('anthropic', 'claude-3-sonnet-20240229', 'Claude 3 Sonnet', 'chat', 200000, true, true, 0.003, 0.015),
  ('anthropic', 'claude-3-haiku-20240307', 'Claude 3 Haiku', 'chat', 200000, false, true, 0.00025, 0.00125),
  ('anthropic', 'claude-3-5-sonnet-20241022', 'Claude 3.5 Sonnet', 'chat', 200000, true, true, 0.003, 0.015),
  
  -- Google
  ('google', 'gemini-pro', 'Gemini Pro', 'chat', 32760, true, false, 0.00025, 0.0005),
  ('google', 'gemini-pro-vision', 'Gemini Pro Vision', 'chat', 32760, true, true, 0.00025, 0.0005),
  ('google', 'gemini-1.5-pro', 'Gemini 1.5 Pro', 'chat', 1048576, true, true, 0.0035, 0.0105),
  ('google', 'gemini-1.5-flash', 'Gemini 1.5 Flash', 'chat', 1048576, true, true, 0.00035, 0.00105)
ON CONFLICT (provider, model_id) DO UPDATE SET
  model_name = EXCLUDED.model_name,
  max_tokens = EXCLUDED.max_tokens,
  supports_functions = EXCLUDED.supports_functions,
  supports_vision = EXCLUDED.supports_vision,
  cost_per_1k_input = EXCLUDED.cost_per_1k_input,
  cost_per_1k_output = EXCLUDED.cost_per_1k_output,
  updated_at = NOW();

-- Grant permissions
GRANT ALL ON user_ai_keys TO authenticated;
GRANT ALL ON system_ai_keys TO authenticated;
GRANT ALL ON system_key_usage TO authenticated;
GRANT ALL ON ai_models TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_ai_key(UUID, ai_provider) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_ai_usage(UUID, ai_provider, VARCHAR, VARCHAR) TO authenticated;

-- Success message
SELECT 'AI Provider Keys system setup complete!' as status;