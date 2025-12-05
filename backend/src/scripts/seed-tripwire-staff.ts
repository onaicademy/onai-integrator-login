/**
 * TRIPWIRE DB SEED SCRIPT v2
 * Создание/Обновление ключевых сотрудников в изолированной базе Tripwire
 * 
 * Работает через UPSERT - безопасно для повторного запуска
 * Запуск: npx tsx src/scripts/seed-tripwire-staff.ts
 */

// ✅ Загружаем .env ПЕРЕД импортом конфигураций
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { tripwireAdminSupabase } from '../config/supabase-tripwire';

interface StaffMember {
  email: string;
  password: string;
  full_name: string;
  role: 'admin' | 'sales';
  tripwire_modules_completed?: number;
}

const STAFF_MEMBERS: StaffMember[] = [
  // 👤 1. SUPER ADMIN (CEO)
  {
    email: 'smmmcwin@gmail.com',
    password: 'Saintcom',
    full_name: 'Alexander CEO',
    role: 'admin',
    tripwire_modules_completed: 3,
  },
  
  // 👤 2. SALES MANAGER 1
  {
    email: 'amina@onaiacademy.kz',
    password: 'Amina2134',
    full_name: 'Amina Sales',
    role: 'sales',
  },
  
  // 👤 3. SALES MANAGER 2
  {
    email: 'rakhat@onaiacademy.kz',
    password: 'Rakhat2134',
    full_name: 'Rakhat Sales',
    role: 'sales',
  },
];

/**
 * Создать или обновить сотрудника
 */
async function upsertStaffMember(member: StaffMember): Promise<void> {
  const { email, password, full_name, role, tripwire_modules_completed } = member;
  
  console.log(`\n📝 Обрабатываем: ${full_name} (${email}) - роль: ${role}`);
  
  try {
    // 1. Проверяем, существует ли пользователь в auth.users
    const { data: userData } = await tripwireAdminSupabase.auth.admin.listUsers();
    let existingUser = userData?.users.find(u => u.email === email);
    
    let userId: string;
    
    if (existingUser) {
      console.log(`✅ Пользователь существует в auth.users: ${existingUser.id}`);
      userId = existingUser.id;
      
      // Обновляем metadata если нужно
      const { error: updateError } = await tripwireAdminSupabase.auth.admin.updateUserById(userId, {
        email: email,
        password: password, // Обновляем пароль на правильный
        email_confirm: true,
        user_metadata: {
          full_name: full_name,
          platform: 'tripwire',
          role: role,
        },
      });
      
      if (updateError) {
        console.warn(`⚠️  Предупреждение при обновлении metadata:`, updateError.message);
      } else {
        console.log(`✅ Metadata обновлены`);
      }
      
    } else {
      // Создаем нового пользователя
      const { data: newUser, error: authError } = await tripwireAdminSupabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: full_name,
          platform: 'tripwire',
          role: role,
        },
      });
      
      if (authError || !newUser?.user) {
        throw new Error(`Auth error: ${authError?.message}`);
      }
      
      userId = newUser.user.id;
      console.log(`✅ Создан новый пользователь в auth.users: ${userId}`);
    }
    
    // 2. Ждем срабатывания триггера
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 3. Обновляем public.users (на случай если триггер не сработал или данные неправильные)
    const { error: usersError } = await tripwireAdminSupabase
      .from('users')
      .upsert({
        id: userId,
        email: email,
        full_name: full_name,
        role: role,
        platform: 'tripwire',
      }, { onConflict: 'id' });
    
    if (usersError) {
      console.error(`⚠️  Ошибка upsert в public.users:`, usersError.message);
    } else {
      console.log(`✅ Запись в public.users синхронизирована`);
    }
    
    // 4. Для CEO: создаем tripwire_user_profile
    if (role === 'admin' && tripwire_modules_completed) {
      console.log(`📊 Создаём Tripwire профиль для ${full_name}...`);
      
      const { error: profileError } = await tripwireAdminSupabase
        .from('tripwire_user_profile')
        .upsert({
          user_id: userId,
          modules_completed: tripwire_modules_completed,
          total_modules: 3,
          completion_percentage: 100,
          certificate_issued: false,
        }, { onConflict: 'user_id' });
      
      if (profileError) {
        console.error(`⚠️  Ошибка upsert tripwire_user_profile:`, profileError.message);
      } else {
        console.log(`✅ Tripwire профиль создан: ${tripwire_modules_completed}/3 модулей`);
      }
      
      // Получаем уроки Tripwire для отметки завершения
      const { data: lessons } = await tripwireAdminSupabase
        .from('lessons')
        .select('id, module_id')
        .in('module_id', [16, 17, 18]);
      
      if (lessons && lessons.length > 0) {
        console.log(`📚 Отмечаем ${lessons.length} уроков как завершенные для CEO...`);
        
        const progressRecords = lessons.map(lesson => ({
          tripwire_user_id: userId,
          lesson_id: lesson.id,
          module_id: lesson.module_id,
          is_completed: true,
          completion_percentage: 100,
          video_progress_percent: 100,
          completed_at: new Date().toISOString(),
        }));
        
        const { error: progressError } = await tripwireAdminSupabase
          .from('tripwire_progress')
          .upsert(progressRecords, { onConflict: 'tripwire_user_id,lesson_id' });
        
        if (progressError) {
          console.error(`⚠️  Ошибка upsert tripwire_progress:`, progressError.message);
        } else {
          console.log(`✅ Прогресс создан для ${lessons.length} уроков`);
        }
      } else {
        console.log(`ℹ️  Уроки модулей 16, 17, 18 не найдены (будут добавлены позже)`);
      }
    }
    
    // 5. Для Sales: создаем запись в tripwire_users (метаданные для Sales Dashboard)
    if (role === 'sales') {
      console.log(`💼 Создаём запись Sales Manager в tripwire_users...`);
      
      const { error: tripwireError } = await tripwireAdminSupabase
        .from('tripwire_users')
        .upsert({
          user_id: userId,
          full_name: full_name,
          email: email,
          granted_by: null,
          manager_name: 'System Administrator',
          generated_password: password,
          password_changed: true, // Sales менеджеры используют постоянные пароли
          status: 'active',
        }, { onConflict: 'email' });
      
      if (tripwireError) {
        console.warn(`⚠️  Предупреждение tripwire_users:`, tripwireError.message);
      } else {
        console.log(`✅ Запись Sales Manager синхронизирована`);
      }
    }
    
    console.log(`🎉 ${full_name} успешно обработан!`);
    
  } catch (error: any) {
    console.error(`❌ Ошибка обработки ${email}:`, error.message);
    throw error;
  }
}

/**
 * Главная функция
 */
async function seedTripwireStaff(): Promise<void> {
  console.log('\n🚀 TRIPWIRE STAFF SEED v2 (UPSERT MODE)');
  console.log('='.repeat(60));
  console.log(`👥 Обрабатываем ${STAFF_MEMBERS.length} сотрудников...`);
  
  try {
    // Создаем/обновляем всех сотрудников последовательно
    for (const member of STAFF_MEMBERS) {
      await upsertStaffMember(member);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ ГОТОВО! Все сотрудники синхронизированы.');
    console.log('\n📋 Данные для входа:');
    console.log('━'.repeat(60));
    
    STAFF_MEMBERS.forEach(member => {
      console.log(`${member.full_name} (${member.role.toUpperCase()}):`);
      console.log(`  Email:    ${member.email}`);
      console.log(`  Password: ${member.password}`);
      console.log('');
    });
    
    console.log('━'.repeat(60));
    console.log('✨ Пользователи синхронизированы. Можно логиниться.\n');
    
  } catch (error: any) {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА:', error.message);
    process.exit(1);
  }
}

// Запуск
seedTripwireStaff();
