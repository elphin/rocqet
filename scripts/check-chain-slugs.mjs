import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  const result = await pool.query('SELECT id, name, slug FROM chains LIMIT 10');
  console.log('Existing chains:');
  
  if (result.rows.length === 0) {
    console.log('No chains found');
  } else {
    result.rows.forEach(row => {
      console.log(`- ${row.name}: slug=${row.slug || 'NULL'}, id=${row.id.substring(0, 8)}...`);
    });
  }
} catch (error) {
  console.error('Error:', error.message);
} finally {
  await pool.end();
}