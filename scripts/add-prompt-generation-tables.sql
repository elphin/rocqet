-- Meta-prompt templates table
CREATE TABLE IF NOT EXISTS meta_prompt_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Template Info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  
  -- The actual meta-prompt template
  template TEXT NOT NULL,
  
  -- Model preferences
  model_preference VARCHAR(50),
  temperature DECIMAL(2,1) DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 2000,
  
  -- Configuration
  supported_platforms JSONB DEFAULT '["general"]'::jsonb,
  variables JSONB DEFAULT '[]'::jsonb,
  example_inputs JSONB DEFAULT '[]'::jsonb,
  
  -- Usage & Performance
  usage_count INTEGER DEFAULT 0,
  success_rate INTEGER,
  average_rating DECIMAL(2,1),
  
  -- Access Control
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  
  -- Metadata
  tags JSONB DEFAULT '[]'::jsonb,
  version VARCHAR(20) DEFAULT '1.0.0',
  
  created_by UUID NOT NULL,
  updated_by UUID,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for meta_prompt_templates
CREATE INDEX IF NOT EXISTS meta_prompt_templates_workspace_idx ON meta_prompt_templates(workspace_id);
CREATE INDEX IF NOT EXISTS meta_prompt_templates_category_idx ON meta_prompt_templates(category);
CREATE INDEX IF NOT EXISTS meta_prompt_templates_active_idx ON meta_prompt_templates(is_active);
CREATE INDEX IF NOT EXISTS meta_prompt_templates_public_idx ON meta_prompt_templates(is_public);

-- Prompt generations history table
CREATE TABLE IF NOT EXISTS prompt_generations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Generation Input
  meta_prompt_id UUID REFERENCES meta_prompt_templates(id) ON DELETE SET NULL,
  input JSONB NOT NULL,
  
  -- Generated Output
  generated_title VARCHAR(255),
  generated_description TEXT,
  generated_content TEXT NOT NULL,
  generated_variables JSONB DEFAULT '[]'::jsonb,
  generated_tags JSONB DEFAULT '[]'::jsonb,
  
  -- Additional generated metadata
  suggested_model VARCHAR(100),
  suggested_temperature DECIMAL(2,1),
  suggested_examples JSONB DEFAULT '[]'::jsonb,
  
  -- Generation Details
  provider VARCHAR(50) NOT NULL,
  model_used VARCHAR(100) NOT NULL,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  cost INTEGER,
  generation_time_ms INTEGER,
  
  -- Usage Tracking
  was_used BOOLEAN DEFAULT false,
  used_in_prompt_id UUID REFERENCES prompts(id) ON DELETE SET NULL,
  
  -- Feedback
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  user_feedback TEXT,
  
  -- Error Handling
  status VARCHAR(50) DEFAULT 'success',
  error TEXT,
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for prompt_generations
CREATE INDEX IF NOT EXISTS prompt_generations_workspace_idx ON prompt_generations(workspace_id);
CREATE INDEX IF NOT EXISTS prompt_generations_user_idx ON prompt_generations(user_id);
CREATE INDEX IF NOT EXISTS prompt_generations_meta_prompt_idx ON prompt_generations(meta_prompt_id);
CREATE INDEX IF NOT EXISTS prompt_generations_created_at_idx ON prompt_generations(created_at);
CREATE INDEX IF NOT EXISTS prompt_generations_was_used_idx ON prompt_generations(was_used);

-- Generation feedback table
CREATE TABLE IF NOT EXISTS generation_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  generation_id UUID REFERENCES prompt_generations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Feedback Details
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  
  -- Improvement suggestions
  suggested_changes TEXT,
  was_helpful BOOLEAN,
  
  -- Categories of feedback
  feedback_type VARCHAR(50),
  tags JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for generation_feedback
CREATE INDEX IF NOT EXISTS generation_feedback_generation_idx ON generation_feedback(generation_id);
CREATE INDEX IF NOT EXISTS generation_feedback_user_idx ON generation_feedback(user_id);

-- Meta-prompt A/B testing variants table
CREATE TABLE IF NOT EXISTS meta_prompt_variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  original_id UUID REFERENCES meta_prompt_templates(id) ON DELETE CASCADE NOT NULL,
  
  -- Variant Details
  name VARCHAR(255) NOT NULL,
  template TEXT NOT NULL,
  description TEXT,
  
  -- Test Configuration
  test_percentage INTEGER DEFAULT 50,
  is_active BOOLEAN DEFAULT true,
  
  -- Performance Metrics
  usage_count INTEGER DEFAULT 0,
  success_rate INTEGER,
  average_rating DECIMAL(2,1),
  conversion_rate INTEGER,
  
  -- Test Results
  winner_declared BOOLEAN DEFAULT false,
  test_started_at TIMESTAMP,
  test_ended_at TIMESTAMP,
  
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for meta_prompt_variants
CREATE INDEX IF NOT EXISTS meta_prompt_variants_original_idx ON meta_prompt_variants(original_id);
CREATE INDEX IF NOT EXISTS meta_prompt_variants_active_idx ON meta_prompt_variants(is_active);

-- Insert default system meta-prompt templates
INSERT INTO meta_prompt_templates (
  name, 
  description, 
  category, 
  template,
  model_preference,
  is_system,
  is_public,
  created_by
) VALUES 
(
  'General Purpose Prompt Generator',
  'A versatile meta-prompt for generating prompts across various domains',
  'general',
  E'You are an expert prompt engineer. Create a high-quality prompt based on the following requirements:\n\nGoal: {{goal}}\nPlatform: {{platform}}\nStyle: {{style}}\n{{#if variables}}Variables to include: {{variables}}{{/if}}\n{{#if examples}}Example outputs: {{examples}}{{/if}}\n\nGenerate a prompt that:\n1. Is clear, specific, and actionable\n2. Includes appropriate context and constraints\n3. Uses the specified variables with {{variable}} syntax\n4. Follows best practices for the target platform\n5. Optimizes for the desired style ({{style}})\n\nOutput format:\nTitle: [Concise, descriptive title]\nDescription: [Brief description of what the prompt does]\nContent: [The actual prompt content]\nVariables: [List of variables used]\nTags: [Relevant tags for categorization]',
  'gpt-4',
  true,
  true,
  '00000000-0000-0000-0000-000000000000'
),
(
  'Code Assistant Prompt Generator',
  'Specialized for generating programming and development prompts',
  'coding',
  E'You are an expert at creating prompts for code generation and programming assistance. Create a prompt based on:\n\nProgramming Task: {{goal}}\nLanguage/Framework: {{language}}\nComplexity Level: {{complexity}}\n{{#if requirements}}Specific Requirements: {{requirements}}{{/if}}\n\nGenerate a prompt that:\n1. Clearly defines the programming task\n2. Specifies input/output formats\n3. Includes error handling considerations\n4. Mentions performance requirements if applicable\n5. Uses appropriate technical terminology\n\nEnsure the prompt will generate:\n- Clean, maintainable code\n- Proper documentation\n- Best practices for the language\n- Test cases when appropriate\n\nOutput format:\nTitle: [Task-focused title]\nDescription: [Technical description]\nContent: [The prompt for code generation]\nVariables: [Required inputs]\nTags: [Language, framework, task type]',
  'gpt-4',
  true,
  true,
  '00000000-0000-0000-0000-000000000000'
),
(
  'Content Creator Prompt Generator',
  'Optimized for generating content writing and creative prompts',
  'writing',
  E'You are a creative writing expert. Design a prompt for content creation based on:\n\nContent Type: {{content_type}}\nTopic: {{goal}}\nTone: {{tone}}\nTarget Audience: {{audience}}\n{{#if keywords}}SEO Keywords: {{keywords}}{{/if}}\n{{#if word_count}}Word Count: {{word_count}}{{/if}}\n\nCreate a prompt that:\n1. Establishes clear voice and tone\n2. Defines the target audience\n3. Includes structure guidelines\n4. Incorporates SEO best practices if needed\n5. Specifies formatting requirements\n\nThe prompt should guide the AI to produce:\n- Engaging, original content\n- Proper structure and flow\n- Audience-appropriate language\n- Call-to-action if relevant\n\nOutput format:\nTitle: [Content-focused title]\nDescription: [Purpose and audience]\nContent: [The writing prompt]\nVariables: [Content parameters]\nTags: [Content type, industry, tone]',
  'gpt-4',
  true,
  true,
  '00000000-0000-0000-0000-000000000000'
),
(
  'Data Analysis Prompt Generator',
  'For creating data analysis and research prompts',
  'analysis',
  E'You are a data analysis expert. Create a prompt for analytical tasks based on:\n\nAnalysis Goal: {{goal}}\nData Type: {{data_type}}\nOutput Format: {{output_format}}\n{{#if metrics}}Key Metrics: {{metrics}}{{/if}}\n{{#if constraints}}Constraints: {{constraints}}{{/if}}\n\nDesign a prompt that:\n1. Clearly defines the analysis objective\n2. Specifies data requirements\n3. Outlines the methodology\n4. Defines success metrics\n5. Includes visualization needs if applicable\n\nThe prompt should enable:\n- Systematic data exploration\n- Statistical rigor when needed\n- Clear insights and conclusions\n- Actionable recommendations\n\nOutput format:\nTitle: [Analysis-focused title]\nDescription: [Analytical objective]\nContent: [The analysis prompt]\nVariables: [Data inputs needed]\nTags: [Analysis type, domain, tools]',
  'gpt-4',
  true,
  true,
  '00000000-0000-0000-0000-000000000000'
),
(
  'Customer Service Prompt Generator',
  'For creating customer support and service prompts',
  'customer_service',
  E'You are a customer service expert. Create a prompt for support interactions based on:\n\nService Context: {{goal}}\nCustomer Type: {{customer_type}}\nTone: {{tone}}\nEscalation Level: {{escalation_level}}\n{{#if policies}}Company Policies: {{policies}}{{/if}}\n{{#if products}}Product/Service: {{products}}{{/if}}\n\nCreate a prompt that:\n1. Maintains appropriate professional tone\n2. Shows empathy and understanding\n3. Provides clear solutions\n4. Follows company guidelines\n5. Manages escalation appropriately\n\nThe prompt should enable:\n- Consistent service quality\n- Problem resolution\n- Customer satisfaction\n- Brand voice alignment\n\nOutput format:\nTitle: [Service scenario title]\nDescription: [Support context]\nContent: [The service prompt]\nVariables: [Customer inputs]\nTags: [Service type, industry, tone]',
  'gpt-4',
  true,
  true,
  '00000000-0000-0000-0000-000000000000'
);

-- Add RLS policies for the new tables
ALTER TABLE meta_prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_prompt_variants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for meta_prompt_templates
CREATE POLICY "Public templates are viewable by all" ON meta_prompt_templates
  FOR SELECT USING (is_public = true OR workspace_id IS NULL);

CREATE POLICY "Workspace members can view their templates" ON meta_prompt_templates
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace admins can manage templates" ON meta_prompt_templates
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- RLS Policies for prompt_generations
CREATE POLICY "Users can view their own generations" ON prompt_generations
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Workspace members can view workspace generations" ON prompt_generations
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create generations" ON prompt_generations
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own generations" ON prompt_generations
  FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for generation_feedback
CREATE POLICY "Users can view feedback" ON generation_feedback
  FOR SELECT USING (
    generation_id IN (
      SELECT id FROM prompt_generations
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create feedback" ON generation_feedback
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own feedback" ON generation_feedback
  FOR UPDATE USING (user_id = auth.uid());