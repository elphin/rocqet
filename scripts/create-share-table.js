const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createShareLinksTable() {
  console.log('🚀 Creating share_links table...');
  
  // Test if table exists
  const { data, error } = await supabase
    .from('share_links')
    .select('id')
    .limit(1);
  
  if (!error || error.code !== 'PGRST205') {
    console.log('✅ Table share_links already exists or was created!');
    return true;
  }
  
  console.log('⚠️  Table does not exist yet.');
  console.log('📝 The table will be created automatically when you:');
  console.log('   1. Run: npm run db:push');
  console.log('   2. Select option 1: "+ share_links create table"');
  console.log('   OR');
  console.log('   3. Run the SQL manually in Supabase Dashboard from:');
  console.log('      scripts/create-share-links-simple.sql');
  
  return false;
}

createShareLinksTable();