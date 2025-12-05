/**
 * 🔐 RESET PASSWORD через Supabase Admin API
 * 
 * Usage: node test-reset-password.js test123@test.com Test123
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const tripwireSupabaseUrl = process.env.TRIPWIRE_SUPABASE_URL;
const tripwireServiceRoleKey = process.env.TRIPWIRE_SERVICE_ROLE_KEY;

if (!tripwireSupabaseUrl || !tripwireServiceRoleKey) {
  console.error('❌ Missing Tripwire Supabase credentials!');
  process.exit(1);
}

const tripwireAdminSupabase = createClient(tripwireSupabaseUrl, tripwireServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function resetPassword(email, newPassword) {
  try {
    console.log(`🔐 Resetting password for: ${email}`);
    console.log(`🔑 New password: ${newPassword}`);

    // 1. Get user by email
    const { data: users, error: listError } = await tripwireAdminSupabase.auth.admin.listUsers();
    
    if (listError) {
      throw listError;
    }

    const user = users.users.find(u => u.email === email);
    
    if (!user) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.id}`);

    // 2. Update password
    const { data, error } = await tripwireAdminSupabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (error) {
      throw error;
    }

    console.log(`✅ Password updated successfully for ${email}!`);
    console.log(`🔑 New password: ${newPassword}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Get email and password from command line
const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error('Usage: node test-reset-password.js <email> <password>');
  process.exit(1);
}

resetPassword(email, password);

