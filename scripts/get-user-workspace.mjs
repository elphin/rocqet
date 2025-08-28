import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const { Client } = pg;

async function getWorkspace() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    
    // Get the user's workspace
    const result = await client.query(`
      SELECT w.* 
      FROM workspaces w
      JOIN workspace_members wm ON w.id = wm.workspace_id
      JOIN auth.users u ON wm.user_id = u.id
      WHERE u.email = 'jim@elphinstone.nl'
      LIMIT 1;
    `);

    if (result.rows.length > 0) {
      console.log('Workspace found:', result.rows[0]);
      console.log('Workspace slug:', result.rows[0].slug);
    } else {
      console.log('No workspace found for this user');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

getWorkspace();