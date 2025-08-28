import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // First, check if slug column exists
    const { data: columns, error: checkError } = await supabase
      .rpc('get_table_columns', { 
        table_name: 'prompts',
        schema_name: 'public' 
      })
      .select('*');
    
    // If the RPC doesn't exist, try a different approach
    if (checkError) {
      console.log('RPC not available, trying direct SQL');
      
      // Try to add the column (will fail silently if it exists)
      const { error: alterError } = await supabase.rpc('exec_sql', {
        query: `
          ALTER TABLE prompts 
          ADD COLUMN IF NOT EXISTS slug VARCHAR(255);
        `
      });
      
      // If exec_sql doesn't exist either, we need manual intervention
      if (alterError) {
        // Let's try a simple test query to see if the column exists
        const { data: testData, error: testError } = await supabase
          .from('prompts')
          .select('slug')
          .limit(1);
        
        if (testError && testError.message.includes('column prompts.slug does not exist')) {
          return NextResponse.json({
            error: 'Column does not exist. Please run this SQL in your Supabase Dashboard:',
            sql: `
ALTER TABLE prompts 
ADD COLUMN slug VARCHAR(255);

CREATE INDEX IF NOT EXISTS prompts_workspace_slug_idx 
ON prompts(workspace_id, slug);
            `,
            instructions: [
              '1. Go to your Supabase Dashboard',
              '2. Click on "SQL Editor" in the sidebar',
              '3. Copy and paste the SQL above',
              '4. Click "Run"',
              '5. Then visit /api/fix-prompt-slugs again'
            ]
          }, { status: 400 });
        }
        
        // Column exists!
        return NextResponse.json({
          message: 'Slug column already exists! You can now visit /api/fix-prompt-slugs to generate slugs.'
        });
      }
    }
    
    return NextResponse.json({
      message: 'Migration completed successfully! Now visit /api/fix-prompt-slugs to generate slugs.'
    });
    
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({
      error: 'Please run this SQL manually in Supabase Dashboard:',
      sql: `
ALTER TABLE prompts 
ADD COLUMN slug VARCHAR(255);

CREATE INDEX IF NOT EXISTS prompts_workspace_slug_idx 
ON prompts(workspace_id, slug);
      `,
      details: error.message
    }, { status: 500 });
  }
}