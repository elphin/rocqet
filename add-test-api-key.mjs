import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const { Client } = pg;

async function addTestApiKey() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✓ Connected to database');

    // Get first workspace and user
    const { rows: workspaces } = await client.query(`
      SELECT w.id, w.name, wm.user_id 
      FROM workspaces w
      JOIN workspace_members wm ON w.id = wm.workspace_id
      WHERE wm.role = 'owner'
      LIMIT 1
    `);

    if (workspaces.length === 0) {
      console.log('No workspaces found');
      return;
    }

    const workspace = workspaces[0];
    console.log(`Found workspace: ${workspace.name} (${workspace.id})`);

    // Check if API key already exists
    const { rows: existingKeys } = await client.query(
      'SELECT * FROM workspace_api_keys WHERE workspace_id = $1',
      [workspace.id]
    );

    if (existingKeys.length > 0) {
      console.log('API key already exists for this workspace');
      return;
    }

    // Add a test API key (you should replace with real key)
    const { rows: newKey } = await client.query(`
      INSERT INTO workspace_api_keys (
        workspace_id,
        name,
        provider,
        api_key,
        is_default,
        is_active,
        created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7
      ) RETURNING id
    `, [
      workspace.id,
      'Test OpenAI Key',
      'openai',
      'sk-test-key-replace-with-real', // REPLACE WITH REAL KEY
      true,
      true,
      workspace.user_id
    ]);

    console.log(`✓ API key added with ID: ${newKey[0].id}`);
    console.log('\n⚠️  IMPORTANT: Replace the test API key with your real OpenAI API key in the database!');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
    console.log('✓ Connection closed');
  }
}

addTestApiKey();