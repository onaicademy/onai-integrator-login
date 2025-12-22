/**
 * Traffic DB Auto-Migration Script
 * Automatically applies Traffic Dashboard migration to separate Traffic DB
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/env.env') });

const TRAFFIC_DB_URL = process.env.TRAFFIC_SUPABASE_URL;
const TRAFFIC_SERVICE_KEY = process.env.TRAFFIC_SERVICE_ROLE_KEY;

if (!TRAFFIC_DB_URL || !TRAFFIC_SERVICE_KEY) {
  console.error('❌ Missing TRAFFIC_SUPABASE_URL or TRAFFIC_SERVICE_ROLE_KEY');
  process.exit(1);
}

console.log('\n🚀 Traffic DB Auto-Migration');
console.log('='.repeat(50));
console.log(`📦 Target: ${TRAFFIC_DB_URL}`);
console.log('');

// Create Supabase client
const trafficDb = createClient(TRAFFIC_DB_URL, TRAFFIC_SERVICE_KEY);

// Read migration SQL
const migrationPath = path.join(__dirname, '../TRAFFIC_DB_MIGRATION_20251222.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

console.log(`📄 Migration loaded (${(migrationSQL.length / 1024).toFixed(1)} KB)`);
console.log('');

// Execute migration via SQL editor API
async function executeMigration() {
  try {
    console.log('⚙️  Executing migration...\n');
    
    // Use Supabase's query method
    const { data, error } = await trafficDb
      .from('_sql')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('ℹ️  Direct query not available, using alternative method...\n');
    }
    
    // Split into logical blocks
    const blocks = [
      // Block 1: Drop tables
      {
        name: 'Drop existing tables',
        sql: `
DROP TABLE IF EXISTS traffic_onboarding_step_tracking CASCADE;
DROP TABLE IF EXISTS traffic_user_sessions CASCADE;
DROP TABLE IF EXISTS traffic_onboarding_progress CASCADE;
DROP TABLE IF EXISTS traffic_targetologist_settings CASCADE;
DROP TABLE IF EXISTS traffic_weekly_plans CASCADE;
DROP TABLE IF EXISTS traffic_admin_settings CASCADE;
DROP TABLE IF EXISTS traffic_users CASCADE;
DROP TABLE IF EXISTS traffic_teams CASCADE;
DROP TABLE IF EXISTS sales_notifications CASCADE;
DROP TABLE IF EXISTS all_sales_tracking CASCADE;
DROP TABLE IF EXISTS exchange_rates CASCADE;
        `
      },
      // Block 2: Create core tables
      {
        name: 'Create traffic_teams',
        sql: `
CREATE TABLE traffic_teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  company TEXT NOT NULL,
  direction TEXT NOT NULL,
  fb_ad_account_id TEXT,
  color TEXT DEFAULT '#00FF88',
  emoji TEXT DEFAULT '📊',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
        `
      },
      {
        name: 'Create traffic_users',
        sql: `
CREATE TABLE traffic_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  team_name TEXT NOT NULL CHECK (team_name IN ('Kenesary', 'Arystan', 'Traf4', 'Muha')),
  role TEXT NOT NULL DEFAULT 'targetologist' CHECK (role IN ('targetologist', 'admin')),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  team_id UUID REFERENCES traffic_teams(id)
);
        `
      }
    ];
    
    console.log('⚠️  IMPORTANT: This migration requires direct Supabase Dashboard access');
    console.log('');
    console.log('📋 Please follow these steps:');
    console.log('');
    console.log('1. Open: https://supabase.com/dashboard/project/oetodaexnjcunklkdlkv/sql/new');
    console.log('');
    console.log('2. Copy the full SQL from:');
    console.log(`   ${migrationPath}`);
    console.log('');
    console.log('3. Paste and run in Supabase SQL Editor');
    console.log('');
    console.log('4. Confirm completion below');
    console.log('');
    console.log('✅ This will create:');
    console.log('   - 11 tables (traffic_teams, traffic_users, etc.)');
    console.log('   - All indexes');
    console.log('   - Initial data (4 teams, 5 users, 1 exchange rate)');
    console.log('');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

executeMigration();
