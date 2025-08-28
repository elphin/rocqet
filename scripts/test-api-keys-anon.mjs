import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

// For testing, we'll use a known user session
// You should login first via the browser to get a session
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testApiKeys() {
  try {
    console.log('🔍 Testing API key retrieval with anon key...\n');
    
    // Try to get workspace API keys (will work if RLS allows public read)
    const { data: keys, error } = await supabase
      .from('workspace_ai_keys')
      .select('provider, workspace_id, is_active, created_at')
      .eq('is_active', true);

    if (error) {
      console.error('❌ Cannot fetch keys without authentication (expected with RLS):', error.message);
      console.log('\n💡 This is expected behavior - RLS policies require authentication.');
      console.log('   Users must be logged in to see workspace API keys.');
    } else if (!keys || keys.length === 0) {
      console.log('📭 No API keys found (may need authentication)');
    } else {
      console.log('✅ Found API keys (unexpected with RLS):');
      keys.forEach(key => {
        console.log(`   - Provider: ${key.provider}, Active: ${key.is_active}`);
      });
    }

    // Test the table structure
    console.log('\n📋 Checking table structure...');
    const { data: testInsert, error: insertError } = await supabase
      .from('workspace_ai_keys')
      .select('*')
      .limit(0);

    if (insertError) {
      console.log('❌ Table access denied (expected with RLS):', insertError.message);
    } else {
      console.log('✅ Table exists and is accessible');
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testApiKeys();