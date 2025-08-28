import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  // Check connections
  const result = await pool.query(`
    SELECT id, name, type, read_only, active, workspace_id 
    FROM database_connections 
    LIMIT 5
  `);
  
  console.log('Database connections:');
  if (result.rows.length === 0) {
    console.log('No connections found');
  } else {
    result.rows.forEach(row => {
      console.log(`- ${row.name}: type=${row.type}, active=${row.active}, read_only=${row.read_only}`);
    });
  }
  
  // Check if active column exists
  const columnsResult = await pool.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'database_connections'
    ORDER BY ordinal_position
  `);
  
  console.log('\nDatabase connections table columns:');
  columnsResult.rows.forEach(col => {
    console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
  });
  
} catch (error) {
  console.error('Error:', error.message);
} finally {
  await pool.end();
}