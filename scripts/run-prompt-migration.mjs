import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully');

    // Read the SQL file
    const sqlPath = path.join(__dirname, 'add-prompt-columns.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Running migration...');
    await client.query(sql);
    
    console.log('✅ Migration completed successfully!');
    console.log('Added columns: shortcode, visibility, is_favorite, folder_id, views, uses, favorites_count, shares_count');
    console.log('Created tables (if not exist): prompt_tags, folders, tags');
  } catch (error) {
    console.error('❌ Error running migration:', error.message);
    throw error;
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

runMigration().catch(console.error);