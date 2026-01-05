/**
 * List ALL tables in Traffic DB to understand schema
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

async function listTables() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📋 ALL TABLES IN TRAFFIC DB');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Query information_schema to get all tables
  const { data, error } = await client
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .order('table_name');

  if (error) {
    console.error('Error:', error.message);
    console.log('\n⚠️ Trying alternative method...\n');

    // Try to list common tables manually
    const commonTables = [
      'traffic_leads',
      'traffic_users',
      'traffic_targetologist_settings',
      'challenge3d_sales',
      'journey_stages',
      'traffic_facebook_ads',
      'traffic_facebook_ads_cache',
      'traffic_facebook_campaigns',
      'traffic_stats',
      'facebook_ad_insights',
      'landing_stats',
      'traffic_landing_stats'
    ];

    for (const table of commonTables) {
      const { data, error } = await client
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: EXISTS (${data?.length || 0} sample rows)`);
      }
    }
  } else {
    console.log(`Found ${data?.length || 0} tables:\n`);
    data?.forEach((table: any, i: number) => {
      console.log(`${i + 1}. ${table.table_name}`);
    });
  }

  console.log('\n═══════════════════════════════════════════════════════════');
}

listTables().catch(console.error);
