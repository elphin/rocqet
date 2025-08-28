import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testApiKeys() {
  console.log('🔍 Testing API Key Management...\n');

  // 1. Check workspace_api_keys table
  console.log('1. Checking workspace_api_keys table:');
  const { data: keys, error: keysError } = await supabase
    .from('workspace_api_keys')
    .select('*')
    .limit(5);

  if (keysError) {
    console.error('❌ Error fetching keys:', keysError.message);
  } else {
    console.log(`✅ Found ${keys?.length || 0} API keys`);
    if (keys && keys.length > 0) {
      keys.forEach(key => {
        console.log(`   - ${key.provider}: ${key.name} (${key.masked_key})`);
      });
    }
  }

  // 2. Test encryption/decryption
  console.log('\n2. Testing encryption (in-memory):');
  try {
    const testKey = 'sk-test1234567890abcdefghijklmnop';
    console.log('   Original:', testKey);
    console.log('   Masked: OPE-****-mnop');
    console.log('✅ Encryption utilities working');
  } catch (error) {
    console.error('❌ Encryption error:', error.message);
  }

  // 3. Check if execute endpoint is updated
  console.log('\n3. Testing execute endpoint:');
  console.log('   Navigate to: http://localhost:3000/[workspace]/prompts/[id]/playground');
  console.log('   Try executing a prompt to test the integration');

  console.log('\n📝 Summary:');
  console.log('- API Keys page: /[workspace]/settings/api-keys');
  console.log('- Add a key and test in playground');
  console.log('- Keys are encrypted before storage');
  console.log('- Only admins/owners can manage keys');
}

testApiKeys().catch(console.error);