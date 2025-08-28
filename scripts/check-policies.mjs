import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const { Client } = pg;

async function checkPolicies() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✓ Connected to database\n');

    // Check policies on tier_configurations
    console.log('=== Policies on tier_configurations ===');
    const tierPolicies = await client.query(`
      SELECT polname, polcmd, pg_get_expr(polqual, polrelid) as using_clause, pg_get_expr(polwithcheck, polrelid) as check_clause
      FROM pg_policy 
      WHERE polrelid = 'tier_configurations'::regclass
    `);
    
    if (tierPolicies.rows.length === 0) {
      console.log('No policies found');
    } else {
      tierPolicies.rows.forEach(p => {
        console.log(`\nPolicy: ${p.polname}`);
        console.log(`Command: ${p.polcmd}`);
        console.log(`USING: ${p.using_clause || 'none'}`);
        console.log(`WITH CHECK: ${p.check_clause || 'none'}`);
      });
    }

    // Check policies on admin_users
    console.log('\n\n=== Policies on admin_users ===');
    const adminPolicies = await client.query(`
      SELECT polname, polcmd, pg_get_expr(polqual, polrelid) as using_clause, pg_get_expr(polwithcheck, polrelid) as check_clause
      FROM pg_policy 
      WHERE polrelid = 'admin_users'::regclass
    `);
    
    if (adminPolicies.rows.length === 0) {
      console.log('No policies found');
    } else {
      adminPolicies.rows.forEach(p => {
        console.log(`\nPolicy: ${p.polname}`);
        console.log(`Command: ${p.polcmd}`);
        console.log(`USING: ${p.using_clause || 'none'}`);
        console.log(`WITH CHECK: ${p.check_clause || 'none'}`);
      });
    }

    // Check if RLS is enabled
    console.log('\n\n=== RLS Status ===');
    const rlsStatus = await client.query(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE tablename IN ('tier_configurations', 'admin_users')
      AND schemaname = 'public'
    `);
    
    rlsStatus.rows.forEach(t => {
      console.log(`${t.tablename}: RLS ${t.rowsecurity ? 'ENABLED' : 'DISABLED'}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkPolicies();