-- Create workspace_ai_keys table if it doesn't exist
CREATE TABLE IF NOT EXISTS workspace_ai_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  api_key TEXT NOT NULL,
  is_default BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(workspace_id, provider)
);

-- Create user_ai_keys table if it doesn't exist (for personal API keys)
CREATE TABLE IF NOT EXISTS user_ai_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  api_key TEXT NOT NULL,
  is_default BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(user_id, provider)
);

-- Create ai_models table if it doesn't exist
CREATE TABLE IF NOT EXISTS ai_models (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL,
  model_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  max_tokens INTEGER,
  supports_vision BOOLEAN DEFAULT false,
  supports_functions BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'ai_models_provider_model_name_key'
  ) THEN
    ALTER TABLE ai_models ADD CONSTRAINT ai_models_provider_model_name_key UNIQUE(provider, model_name);
  END IF;
END $$;

-- Add display_name column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ai_models' 
    AND column_name = 'display_name'
  ) THEN
    ALTER TABLE ai_models ADD COLUMN display_name TEXT;
    UPDATE ai_models SET display_name = model_name WHERE display_name IS NULL;
    ALTER TABLE ai_models ALTER COLUMN display_name SET NOT NULL;
  END IF;
END $$;

-- Insert default AI models if they don't exist (only for supported providers)
INSERT INTO ai_models (provider, model_name, display_name, max_tokens, supports_vision, supports_functions) VALUES
  ('openai', 'gpt-4-turbo-preview', 'GPT-4 Turbo', 128000, true, true),
  ('openai', 'gpt-4', 'GPT-4', 8192, false, true),
  ('openai', 'gpt-3.5-turbo', 'GPT-3.5 Turbo', 16385, false, true),
  ('openai', 'gpt-3.5-turbo-16k', 'GPT-3.5 Turbo 16K', 16385, false, true),
  ('anthropic', 'claude-3-opus-20240229', 'Claude 3 Opus', 200000, true, false),
  ('anthropic', 'claude-3-sonnet-20240229', 'Claude 3 Sonnet', 200000, true, false),
  ('anthropic', 'claude-3-haiku-20240307', 'Claude 3 Haiku', 200000, true, false),
  ('google', 'gemini-pro', 'Gemini Pro', 30720, false, true),
  ('google', 'gemini-pro-vision', 'Gemini Pro Vision', 30720, true, true),
  ('mistral', 'mistral-large-latest', 'Mistral Large', 32000, false, true),
  ('mistral', 'mistral-medium-latest', 'Mistral Medium', 32000, false, true),
  ('mistral', 'mistral-small-latest', 'Mistral Small', 32000, false, true),
  ('cohere', 'command', 'Command', 4096, false, false),
  ('cohere', 'command-light', 'Command Light', 4096, false, false),
  ('cohere', 'command-nightly', 'Command Nightly', 4096, false, false)
ON CONFLICT (provider, model_name) DO NOTHING;

-- Enable RLS
ALTER TABLE workspace_ai_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ai_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workspace_ai_keys
CREATE POLICY "Workspace members can view workspace API keys" ON workspace_ai_keys
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspace_ai_keys.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace admins can manage workspace API keys" ON workspace_ai_keys
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspace_ai_keys.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin')
    )
  );

-- RLS Policies for user_ai_keys
CREATE POLICY "Users can view their own API keys" ON user_ai_keys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own API keys" ON user_ai_keys
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for ai_models (public read)
CREATE POLICY "Anyone can view AI models" ON ai_models
  FOR SELECT USING (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_workspace_ai_keys_updated_at'
  ) THEN
    CREATE TRIGGER update_workspace_ai_keys_updated_at
      BEFORE UPDATE ON workspace_ai_keys
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_user_ai_keys_updated_at'
  ) THEN
    CREATE TRIGGER update_user_ai_keys_updated_at
      BEFORE UPDATE ON user_ai_keys
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;