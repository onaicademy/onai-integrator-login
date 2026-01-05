/**
 * Check traffic_aggregated_metrics table (the CORRECT table)
 */

import { createClient } from '@supabase/supabase-js';

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

async function checkAggregatedMetrics() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 CHECKING traffic_aggregated_metrics (CORRECT TABLE)');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Check if table exists and get all data
  const { data, error } = await client
    .from('traffic_aggregated_metrics')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('❌ Error:', error.message);
  } else {
    console.log(`✅ Table exists! Total records: ${data?.length || 0}\n`);

    if (data && data.length > 0) {
      console.log('Sample records:\n');
      data.slice(0, 5).forEach((record, i) => {
        console.log(`${i + 1}. Team: ${record.team_name} | Period: ${record.period}`);
        console.log(`   Spend: $${record.spend} (${record.spend_kzt} ₸)`);
        console.log(`   Impressions: ${record.impressions} | Clicks: ${record.clicks}`);
        console.log(`   Sales: ${record.sales} | Revenue: ${record.revenue} ₸`);
        console.log(`   ROAS: ${record.roas} | CPA: ${record.cpa}`);
        console.log(`   Updated: ${record.updated_at}\n`);
      });
    } else {
      console.log('⚠️ Table is EMPTY - no metrics data!\n');
      console.log('This means:');
      console.log('1. Migration 008 was run (table exists)');
      console.log('2. BUT sync service has not populated data yet\n');
    }
  }

  // Check sync history
  console.log('📋 Checking traffic_sync_history:\n');
  const { data: history, error: historyError } = await client
    .from('traffic_sync_history')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(5);

  if (historyError) {
    console.error('❌ Error:', historyError.message);
  } else {
    console.log(`✅ Sync history records: ${history?.length || 0}\n`);

    if (history && history.length > 0) {
      history.forEach((record, i) => {
        console.log(`${i + 1}. Started: ${record.started_at}`);
        console.log(`   Status: ${record.success ? '✅ Success' : '❌ Failed'}`);
        console.log(`   Users processed: ${record.users_processed}`);
        console.log(`   Metrics updated: ${record.metrics_updated}`);
        console.log(`   Duration: ${record.duration_ms}ms`);
        if (record.error_message) {
          console.log(`   Error: ${record.error_message}`);
        }
        console.log();
      });
    } else {
      console.log('⚠️ No sync history - sync has NEVER run!\n');
    }
  }

  console.log('═══════════════════════════════════════════════════════════');
}

checkAggregatedMetrics().catch(console.error);
