#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

// Tripwire Database credentials
const TRIPWIRE_SUPABASE_URL = 'https://pjmvxecykysfrzppdcto.supabase.co';
const TRIPWIRE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbXZ4ZWN5a3lzZnJ6cHBkY3RvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc5NTMwOCwiZXhwIjoyMDgwMzcxMzA4fQ.QB_iIKt06nqa0owpVtKwKXmDwFInuy9mOyALf3VgWyk';

const supabase = createClient(TRIPWIRE_SUPABASE_URL, TRIPWIRE_SERVICE_ROLE_KEY);

async function checkRPCLeaderboard() {
  console.log('🏆 Testing rpc_get_sales_leaderboard...\n');

  try {
    const { data, error } = await supabase.rpc('rpc_get_sales_leaderboard');

    if (error) {
      console.log('❌ Error calling rpc_get_sales_leaderboard:', error.message);
    } else {
      console.log(`✅ rpc_get_sales_leaderboard returned ${data.length} results:`);
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('❌ Exception:', err.message);
  }
}

async function checkSalesManagers() {
  console.log('\n\n👥 Checking sales_managers table...\n');

  try {
    const { data, error, count } = await supabase
      .from('sales_managers')
      .select('*', { count: 'exact' });

    if (error) {
      console.log('❌ Error querying sales_managers:', error.message);
    } else {
      console.log(`✅ sales_managers table has ${count} rows:`);
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('❌ Exception:', err.message);
  }
}

async function checkSalesStats() {
  console.log('\n\n📊 Checking sales_stats table...\n');

  try {
    const { data, error, count } = await supabase
      .from('sales_stats')
      .select('*', { count: 'exact' });

    if (error) {
      console.log('❌ Error querying sales_stats:', error.message);
    } else {
      console.log(`✅ sales_stats table has ${count} rows:`);
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('❌ Exception:', err.message);
  }
}

async function checkAuthUsers() {
  console.log('\n\n🔐 Checking auth.users for sales managers...\n');

  try {
    // Try to query auth.users via RPC or direct query
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.log('❌ Error listing users:', error.message);
    } else {
      const salesManagers = data.users.filter(u =>
        u.user_metadata?.role === 'sales_manager' ||
        u.app_metadata?.role === 'sales_manager'
      );

      console.log(`✅ Found ${salesManagers.length} sales managers in auth.users:`);
      salesManagers.forEach(sm => {
        console.log(`   - ${sm.email} (ID: ${sm.id})`);
        console.log(`     user_metadata:`, sm.user_metadata);
        console.log(`     app_metadata:`, sm.app_metadata);
      });

      // Also show all users to understand structure
      console.log(`\n📋 Total users in auth: ${data.users.length}`);
      data.users.forEach(u => {
        console.log(`   - ${u.email || 'No email'} (Role in metadata: ${u.user_metadata?.role || u.app_metadata?.role || 'none'})`);
      });
    }
  } catch (err) {
    console.error('❌ Exception:', err.message);
  }
}

async function checkProfiles() {
  console.log('\n\n👤 Checking profiles table (if exists)...\n');

  try {
    const { data, error, count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact' });

    if (error) {
      console.log('❌ Error querying profiles:', error.message);
    } else {
      console.log(`✅ profiles table has ${count} rows:`);
      const salesManagerProfiles = data.filter(p => p.role === 'sales_manager');
      console.log(`   Sales managers in profiles: ${salesManagerProfiles.length}`);
      console.log(JSON.stringify(salesManagerProfiles, null, 2));
    }
  } catch (err) {
    console.error('❌ Exception:', err.message);
  }
}

async function checkStudents() {
  console.log('\n\n🎓 Checking students table structure...\n');

  try {
    const { data, error } = await supabase
      .from('students')
      .select('id, email, sales_manager_id, created_at')
      .limit(5);

    if (error) {
      console.log('❌ Error querying students:', error.message);
    } else {
      console.log(`✅ students table sample (${data.length} rows):`);
      console.log(JSON.stringify(data, null, 2));

      // Count students with sales_manager_id
      const { count } = await supabase
        .from('students')
        .select('id', { count: 'exact', head: true })
        .not('sales_manager_id', 'is', null);

      console.log(`\n   Students with sales_manager_id: ${count}`);
    }
  } catch (err) {
    console.error('❌ Exception:', err.message);
  }
}

async function listAllTables() {
  console.log('\n\n📋 Trying to list all public tables...\n');

  const commonTables = [
    'students',
    'profiles',
    'user_profiles',
    'tripwire_students',
    'sales_managers',
    'sales_stats',
    'tripwire_lessons',
    'tripwire_progress',
    'tripwire_payments'
  ];

  for (const tableName of commonTables) {
    try {
      const { error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`❌ ${tableName}: ${error.message}`);
      } else {
        console.log(`✅ ${tableName}: EXISTS (${count} rows)`);
      }
    } catch (err) {
      console.log(`❌ ${tableName}: Exception - ${err.message}`);
    }
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  SALES MANAGER DASHBOARD DATA DIAGNOSTIC                     ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  console.log('📍 URL:', TRIPWIRE_SUPABASE_URL);
  console.log('🔑 Service Key:', TRIPWIRE_SERVICE_ROLE_KEY.substring(0, 30) + '...\n');

  await listAllTables();
  await checkRPCLeaderboard();
  await checkSalesManagers();
  await checkSalesStats();
  await checkProfiles();
  await checkStudents();
  await checkAuthUsers();

  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('✅ Sales Dashboard Diagnostic completed!');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
