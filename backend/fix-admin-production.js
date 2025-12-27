#!/usr/bin/env node
/**
 * Fix admin@onai.academy team to NULL in PRODUCTION Traffic DB
 * Run: node fix-admin-production.js
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from production env.env
dotenv.config({ path: join(__dirname, 'env.env') });

const TRAFFIC_URL = process.env.TRAFFIC_SUPABASE_URL;
const TRAFFIC_KEY = process.env.TRAFFIC_SUPABASE_SERVICE_ROLE_KEY;

if (!TRAFFIC_URL || !TRAFFIC_KEY) {
  console.error('❌ Missing TRAFFIC_SUPABASE credentials in env.env');
  process.exit(1);
}

const trafficDB = createClient(TRAFFIC_URL, TRAFFIC_KEY);

async function fixAdmin() {
  console.log('🔧 Fixing admin@onai.academy in Traffic DB...\n');
  
  // 1. Update traffic_users
  console.log('📝 Updating traffic_users...');
  const { data: usersData, error: usersError } = await trafficDB
    .from('traffic_users')
    .update({
      team_name: null,
      role: 'admin',
      full_name: 'Global Administrator',
      updated_at: new Date().toISOString()
    })
    .eq('email', 'admin@onai.academy')
    .select('id, email, full_name, team_name, role');
  
  if (usersError) {
    console.error('❌ traffic_users update failed:', usersError);
  } else {
    console.log('✅ traffic_users updated:', usersData);
  }
  
  // 2. Update traffic_targetologists
  console.log('\n📝 Updating traffic_targetologists...');
  const { data: targetData, error: targetError } = await trafficDB
    .from('traffic_targetologists')
    .update({
      team: 'Admin',
      role: 'admin',
      full_name: 'Global Administrator',
      updated_at: new Date().toISOString()
    })
    .eq('email', 'admin@onai.academy')
    .select('id, email, full_name, team, role');
  
  if (targetError) {
    console.error('❌ traffic_targetologists update failed:', targetError);
  } else {
    console.log('✅ traffic_targetologists updated:', targetData);
  }
  
  // 3. Delete from traffic_targetologist_settings
  console.log('\n📝 Deleting from traffic_targetologist_settings...');
  
  // Get admin user_id first
  const { data: adminUser } = await trafficDB
    .from('traffic_users')
    .select('id')
    .eq('email', 'admin@onai.academy')
    .single();
  
  if (adminUser) {
    const { error: settingsError } = await trafficDB
      .from('traffic_targetologist_settings')
      .delete()
      .eq('user_id', adminUser.id);
    
    if (settingsError) {
      console.error('❌ settings delete failed:', settingsError);
    } else {
      console.log('✅ Admin settings deleted');
    }
  }
  
  console.log('\n✅ DONE! Admin account fixed in production DB.');
}

fixAdmin().catch(console.error);
