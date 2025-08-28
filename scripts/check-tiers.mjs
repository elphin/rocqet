import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const { Client } = pg;

async function checkTiers() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✓ Connected to database\n');

    // Check tier configurations
    const tiersResult = await client.query(`
      SELECT tier_name, display_name, monthly_price, active 
      FROM tier_configurations 
      ORDER BY monthly_price
    `);
    
    console.log('📊 Tier Configurations:');
    console.log('------------------------');
    tiersResult.rows.forEach(tier => {
      console.log(`${tier.tier_name}: ${tier.display_name} - €${tier.monthly_price}/month (active: ${tier.active})`);
    });
    
    // Check workspaces with their tiers
    const workspacesResult = await client.query(`
      SELECT name, slug, subscription_tier, subscription_status 
      FROM workspaces 
      LIMIT 5
    `);
    
    console.log('\n🏢 Workspace Subscriptions:');
    console.log('----------------------------');
    workspacesResult.rows.forEach(ws => {
      console.log(`${ws.name} (${ws.slug}): ${ws.subscription_tier || 'not set'} - ${ws.subscription_status || 'not set'}`);
    });
    
    // Check admin users
    const adminResult = await client.query(`
      SELECT u.email, a.is_super_admin, a.can_manage_tiers 
      FROM admin_users a 
      JOIN auth.users u ON a.user_id = u.id
    `);
    
    console.log('\n👨‍💼 Admin Users:');
    console.log('------------------');
    adminResult.rows.forEach(admin => {
      console.log(`${admin.email}: Super Admin: ${admin.is_super_admin}, Can Manage Tiers: ${admin.can_manage_tiers}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkTiers();