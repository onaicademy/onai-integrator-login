import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// ВАЖНО: Загружаем .env ПЕРЕД импортом конфигов
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Создаем Supabase Admin client для Tripwire
const TRIPWIRE_URL = process.env.TRIPWIRE_SUPABASE_URL;
const TRIPWIRE_KEY = process.env.TRIPWIRE_SERVICE_ROLE_KEY;

if (!TRIPWIRE_URL || !TRIPWIRE_KEY) {
  console.error('❌ ERROR: Missing TRIPWIRE_SUPABASE_URL or TRIPWIRE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const tripwireAdminSupabase = createClient(TRIPWIRE_URL, TRIPWIRE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface TripwireUser {
  email: string;
  password: string;
  role: 'admin' | 'sales';
  fullName: string;
}

const TRIPWIRE_USERS: TripwireUser[] = [
  {
    email: 'smmmcwin@gmail.com',
    password: 'Saintcom',
    role: 'admin',
    fullName: 'Alisher Admin',
  },
  {
    email: 'amina@onaiacademy.kz',
    password: 'Amina2134',
    role: 'sales',
    fullName: 'Amina',
  },
  {
    email: 'rakhat@onaiacademy.kz',
    password: 'Rakhat2134',
    role: 'sales',
    fullName: 'Rakhat',
  },
];

async function createOrUpdateTripwireUser(user: TripwireUser) {
  console.log(`\n🔄 Processing: ${user.email} (${user.role})`);
  
  try {
    let userId: string;
    let isNewUser = false;
    
    // 1. Пытаемся создать пользователя
    const { data: newUser, error: createError } = await tripwireAdminSupabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: {
        full_name: user.fullName,
        role: user.role,
        platform: 'tripwire',
      },
    });
    
    if (createError) {
      // Если ошибка "User already registered" - ищем его и обновляем
      if (createError.message.includes('already') || createError.message.includes('duplicate')) {
        console.log(`   ℹ️  User already exists, searching...`);
        
        // Ищем пользователя через listUsers (единственный способ найти по email)
        const { data: usersList, error: listError } = await tripwireAdminSupabase.auth.admin.listUsers();
        
        if (listError) {
          throw new Error(`Failed to list users: ${listError.message}`);
        }
        
        const existingUser = usersList.users.find(u => u.email === user.email);
        
        if (!existingUser) {
          throw new Error(`User ${user.email} should exist but not found in list`);
        }
        
        userId = existingUser.id;
        console.log(`   ℹ️  Found existing user with ID: ${userId}`);
        
        // Обновляем пароль и метаданные
        const { error: updateError } = await tripwireAdminSupabase.auth.admin.updateUserById(userId, {
          password: user.password,
          email_confirm: true,
          user_metadata: {
            full_name: user.fullName,
            role: user.role,
            platform: 'tripwire',
          },
        });
        
        if (updateError) {
          throw new Error(`Failed to update user: ${updateError.message}`);
        }
        
        console.log(`   ✅ Updated auth.users (password + metadata)`);
        
      } else {
        throw new Error(`Failed to create user: ${createError.message}`);
      }
    } else {
      // Пользователь успешно создан
      if (!newUser?.user) {
        throw new Error('No user returned from createUser');
      }
      
      userId = newUser.user.id;
      isNewUser = true;
      console.log(`   ✅ Created new user in auth.users with ID: ${userId}`);
    }
    
    // 2. Проверяем есть ли запись в public.users
    const { data: existingProfile, error: profileCheckError } = await tripwireAdminSupabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (profileCheckError && profileCheckError.code !== 'PGRST116') {
      console.warn(`   ⚠️  Warning checking public.users: ${profileCheckError.message}`);
    }
    
    // 3. Создаем/обновляем запись в public.users
    // Используем trigger который мы создали, но на всякий случай делаем upsert
    await new Promise(resolve => setTimeout(resolve, 1000)); // Даем время trigger сработать
    
    const { error: upsertError } = await tripwireAdminSupabase
      .from('users')
      .upsert({
        id: userId,
        email: user.email,
        full_name: user.fullName,
        role: user.role,
        platform: 'tripwire',
        onboarding_completed: true, // Админам и менеджерам онбординг не нужен
      }, {
        onConflict: 'id',
      });
    
    if (upsertError) {
      // Это может быть ошибка schema cache, но пользователь создан в auth
      console.warn(`   ⚠️  Warning upserting public.users: ${upsertError.message}`);
      console.log(`   ℹ️  User created in auth.users, but public.users may need manual sync`);
    } else {
      console.log(`   ✅ Synced public.users (role: ${user.role}, platform: tripwire)`);
    }
    
    // 4. Итоговая проверка
    console.log(`   ✅ SUCCESS: ${user.fullName} (${user.role})`);
    console.log(`      UUID: ${userId}`);
    console.log(`      Email: ${user.email}`);
    console.log(`      Role: ${user.role}`);
    console.log(`      Platform: tripwire`);
    
    return { success: true, userId, email: user.email };
    
  } catch (error: any) {
    console.error(`   ❌ FAILED: ${user.email}`);
    console.error(`      Error: ${error.message}`);
    return { success: false, email: user.email, error: error.message };
  }
}

async function main() {
  console.log('🚀 TRIPWIRE ADMINS & SALES MANAGERS SEEDING');
  console.log('==========================================');
  console.log(`📊 Target Supabase: ${process.env.TRIPWIRE_SUPABASE_URL}`);
  console.log(`👥 Users to create: ${TRIPWIRE_USERS.length}`);
  console.log('');
  
  // Проверяем что переменные окружения установлены
  if (!process.env.TRIPWIRE_SUPABASE_URL || !process.env.TRIPWIRE_SERVICE_ROLE_KEY) {
    console.error('❌ ERROR: Missing TRIPWIRE_SUPABASE_URL or TRIPWIRE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }
  
  const results = [];
  
  for (const user of TRIPWIRE_USERS) {
    const result = await createOrUpdateTripwireUser(user);
    results.push(result);
  }
  
  console.log('\n==========================================');
  console.log('📊 FINAL RESULTS:');
  console.log('==========================================\n');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  successful.forEach(r => {
    console.log(`   - ${r.email} (UUID: ${r.userId})`);
  });
  
  if (failed.length > 0) {
    console.log(`\n❌ Failed: ${failed.length}/${results.length}`);
    failed.forEach(r => {
      console.log(`   - ${r.email}: ${r.error}`);
    });
  }
  
  console.log('\n==========================================');
  console.log('🎯 NEXT STEPS:');
  console.log('==========================================');
  console.log('1. Login to Tripwire Manager: https://onai.academy/admin/tripwire-manager');
  console.log('2. Use credentials:');
  console.log('   - Alisher (Admin): smmmcwin@gmail.com / Saintcom');
  console.log('   - Amina (Sales): amina@onaiacademy.kz / Amina2134');
  console.log('   - Rakhat (Sales): rakhat@onaiacademy.kz / Rakhat2134');
  console.log('');
  console.log('✅ Seeding complete!');
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

