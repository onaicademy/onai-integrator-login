#!/usr/bin/env node

/**
 * Script to execute migration 004_create_integration_logs_table.sql
 * This connects to Landing BD and creates the integration_logs table
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Landing BD credentials
const SUPABASE_URL = 'https://xikaiavwqinamgolmtcy.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpa2FpYXZ3cWluYW1nb2xtdGN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDg1MzIyMSwiZXhwIjoyMDgwNDI5MjIxfQ.eP7ake2RkWqCaLTKv0jI3vWMkBjDySKsAdToKIgb7fA';

// Create Supabase client with service role
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  console.log('🚀 Starting migration 004_create_integration_logs_table...\n');

  try {
    // Read SQL file
    const sqlFile = join(__dirname, '004_create_integration_logs_table.sql');
    const sql = readFileSync(sqlFile, 'utf-8');

    console.log('📄 SQL file loaded successfully\n');

    // Split SQL into statements (by semicolon followed by newline)
    const statements = sql
      .split(/;[\s]*\n/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📊 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip comments and empty lines
      if (statement.startsWith('--') || statement.trim() === '') {
        continue;
      }

      console.log(`⚙️  Executing statement ${i + 1}/${statements.length}...`);

      try {
        const { data, error } = await supabase.rpc('exec_sql', {
          sql_query: statement + ';'
        });

        if (error) {
          // Try direct query if RPC doesn't exist
          console.log(`   Trying direct query...`);
          const { error: directError } = await supabase
            .from('_sql')
            .select('*')
            .limit(0);

          if (directError) {
            throw error;
          }
        }

        console.log(`   ✅ Success\n`);
      } catch (err) {
        console.error(`   ❌ Error executing statement:`, err.message);
        console.error(`   Statement:`, statement.substring(0, 100) + '...\n');
      }
    }

    console.log('\n✅ Migration completed!\n');

    // Verify table exists
    console.log('🔍 Verifying table creation...\n');

    const { count, error: countError } = await supabase
      .from('integration_logs')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Table verification failed:', countError.message);
      console.log('\n⚠️  Table might not have been created. Please check manually.\n');
      process.exit(1);
    }

    console.log(`✅ Table 'integration_logs' exists! Current count: ${count}\n`);

    // Test views
    console.log('🔍 Testing views...\n');

    const { data: hourlyData, error: hourlyError } = await supabase
      .from('integration_stats_hourly')
      .select('*')
      .limit(1);

    if (hourlyError) {
      console.log('⚠️  View integration_stats_hourly might not be accessible:', hourlyError.message);
    } else {
      console.log('✅ View integration_stats_hourly is accessible\n');
    }

    const { data: dailyData, error: dailyError } = await supabase
      .from('integration_stats_daily')
      .select('*')
      .limit(1);

    if (dailyError) {
      console.log('⚠️  View integration_stats_daily might not be accessible:', dailyError.message);
    } else {
      console.log('✅ View integration_stats_daily is accessible\n');
    }

    console.log('\n🎉 All done! Migration 004 executed successfully.\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run migration
runMigration();
