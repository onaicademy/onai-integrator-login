#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

// Tripwire Database credentials
const TRIPWIRE_SUPABASE_URL = 'https://pjmvxecykysfrzppdcto.supabase.co';
const TRIPWIRE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbXZ4ZWN5a3lzZnJ6cHBkY3RvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc5NTMwOCwiZXhwIjoyMDgwMzcxMzA4fQ.QB_iIKt06nqa0owpVtKwKXmDwFInuy9mOyALf3VgWyk';

const supabase = createClient(TRIPWIRE_SUPABASE_URL, TRIPWIRE_SERVICE_ROLE_KEY);

async function checkRPCFunctions() {
  console.log('🔍 Checking RPC functions in Tripwire database...\n');

  try {
    // Query 1: Check RPC functions
    const { data: functions, error: funcError } = await supabase
      .from('pg_catalog.pg_proc')
      .select('proname, prokind')
      .like('proname', 'rpc_%');

    if (funcError) {
      console.log('❌ Error querying pg_catalog.pg_proc (trying alternative method):', funcError.message);

      // Alternative: Try direct SQL query using rpc
      const { data: altFunctions, error: altError } = await supabase.rpc('exec_sql', {
        query: `
          SELECT routine_name, routine_type
          FROM information_schema.routines
          WHERE routine_schema = 'public'
            AND routine_name LIKE 'rpc_%'
          ORDER BY routine_name;
        `
      });

      if (altError) {
        console.log('❌ Alternative query also failed:', altError.message);
        console.log('\n📋 Attempting to list all available RPC functions...\n');

        // Try to call known RPC functions to see if they exist
        const knownRPCs = [
          'rpc_get_sales_leaderboard',
          'rpc_get_sales_stats',
          'rpc_get_student_stats',
          'rpc_get_revenue_stats'
        ];

        for (const rpcName of knownRPCs) {
          try {
            const { data, error } = await supabase.rpc(rpcName);
            if (error) {
              console.log(`❌ ${rpcName}: NOT FOUND or ERROR - ${error.message}`);
            } else {
              console.log(`✅ ${rpcName}: EXISTS (returned ${Array.isArray(data) ? data.length : 'data'} results)`);
            }
          } catch (err) {
            console.log(`❌ ${rpcName}: ERROR - ${err.message}`);
          }
        }
      } else {
        console.log('✅ RPC Functions found:', altFunctions);
      }
    } else {
      console.log('✅ RPC Functions found:', functions);
    }
  } catch (err) {
    console.error('❌ Unexpected error checking RPC functions:', err.message);
  }
}

async function checkTables() {
  console.log('\n\n🔍 Checking tables in Tripwire database...\n');

  try {
    // Query 2: Check tables
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .or('table_name.like.%tripwire%,table_name.like.%sales%')
      .order('table_name');

    if (tableError) {
      console.log('❌ Error querying information_schema.tables:', tableError.message);

      // Try listing common tables directly
      const commonTables = [
        'tripwire_students',
        'tripwire_lessons',
        'tripwire_progress',
        'tripwire_payments',
        'sales_managers',
        'sales_stats'
      ];

      console.log('\n📋 Checking common tables directly...\n');

      for (const tableName of commonTables) {
        try {
          const { data, error, count } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });

          if (error) {
            console.log(`❌ ${tableName}: NOT FOUND - ${error.message}`);
          } else {
            console.log(`✅ ${tableName}: EXISTS (${count} rows)`);
          }
        } catch (err) {
          console.log(`❌ ${tableName}: ERROR - ${err.message}`);
        }
      }
    } else {
      console.log('✅ Tables found:');
      tables.forEach(t => console.log(`   - ${t.table_name}`));
    }
  } catch (err) {
    console.error('❌ Unexpected error checking tables:', err.message);
  }
}

async function checkSalesManagerData() {
  console.log('\n\n🔍 Checking sales_manager data specifically...\n');

  try {
    // Check if user_profiles table exists and has sales_manager role
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, email, role, full_name')
      .eq('role', 'sales_manager')
      .limit(5);

    if (profileError) {
      console.log('❌ Error querying user_profiles:', profileError.message);
    } else {
      console.log(`✅ Found ${profiles.length} sales managers in user_profiles:`);
      profiles.forEach(p => console.log(`   - ${p.full_name} (${p.email}) - Role: ${p.role}`));
    }

    // Check tripwire_students table for sales_manager_id
    const { data: students, error: studentError } = await supabase
      .from('tripwire_students')
      .select('id, email, sales_manager_id')
      .not('sales_manager_id', 'is', null)
      .limit(5);

    if (studentError) {
      console.log('❌ Error querying tripwire_students:', studentError.message);
    } else {
      console.log(`\n✅ Found ${students.length} students with sales_manager_id:`);
      students.forEach(s => console.log(`   - ${s.email} -> sales_manager_id: ${s.sales_manager_id}`));
    }
  } catch (err) {
    console.error('❌ Unexpected error checking sales manager data:', err.message);
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  TRIPWIRE SUPABASE DATABASE DIAGNOSTIC REPORT                ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  console.log('📍 URL:', TRIPWIRE_SUPABASE_URL);
  console.log('🔑 Service Key:', TRIPWIRE_SERVICE_ROLE_KEY.substring(0, 30) + '...\n');

  await checkRPCFunctions();
  await checkTables();
  await checkSalesManagerData();

  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('✅ Diagnostic check completed!');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
