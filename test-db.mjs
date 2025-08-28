import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const { Client } = pg;

async function testConnection() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✓ Connected to database');

    // Test basic queries
    const { rows: workspaces } = await client.query('SELECT COUNT(*) FROM workspaces');
    console.log(`✓ Workspaces: ${workspaces[0].count}`);

    const { rows: prompts } = await client.query('SELECT COUNT(*) FROM prompts');
    console.log(`✓ Prompts: ${prompts[0].count}`);

    const { rows: apiKeys } = await client.query('SELECT COUNT(*) FROM workspace_api_keys');
    console.log(`✓ API Keys: ${apiKeys[0].count}`);

    const { rows: chainSteps } = await client.query('SELECT COUNT(*) FROM prompt_chain_steps');
    console.log(`✓ Chain Steps: ${chainSteps[0].count}`);

    const { rows: runs } = await client.query('SELECT COUNT(*) FROM prompt_runs');
    console.log(`✓ Prompt Runs: ${runs[0].count}`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
    console.log('✓ Connection closed');
  }
}

testConnection();