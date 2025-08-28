import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: '.env.local' });

const { Client } = pg;

async function runFix() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✓ Connected to database');

    const fixSql = fs.readFileSync(
      path.join(__dirname, 'disable-rls-tiers.sql'),
      'utf8'
    );

    console.log('Disabling RLS on tier_configurations...');
    await client.query(fixSql);
    console.log('✓ RLS disabled on tier_configurations!');

    // Test the query
    console.log('\nTesting tier query...');
    const result = await client.query(`
      SELECT * FROM tier_configurations 
      WHERE active = true 
      ORDER BY monthly_price ASC
    `);
    
    console.log(`✓ Found ${result.rows.length} tiers`);
    result.rows.forEach(tier => {
      console.log(`  - ${tier.tier_name}: ${tier.display_name}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

runFix();
