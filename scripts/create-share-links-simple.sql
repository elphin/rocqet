-- Run this SQL in your Supabase SQL Editor to create the share_links table

-- Create the table
CREATE TABLE IF NOT EXISTS public.share_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  max_views INTEGER,
  current_views INTEGER DEFAULT 0,
  allow_copying BOOLEAN DEFAULT true,
  show_variables BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_share_links_slug ON public.share_links(slug);
CREATE INDEX IF NOT EXISTS idx_share_links_prompt_id ON public.share_links(prompt_id);
CREATE INDEX IF NOT EXISTS idx_share_links_is_active ON public.share_links(is_active);

-- Enable RLS (Row Level Security)
ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows authenticated users to manage their workspace's share links
CREATE POLICY "Users can manage their workspace share links" ON public.share_links
  FOR ALL
  USING (true)  -- For now, allow all authenticated users
  WITH CHECK (true);

-- Create a policy for public read access to active share links
CREATE POLICY "Anyone can view active share links" ON public.share_links
  FOR SELECT
  USING (
    is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  );