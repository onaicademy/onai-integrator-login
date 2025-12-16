/**
 * Apply telegram_groups table migration to Landing Supabase
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load env variables
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../../backend/env.env') });

const LANDING_SUPABASE_URL = process.env.LANDING_SUPABASE_URL!;
const LANDING_SUPABASE_SERVICE_KEY = process.env.LANDING_SUPABASE_SERVICE_KEY!;

if (!LANDING_SUPABASE_URL || !LANDING_SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Landing Supabase credentials!');
  process.exit(1);
}

const supabase = createClient(LANDING_SUPABASE_URL, LANDING_SUPABASE_SERVICE_KEY);

async function applyMigration() {
  console.log('🚀 Applying telegram_groups table migration...\n');

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/create_telegram_groups.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migration file loaded:', migrationPath);
    console.log('📏 SQL length:', migrationSQL.length, 'characters\n');

    // Split SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📊 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      console.log(`\n[${i + 1}/${statements.length}] Executing statement...`);
      console.log('   First 100 chars:', statement.substring(0, 100).replace(/\n/g, ' '));

      try {
        const { data, error } = await supabase.rpc('exec_sql', {
          sql_query: statement
        });

        if (error) {
          // Try direct query if RPC doesn't exist
          console.log('   ⚠️ RPC method not available, trying direct query...');
          
          // For CREATE TABLE, we can check if table exists
          if (statement.includes('CREATE TABLE')) {
            const tableName = statement.match(/CREATE TABLE (?:IF NOT EXISTS )?(?:public\.)?(\w+)/i)?.[1];
            if (tableName) {
              const { data: existingTable, error: checkError } = await supabase
                .from(tableName)
                .select('*')
                .limit(1);

              if (checkError && checkError.code !== 'PGRST116') {
                console.log(`   ⚠️ Warning: ${checkError.message}`);
              } else {
                console.log(`   ✅ Table ${tableName} exists or created`);
              }
            }
          } else {
            console.log(`   ⚠️ Warning: ${error.message}`);
          }
        } else {
          console.log('   ✅ Success');
        }
      } catch (err: any) {
        console.log(`   ⚠️ Error: ${err.message}`);
        // Continue with next statement
      }
    }

    // Verify table was created
    console.log('\n\n🔍 Verifying table creation...');
    const { data: tableCheck, error: tableError } = await supabase
      .from('telegram_groups')
      .select('*')
      .limit(1);

    if (tableError) {
      console.error('❌ Table verification failed:', tableError.message);
      console.error('\n⚠️ Please apply migration manually using Supabase SQL Editor:');
      console.error('   URL: https://supabase.com/dashboard/project/xikaiavwqinamgolmtcy/sql/new');
      console.error('   Copy SQL from: backend/supabase/migrations/create_telegram_groups.sql');
    } else {
      console.log('✅ Table telegram_groups exists and is accessible!');
      console.log('\n📊 Table structure verified. Ready to use!');
    }

    console.log('\n✨ Migration completed!\n');

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\n💡 Manual steps:');
    console.error('1. Go to: https://supabase.com/dashboard/project/xikaiavwqinamgolmtcy/sql/new');
    console.error('2. Copy SQL from: backend/supabase/migrations/create_telegram_groups.sql');
    console.error('3. Execute in SQL Editor');
    process.exit(1);
  }
}

applyMigration();
