/**
 * 🔍 ПРОВЕРКА ЗАЧИСТКИ TRIPWIRE БД
 * Проверяем что все следы студентов удалены
 */

import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(__dirname, '../env.env') });

const supabaseUrl = process.env.TRIPWIRE_SUPABASE_URL!;
const supabaseKey = process.env.TRIPWIRE_SERVICE_ROLE_KEY || process.env.TRIPWIRE_SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCleanup() {
  console.log('🔍 ПРОВЕРКА ЗАЧИСТКИ TRIPWIRE БД\n');
  console.log('='.repeat(80));

  try {
    // 1. tripwire_users
    console.log('\n📊 1. tripwire_users (студенты):');
    const { data: users, error: usersError } = await supabase
      .from('tripwire_users')
      .select('*');
    
    if (usersError) throw usersError;
    
    console.log(`   Найдено: ${users?.length || 0} записей`);
    if (users && users.length > 0) {
      console.log('   ⚠️  Есть записи! Список:');
      users.forEach((u: any) => {
        console.log(`      - ${u.email} (ID: ${u.id})`);
      });
    } else {
      console.log('   ✅ Пусто');
    }

    // 2. tripwire_progress
    console.log('\n📊 2. tripwire_progress (прогресс):');
    const { data: progress, error: progressError } = await supabase
      .from('tripwire_progress')
      .select('*');
    
    if (progressError) throw progressError;
    
    console.log(`   Найдено: ${progress?.length || 0} записей`);
    if (progress && progress.length > 0) {
      console.log('   ⚠️  Есть записи!');
      progress.slice(0, 5).forEach((p: any) => {
        console.log(`      - User: ${p.user_id}, Lesson: ${p.lesson_id}`);
      });
      if (progress.length > 5) console.log(`      ... и ещё ${progress.length - 5}`);
    } else {
      console.log('   ✅ Пусто');
    }

    // 3. module_unlocks
    console.log('\n📊 3. module_unlocks (разблокировки):');
    const { data: unlocks, error: unlocksError } = await supabase
      .from('module_unlocks')
      .select('*');
    
    if (unlocksError) throw unlocksError;
    
    console.log(`   Найдено: ${unlocks?.length || 0} записей`);
    if (unlocks && unlocks.length > 0) {
      console.log('   ⚠️  Есть записи!');
    } else {
      console.log('   ✅ Пусто');
    }

    // 4. user_achievements
    console.log('\n📊 4. user_achievements (достижения):');
    const { data: achievements, error: achievementsError } = await supabase
      .from('user_achievements')
      .select('*');
    
    if (achievementsError) throw achievementsError;
    
    console.log(`   Найдено: ${achievements?.length || 0} записей`);
    if (achievements && achievements.length > 0) {
      console.log('   ⚠️  Есть записи!');
    } else {
      console.log('   ✅ Пусто');
    }

    // 5. certificates
    console.log('\n📊 5. certificates (сертификаты):');
    const { data: certificates, error: certificatesError } = await supabase
      .from('certificates')
      .select('*');
    
    if (certificatesError) throw certificatesError;
    
    console.log(`   Найдено: ${certificates?.length || 0} записей`);
    if (certificates && certificates.length > 0) {
      console.log('   ⚠️  Есть записи!');
      certificates.forEach((c: any) => {
        console.log(`      - ${c.user_email} (№${c.certificate_number})`);
      });
    } else {
      console.log('   ✅ Пусто');
    }

    // 6. tripwire_user_profile
    console.log('\n📊 6. tripwire_user_profile (профили):');
    const { data: profiles, error: profilesError } = await supabase
      .from('tripwire_user_profile')
      .select('*');
    
    if (profilesError) throw profilesError;
    
    console.log(`   Найдено: ${profiles?.length || 0} записей`);
    if (profiles && profiles.length > 0) {
      console.log('   ⚠️  Есть записи!');
    } else {
      console.log('   ✅ Пусто');
    }

    // 7. sales_activity_log (история - это нормально что есть)
    console.log('\n📊 7. sales_activity_log (история действий):');
    const { data: logs, error: logsError } = await supabase
      .from('sales_activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (logsError) throw logsError;
    
    console.log(`   Найдено: ${logs?.length || 0} записей (последние 10)`);
    console.log('   ℹ️  История действий сохраняется для аудита - это нормально');

    // 8. auth.users (должны быть только 3)
    console.log('\n📊 8. auth.users (аутентификация):');
    const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();
    
    console.log(`   Найдено: ${authUsers.length} пользователей`);
    authUsers.forEach((u: any) => {
      console.log(`      ✅ ${u.email}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ ПРОВЕРКА ЗАВЕРШЕНА!\n');

  } catch (error: any) {
    console.error('\n❌ ОШИБКА:', error.message);
    process.exit(1);
  }
}

checkCleanup().then(() => process.exit(0));
