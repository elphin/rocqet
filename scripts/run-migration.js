const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration(sqlFile) {
  try {
    console.log(`Running migration: ${sqlFile}`);
    
    const sqlContent = fs.readFileSync(path.join(__dirname, sqlFile), 'utf8');
    
    // Split by semicolons but preserve them
    const statements = sqlContent
      .split(/;(?=\s*$)/m)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql_query: statement + ';' 
        });
        
        if (error) {
          console.error(`Error executing statement:`, error);
          // Continue with next statement
        } else {
          console.log(`✓ Success`);
        }
      }
    }
    
    console.log(`Migration completed: ${sqlFile}`);
  } catch (error) {
    console.error(`Failed to run migration ${sqlFile}:`, error);
  }
}

// Run the migration
const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('Please specify a migration file');
  process.exit(1);
}

runMigration(migrationFile);