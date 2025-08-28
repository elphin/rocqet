import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const { Client } = pg;

async function testTiers() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✓ Connected to database');

    // Test the exact query the billing page uses
    const result = await client.query(`
      SELECT * FROM tier_configurations 
      WHERE active = true 
      ORDER BY monthly_price ASC
    `);
    
    console.log(`\n✓ Found ${result.rows.length} active tiers:`);
    result.rows.forEach(tier => {
      console.log(`  - ${tier.tier_name}: ${tier.display_name} ($${tier.monthly_price}/mo)`);
      console.log(`    Features:`, tier.features);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

testTiers();
