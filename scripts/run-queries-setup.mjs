import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config({ path: '.env.local' });

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✓ Connected to database');

    // Read and execute the queries setup SQL
    const sqlFile = path.join(__dirname, 'setup-queries.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('Running queries table setup...');
    await client.query(sql);
    console.log('✓ Query management tables created!');

    // Verify the setup
    const tables = ['queries', 'query_runs', 'query_versions', 'query_cache', 'query_snippets'];
    for (const table of tables) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT 1 
          FROM information_schema.tables 
          WHERE table_name = $1
        )
      `, [table]);
      
      if (result.rows[0].exists) {
        console.log(`  ✓ Table '${table}' exists`);
      } else {
        console.log(`  ✗ Table '${table}' not found`);
      }
    }

  } catch (error) {
    console.error('Migration failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('✓ Database connection closed');
  }
}

runMigration();