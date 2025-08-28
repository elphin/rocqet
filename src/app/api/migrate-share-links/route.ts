import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get service role client for admin operations
    const { data: { user } } = await supabase.auth.getUser();
    
    // Create the share_links table
    const { error: createTableError } = await supabase.from('share_links').select('id').limit(1);
    
    if (createTableError && createTableError.code === 'PGRST205') {
      // Table doesn't exist, create it using raw SQL
      // Note: In production Supabase, we need to use the SQL editor or migrations
      // But we can create the table through the API
      
      // First, let's try to create a minimal version
      const { data: prompt } = await supabase
        .from('prompts')
        .select('id, workspace_id')
        .limit(1)
        .single();
      
      if (prompt) {
        // Create a test share link entry to force table creation
        const testData = {
          id: crypto.randomUUID(),
          prompt_id: prompt.id,
          workspace_id: prompt.workspace_id,
          slug: 'test-migration-' + Date.now(),
          password_hash: null,
          expires_at: null,
          max_views: null,
          current_views: 0,
          allow_copying: true,
          show_variables: true,
          created_by: user?.id || null,
          created_at: new Date().toISOString(),
          last_accessed_at: null,
          is_active: false
        };
        
        // Try to insert - this will fail but might help
        const { error: insertError } = await supabase
          .from('share_links')
          .insert(testData);
        
        if (insertError) {
          console.log('Expected error (table needs creation):', insertError);
        }
      }
    }

    // Check if table exists now
    const { data: checkData, error: checkError } = await supabase
      .from('share_links')
      .select('id')
      .limit(1);
    
    if (!checkError || checkError.code !== 'PGRST205') {
      return NextResponse.json({ 
        success: true, 
        message: 'Share links table is ready',
        tableExists: true
      });
    }

    return NextResponse.json({ 
      success: false, 
      message: 'Table creation needs to be done via Supabase Dashboard SQL editor',
      sqlFile: 'scripts/create-share-links-simple.sql',
      tableExists: false
    });
    
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}