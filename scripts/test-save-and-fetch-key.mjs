import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testSaveAndFetch() {
  try {
    // First, get a workspace to test with
    const { data: workspaces, error: wsError } = await supabase
      .from('workspaces')
      .select('id, name')
      .limit(1);

    if (wsError || !workspaces || workspaces.length === 0) {
      console.error('No workspaces found:', wsError);
      return;
    }

    const testWorkspace = workspaces[0];
    console.log('Testing with workspace:', testWorkspace);

    // Try to save a test API key
    console.log('\n🔑 Saving test API key...');
    const { data: savedKey, error: saveError } = await supabase
      .from('workspace_ai_keys')
      .upsert({
        workspace_id: testWorkspace.id,
        provider: 'openai',
        api_key: 'sk-test-' + Date.now(),
        is_default: true,
        is_active: true
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving key:', saveError);
      return;
    }

    console.log('✅ Key saved successfully:', savedKey);

    // Now fetch it back
    console.log('\n📊 Fetching keys for workspace...');
    const { data: keys, error: fetchError } = await supabase
      .from('workspace_ai_keys')
      .select('*')
      .eq('workspace_id', testWorkspace.id);

    if (fetchError) {
      console.error('Error fetching keys:', fetchError);
      return;
    }

    console.log('Found keys:', keys);

    // Clean up - delete the test key
    console.log('\n🧹 Cleaning up test key...');
    const { error: deleteError } = await supabase
      .from('workspace_ai_keys')
      .delete()
      .eq('id', savedKey.id);

    if (deleteError) {
      console.error('Error deleting test key:', deleteError);
    } else {
      console.log('✅ Test key cleaned up');
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testSaveAndFetch();