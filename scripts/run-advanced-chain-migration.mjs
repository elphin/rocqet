import pg from 'pg';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: '.env.local' });

const { Client } = pg;

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✓ Connected to database');
    
    // Read the migration SQL
    const migrationSQL = readFileSync(
      join(__dirname, 'add-advanced-chain-features.sql'),
      'utf8'
    );
    
    console.log('Running advanced chain features migration...');
    await client.query(migrationSQL);
    console.log('✓ Advanced chain features migration complete!');
    
  } catch (error) {
    console.error('Migration failed:', error.message);
    if (error.detail) {
      console.error('Details:', error.detail);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration().catch(console.error);