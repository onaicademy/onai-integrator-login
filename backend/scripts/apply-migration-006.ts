/**
 * Apply Migration 006: Add funnel_type to traffic_users
 */

import { createClient } from '@supabase/supabase-js';

const TRAFFIC_ADMIN_URL = process.env.TRAFFIC_SUPABASE_URL || 'https://oetodaexnjcunklkdlkv.supabase.co';
const TRAFFIC_ADMIN_KEY = process.env.TRAFFIC_SERVICE_ROLE_KEY || '';

async function applyMigration() {
  if (!TRAFFIC_ADMIN_KEY) {
    console.error('❌ TRAFFIC_SERVICE_ROLE_KEY not found in environment');
    console.error('Make sure .env file is loaded');
    process.exit(1);
  }

  const supabase = createClient(TRAFFIC_ADMIN_URL, TRAFFIC_ADMIN_KEY);

  console.log('🔧 Applying Migration 006: Adding funnel_type to traffic_users...');
  console.log('');

  // Step 1: Add columns
  console.log('Step 1/3: Adding columns...');
  const alterTableSQL = `
    ALTER TABLE traffic_users
      ADD COLUMN IF NOT EXISTS utm_source TEXT,
      ADD COLUMN IF NOT EXISTS funnel_type TEXT CHECK (funnel_type IN ('express', 'challenge3d', 'intensive1d', NULL)),
      ADD COLUMN IF NOT EXISTS utm_medium TEXT,
      ADD COLUMN IF NOT EXISTS tracking_by TEXT CHECK (tracking_by IN ('utm_source', 'utm_medium', NULL)),
      ADD COLUMN IF NOT EXISTS team_id UUID,
      ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;
  `;

  const { error: alterError } = await supabase.rpc('exec_sql', { sql_query: alterTableSQL });

  if (alterError) {
    console.error('❌ Failed to add columns:', alterError.message);
    process.exit(1);
  }

  console.log('✅ Columns added successfully');
  console.log('');

  // Step 2: Create indexes
  console.log('Step 2/3: Creating indexes...');
  const indexSQL = `
    CREATE INDEX IF NOT EXISTS idx_traffic_users_utm_source
    ON traffic_users(utm_source)
    WHERE utm_source IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_traffic_users_funnel_type
    ON traffic_users(funnel_type)
    WHERE funnel_type IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_traffic_users_tracking_by
    ON traffic_users(tracking_by)
    WHERE tracking_by IS NOT NULL;
  `;

  const { error: indexError } = await supabase.rpc('exec_sql', { sql_query: indexSQL });

  if (indexError) {
    console.error('❌ Failed to create indexes:', indexError.message);
    process.exit(1);
  }

  console.log('✅ Indexes created successfully');
  console.log('');

  // Step 3: Verify
  console.log('Step 3/3: Verifying columns...');
  const { data: columns } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type')
    .eq('table_name', 'traffic_users')
    .in('column_name', ['utm_source', 'funnel_type', 'utm_medium', 'tracking_by', 'team_id', 'last_sync_at']);

  console.log('✅ Verified columns in traffic_users:');
  if (columns) {
    columns.forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
  }

  console.log('');
  console.log('✅ Migration 006 completed successfully!');
}

applyMigration().catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
