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

async function runFix() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✓ Connected to database');

    // Read and execute the fix SQL
    const fixSql = fs.readFileSync(
      path.join(__dirname, 'fix-rls-recursion.sql'),
      'utf8'
    );

    console.log('Fixing RLS recursion for tier_configurations...');
    await client.query(fixSql);
    console.log('✓ RLS policies fixed!');

    // Test the query that the app uses
    console.log('\nTesting tier query as used in the app...');
    const result = await client.query(`
      SELECT * FROM tier_configurations 
      WHERE active = true 
      ORDER BY monthly_price ASC
    `);
    
    console.log(`✓ Query successful! Found ${result.rows.length} tiers`);
    result.rows.forEach(tier => {
      console.log(`  - ${tier.tier_name}: ${tier.display_name} ($${tier.monthly_price}/mo)`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

runFix();