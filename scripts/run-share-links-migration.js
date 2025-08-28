const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function runMigration() {
  try {
    console.log('Creating share_links table...');

    // Use the Supabase SQL editor approach
    const { data, error } = await supabase
      .from('share_links')
      .select('id')
      .limit(1);

    if (error && error.message.includes('relation "public.share_links" does not exist')) {
      console.log('Table does not exist. Please create it manually in Supabase Dashboard.');
      console.log('Copy the SQL from scripts/create-share-links-table.sql');
    } else if (error) {
      console.error('Error checking table:', error);
    } else {
      console.log('Share links table already exists or was created successfully!');
    }

  } catch (error) {
    console.error('Migration error:', error);
  }
}

runMigration();