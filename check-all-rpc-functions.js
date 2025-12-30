#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

// Tripwire Database credentials
const TRIPWIRE_SUPABASE_URL = 'https://pjmvxecykysfrzppdcto.supabase.co';
const TRIPWIRE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbXZ4ZWN5a3lzZnJ6cHBkY3RvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc5NTMwOCwiZXhwIjoyMDgwMzcxMzA4fQ.QB_iIKt06nqa0owpVtKwKXmDwFInuy9mOyALf3VgWyk';

const supabase = createClient(TRIPWIRE_SUPABASE_URL, TRIPWIRE_SERVICE_ROLE_KEY);

// List of RPC functions used in tripwireManagerService.ts
const rpcFunctions = [
  {
    name: 'rpc_create_tripwire_user_full',
    params: {
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_full_name: 'Test User',
      p_email: 'test@example.com',
      p_granted_by: '00000000-0000-0000-0000-000000000000',
      p_manager_name: 'Test Manager',
      p_generated_password: 'testpass123',
      p_welcome_email_sent: false
    }
  },
  {
    name: 'rpc_update_email_status',
    params: {
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_email_sent: true
    }
  },
  {
    name: 'rpc_get_tripwire_users',
    params: {
      p_manager_id: null,
      p_status: null,
      p_page: 1,
      p_limit: 20,
      p_start_date: null,
      p_end_date: null
    }
  },
  {
    name: 'rpc_get_tripwire_stats',
    params: {
      p_manager_id: null,
      p_start_date: null,
      p_end_date: null
    }
  },
  {
    name: 'rpc_update_tripwire_user_status',
    params: {
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_status: 'active',
      p_manager_id: '00000000-0000-0000-0000-000000000000'
    }
  },
  {
    name: 'rpc_get_sales_activity_log',
    params: {
      p_manager_id: '00000000-0000-0000-0000-000000000000',
      p_limit: 50,
      p_start_date: null,
      p_end_date: null
    }
  },
  {
    name: 'rpc_get_sales_leaderboard',
    params: {} // No parameters
  },
  {
    name: 'rpc_get_sales_chart_data',
    params: {
      p_manager_id: null,
      p_start_date: '2024-01-01T00:00:00Z',
      p_end_date: '2024-12-31T23:59:59Z'
    }
  }
];

async function checkRPCFunction(funcName, params) {
  try {
    const { data, error } = await supabase.rpc(funcName, params);

    if (error) {
      // Check if it's a "function not found" error
      if (error.message.includes('Could not find the function') || error.message.includes('schema cache')) {
        return { status: 'NOT_FOUND', error: error.message };
      }
      // It exists but has parameter/logic errors
      return { status: 'EXISTS_WITH_ERROR', error: error.message };
    }

    return { status: 'EXISTS_AND_WORKS', data };
  } catch (err) {
    return { status: 'EXCEPTION', error: err.message };
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  CHECKING ALL RPC FUNCTIONS FOR SALES MANAGER DASHBOARD     ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const results = [];

  for (const func of rpcFunctions) {
    console.log(`🔍 Checking ${func.name}...`);
    const result = await checkRPCFunction(func.name, func.params);

    results.push({
      name: func.name,
      ...result
    });

    if (result.status === 'NOT_FOUND') {
      console.log(`   ❌ NOT FOUND - ${result.error}`);
    } else if (result.status === 'EXISTS_WITH_ERROR') {
      console.log(`   ⚠️  EXISTS but has error: ${result.error}`);
    } else if (result.status === 'EXISTS_AND_WORKS') {
      console.log(`   ✅ EXISTS and works (returned ${Array.isArray(result.data) ? result.data.length : 'data'})`);
    } else {
      console.log(`   ❌ EXCEPTION: ${result.error}`);
    }
  }

  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('📊 SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const notFound = results.filter(r => r.status === 'NOT_FOUND');
  const existsWithError = results.filter(r => r.status === 'EXISTS_WITH_ERROR');
  const working = results.filter(r => r.status === 'EXISTS_AND_WORKS');

  console.log(`✅ Working: ${working.length}`);
  working.forEach(r => console.log(`   - ${r.name}`));

  console.log(`\n⚠️  Exists with errors: ${existsWithError.length}`);
  existsWithError.forEach(r => console.log(`   - ${r.name}: ${r.error}`));

  console.log(`\n❌ Not found: ${notFound.length}`);
  notFound.forEach(r => console.log(`   - ${r.name}`));

  console.log('\n═══════════════════════════════════════════════════════════════');

  if (notFound.length > 0) {
    console.log('\n🚨 PROBLEM FOUND:');
    console.log(`   ${notFound.length} RPC function(s) are missing!`);
    console.log('\n💡 SOLUTION:');
    console.log('   Run the migration SQL to create missing RPC functions:');
    console.log('   - Check supabase/migrations/ folder');
    console.log('   - Look for RPC creation scripts');
    console.log('   - Execute them in Supabase SQL Editor');
  } else if (existsWithError.length > 0) {
    console.log('\n⚠️  WARNING:');
    console.log(`   ${existsWithError.length} RPC function(s) exist but have errors.`);
    console.log('   This might be due to invalid test parameters.');
  } else {
    console.log('\n✅ ALL RPC FUNCTIONS ARE WORKING!');
  }

  console.log('\n═══════════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
