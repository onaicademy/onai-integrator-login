/**
 * Migration: Add tracking_by column to traffic_targetologist_settings
 *
 * This column determines whether campaigns are tracked by:
 * - 'utm_source' (default) - for team-based tracking (fb_kenesary, fb_arystan)
 * - 'utm_medium' - for traffic type tracking (cpc, social, organic)
 */

import { trafficAdminSupabase } from '../src/config/supabase-traffic.js';

async function addTrackingByColumn() {
  console.log('\n🔧 Adding tracking_by column to traffic_targetologist_settings...\n');

  try {
    // Execute raw SQL to add the column
    const { data, error } = await trafficAdminSupabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE traffic_targetologist_settings
        ADD COLUMN IF NOT EXISTS tracking_by TEXT DEFAULT 'utm_source';

        -- Add comment for documentation
        COMMENT ON COLUMN traffic_targetologist_settings.tracking_by IS
        'Determines tracking field: utm_source (team-based) or utm_medium (traffic type)';
      `
    });

    if (error) {
      // If RPC doesn't exist, try direct approach
      console.log('⚠️  RPC exec_sql not available, attempting direct SQL...');

      const migration = `
ALTER TABLE traffic_targetologist_settings
ADD COLUMN IF NOT EXISTS tracking_by TEXT DEFAULT 'utm_source';
      `.trim();

      console.log('\n📋 Please execute this SQL in Supabase Dashboard:');
      console.log('━'.repeat(60));
      console.log(migration);
      console.log('━'.repeat(60));
      console.log('\n1. Go to: https://supabase.com/dashboard/project/oetodaexnjcunklkdlkv/editor');
      console.log('2. Click "SQL Editor"');
      console.log('3. Paste the SQL above');
      console.log('4. Click "Run"');
      console.log('\nOr use the SQL file:');
      console.log('sql/migrations/009_add_tracking_by_column.sql\n');

      return false;
    }

    console.log('✅ Migration successful!');
    console.log('   Column tracking_by added to traffic_targetologist_settings');
    console.log('   Default value: utm_source\n');

    return true;

  } catch (err: any) {
    console.error('❌ Migration failed:', err.message);
    return false;
  }
}

// Also create SQL file for manual execution
async function createMigrationFile() {
  const fs = await import('fs/promises');
  const path = await import('path');

  const migrationSQL = `-- Migration 009: Add tracking_by column
-- Purpose: Enable selection between utm_source and utm_medium tracking
-- Run this in Traffic Supabase project

ALTER TABLE traffic_targetologist_settings
ADD COLUMN IF NOT EXISTS tracking_by TEXT DEFAULT 'utm_source';

COMMENT ON COLUMN traffic_targetologist_settings.tracking_by IS
'Determines tracking field: utm_source (team-based) or utm_medium (traffic type)';

-- Update existing rows to use utm_source by default
UPDATE traffic_targetologist_settings
SET tracking_by = 'utm_source'
WHERE tracking_by IS NULL;
`;

  const sqlDir = path.join(process.cwd(), '..', 'sql', 'migrations');
  const sqlFile = path.join(sqlDir, '009_add_tracking_by_column.sql');

  try {
    await fs.mkdir(sqlDir, { recursive: true });
    await fs.writeFile(sqlFile, migrationSQL);
    console.log(`✅ Migration SQL file created: ${sqlFile}`);
  } catch (err: any) {
    console.error('⚠️  Could not create SQL file:', err.message);
  }
}

async function main() {
  await createMigrationFile();
  const success = await addTrackingByColumn();

  if (!success) {
    console.log('\n⚠️  Migration requires manual execution');
    console.log('   See instructions above\n');
    process.exit(1);
  }
}

main().catch(console.error);
