import pg from 'pg';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function runMigration() {
  try {
    console.log('Running slug migration...');
    
    // Read migration file
    const migrationPath = join(__dirname, 'add-chain-slugs.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    // Run migration
    await pool.query(migrationSQL);
    console.log('✓ Slug migration completed successfully!');
    
    // Check the results
    const result = await pool.query('SELECT id, name, slug FROM chains LIMIT 5');
    console.log('\nExisting chains:');
    
    if (result.rows.length === 0) {
      console.log('No chains found');
    } else {
      result.rows.forEach(row => {
        console.log(`- ${row.name}: slug=${row.slug}`);
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

runMigration();