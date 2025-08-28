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
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'prompts'
      ORDER BY ordinal_position
    `);
    
    console.log('Columns in prompts table:');
    result.rows.forEach(col => {
      console.log(`  - ${col.column_name}`);
    });
    
    // Check a sample prompt
    const sample = await client.query(`
      SELECT id, name, content, prompt 
      FROM prompts 
      LIMIT 1
    `);
    
    if (sample.rows.length > 0) {
      console.log('\nSample prompt:');
      console.log('  id:', sample.rows[0].id);
      console.log('  name:', sample.rows[0].name);
      console.log('  content:', sample.rows[0].content ? 'Has content' : 'No content');
      console.log('  prompt:', sample.rows[0].prompt ? 'Has prompt' : 'No prompt');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkTable();