import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const { Client } = pg;

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Check if tables already exist
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tags'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('Creating tags and prompt_tags tables...');
      
      // Create tags table
      await client.query(`
        CREATE TABLE IF NOT EXISTS "tags" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "workspace_id" uuid NOT NULL,
          "name" varchar(255) NOT NULL,
          "color" varchar(7) DEFAULT '#3B82F6',
          "created_at" timestamp DEFAULT now() NOT NULL,
          "updated_at" timestamp DEFAULT now() NOT NULL,
          CONSTRAINT "tags_workspace_id_name_key" UNIQUE("workspace_id","name")
        );
      `);

      // Create prompt_tags table
      await client.query(`
        CREATE TABLE IF NOT EXISTS "prompt_tags" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "prompt_id" uuid NOT NULL,
          "tag_id" uuid NOT NULL,
          "created_at" timestamp DEFAULT now() NOT NULL
        );
      `);

      // Add foreign keys
      await client.query(`
        ALTER TABLE "tags" 
        ADD CONSTRAINT "tags_workspace_id_workspaces_id_fk" 
        FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") 
        ON DELETE cascade ON UPDATE no action;
      `);

      await client.query(`
        ALTER TABLE "prompt_tags" 
        ADD CONSTRAINT "prompt_tags_prompt_id_prompts_id_fk" 
        FOREIGN KEY ("prompt_id") REFERENCES "public"."prompts"("id") 
        ON DELETE cascade ON UPDATE no action;
      `);

      await client.query(`
        ALTER TABLE "prompt_tags" 
        ADD CONSTRAINT "prompt_tags_tag_id_tags_id_fk" 
        FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") 
        ON DELETE cascade ON UPDATE no action;
      `);

      // Create indexes
      await client.query(`CREATE INDEX IF NOT EXISTS "idx_prompt_tags_prompt_id" ON "prompt_tags" ("prompt_id");`);
      await client.query(`CREATE INDEX IF NOT EXISTS "idx_prompt_tags_tag_id" ON "prompt_tags" ("tag_id");`);
      await client.query(`CREATE INDEX IF NOT EXISTS "idx_tags_workspace_id" ON "tags" ("workspace_id");`);

      // Add unique constraint - only if no duplicate data
      const duplicateCheck = await client.query(`
        SELECT prompt_id, tag_id, COUNT(*) 
        FROM prompt_tags 
        GROUP BY prompt_id, tag_id 
        HAVING COUNT(*) > 1;
      `);

      if (duplicateCheck.rows.length === 0) {
        await client.query(`
          ALTER TABLE "prompt_tags" 
          ADD CONSTRAINT "prompt_tags_prompt_id_tag_id_unique" 
          UNIQUE("prompt_id","tag_id");
        `);
        console.log('✅ Added unique constraint to prompt_tags');
      } else {
        console.log('⚠️ Skipping unique constraint due to duplicate data in prompt_tags');
      }

      console.log('✅ Tags tables created successfully!');
    } else {
      console.log('Tags tables already exist');
      
      // Just try to add the unique constraint if it doesn't exist
      const constraintCheck = await client.query(`
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'prompt_tags' 
        AND constraint_name = 'prompt_tags_prompt_id_tag_id_unique';
      `);

      if (constraintCheck.rows.length === 0) {
        // Remove duplicates first
        await client.query(`
          DELETE FROM prompt_tags 
          WHERE id IN (
            SELECT id FROM (
              SELECT id, ROW_NUMBER() OVER (
                PARTITION BY prompt_id, tag_id 
                ORDER BY created_at DESC
              ) as rn 
              FROM prompt_tags
            ) t 
            WHERE t.rn > 1
          );
        `);

        await client.query(`
          ALTER TABLE "prompt_tags" 
          ADD CONSTRAINT "prompt_tags_prompt_id_tag_id_unique" 
          UNIQUE("prompt_id","tag_id");
        `);
        console.log('✅ Added unique constraint after removing duplicates');
      }
    }

    console.log('✅ Migration completed!');
  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();