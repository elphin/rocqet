import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: '.env.local' });

const { Client } = pg;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL not found in environment');
  process.exit(1);
}

// Get migration file from command line argument
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('Usage: node run-pg-migration.mjs <migration-file.sql>');
  process.exit(1);
}

async function runMigration() {
  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    await client.connect();
    console.log('✓ Connected to database');

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, migrationFile);
    
    if (!fs.existsSync(migrationPath)) {
      console.error(`Migration file not found: ${migrationPath}`);
      process.exit(1);
    }

    const migrationSql = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    console.log(`Running migration: ${migrationFile}...`);
    await client.query(migrationSql);
    console.log(`✓ Migration ${migrationFile} completed successfully!`);

  } catch (error) {
    console.error('Migration failed:', error.message);
    if (error.detail) {
      console.error('Detail:', error.detail);
    }
    if (error.hint) {
      console.error('Hint:', error.hint);
    }
    process.exit(1);
  } finally {
    await client.end();
    console.log('✓ Database connection closed');
  }
}

runMigration();