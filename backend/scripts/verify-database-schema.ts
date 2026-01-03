/**
 * Database Schema Verification Script
 * Verifies all tables exist and are accessible
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../env.env') });

const trafficDb = createClient(
  process.env.TRAFFIC_SUPABASE_URL || '',
  process.env.TRAFFIC_SERVICE_ROLE_KEY || ''
);

const landingDb = createClient(
  process.env.LANDING_SUPABASE_URL || '',
  process.env.LANDING_SUPABASE_SERVICE_KEY || ''
);

async function verifyDatabaseSchema() {
  console.log('📊 === DATABASE SCHEMA VERIFICATION ===\n');

  // TRAFFIC DATABASE
  console.log('🔍 TRAFFIC DATABASE (Tripwire)\n');

  const trafficTables = [
    'tripwire_users',
    'integration_logs',
    'tripwire_user_profile',
    'traffic_users',
    'traffic_stats'
  ];

  for (const table of trafficTables) {
    try {
      const { data, error } = await trafficDb
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: exists and accessible`);
      }
    } catch (err: any) {
      console.log(`❌ ${table}: ${err.message}`);
    }
  }

  // LANDING DATABASE
  console.log('\n🔍 LANDING DATABASE (Sales Tracking)\n');

  const landingTables = [
    'all_sales_tracking',
    'integration_logs',
    'exchange_rates',
    'traffic_stats'
  ];

  for (const table of landingTables) {
    try {
      const { data, error } = await landingDb
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: exists and accessible`);
      }
    } catch (err: any) {
      console.log(`❌ ${table}: ${err.message}`);
    }
  }

  // Check exchange rates data
  console.log('\n💱 EXCHANGE RATES CHECK\n');

  const { data: rates, error: ratesError } = await landingDb
    .from('exchange_rates')
    .select('*')
    .order('date', { ascending: false })
    .limit(3);

  if (ratesError) {
    console.log('❌ Error fetching rates:', ratesError.message);
  } else {
    console.log(`✅ Exchange rates count: ${rates?.length || 0}`);
    if (rates && rates.length > 0) {
      console.log('Latest rate:', rates[0].date, '- $1 =', rates[0].usd_to_kzt, 'KZT');
    }
  }

  console.log('\n✅ === VERIFICATION COMPLETE ===\n');
}

verifyDatabaseSchema().catch(console.error);
