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

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testApiKeys() {
  try {
    // Get all workspace API keys
    const { data: keys, error } = await supabase
      .from('workspace_ai_keys')
      .select('*');

    if (error) {
      console.error('Error fetching API keys:', error);
      return;
    }

    console.log('\n🔑 Found API keys:');
    console.log('=' .repeat(50));
    
    if (!keys || keys.length === 0) {
      console.log('No API keys found in database');
    } else {
      keys.forEach(key => {
        console.log(`
Provider: ${key.provider}
Workspace ID: ${key.workspace_id}
Active: ${key.is_active}
Created: ${key.created_at}
Key (masked): ${key.encrypted_key ? '****' + key.encrypted_key.slice(-4) : 'N/A'}
`);
      });
    }

    // Test a specific workspace
    const testWorkspaceId = keys?.[0]?.workspace_id;
    if (testWorkspaceId) {
      console.log('\n📊 Testing workspace:', testWorkspaceId);
      const { data: workspaceKeys, error: wsError } = await supabase
        .from('workspace_ai_keys')
        .select('provider')
        .eq('workspace_id', testWorkspaceId)
        .eq('is_active', true);

      if (wsError) {
        console.error('Error fetching workspace keys:', wsError);
      } else {
        console.log('Active providers for workspace:', workspaceKeys?.map(k => k.provider).join(', '));
      }
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testApiKeys();