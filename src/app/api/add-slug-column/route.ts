import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    // First, let me try using the admin client for database operations
    const supabase = await createClient();
    
    // Test if the column already exists by trying to select it
    const { error: testError } = await supabase
      .from('prompts')
      .select('slug')
      .limit(1);
    
    if (!testError) {
      return NextResponse.json({
        message: 'Slug column already exists! You can visit /api/fix-prompt-slugs to generate slugs.',
        status: 'already_exists'
      });
    }
    
    // If we get here, the column doesn't exist
    // Unfortunately, Supabase client doesn't support DDL operations directly
    // But we can try using the Supabase Management API if we have the right credentials
    
    // Alternative approach: Create a database function that adds the column
    // This function would need to be created once, then we can call it
    
    return NextResponse.json({
      status: 'manual_action_required',
      message: 'The slug column needs to be added to the database.',
      instructions: 'I cannot directly execute ALTER TABLE commands through the Supabase client library.',
      sql_to_run: `
-- Add slug column to prompts table
ALTER TABLE prompts 
ADD COLUMN slug VARCHAR(255);

-- Create index for unique slug per workspace  
CREATE INDEX prompts_workspace_slug_idx 
ON prompts(workspace_id, slug);`,
      alternative: 'Please run the SQL above in Supabase Dashboard, then visit /api/fix-prompt-slugs'
    });
    
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ 
      error: error.message,
      status: 'error' 
    }, { status: 500 });
  }
}