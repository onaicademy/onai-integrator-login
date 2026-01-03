/**
 * Execute migration 004_create_integration_logs_table.sql
 * This script creates the integration_logs table in Landing BD
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Landing BD credentials
const SUPABASE_URL = 'https://xikaiavwqinamgolmtcy.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpa2FpYXZ3cWluYW1nb2xtdGN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDg1MzIyMSwiZXhwIjoyMDgwNDI5MjIxfQ.eP7ake2RkWqCaLTKv0jI3vWMkBjDySKsAdToKIgb7fA';

// Create Supabase client with service role
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeSQLStatement(sql: string): Promise<void> {
  // Use Supabase's RPC to execute raw SQL
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    throw error;
  }

  return data;
}

async function runMigration() {
  console.log('🚀 Starting migration 004_create_integration_logs_table...\n');

  try {
    // Step 1: Create table
    console.log('📋 Step 1: Creating integration_logs table...');

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS integration_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        service_name TEXT NOT NULL,
        action TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending', 'retrying')),
        related_entity_type TEXT,
        related_entity_id UUID,
        request_payload JSONB,
        response_payload JSONB,
        error_message TEXT,
        error_code TEXT,
        duration_ms INTEGER,
        retry_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    const { error: createError } = await supabase.rpc('exec_sql', { sql_query: createTableSQL });

    if (createError) {
      console.error('❌ Failed to create table:', createError);
    } else {
      console.log('✅ Table created successfully\n');
    }

    // Step 2: Create indexes
    console.log('📋 Step 2: Creating indexes...');

    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_integration_logs_service_name ON integration_logs(service_name);`,
      `CREATE INDEX IF NOT EXISTS idx_integration_logs_status ON integration_logs(status);`,
      `CREATE INDEX IF NOT EXISTS idx_integration_logs_created_at ON integration_logs(created_at DESC);`,
      `CREATE INDEX IF NOT EXISTS idx_integration_logs_related_entity ON integration_logs(related_entity_type, related_entity_id);`,
      `CREATE INDEX IF NOT EXISTS idx_integration_logs_failed ON integration_logs(service_name, created_at DESC) WHERE status = 'failed';`,
      `CREATE INDEX IF NOT EXISTS idx_integration_logs_dashboard ON integration_logs(service_name, status, created_at DESC);`
    ];

    for (let i = 0; i < indexes.length; i++) {
      const { error: indexError } = await supabase.rpc('exec_sql', { sql_query: indexes[i] });
      if (indexError) {
        console.error(`❌ Failed to create index ${i + 1}:`, indexError);
      } else {
        console.log(`✅ Index ${i + 1}/6 created`);
      }
    }

    console.log('\n');

    // Step 3: Create views
    console.log('📋 Step 3: Creating analytics views...');

    const hourlyViewSQL = `
      CREATE OR REPLACE VIEW integration_stats_hourly AS
      SELECT
        service_name,
        action,
        status,
        DATE_TRUNC('hour', created_at) as hour,
        COUNT(*) as count,
        AVG(duration_ms) as avg_duration_ms,
        MAX(duration_ms) as max_duration_ms,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count
      FROM integration_logs
      WHERE created_at >= NOW() - INTERVAL '24 hours'
      GROUP BY service_name, action, status, DATE_TRUNC('hour', created_at);
    `;

    const dailyViewSQL = `
      CREATE OR REPLACE VIEW integration_stats_daily AS
      SELECT
        service_name,
        action,
        status,
        DATE_TRUNC('day', created_at) as day,
        COUNT(*) as count,
        AVG(duration_ms) as avg_duration_ms,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count
      FROM integration_logs
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY service_name, action, status, DATE_TRUNC('day', created_at);
    `;

    const { error: hourlyError } = await supabase.rpc('exec_sql', { sql_query: hourlyViewSQL });
    if (hourlyError) {
      console.error('❌ Failed to create hourly view:', hourlyError);
    } else {
      console.log('✅ Hourly view created');
    }

    const { error: dailyError } = await supabase.rpc('exec_sql', { sql_query: dailyViewSQL });
    if (dailyError) {
      console.error('❌ Failed to create daily view:', dailyError);
    } else {
      console.log('✅ Daily view created');
    }

    console.log('\n');

    // Step 4: Enable RLS and create policies
    console.log('📋 Step 4: Enabling RLS and creating policies...');

    const rlsSQL = `ALTER TABLE integration_logs ENABLE ROW LEVEL SECURITY;`;
    const { error: rlsError } = await supabase.rpc('exec_sql', { sql_query: rlsSQL });

    if (rlsError) {
      console.error('❌ Failed to enable RLS:', rlsError);
    } else {
      console.log('✅ RLS enabled');
    }

    const serviceRolePolicy = `
      CREATE POLICY "Service role full access to integration_logs"
      ON integration_logs
      FOR ALL
      USING (auth.role() = 'service_role');
    `;

    const { error: servicePolicyError } = await supabase.rpc('exec_sql', { sql_query: serviceRolePolicy });
    if (servicePolicyError) {
      console.error('❌ Failed to create service role policy:', servicePolicyError);
    } else {
      console.log('✅ Service role policy created');
    }

    const authUserPolicy = `
      CREATE POLICY "Authenticated users can view integration_logs"
      ON integration_logs
      FOR SELECT
      USING (auth.role() = 'authenticated');
    `;

    const { error: authPolicyError } = await supabase.rpc('exec_sql', { sql_query: authUserPolicy });
    if (authPolicyError) {
      console.error('❌ Failed to create auth user policy:', authPolicyError);
    } else {
      console.log('✅ Auth user policy created');
    }

    console.log('\n');

    // Step 5: Create cleanup function
    console.log('📋 Step 5: Creating cleanup function...');

    const cleanupFunctionSQL = `
      CREATE OR REPLACE FUNCTION cleanup_old_integration_logs()
      RETURNS void
      LANGUAGE plpgsql
      AS $$
      BEGIN
        DELETE FROM integration_logs
        WHERE created_at < NOW() - INTERVAL '90 days'
          AND status = 'success';

        DELETE FROM integration_logs
        WHERE created_at < NOW() - INTERVAL '180 days';
      END;
      $$;
    `;

    const { error: functionError } = await supabase.rpc('exec_sql', { sql_query: cleanupFunctionSQL });
    if (functionError) {
      console.error('❌ Failed to create cleanup function:', functionError);
    } else {
      console.log('✅ Cleanup function created');
    }

    console.log('\n');

    // Step 6: Verify table
    console.log('🔍 Verifying table creation...\n');

    const { count, error: countError } = await supabase
      .from('integration_logs')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Table verification failed:', countError.message);
      console.log('\n⚠️  Migration might have failed. Please check Supabase dashboard.\n');
      process.exit(1);
    }

    console.log(`✅ Table 'integration_logs' exists! Current count: ${count || 0}\n`);

    // Step 7: Test insert
    console.log('🧪 Testing insert...\n');

    const { error: insertError } = await supabase
      .from('integration_logs')
      .insert({
        service_name: 'test',
        action: 'migration_test',
        status: 'success',
        duration_ms: 1
      });

    if (insertError) {
      console.error('❌ Test insert failed:', insertError.message);
    } else {
      console.log('✅ Test insert successful\n');

      // Clean up test data
      await supabase
        .from('integration_logs')
        .delete()
        .eq('action', 'migration_test');
    }

    console.log('🎉 Migration completed successfully!\n');

    console.log('📊 Migration summary:');
    console.log('  ✅ Table: integration_logs');
    console.log('  ✅ Indexes: 6');
    console.log('  ✅ Views: 2 (integration_stats_hourly, integration_stats_daily)');
    console.log('  ✅ Functions: 1 (cleanup_old_integration_logs)');
    console.log('  ✅ RLS: enabled with 2 policies\n');

    console.log('🔗 Next steps:');
    console.log('  1. View in Supabase: https://supabase.com/dashboard/project/xikaiavwqinamgolmtcy/editor');
    console.log('  2. Start logging integrations in your services');
    console.log('  3. Set up scheduled cleanup job (optional)\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
runMigration();
