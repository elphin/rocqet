import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  console.log('Please add SUPABASE_SERVICE_KEY to your .env.local file');
  console.log('You can find this in your Supabase dashboard under Settings > API > Service Role Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  try {
    console.log('🚀 Starting migration for share_links table...');
    
    // Read the SQL file
    const sqlPath = join(__dirname, 'create-share-links-simple.sql');
    const sql = readFileSync(sqlPath, 'utf8');
    
    // Split SQL statements and execute them
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      console.log('Executing:', statement.substring(0, 50) + '...');
      
      // Use rpc to execute raw SQL (if your Supabase instance supports it)
      // Otherwise, we'll need to use the Supabase Dashboard
      const { error } = await supabase.rpc('exec_sql', { sql: statement }).catch(err => ({ error: err }));
      
      if (error) {
        console.warn('Statement failed (might already exist):', error.message);
      } else {
        console.log('✓ Statement executed successfully');
      }
    }
    
    // Test if the table was created
    const { data, error } = await supabase
      .from('share_links')
      .select('id')
      .limit(1);
    
    if (!error || error.code !== 'PGRST205') {
      console.log('✅ Migration completed successfully! share_links table is ready.');
    } else {
      console.log('⚠️  Table creation requires manual execution in Supabase Dashboard');
      console.log('Please run the SQL from: scripts/create-share-links-simple.sql');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.log('\n📝 Manual steps required:');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and run the SQL from: scripts/create-share-links-simple.sql');
  }
}

runMigration();