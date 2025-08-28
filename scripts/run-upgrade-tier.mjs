import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const { Client } = pg;

async function upgradeWorkspaceToPro() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✓ Connected to database');

    // Upgrade workspace to pro
    const result = await client.query(`
      UPDATE workspaces 
      SET subscription_tier = 'pro'
      WHERE slug = 'elphinstone'
      RETURNING id, name, slug, subscription_tier
    `);

    if (result.rows.length > 0) {
      console.log('✓ Workspace upgraded to Pro tier:', result.rows[0]);
    } else {
      console.log('⚠ No workspace found with slug "elphinstone"');
      
      // List all workspaces
      const allWorkspaces = await client.query(`
        SELECT id, name, slug, subscription_tier 
        FROM workspaces
      `);
      
      console.log('Available workspaces:');
      allWorkspaces.rows.forEach(ws => {
        console.log(`  - ${ws.slug}: ${ws.subscription_tier}`);
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
    console.log('✓ Database connection closed');
  }
}

upgradeWorkspaceToPro();