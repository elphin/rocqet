import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Create share_links table
    const { error: tableError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Create share_links table for managing public prompt shares
        CREATE TABLE IF NOT EXISTS share_links (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
          workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
          slug VARCHAR(255) NOT NULL UNIQUE,
          password_hash TEXT,
          expires_at TIMESTAMP WITH TIME ZONE,
          max_views INTEGER,
          current_views INTEGER DEFAULT 0,
          allow_copying BOOLEAN DEFAULT true,
          show_variables BOOLEAN DEFAULT true,
          created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
          last_accessed_at TIMESTAMP WITH TIME ZONE,
          is_active BOOLEAN DEFAULT true
        );

        -- Create indexes for performance
        CREATE INDEX IF NOT EXISTS idx_share_links_slug ON share_links(slug);
        CREATE INDEX IF NOT EXISTS idx_share_links_prompt_id ON share_links(prompt_id);
        CREATE INDEX IF NOT EXISTS idx_share_links_workspace_id ON share_links(workspace_id);
        CREATE INDEX IF NOT EXISTS idx_share_links_expires_at ON share_links(expires_at);
        CREATE INDEX IF NOT EXISTS idx_share_links_is_active ON share_links(is_active);
      `
    });

    if (tableError) {
      console.error('Error creating table:', tableError);
    }

    // Enable RLS
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;`
    });

    if (rlsError) {
      console.error('Error enabling RLS:', rlsError);
    }

    // Create policies
    const { error: policyError1 } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY IF NOT EXISTS "Workspace members can manage share links" ON share_links
        FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = share_links.workspace_id
            AND wm.user_id = auth.uid()
          )
        );
      `
    });

    if (policyError1) {
      console.error('Error creating policy 1:', policyError1);
    }

    const { error: policyError2 } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY IF NOT EXISTS "Public can view active share links" ON share_links
        FOR SELECT
        USING (
          is_active = true
          AND (expires_at IS NULL OR expires_at > now())
          AND (max_views IS NULL OR current_views < max_views)
        );
      `
    });

    if (policyError2) {
      console.error('Error creating policy 2:', policyError2);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Share links table created successfully'
    });
  } catch (error) {
    console.error('Error creating share links table:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}