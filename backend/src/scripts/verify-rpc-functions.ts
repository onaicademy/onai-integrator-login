/**
 * VERIFY RPC FUNCTIONS IN TRIPWIRE DB
 * Проверяет доступность всех 5 RPC функций
 */

import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const TRIPWIRE_SUPABASE_URL = process.env.TRIPWIRE_SUPABASE_URL!;
const TRIPWIRE_SERVICE_ROLE_KEY = process.env.TRIPWIRE_SERVICE_ROLE_KEY!;

if (!TRIPWIRE_SUPABASE_URL || !TRIPWIRE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing ENV variables');
  process.exit(1);
}

console.log('\n🔍 VERIFYING RPC FUNCTIONS IN TRIPWIRE DB');
console.log('='.repeat(60));
console.log('📍 URL:', TRIPWIRE_SUPABASE_URL);
console.log('='.repeat(60));

const supabase = createClient(TRIPWIRE_SUPABASE_URL, TRIPWIRE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
});

async function verifyRpcFunctions(): Promise<void> {
  const results: Array<{ name: string; status: 'OK' | 'FAILED'; error?: string }> = [];

  console.log('\n📊 Testing RPC Functions...\n');

  // Test 1: rpc_get_sales_leaderboard (no parameters)
  try {
    const { data, error } = await supabase.rpc('rpc_get_sales_leaderboard');
    if (error) {
      results.push({ name: 'rpc_get_sales_leaderboard', status: 'FAILED', error: error.message });
    } else {
      results.push({ name: 'rpc_get_sales_leaderboard', status: 'OK' });
    }
  } catch (err: any) {
    results.push({ name: 'rpc_get_sales_leaderboard', status: 'FAILED', error: err.message });
  }

  // Test 2: rpc_get_sales_activity_log
  try {
    const { data, error } = await supabase.rpc('rpc_get_sales_activity_log', {
      p_end_date: null,
      p_limit: 5,
      p_manager_id: null,
      p_start_date: null
    });
    if (error) {
      results.push({ name: 'rpc_get_sales_activity_log', status: 'FAILED', error: error.message });
    } else {
      results.push({ name: 'rpc_get_sales_activity_log', status: 'OK' });
    }
  } catch (err: any) {
    results.push({ name: 'rpc_get_sales_activity_log', status: 'FAILED', error: err.message });
  }

  // Test 3: rpc_get_sales_chart_data
  try {
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = new Date().toISOString();

    const { data, error } = await supabase.rpc('rpc_get_sales_chart_data', {
      p_end_date: endDate,
      p_manager_id: null,
      p_start_date: startDate
    });
    if (error) {
      results.push({ name: 'rpc_get_sales_chart_data', status: 'FAILED', error: error.message });
    } else {
      results.push({ name: 'rpc_get_sales_chart_data', status: 'OK' });
    }
  } catch (err: any) {
    results.push({ name: 'rpc_get_sales_chart_data', status: 'FAILED', error: err.message });
  }

  // Test 4: rpc_get_tripwire_stats
  try {
    const { data, error } = await supabase.rpc('rpc_get_tripwire_stats', {
      p_end_date: null,
      p_manager_id: null,
      p_start_date: null
    });
    if (error) {
      results.push({ name: 'rpc_get_tripwire_stats', status: 'FAILED', error: error.message });
    } else {
      results.push({ name: 'rpc_get_tripwire_stats', status: 'OK' });
    }
  } catch (err: any) {
    results.push({ name: 'rpc_get_tripwire_stats', status: 'FAILED', error: err.message });
  }

  // Test 5: rpc_get_tripwire_users
  try {
    const { data, error } = await supabase.rpc('rpc_get_tripwire_users', {
      p_end_date: null,
      p_limit: 5,
      p_manager_id: null,
      p_page: 1,
      p_start_date: null,
      p_status: null
    });
    if (error) {
      results.push({ name: 'rpc_get_tripwire_users', status: 'FAILED', error: error.message });
    } else {
      results.push({ name: 'rpc_get_tripwire_users', status: 'OK' });
    }
  } catch (err: any) {
    results.push({ name: 'rpc_get_tripwire_users', status: 'FAILED', error: err.message });
  }

  // Display results
  console.log('='.repeat(60));
  console.log('📊 VERIFICATION RESULTS:');
  console.log('='.repeat(60));

  const successCount = results.filter(r => r.status === 'OK').length;
  const failCount = results.filter(r => r.status === 'FAILED').length;

  results.forEach((result, i) => {
    const icon = result.status === 'OK' ? '✅' : '❌';
    console.log(`${icon} ${i + 1}. ${result.name}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  console.log('='.repeat(60));
  console.log(`✅ Success: ${successCount}/5`);
  console.log(`❌ Failed: ${failCount}/5`);
  console.log('='.repeat(60));

  if (failCount === 0) {
    console.log('\n🎉 ALL RPC FUNCTIONS ARE WORKING!');
  } else if (failCount === 5) {
    console.log('\n❌ NO RPC FUNCTIONS FOUND - Need to apply SQL migration');
  } else {
    console.log('\n⚠️  PARTIAL SUCCESS - Some functions missing');
  }
}

verifyRpcFunctions();
