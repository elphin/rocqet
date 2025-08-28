-- Template Library Schema
-- Marketplace for sharing and discovering prompt templates

-- 1. Create prompt_templates table
CREATE TABLE IF NOT EXISTS prompt_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Template metadata
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  content TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  
  -- Category and tags
  category VARCHAR(100) NOT NULL,
  tags TEXT[] DEFAULT '{}',
  use_case TEXT,
  
  -- Author information
  author_id UUID NOT NULL REFERENCES auth.users(id),
  author_name VARCHAR(255),
  author_avatar TEXT,
  workspace_id UUID REFERENCES workspaces(id), -- Optional: which workspace published it
  
  -- Visibility and pricing
  visibility VARCHAR(50) DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'unlisted')),
  is_featured BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false, -- Verified by ROCQET team
  price DECIMAL(10,2) DEFAULT 0, -- For future paid templates
  
  -- Usage statistics
  views_count INTEGER DEFAULT 0,
  uses_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  rating_avg DECIMAL(3,2),
  rating_count INTEGER DEFAULT 0,
  
  -- Version control
  version VARCHAR(20) DEFAULT '1.0.0',
  parent_template_id UUID REFERENCES prompt_templates(id), -- For forks
  
  -- Model recommendations
  recommended_models TEXT[] DEFAULT '{}',
  model_settings JSONB DEFAULT '{}',
  
  -- Documentation
  example_input TEXT,
  example_output TEXT,
  requirements TEXT,
  warnings TEXT,
  
  -- SEO
  slug VARCHAR(255) UNIQUE NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Search vector for full-text search
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(use_case, '')), 'C')
  ) STORED
);

-- 2. Create template_likes table (users can like templates)
CREATE TABLE IF NOT EXISTS template_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES prompt_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(template_id, user_id)
);

-- 3. Create template_uses table (track who uses which template)
CREATE TABLE IF NOT EXISTS template_uses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES prompt_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  workspace_id UUID REFERENCES workspaces(id),
  prompt_id UUID REFERENCES prompts(id), -- Link to created prompt
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create template_reviews table
CREATE TABLE IF NOT EXISTS template_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES prompt_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  is_verified_purchase BOOLEAN DEFAULT false,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(template_id, user_id)
);

-- 5. Create template_categories table
CREATE TABLE IF NOT EXISTS template_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(20),
  parent_id UUID REFERENCES template_categories(id),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create template_collections table (curated collections)
CREATE TABLE IF NOT EXISTS template_collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  slug VARCHAR(255) UNIQUE NOT NULL,
  cover_image TEXT,
  curator_id UUID REFERENCES auth.users(id),
  is_official BOOLEAN DEFAULT false, -- Official ROCQET collections
  is_public BOOLEAN DEFAULT true,
  templates UUID[] DEFAULT '{}', -- Array of template IDs
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create template_reports table (for moderation)
CREATE TABLE IF NOT EXISTS template_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES prompt_templates(id),
  reporter_id UUID NOT NULL REFERENCES auth.users(id),
  reason VARCHAR(100) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_templates_author ON prompt_templates(author_id);
CREATE INDEX IF NOT EXISTS idx_templates_category ON prompt_templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_visibility ON prompt_templates(visibility);
CREATE INDEX IF NOT EXISTS idx_templates_featured ON prompt_templates(is_featured);
CREATE INDEX IF NOT EXISTS idx_templates_search ON prompt_templates USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_templates_tags ON prompt_templates USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_templates_slug ON prompt_templates(slug);
CREATE INDEX IF NOT EXISTS idx_templates_created ON prompt_templates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_templates_likes ON prompt_templates(likes_count DESC);
CREATE INDEX IF NOT EXISTS idx_templates_uses ON prompt_templates(uses_count DESC);

CREATE INDEX IF NOT EXISTS idx_likes_template ON template_likes(template_id);
CREATE INDEX IF NOT EXISTS idx_likes_user ON template_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_uses_template ON template_uses(template_id);
CREATE INDEX IF NOT EXISTS idx_uses_user ON template_uses(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_template ON template_reviews(template_id);

-- Insert default categories
INSERT INTO template_categories (name, slug, description, icon, color, display_order) VALUES
  ('Marketing', 'marketing', 'Marketing and advertising templates', 'megaphone', '#FF6B6B', 1),
  ('Sales', 'sales', 'Sales and outreach templates', 'dollar-sign', '#4ECDC4', 2),
  ('Writing', 'writing', 'Content writing and copywriting', 'pen-tool', '#45B7D1', 3),
  ('Code', 'code', 'Programming and development', 'code', '#96CEB4', 4),
  ('Data', 'data', 'Data analysis and visualization', 'bar-chart', '#FECA57', 5),
  ('Education', 'education', 'Teaching and learning', 'book-open', '#DDA0DD', 6),
  ('Customer Service', 'customer-service', 'Support and communication', 'headphones', '#98D8C8', 7),
  ('Creative', 'creative', 'Creative and artistic', 'palette', '#FFB6C1', 8),
  ('Business', 'business', 'Business strategy and planning', 'briefcase', '#87CEEB', 9),
  ('Personal', 'personal', 'Personal productivity', 'user', '#F0E68C', 10),
  ('Research', 'research', 'Research and analysis', 'search', '#B19CD9', 11),
  ('Other', 'other', 'Miscellaneous templates', 'grid', '#D3D3D3', 12)
ON CONFLICT (slug) DO NOTHING;

-- Enable RLS
ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_uses ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_reports ENABLE ROW LEVEL SECURITY;

-- Enable real-time for template tables (safely)
DO $$
BEGIN
  -- Check if publication exists and add table if not already member
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    -- Add tables one by one, ignoring if already exists
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE prompt_templates;
    EXCEPTION WHEN duplicate_object THEN
      NULL; -- Ignore if already exists
    END;
    
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE template_likes;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
    
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE template_uses;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END $$;

-- RLS Policies

-- Templates: Anyone can view public templates
DROP POLICY IF EXISTS "Anyone can view public templates" ON prompt_templates;
CREATE POLICY "Anyone can view public templates" ON prompt_templates
  FOR SELECT USING (visibility = 'public' OR author_id = auth.uid());

-- Templates: Authors can manage their own
DROP POLICY IF EXISTS "Authors can manage own templates" ON prompt_templates;
CREATE POLICY "Authors can manage own templates" ON prompt_templates
  FOR ALL USING (author_id = auth.uid());

-- Likes: Users can manage their own likes
DROP POLICY IF EXISTS "Users can view template likes" ON template_likes;
CREATE POLICY "Users can view template likes" ON template_likes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own likes" ON template_likes;
CREATE POLICY "Users can manage own likes" ON template_likes
  FOR ALL USING (user_id = auth.uid());

-- Uses: Track own usage
DROP POLICY IF EXISTS "Users can track own usage" ON template_uses;
CREATE POLICY "Users can track own usage" ON template_uses
  FOR ALL USING (user_id = auth.uid());

-- Reviews: Public read, authors manage own
DROP POLICY IF EXISTS "Anyone can read reviews" ON template_reviews;
CREATE POLICY "Anyone can read reviews" ON template_reviews
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own reviews" ON template_reviews;
CREATE POLICY "Users can manage own reviews" ON template_reviews
  FOR ALL USING (user_id = auth.uid());

-- Categories: Public read
DROP POLICY IF EXISTS "Anyone can view categories" ON template_categories;
CREATE POLICY "Anyone can view categories" ON template_categories
  FOR SELECT USING (is_active = true);

-- Collections: Public/private visibility
DROP POLICY IF EXISTS "View public collections" ON template_collections;
CREATE POLICY "View public collections" ON template_collections
  FOR SELECT USING (is_public = true OR curator_id = auth.uid());

DROP POLICY IF EXISTS "Curators manage own collections" ON template_collections;
CREATE POLICY "Curators manage own collections" ON template_collections
  FOR ALL USING (curator_id = auth.uid());

-- Functions for template operations

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_template_views(template_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE prompt_templates 
  SET views_count = views_count + 1
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update template statistics
CREATE OR REPLACE FUNCTION update_template_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'template_likes' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE prompt_templates 
      SET likes_count = likes_count + 1 
      WHERE id = NEW.template_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE prompt_templates 
      SET likes_count = likes_count - 1 
      WHERE id = OLD.template_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'template_uses' THEN
    UPDATE prompt_templates 
    SET uses_count = uses_count + 1 
    WHERE id = NEW.template_id;
  ELSIF TG_TABLE_NAME = 'template_reviews' THEN
    UPDATE prompt_templates 
    SET 
      rating_avg = (
        SELECT AVG(rating)::DECIMAL(3,2) 
        FROM template_reviews 
        WHERE template_id = NEW.template_id
      ),
      rating_count = (
        SELECT COUNT(*) 
        FROM template_reviews 
        WHERE template_id = NEW.template_id
      )
    WHERE id = NEW.template_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for statistics
DROP TRIGGER IF EXISTS update_template_likes ON template_likes;
CREATE TRIGGER update_template_likes
  AFTER INSERT OR DELETE ON template_likes
  FOR EACH ROW EXECUTE FUNCTION update_template_stats();

DROP TRIGGER IF EXISTS update_template_uses ON template_uses;
CREATE TRIGGER update_template_uses
  AFTER INSERT ON template_uses
  FOR EACH ROW EXECUTE FUNCTION update_template_stats();

DROP TRIGGER IF EXISTS update_template_reviews ON template_reviews;
CREATE TRIGGER update_template_reviews
  AFTER INSERT OR UPDATE OR DELETE ON template_reviews
  FOR EACH ROW EXECUTE FUNCTION update_template_stats();