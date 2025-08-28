import { Client } from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  try {
    await client.connect();
    console.log('✓ Connected to database');

    // Add seats column
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'workspaces' 
          AND column_name = 'seats'
        ) THEN
          ALTER TABLE workspaces 
          ADD COLUMN seats INTEGER DEFAULT 1;
        END IF;
      END $$;
    `);
    console.log('✓ Added seats column');

    // Add max_seats column
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'workspaces' 
          AND column_name = 'max_seats'
        ) THEN
          ALTER TABLE workspaces 
          ADD COLUMN max_seats INTEGER DEFAULT 1;
        END IF;
      END $$;
    `);
    console.log('✓ Added max_seats column');

    // Add display_name column
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'workspaces' 
          AND column_name = 'display_name'
        ) THEN
          ALTER TABLE workspaces 
          ADD COLUMN display_name TEXT;
        END IF;
      END $$;
    `);
    console.log('✓ Added display_name column');

    // Update existing workspaces based on their tier
    await client.query(`
      UPDATE workspaces 
      SET 
        seats = CASE 
          WHEN subscription_tier = 'free' THEN 1
          WHEN subscription_tier = 'pro' THEN 1
          ELSE COALESCE(seats, 1)
        END,
        max_seats = CASE
          WHEN subscription_tier = 'free' THEN 1
          WHEN subscription_tier = 'pro' THEN 1
          WHEN subscription_tier = 'professional' THEN 10
          WHEN subscription_tier = 'business' THEN 50
          WHEN subscription_tier = 'enterprise' THEN 999
          ELSE 1
        END
      WHERE seats IS NULL OR max_seats IS NULL;
    `);
    console.log('✓ Updated workspace seat limits based on tiers');

    console.log('✓ Workspace seats migration complete!');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('✓ Database connection closed');
  }
}

runMigration();