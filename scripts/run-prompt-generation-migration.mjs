import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: '.env.local', debug: true });

const { Client } = pg;

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✓ Connected to database');

    // Read the migration SQL
    const migrationPath = join(__dirname, 'add-prompt-generation-tables.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Run the migration
    console.log('Running prompt generation tables migration...');
    await client.query(sql);
    console.log('✓ Prompt generation tables created successfully!');

  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration().catch(console.error);