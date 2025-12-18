/**
 * Apply traffic_targetologist_settings migration
 * Run: node apply-migration.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load env
require('dotenv').config({ path: './backend/env.env' });

// Hardcoded values (since dotenv doesn't work here)
const supabaseUrl = 'https://pjmvxecykysfrzppdcto.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbXZ4ZWN5a3lzZnJ6cHBkY3RvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc5NTMwOCwiZXhwIjoyMDgwMzcxMzA4fQ.QB_iIKt06nqa0owpVtKwKXmDwFInuy9mOyALf3VgWyk';

console.log('🔧 Applying migration...');
console.log('📍 URL:', supabaseUrl);
console.log('🔑 Key:', supabaseKey.substring(0, 20) + '...');

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    console.log('\n1️⃣ Creating table traffic_targetologist_settings...');
    
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS traffic_targetologist_settings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES traffic_users(id) ON DELETE CASCADE,
          fb_ad_accounts JSONB DEFAULT '[]'::jsonb,
          fb_access_token TEXT,
          tracked_campaigns JSONB DEFAULT '[]'::jsonb,
          utm_source TEXT DEFAULT 'facebook',
          utm_medium TEXT DEFAULT 'cpc',
          utm_templates JSONB DEFAULT '{}'::jsonb,
          notification_email TEXT,
          notification_telegram BIGINT,
          report_frequency TEXT DEFAULT 'daily',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id)
        );
      `
    });
    
    if (error) {
      console.log('⚠️ RPC not available, trying direct SQL...');
      
      // Alternative: use raw SQL query
      const { error: sqlError } = await supabase
        .from('traffic_targetologist_settings')
        .select('*')
        .limit(0);
      
      if (sqlError && sqlError.message.includes('does not exist')) {
        console.log('❌ Table does not exist. Please apply manually.');
        console.log('\n📋 Copy this SQL to Supabase Dashboard → SQL Editor:\n');
        
        const migration = fs.readFileSync(
          './supabase/migrations/20251219_create_targetologist_settings.sql',
          'utf8'
        );
        
        console.log(migration);
        console.log('\n🔗 https://supabase.com/dashboard/project/pjmvxecykysfrzppdcto/sql\n');
        process.exit(1);
      }
    }
    
    console.log('✅ Table created!');
    
    // Test
    console.log('\n2️⃣ Testing table...');
    const { data: testData, error: testError } = await supabase
      .from('traffic_targetologist_settings')
      .select('*')
      .limit(1);
    
    if (testError) {
      console.log('❌ Test failed:', testError.message);
      process.exit(1);
    }
    
    console.log('✅ Table works!');
    console.log('\n🎉 Migration applied successfully!');
    console.log('\n🔄 Now refresh: http://localhost:8080/traffic/settings\n');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.log('\n📋 Please apply manually via Supabase Dashboard:');
    console.log('🔗 https://supabase.com/dashboard/project/pjmvxecykysfrzppdcto/sql\n');
    process.exit(1);
  }
}

applyMigration();
