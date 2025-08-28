import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  // Check connections without active column
  const result = await pool.query(`
    SELECT id, name, type, read_only, workspace_id 
    FROM database_connections 
    LIMIT 10
  `);
  
  console.log('Database connections found:', result.rows.length);
  if (result.rows.length > 0) {
    result.rows.forEach(row => {
      console.log(`- ${row.name}: type=${row.type}, read_only=${row.read_only}`);
    });
  }
  
  // Check columns
  const columnsResult = await pool.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'database_connections'
    ORDER BY ordinal_position
  `);
  
  console.log('\nTable columns:');
  columnsResult.rows.forEach(col => {
    console.log(`- ${col.column_name}: ${col.data_type}`);
  });
  
} catch (error) {
  console.error('Error:', error.message);
} finally {
  await pool.end();
}