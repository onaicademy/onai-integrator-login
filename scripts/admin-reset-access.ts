#!/usr/bin/env npx tsx
/**
 * 🔐 ADMIN RESET ACCESS SCRIPT
 * 
 * Resets passwords for Admin users and Kenesary to temporary password: Onai2025!
 * Lists all users from traffic_users table with their login credentials.
 * 
 * Usage:
 *   npx tsx scripts/admin-reset-access.ts
 */

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../backend/env.env') });

const TRIPWIRE_SUPABASE_URL = process.env.TRIPWIRE_SUPABASE_URL || process.env.VITE_TRIPWIRE_SUPABASE_URL;
const TRIPWIRE_SERVICE_KEY = process.env.TRIPWIRE_SUPABASE_SERVICE_KEY || process.env.TRIPWIRE_SERVICE_KEY;

const TEMPORARY_PASSWORD = 'Onai2025!';
const SALT_ROUNDS = 10;

interface TrafficUser {
  id: string;
  team_name: string;
  username: string;
  email: string;
  role: string;
  password_hash: string;
  created_at: string;
}

async function main() {
  console.log('🔐 ADMIN RESET ACCESS - Traffic Dashboard');
  console.log('═══════════════════════════════════════════════════════\n');

  if (!TRIPWIRE_SUPABASE_URL || !TRIPWIRE_SERVICE_KEY) {
    console.error('❌ Error: Missing Tripwire Supabase credentials');
    console.error('Required env vars: TRIPWIRE_SUPABASE_URL, TRIPWIRE_SUPABASE_SERVICE_KEY');
    process.exit(1);
  }

  const supabase = createClient(TRIPWIRE_SUPABASE_URL, TRIPWIRE_SERVICE_KEY);

  try {
    // 1. Fetch all users
    console.log('📋 Step 1: Fetching all users from traffic_users...\n');
    
    const { data: users, error: fetchError } = await supabase
      .from('traffic_users')
      .select('*')
      .order('role', { ascending: false })
      .order('team_name');

    if (fetchError) {
      throw new Error(`Failed to fetch users: ${fetchError.message}`);
    }

    if (!users || users.length === 0) {
      console.log('⚠️  No users found in traffic_users table');
      return;
    }

    console.log(`✅ Found ${users.length} users\n`);
    console.log('CURRENT USERS:');
    console.log('━'.repeat(80));
    
    users.forEach((user: TrafficUser, index: number) => {
      const roleEmoji = user.role === 'admin' ? '👑' : '👤';
      console.log(`${index + 1}. ${roleEmoji} ${user.team_name.padEnd(20)} | ${user.username.padEnd(15)} | ${user.email}`);
    });
    
    console.log('\n');

    // 2. Generate new password hash
    console.log('🔑 Step 2: Generating new password hash...\n');
    const newPasswordHash = await bcrypt.hash(TEMPORARY_PASSWORD, SALT_ROUNDS);
    console.log(`✅ New password hash generated: ${newPasswordHash.substring(0, 30)}...\n`);

    // 3. Reset passwords for Admin and Kenesary
    console.log('🔄 Step 3: Resetting passwords...\n');

    const usersToReset = users.filter((u: TrafficUser) => 
      u.role === 'admin' || 
      u.team_name.toLowerCase() === 'kenesary' ||
      u.username.toLowerCase().includes('admin') ||
      u.username.toLowerCase().includes('kenesary')
    );

    if (usersToReset.length === 0) {
      console.log('⚠️  No admin or Kenesary users found to reset');
      return;
    }

    let successCount = 0;
    const credentials: Array<{ team: string; username: string; email: string; password: string }> = [];

    for (const user of usersToReset) {
      const { error: updateError } = await supabase
        .from('traffic_users')
        .update({ password_hash: newPasswordHash })
        .eq('id', user.id);

      if (updateError) {
        console.error(`❌ Failed to reset password for ${user.username}: ${updateError.message}`);
      } else {
        console.log(`✅ Password reset for: ${user.team_name} (${user.username})`);
        successCount++;
        
        credentials.push({
          team: user.team_name,
          username: user.username,
          email: user.email,
          password: TEMPORARY_PASSWORD
        });
      }
    }

    console.log(`\n✅ Successfully reset ${successCount} password(s)\n`);

    // 4. Output login credentials
    console.log('═══════════════════════════════════════════════════════');
    console.log('🎯 LOGIN CREDENTIALS (COPY THESE!)');
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log('Dashboard URL: https://traffic.onai.academy/login\n');
    
    credentials.forEach((cred, index) => {
      console.log(`${index + 1}. ${cred.team} (${cred.username})`);
      console.log(`   Email:    ${cred.email}`);
      console.log(`   Password: ${cred.password}`);
      console.log('');
    });

    console.log('═══════════════════════════════════════════════════════');
    console.log('⚠️  SECURITY NOTE:');
    console.log('   This is a TEMPORARY password. Users should change it');
    console.log('   after first login via Settings → Change Password.');
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
