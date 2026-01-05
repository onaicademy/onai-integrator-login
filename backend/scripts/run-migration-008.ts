/**
 * Run Migration 008: Create traffic_aggregated_metrics and traffic_sync_history
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const trafficUrl = 'https://oetodaexnjcunklkdlkv.supabase.co';
const trafficKey = 'sb_secret_h7VM2nxmyNWtw9158fCDLA_t6by7McK';

const client = createClient(trafficUrl, trafficKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  global: {
    headers: {
      Authorization: `Bearer ${trafficKey}`
    }
  }
});

async function runMigration() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🚀 RUNNING MIGRATION 008: traffic_aggregated_metrics');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Read migration SQL file
  const migrationPath = path.join(process.cwd(), 'sql/migrations/008_traffic_aggregated_metrics.sql');
  console.log(`📂 Reading migration file: ${migrationPath}\n`);

  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('⚠️  IMPORTANT: This migration must be run in Supabase SQL Editor');
  console.log('⚠️  The Supabase client library cannot execute DDL statements\n');
  console.log('📋 INSTRUCTIONS:\n');
  console.log('1. Go to: https://supabase.com/dashboard/project/oetodaexnjcunklkdlkv/sql/new');
  console.log('2. Copy and paste the SQL from: sql/migrations/008_traffic_aggregated_metrics.sql');
  console.log('3. Click "Run" to execute the migration\n');

  console.log('═══════════════════════════════════════════════════════════');
  console.log('SQL PREVIEW (first 50 lines):');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(sql.split('\n').slice(0, 50).join('\n'));
  console.log('\n... (see full file for complete SQL)\n');

  console.log('═══════════════════════════════════════════════════════════');
  console.log('Alternative: Use psql command');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('If you have psql installed, run:');
  console.log('psql "postgresql://postgres.oetodaexnjcunklkdlkv:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres" < sql/migrations/008_traffic_aggregated_metrics.sql\n');
}

runMigration().catch(console.error);
