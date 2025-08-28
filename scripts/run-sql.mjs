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

async function runSQL() {
  // Get SQL file from command line argument
  const sqlFile = process.argv[2];
  if (!sqlFile) {
    console.error('Please provide a SQL file as argument');
    console.error('Usage: node scripts/run-sql.mjs <sql-file>');
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    await client.connect();
    console.log('✓ Connected to database');

    // Read the SQL file
    const sqlPath = path.join(__dirname, sqlFile);
    if (!fs.existsSync(sqlPath)) {
      console.error(`SQL file not found: ${sqlPath}`);
      process.exit(1);
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute the SQL
    console.log(`Running SQL from ${sqlFile}...`);
    await client.query(sql);
    console.log(`✓ SQL executed successfully!`);

  } catch (error) {
    console.error('SQL execution failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('✓ Database connection closed');
  }
}

runSQL();