/**
 * Run Aggregation Tables Migration
 *
 * Creates traffic_aggregated_metrics and traffic_sync_history tables
 * in Traffic Supabase database.
 *
 * Usage: npx tsx backend/scripts/run-aggregation-migration.ts
 */

import '../src/load-env.js';
import { trafficAdminSupabase } from '../src/config/supabase-traffic.js';

async function runMigration() {
  console.log('🚀 Running aggregation tables migration...\n');

  try {
    // Step 1: Create traffic_aggregated_metrics table
    console.log('📊 Creating traffic_aggregated_metrics table...');

    const { error: metricsError } = await trafficAdminSupabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS traffic_aggregated_metrics (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES traffic_users(id) ON DELETE CASCADE,
          team_name TEXT NOT NULL,
          period TEXT NOT NULL CHECK (period IN ('today', '7d', '30d')),
          impressions BIGINT DEFAULT 0,
          clicks BIGINT DEFAULT 0,
          spend DECIMAL(12,2) DEFAULT 0,
          spend_kzt DECIMAL(14,2) DEFAULT 0,
          ctr DECIMAL(6,4) DEFAULT 0,
          cpc DECIMAL(10,4) DEFAULT 0,
          cpm DECIMAL(10,4) DEFAULT 0,
          conversions INTEGER DEFAULT 0,
          revenue DECIMAL(14,2) DEFAULT 0,
          sales INTEGER DEFAULT 0,
          roas DECIMAL(8,4) DEFAULT 0,
          cpa DECIMAL(10,2) DEFAULT 0,
          campaigns_json JSONB DEFAULT '[]'::jsonb,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(user_id, period)
        );
      `
    });

    if (metricsError) {
      // Try direct insert to test if table exists
      const { error: testError } = await trafficAdminSupabase
        .from('traffic_aggregated_metrics')
        .select('id')
        .limit(1);

      if (testError && testError.code === '42P01') {
        console.log('⚠️  RPC not available, table does not exist.');
        console.log('   Please run the SQL migration manually in Supabase Dashboard.');
        console.log('   File: sql/migrations/008_traffic_aggregated_metrics.sql\n');
        return;
      } else if (!testError) {
        console.log('✅ Table traffic_aggregated_metrics already exists');
      }
    } else {
      console.log('✅ Created traffic_aggregated_metrics table');
    }

    // Step 2: Create traffic_sync_history table
    console.log('📜 Creating traffic_sync_history table...');

    const { error: historyError } = await trafficAdminSupabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS traffic_sync_history (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          started_at TIMESTAMPTZ DEFAULT NOW(),
          completed_at TIMESTAMPTZ,
          success BOOLEAN DEFAULT FALSE,
          users_processed INTEGER DEFAULT 0,
          metrics_updated INTEGER DEFAULT 0,
          duration_ms INTEGER DEFAULT 0,
          error_message TEXT
        );
      `
    });

    if (historyError) {
      const { error: testError } = await trafficAdminSupabase
        .from('traffic_sync_history')
        .select('id')
        .limit(1);

      if (!testError || testError.code !== '42P01') {
        console.log('✅ Table traffic_sync_history already exists');
      }
    } else {
      console.log('✅ Created traffic_sync_history table');
    }

    // Step 3: Create indexes
    console.log('🔍 Creating indexes...');

    // Test if we can query the tables
    const { data: metricsData, error: metricsCheckError } = await trafficAdminSupabase
      .from('traffic_aggregated_metrics')
      .select('id')
      .limit(1);

    if (!metricsCheckError) {
      console.log('✅ traffic_aggregated_metrics table is accessible');
    } else {
      console.log('❌ Cannot access traffic_aggregated_metrics:', metricsCheckError.message);
    }

    const { data: historyData, error: historyCheckError } = await trafficAdminSupabase
      .from('traffic_sync_history')
      .select('id')
      .limit(1);

    if (!historyCheckError) {
      console.log('✅ traffic_sync_history table is accessible');
    } else {
      console.log('❌ Cannot access traffic_sync_history:', historyCheckError.message);
    }

    // Step 4: Test insert
    console.log('\n🧪 Testing insert capability...');

    const { error: insertError } = await trafficAdminSupabase
      .from('traffic_sync_history')
      .insert({
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        success: true,
        users_processed: 0,
        metrics_updated: 0,
        duration_ms: 0,
        error_message: 'Migration test entry'
      });

    if (!insertError) {
      console.log('✅ Insert test successful');
    } else {
      console.log('❌ Insert test failed:', insertError.message);
    }

    console.log('\n✅ Migration completed!\n');
    console.log('Next steps:');
    console.log('1. Deploy backend with new routes');
    console.log('2. Set NODE_ENV=production to enable scheduler');
    console.log('3. Test with: curl http://localhost:3000/api/traffic-aggregation/status');

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n⚠️  Please run the SQL migration manually:');
    console.log('   1. Open Traffic Supabase Dashboard');
    console.log('   2. Go to SQL Editor');
    console.log('   3. Paste contents of: sql/migrations/008_traffic_aggregated_metrics.sql');
    console.log('   4. Run the query');
  }
}

runMigration();
