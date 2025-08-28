import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const { Client } = pg;

async function checkTable() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    await client.connect();
    
    // Check columns
    const result = await client.query(`
      SELECT column_name, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'workspace_api_keys'
      ORDER BY ordinal_position
    `);
    
    console.log('Columns in workspace_api_keys:');
    result.rows.forEach(col => {
      console.log(`  - ${col.column_name}: nullable=${col.is_nullable}, default=${col.column_default || 'none'}`);
    });
    
    // Check if api_key column still exists
    const apiKeyCol = result.rows.find(r => r.column_name === 'api_key');
    if (apiKeyCol) {
      console.log('\n⚠️  WARNING: api_key column still exists and is', apiKeyCol.is_nullable === 'NO' ? 'NOT NULL' : 'nullable');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkTable();