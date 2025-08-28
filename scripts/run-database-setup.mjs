import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: '.env.local' });

const { Client } = pg;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL not found in environment');
  process.exit(1);
}

async function runMigration() {
  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    await client.connect();
    console.log('✓ Connected to database');

    // Fix unique constraint issue first
    const fixConstraintIssueFile = path.join(__dirname, 'fix-unique-constraint-issue.sql');
    if (fs.existsSync(fixConstraintIssueFile)) {
      console.log('Fixing unique constraint issue...');
      const fixConstraintIssueSql = fs.readFileSync(fixConstraintIssueFile, 'utf8');
      await client.query(fixConstraintIssueSql);
      console.log('✓ Unique constraint issue fixed!');
    }

    // Fix tier constraints before running tier setup
    const fixTierConstraintsFile = path.join(__dirname, 'fix-tier-constraints.sql');
    if (fs.existsSync(fixTierConstraintsFile)) {
      console.log('Fixing tier constraints...');
      const fixTierConstraintsSql = fs.readFileSync(fixTierConstraintsFile, 'utf8');
      await client.query(fixTierConstraintsSql);
      console.log('✓ Tier constraints fixed!');
    }

    // Read the setup SQL file (use updated version if it exists)
    const setupFile = fs.existsSync(path.join(__dirname, 'setup-tiers-updated.sql')) 
      ? 'setup-tiers-updated.sql' 
      : 'setup-tiers-safe.sql';
    const setupSql = fs.readFileSync(
      path.join(__dirname, setupFile),
      'utf8'
    );

    // Execute the entire setup script
    console.log('Running tier setup migration...');
    await client.query(setupSql);
    console.log('✓ Tier management system setup complete!');

    // Run workspace AI keys migration if file exists
    const aiKeysFile = path.join(__dirname, 'workspace-ai-keys-simple.sql');
    if (fs.existsSync(aiKeysFile)) {
      console.log('Running workspace AI keys migration...');
      const aiKeysSql = fs.readFileSync(aiKeysFile, 'utf8');
      await client.query(aiKeysSql);
      console.log('✓ Workspace AI keys tables created!');
    }

    // Run chains schema update if file exists
    const chainsUpdateFile = path.join(__dirname, 'update-chains-schema.sql');
    if (fs.existsSync(chainsUpdateFile)) {
      console.log('Running chains schema update...');
      const chainsUpdateSql = fs.readFileSync(chainsUpdateFile, 'utf8');
      await client.query(chainsUpdateSql);
      console.log('✓ Chains schema updated!');
    }

    // Run search function setup if file exists
    const searchFunctionFile = path.join(__dirname, 'setup-search-function.sql');
    if (fs.existsSync(searchFunctionFile)) {
      console.log('Running search function setup...');
      const searchFunctionSql = fs.readFileSync(searchFunctionFile, 'utf8');
      await client.query(searchFunctionSql);
      console.log('✓ Search function created!');
    }

    // Run chain execution setup if file exists
    const chainExecutionFile = path.join(__dirname, 'setup-chain-execution.sql');
    if (fs.existsSync(chainExecutionFile)) {
      console.log('Running chain execution setup...');
      const chainExecutionSql = fs.readFileSync(chainExecutionFile, 'utf8');
      await client.query(chainExecutionSql);
      console.log('✓ Chain execution tables created!');
    }

    // Run encrypted key column migration if file exists
    const encryptedKeyFile = path.join(__dirname, 'add-encrypted-key-column.sql');
    if (fs.existsSync(encryptedKeyFile)) {
      console.log('Running encrypted key column migration...');
      const encryptedKeySql = fs.readFileSync(encryptedKeyFile, 'utf8');
      await client.query(encryptedKeySql);
      console.log('✓ Encrypted key column added to workspace_api_keys!');
    }

    // Rename key_preview to masked_key if needed
    const renameMaskedKeyFile = path.join(__dirname, 'rename-key-preview-to-masked-key.sql');
    if (fs.existsSync(renameMaskedKeyFile)) {
      console.log('Renaming key_preview to masked_key...');
      const renameSql = fs.readFileSync(renameMaskedKeyFile, 'utf8');
      await client.query(renameSql);
      console.log('✓ Column renamed to masked_key!');
    }

    // Fix api_key column issue
    const fixApiKeyFile = path.join(__dirname, 'fix-api-key-column.sql');
    if (fs.existsSync(fixApiKeyFile)) {
      console.log('Fixing api_key column...');
      const fixSql = fs.readFileSync(fixApiKeyFile, 'utf8');
      await client.query(fixSql);
      console.log('✓ API key column fixed!');
    }

    // Fix default key constraint
    const fixDefaultConstraintFile = path.join(__dirname, 'fix-api-keys-default-constraint.sql');
    if (fs.existsSync(fixDefaultConstraintFile)) {
      console.log('Fixing default key constraint...');
      const fixConstraintSql = fs.readFileSync(fixDefaultConstraintFile, 'utf8');
      await client.query(fixConstraintSql);
      console.log('✓ Default key constraint fixed!');
    }

    // Refresh Supabase cache
    const refreshCacheFile = path.join(__dirname, 'refresh-supabase-cache.sql');
    if (fs.existsSync(refreshCacheFile)) {
      console.log('Refreshing Supabase schema cache...');
      const refreshSql = fs.readFileSync(refreshCacheFile, 'utf8');
      await client.query(refreshSql);
      console.log('✓ Schema cache refreshed!');
    }

    // Run advanced chain features migration if file exists
    const advancedChainFile = path.join(__dirname, 'add-advanced-chain-features.sql');
    if (fs.existsSync(advancedChainFile)) {
      console.log('Running advanced chain features migration...');
      const advancedChainSql = fs.readFileSync(advancedChainFile, 'utf8');
      await client.query(advancedChainSql);
      console.log('✓ Advanced chain features tables and columns created!');
    }

    // Run new chains table setup if file exists
    const newChainsFile = path.join(__dirname, 'setup-chains.sql');
    if (fs.existsSync(newChainsFile)) {
      console.log('Running new chains table setup...');
      const newChainsSql = fs.readFileSync(newChainsFile, 'utf8');
      await client.query(newChainsSql);
      console.log('✓ New chains tables created!');
    }

    // Run database connections setup if file exists
    const dbConnectionsFile = path.join(__dirname, 'setup-database-connections.sql');
    if (fs.existsSync(dbConnectionsFile)) {
      console.log('Running database connections setup...');
      const dbConnectionsSql = fs.readFileSync(dbConnectionsFile, 'utf8');
      await client.query(dbConnectionsSql);
      console.log('✓ Database connections tables created!');
    }

    // Run workspace type setup if file exists
    const workspaceTypeFile = path.join(__dirname, 'add-workspace-type.sql');
    if (fs.existsSync(workspaceTypeFile)) {
      console.log('Running workspace type migration...');
      const workspaceTypeSql = fs.readFileSync(workspaceTypeFile, 'utf8');
      await client.query(workspaceTypeSql);
      console.log('✓ Workspace type fields added!');
    }

    // Run tier names update if file exists
    const tierNamesFile = path.join(__dirname, 'update-tier-names.sql');
    if (fs.existsSync(tierNamesFile)) {
      console.log('Updating tier names to Starter/Pro/Team...');
      const tierNamesSql = fs.readFileSync(tierNamesFile, 'utf8');
      await client.query(tierNamesSql);
      console.log('✓ Tier names updated!');
    }

    // Run tier pricing update if file exists
    const tierPricingFile = path.join(__dirname, 'update-tier-pricing.sql');
    if (fs.existsSync(tierPricingFile)) {
      console.log('Updating tier pricing (Pro €9, Team €15)...');
      const tierPricingSql = fs.readFileSync(tierPricingFile, 'utf8');
      await client.query(tierPricingSql);
      console.log('✓ Tier pricing updated!');
    }

    // Run notifications setup if file exists
    const notificationsFile = path.join(__dirname, 'setup-notifications.sql');
    if (fs.existsSync(notificationsFile)) {
      console.log('Setting up notifications system...');
      const notificationsSql = fs.readFileSync(notificationsFile, 'utf8');
      await client.query(notificationsSql);
      console.log('✓ Notifications system created!');
    }

    // Setup real-time notifications if file exists
    const realtimeNotificationsFile = path.join(__dirname, 'setup-realtime-notifications.sql');
    if (fs.existsSync(realtimeNotificationsFile)) {
      console.log('Setting up real-time notifications...');
      const realtimeSql = fs.readFileSync(realtimeNotificationsFile, 'utf8');
      await client.query(realtimeSql);
      console.log('✓ Real-time notifications configured!');
    }

    // Now make the user an admin (you need to update the email)
    const adminEmail = process.env.ADMIN_EMAIL || 'jim@elphinstone.nl';
    console.log(`Setting up admin user for: ${adminEmail}`);
    
    const adminSql = `
      -- Make user admin
      WITH user_lookup AS (
        SELECT id 
        FROM auth.users 
        WHERE email = $1
        LIMIT 1
      )
      INSERT INTO admin_users (user_id, is_super_admin, can_manage_tiers, can_view_analytics, created_at)
      SELECT id, true, true, true, NOW()
      FROM user_lookup
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        is_super_admin = true,
        can_manage_tiers = true,
        can_view_analytics = true;
    `;
    
    await client.query(adminSql, [adminEmail]);
    console.log(`✓ Admin user created for ${adminEmail}`);

    // Verify the setup
    const verifyResult = await client.query('SELECT COUNT(*) FROM tier_configurations');
    console.log(`✓ Tier configurations created: ${verifyResult.rows[0].count}`);

  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('✓ Database connection closed');
  }
}

runMigration();