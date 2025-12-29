/**
 * СОЗДАНИЕ СТУДЕНТА Tacher12122005@gmail.com В TRIPWIRE
 * Использует Supabase Management API для создания auth.users
 * Затем заполняет все необходимые таблицы
 */

const { createClient } = require('@supabase/supabase-js');

// Конфигурация Supabase Tripwire
const SUPABASE_URL = 'https://pjmvxecykysfrzppdcto.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbXZ4ZWN5a3lzZnJ6cHBkY3RvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc5NTMwOCwiZXhwIjoyMDgwMzcxMzA4fQ.QB_iIKt06nqa0owpVtKwKXmDwFInuy9mOyALf3VgWyk';

// Создаем Supabase клиент с service_role ключом
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Данные студента
const studentData = {
  email: 'Tacher12122005@gmail.com',
  password: 'Tripwire2024!',
  full_name: 'Ильязов Микаэль',
  role: 'student'
};

async function createStudent() {
  console.log('🚀 Начинаем создание студента Tripwire...');
  console.log('📧 Email:', studentData.email);
  console.log('👤 Full Name:', studentData.full_name);
  console.log('');

  try {
    // ============================================
    // 1. Создание пользователя в auth.users
    // ============================================
    console.log('📝 Шаг 1: Создание пользователя в auth.users...');
    
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: studentData.email,
      password: studentData.password,
      email_confirm: true,
      user_metadata: {
        full_name: studentData.full_name,
        role: studentData.role
      }
    });

    if (authError) {
      console.error('❌ Ошибка при создании пользователя в auth.users:', authError);
      throw authError;
    }

    const userId = authData.user.id;
    console.log('✅ Пользователь создан в auth.users');
    console.log('🆔 User ID:', userId);
    console.log('');

    // ============================================
    // 2. Создание записи в public.users
    // ============================================
    console.log('📝 Шаг 2: Создание записи в public.users...');
    
    const { error: usersError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: studentData.email,
        full_name: studentData.full_name,
        role: studentData.role
      });

    if (usersError) {
      console.error('❌ Ошибка при создании записи в public.users:', usersError);
      throw usersError;
    }

    console.log('✅ Запись создана в public.users');
    console.log('');

    // ============================================
    // 3. Создание записи в tripwire_users
    // ============================================
    console.log('📝 Шаг 3: Создание записи в tripwire_users...');
    
    const { error: tripwireUsersError } = await supabase
      .from('tripwire_users')
      .insert({
        id: crypto.randomUUID(), // tripwire_users.id - это отдельный UUID
        user_id: userId,
        full_name: studentData.full_name,
        email: studentData.email,
        granted_by: null,
        manager_name: 'System',
        generated_password: studentData.password,
        password_changed: false,
        welcome_email_sent: false,
        welcome_email_sent_at: null,
        email_opened: false,
        first_login_at: null,
        last_active_at: null,
        modules_completed: 0,
        status: 'active',
        price: 5000,
        onboarding_completed: false,
        onboarding_completed_at: null
      });

    if (tripwireUsersError) {
      console.error('❌ Ошибка при создании записи в tripwire_users:', tripwireUsersError);
      throw tripwireUsersError;
    }

    console.log('✅ Запись создана в tripwire_users');
    console.log('');

    // ============================================
    // 4. Создание записи в tripwire_user_profile
    // ============================================
    console.log('📝 Шаг 4: Создание записи в tripwire_user_profile...');
    
    const { error: profileError } = await supabase
      .from('tripwire_user_profile')
      .insert({
        user_id: userId,
        modules_completed: 0,
        total_modules: 3,
        completion_percentage: 0,
        certificate_issued: false,
        certificate_url: null,
        added_by_manager_id: null,
        full_name: studentData.full_name
      });

    if (profileError) {
      console.error('❌ Ошибка при создании записи в tripwire_user_profile:', profileError);
      throw profileError;
    }

    console.log('✅ Запись создана в tripwire_user_profile');
    console.log('');

    // ============================================
    // 5. Разблокировка модулей (16, 17, 18)
    // ============================================
    console.log('📝 Шаг 5: Разблокировка модулей (16, 17, 18)...');
    
    const modules = [16, 17, 18];
    for (const moduleId of modules) {
      const { error: moduleError } = await supabase
        .from('module_unlocks')
        .insert({
          user_id: userId,
          module_id: moduleId,
          unlocked_at: new Date().toISOString()
        });

      if (moduleError) {
        console.error(`❌ Ошибка при разблокировке модуля ${moduleId}:`, moduleError);
        throw moduleError;
      }
    }

    console.log('✅ Все модули разблокированы');
    console.log('');

    // ============================================
    // 6. Создание записей в student_progress (уроки 67, 68, 69)
    // ============================================
    console.log('📝 Шаг 6: Создание записей в student_progress...');
    
    const lessons = [
      { module_id: 16, lesson_id: 67 },
      { module_id: 17, lesson_id: 68 },
      { module_id: 18, lesson_id: 69 }
    ];

    for (const lesson of lessons) {
      const { error: progressError } = await supabase
        .from('student_progress')
        .insert({
          user_id: userId,
          module_id: lesson.module_id,
          lesson_id: lesson.lesson_id,
          status: 'not_started',
          started_at: null,
          completed_at: null
        });

      if (progressError) {
        console.error(`❌ Ошибка при создании прогресса для урока ${lesson.lesson_id}:`, progressError);
        throw progressError;
      }
    }

    console.log('✅ Записи созданы в student_progress');
    console.log('');

    // ============================================
    // 7. Создание записей в video_tracking
    // ============================================
    console.log('📝 Шаг 7: Создание записей в video_tracking...');
    
    for (const lesson of lessons) {
      const { error: trackingError } = await supabase
        .from('video_tracking')
        .insert({
          user_id: userId,
          lesson_id: lesson.lesson_id,
          watched_segments: [],
          total_watched_seconds: 0,
          video_duration_seconds: 0,
          watch_percentage: 0,
          last_position_seconds: 0,
          is_qualified_for_completion: false
        });

      if (trackingError) {
        console.error(`❌ Ошибка при создании tracking для урока ${lesson.lesson_id}:`, trackingError);
        throw trackingError;
      }
    }

    console.log('✅ Записи созданы в video_tracking');
    console.log('');

    // ============================================
    // 8. Создание записей в user_achievements
    // ============================================
    console.log('📝 Шаг 8: Создание записей в user_achievements...');
    
    const achievements = [
      'first_module_complete',
      'second_module_complete',
      'third_module_complete',
      'tripwire_graduate'
    ];

    for (const achievementId of achievements) {
      const { error: achievementError } = await supabase
        .from('user_achievements')
        .insert({
          user_id: userId,
          achievement_id: achievementId,
          current_value: 0,
          required_value: 1,
          is_completed: false,
          completed_at: null
        });

      if (achievementError) {
        console.error(`❌ Ошибка при создании достижения ${achievementId}:`, achievementError);
        throw achievementError;
      }
    }

    console.log('✅ Записи созданы в user_achievements');
    console.log('');

    // ============================================
    // 9. Создание записи в user_statistics
    // ============================================
    console.log('📝 Шаг 9: Создание записи в user_statistics...');
    
    const { error: statsError } = await supabase
      .from('user_statistics')
      .insert({
        user_id: userId,
        lessons_completed: 0,
        total_time_spent: 0
      });

    if (statsError) {
      console.error('❌ Ошибка при создании записи в user_statistics:', statsError);
      throw statsError;
    }

    console.log('✅ Запись создана в user_statistics');
    console.log('');

    // ============================================
    // 10. Создание записей в tripwire_progress
    // ============================================
    console.log('📝 Шаг 10: Создание записей в tripwire_progress...');
    
    for (const lesson of lessons) {
      const { error: tripwireProgressError } = await supabase
        .from('tripwire_progress')
        .insert({
          tripwire_user_id: userId,
          module_id: lesson.module_id,
          lesson_id: lesson.lesson_id,
          is_completed: false,
          watch_time_seconds: 0,
          started_at: null,
          completed_at: null,
          video_qualified_for_completion: false,
          video_progress_percent: 0,
          last_position_seconds: 0
        });

      if (tripwireProgressError) {
        console.error(`❌ Ошибка при создании tripwire_progress для урока ${lesson.lesson_id}:`, tripwireProgressError);
        throw tripwireProgressError;
      }
    }

    console.log('✅ Записи созданы в tripwire_progress');
    console.log('');

    // ============================================
    // 11. Логирование действия в sales_activity_log
    // ============================================
    console.log('📝 Шаг 11: Логирование действия в sales_activity_log...');
    
    const { error: logError } = await supabase
      .from('sales_activity_log')
      .insert({
        manager_id: null,
        action_type: 'student_created',
        target_user_id: userId,
        details: {
          email: studentData.email,
          full_name: studentData.full_name,
          manager_name: 'System',
          created_via: 'Direct Node.js Script',
          generated_password: studentData.password
        }
      });

    if (logError) {
      console.error('❌ Ошибка при логировании действия:', logError);
      throw logError;
    }

    console.log('✅ Действие залогировано');
    console.log('');

    // ============================================
    // 12. Проверка созданных записей
    // ============================================
    console.log('📝 Шаг 12: Проверка созданных записей...');
    
    const tables = [
      { name: 'public.users', query: supabase.from('users').select('*').eq('email', studentData.email) },
      { name: 'tripwire_users', query: supabase.from('tripwire_users').select('*').eq('email', studentData.email) },
      { name: 'tripwire_user_profile', query: supabase.from('tripwire_user_profile').select('*').eq('user_id', userId) },
      { name: 'module_unlocks', query: supabase.from('module_unlocks').select('*').eq('user_id', userId) },
      { name: 'student_progress', query: supabase.from('student_progress').select('*').eq('user_id', userId) },
      { name: 'video_tracking', query: supabase.from('video_tracking').select('*').eq('user_id', userId) },
      { name: 'user_achievements', query: supabase.from('user_achievements').select('*').eq('user_id', userId) },
      { name: 'user_statistics', query: supabase.from('user_statistics').select('*').eq('user_id', userId) },
      { name: 'tripwire_progress', query: supabase.from('tripwire_progress').select('*').eq('tripwire_user_id', userId) },
      { name: 'sales_activity_log', query: supabase.from('sales_activity_log').select('*').eq('target_user_id', userId) }
    ];

    for (const table of tables) {
      const { data, error } = await table.query;
      const count = data ? data.length : 0;
      console.log(`✅ ${table.name}: ${count} записей`);
      if (error) {
        console.error(`   ❌ Ошибка:`, error.message);
      }
    }

    console.log('');
    console.log('============================================');
    console.log('🎉 СТУДЕНТ УСПЕШНО СОЗДАН!');
    console.log('============================================');
    console.log('');
    console.log('📧 Email:', studentData.email);
    console.log('🔑 Password:', studentData.password);
    console.log('🆔 User ID:', userId);
    console.log('');
    console.log('📋 Чек-лист завершения:');
    console.log('  [✅] Пользователь создан в auth.users');
    console.log('  [✅] Запись создана в public.users');
    console.log('  [✅] Запись создана в tripwire_users');
    console.log('  [✅] Запись создана в tripwire_user_profile');
    console.log('  [✅] Модули 16, 17, 18 разблокированы');
    console.log('  [✅] Прогресс создан для уроков 67, 68, 69');
    console.log('  [✅] Video tracking создан для уроков 67, 68, 69');
    console.log('  [✅] Достижения созданы');
    console.log('  [✅] Статистика создана');
    console.log('  [✅] Tripwire прогресс создан');
    console.log('  [✅] Действие залогировано');
    console.log('');
    console.log('⏭️  Следующие шаги:');
    console.log('  1. Отправить welcome email через Resend API');
    console.log('  2. Проверить, что пользователь может войти в систему');
    console.log('  3. Убедиться, что все уроки доступны');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('============================================');
    console.error('❌ ОШИБКА ПРИ СОЗДАНИИ СТУДЕНТА!');
    console.error('============================================');
    console.error('');
    console.error('Детали ошибки:', error);
    console.error('');
    process.exit(1);
  }
}

// Запуск
createStudent();
