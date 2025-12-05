/**
 * Устанавливаем role=sales для Amina в Tripwire Auth через Admin API
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const tripwireUrl = process.env.TRIPWIRE_SUPABASE_URL;
const tripwireServiceKey = process.env.TRIPWIRE_SERVICE_ROLE_KEY;

if (!tripwireUrl || !tripwireServiceKey) {
  console.error('❌ Missing TRIPWIRE env vars!');
  process.exit(1);
}

const admin = createClient(tripwireUrl, tripwireServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function setRole() {
  try {
    // 1. Получаем пользователя по email
    const { data: users } = await admin.auth.admin.listUsers();
    const amina = users.users.find(u => u.email === 'amina@onaiacademy.kz');
    
    if (!amina) {
      console.error('❌ Amina not found in auth.users!');
      process.exit(1);
    }

    console.log('✅ Found Amina:', amina.id, amina.email);

    // 2. Обновляем user_metadata
    const { data, error } = await admin.auth.admin.updateUserById(amina.id, {
      user_metadata: {
        ...amina.user_metadata,
        role: 'sales',
      },
    });

    if (error) {
      console.error('❌ Error updating role:', error);
      process.exit(1);
    }

    console.log('✅ Role updated successfully!');
    console.log('   User ID:', data.user.id);
    console.log('   Email:', data.user.email);
    console.log('   Role:', data.user.user_metadata.role);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

setRole();

