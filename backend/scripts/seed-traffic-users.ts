/**
 * Seed Traffic Users
 * 
 * Creates initial users for Traffic Dashboard:
 * - 4 targetologists (one per team)
 * - 1 admin
 */

import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from backend/env.env FIRST
const envPath = resolve(__dirname, '../env.env');
console.log(`Loading env from: ${envPath}`);
dotenv.config({ path: envPath });

// Now create supabase client directly here (after env is loaded)
const tripwireUrl = process.env.TRIPWIRE_SUPABASE_URL!;
const tripwireServiceRoleKey = process.env.TRIPWIRE_SERVICE_ROLE_KEY!;

if (!tripwireUrl || !tripwireServiceRoleKey) {
  console.error('❌ Missing Tripwire Supabase credentials!');
  console.error('   TRIPWIRE_SUPABASE_URL:', tripwireUrl ? '✅' : '❌');
  console.error('   TRIPWIRE_SERVICE_ROLE_KEY:', tripwireServiceRoleKey ? '✅' : '❌');
  process.exit(1);
}

const tripwireAdminSupabase = createClient(tripwireUrl, tripwireServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const USERS = [
  {
    email: 'kenesary@onai.academy',
    password: 'changeme123',
    full_name: 'Kenesary',
    team_name: 'Kenesary',
    role: 'targetologist'
  },
  {
    email: 'arystan@onai.academy',
    password: 'changeme123',
    full_name: 'Arystan',
    team_name: 'Arystan',
    role: 'targetologist'
  },
  {
    email: 'traf4@onai.academy',
    password: 'changeme123',
    full_name: 'Traf4',
    team_name: 'Traf4',
    role: 'targetologist'
  },
  {
    email: 'muha@onai.academy',
    password: 'changeme123',
    full_name: 'Muha',
    team_name: 'Muha',
    role: 'targetologist'
  },
  {
    email: 'admin@onai.academy',
    password: 'admin123',
    full_name: 'Admin',
    team_name: 'Kenesary', // Admin can see all teams
    role: 'admin'
  }
];

async function seedTrafficUsers() {
  console.log('\n🌱 Starting Traffic Users Seed...\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const user of USERS) {
    try {
      // Hash password with bcrypt (10 rounds)
      const passwordHash = await bcrypt.hash(user.password, 10);
      
      // Insert user
      const { data, error } = await tripwireAdminSupabase
        .from('traffic_users')
        .insert({
          email: user.email,
          password_hash: passwordHash,
          full_name: user.full_name,
          team_name: user.team_name,
          role: user.role,
          is_active: true
        })
        .select()
        .single();
      
      if (error) {
        // Check if user already exists
        if (error.code === '23505') { // Unique violation
          console.log(`⚠️  User already exists: ${user.email}`);
          continue;
        }
        throw error;
      }
      
      console.log(`✅ Created user: ${user.email}`);
      console.log(`   - Name: ${user.full_name}`);
      console.log(`   - Team: ${user.team_name}`);
      console.log(`   - Role: ${user.role}`);
      console.log(`   - ID: ${data.id}`);
      console.log('');
      
      successCount++;
    } catch (error: any) {
      console.error(`❌ Failed to create user: ${user.email}`);
      console.error(`   Error: ${error.message}`);
      console.log('');
      errorCount++;
    }
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`✅ Seed completed!`);
  console.log(`   - Created: ${successCount} users`);
  console.log(`   - Errors: ${errorCount}`);
  console.log(`   - Total: ${USERS.length} users`);
  console.log('\n📋 LOGIN CREDENTIALS:\n');
  
  USERS.forEach(user => {
    console.log(`${user.role === 'admin' ? '👑' : '👤'} ${user.email} / ${user.password} (${user.role})`);
  });
  
  console.log('\n✅ All done!\n');
  
  process.exit(0);
}

// Run seed
seedTrafficUsers().catch((error) => {
  console.error('\n💥 CRITICAL ERROR:\n');
  console.error(error);
  process.exit(1);
});






