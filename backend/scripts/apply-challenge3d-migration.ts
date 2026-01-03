/**
 * Apply Migration 010: Create challenge3d_sales table
 * Executes SQL migration in Landing Supabase database
 */

import { landingSupabase } from '../src/config/supabase.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function applyMigration() {
  console.log('\n🔄 Starting Migration 010: challenge3d_sales table\n');

  try {
    // Read migration SQL file
    const migrationPath = join(__dirname, '../../sql/migrations/010_create_challenge3d_sales.sql');
    console.log(`📄 Reading migration from: ${migrationPath}`);

    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Remove comments and split into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('/*'));

    console.log(`✅ Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];

      // Skip SELECT statements (they're just for validation)
      if (stmt.trim().toUpperCase().startsWith('SELECT')) {
        console.log(`⏭️  Skipping SELECT statement ${i + 1}`);
        continue;
      }

      console.log(`\n▶️  Executing statement ${i + 1}/${statements.length}...`);

      // Extract statement type for logging
      const stmtType = stmt.trim().split(/\s+/)[0].toUpperCase();
      console.log(`   Type: ${stmtType}`);

      try {
        // Execute via Supabase client using rpc (if available) or direct SQL
        const { data, error } = await landingSupabase.rpc('exec_sql', { sql: stmt + ';' })
          .catch(() => ({ data: null, error: { message: 'RPC not available' } }));

        if (error && error.message === 'RPC not available') {
          console.log(`   ⚠️  Direct RPC not available, trying alternative method...`);

          // Alternative: Try using Supabase REST API directly
          // This won't work for DDL, so we'll inform user to run manually
          console.log(`   ℹ️  Statement type: ${stmtType}`);

          if (['CREATE', 'ALTER', 'DROP', 'COMMENT'].includes(stmtType)) {
            console.log(`   ⚠️  DDL statement - requires manual execution via Supabase Dashboard`);
            failCount++;
            continue;
          }
        } else if (error) {
          console.error(`   ❌ Error: ${error.message}`);
          failCount++;
          continue;
        }

        console.log(`   ✅ Success`);
        successCount++;
      } catch (err: any) {
        console.error(`   ❌ Unexpected error: ${err.message}`);
        failCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`📊 Migration Summary:`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   ⏭️  Skipped: ${statements.length - successCount - failCount}`);
    console.log('='.repeat(60));

    if (failCount > 0) {
      console.log('\n⚠️  Some statements failed. Manual execution required:\n');
      console.log('1. Go to: https://supabase.com/dashboard/project/xikaiavwqinamgolmtcy/editor');
      console.log('2. Click "SQL Editor"');
      console.log('3. Paste contents from: sql/migrations/010_create_challenge3d_sales.sql');
      console.log('4. Click "Run"\n');

      process.exit(1);
    }

    // Verify table was created
    console.log('\n🔍 Verifying table creation...');

    const { data: tableCheck, error: checkError } = await landingSupabase
      .from('challenge3d_sales')
      .select('id')
      .limit(0);

    if (checkError) {
      if (checkError.message.includes('does not exist')) {
        console.log('❌ Table challenge3d_sales does NOT exist');
        console.log('\n📋 Manual execution required (see instructions above)\n');
        process.exit(1);
      } else {
        console.log(`⚠️  Verification warning: ${checkError.message}`);
      }
    } else {
      console.log('✅ Table challenge3d_sales exists and is accessible!');
    }

    // Show table structure
    console.log('\n📋 Checking table structure...');

    const { data: columns, error: colError } = await landingSupabase
      .from('information_schema.columns')
      .select('column_name, data_type, column_default')
      .eq('table_name', 'challenge3d_sales')
      .order('ordinal_position')
      .catch(() => ({ data: null, error: null }));

    if (columns && columns.length > 0) {
      console.log(`\n✅ Found ${columns.length} columns:`);
      columns.slice(0, 10).forEach((col: any) => {
        console.log(`   - ${col.column_name} (${col.data_type})`);
      });
      if (columns.length > 10) {
        console.log(`   ... and ${columns.length - 10} more`);
      }
    }

    console.log('\n🎉 Migration 010 completed successfully!\n');

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

applyMigration().catch(console.error);
