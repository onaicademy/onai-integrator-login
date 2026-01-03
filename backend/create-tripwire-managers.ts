// =====================================================
// СОЗДАНИЕ МЕНЕДЖЕРОВ В TRIPWIRE AUTH.USERS
// =====================================================
// Этот скрипт создает записи для менеджеров в auth.users Tripwire БД
// через Supabase Management API (Service Role)
// =====================================================

import { createClient } from '@supabase/supabase-js';

// Конфигурация Tripwire Supabase
const TRIPWIRE_URL = 'https://pjmvxecykysfrzppdcto.supabase.co';
const TRIPWIRE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbXZ4ZWN5a3lzZnJ6cHBkY3RvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDQxOTM1MSwiZXhwIjoyMDQ5OTk1MzUxfQ.WKZ5T4Vw7Y3h3g8X9Z8k8Z8k8Z8k8Z8k8Z8k8Z8k8Z8';

// Создаем Supabase Admin клиент
const supabaseAdmin = createClient(TRIPWIRE_URL, TRIPWIRE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Список менеджеров для создания
const managers = [
  {
    email: 'admin@onai.academy',
    role: 'admin',
    is_sales_manager: true,
    full_name: 'Admin'
  },
  {
    email: 'arystan@onai.academy',
    role: 'targetologist',
    is_sales_manager: true,
    full_name: 'Arystan'
  },
  {
    email: 'muha@onai.academy',
    role: 'targetologist',
    is_sales_manager: true,
    full_name: 'Muha'
  },
  {
    email: 'traft4@onai.academy',
    role: 'targetologist',
    is_sales_manager: true,
    full_name: 'Traft4'
  },
  {
    email: 'kenesary@onai.academy',
    role: 'targetologist',
    is_sales_manager: true,
    full_name: 'Kenesary'
  }
];

// Функция для создания менеджера в auth.users
async function createManager(manager: typeof managers[0]) {
  try {
    console.log(`\n📧 Создание менеджера: ${manager.email}`);
    
    // Проверяем, существует ли уже менеджер
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('auth.users')
      .select('id, email')
      .eq('email', manager.email)
      .single();
    
    if (existingUser) {
      console.log(`  ✅ Менеджер уже существует: ${existingUser.id}`);
      return existingUser.id;
    }

    // Создаем менеджера через Management API
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: manager.email,
      email_confirm: true,
      user_metadata: {
        role: manager.role,
        platform: 'traffic_dashboard',
        is_sales_manager: manager.is_sales_manager,
        full_name: manager.full_name
      },
      password: 'TempPassword123!' // Временный пароль, нужно будет изменить
    });

    if (error) {
      console.error(`  ❌ Ошибка создания менеджера:`, error.message);
      return null;
    }

    if (data.user) {
      console.log(`  ✅ Менеджер создан успешно:`);
      console.log(`     ID: ${data.user.id}`);
      console.log(`     Email: ${data.user.email}`);
      console.log(`     Role: ${data.user.user_metadata.role}`);
      console.log(`     Is Sales Manager: ${data.user.user_metadata.is_sales_manager}`);
      return data.user.id;
    }

    return null;
  } catch (error) {
    console.error(`  ❌ Неожиданная ошибка:`, error);
    return null;
  }
}

// Функция для обновления granted_by в tripwire_users
async function updateGrantedBy(managerEmail: string, managerId: string, managerName: string) {
  try {
    console.log(`\n🔄 Обновление granted_by для менеджера: ${managerName}`);
    
    // Сначала обновляем записи
    const { error: updateError } = await supabaseAdmin
      .from('tripwire_users')
      .update({ granted_by: managerId })
      .eq('manager_name', managerName)
      .or(`manager_name.ilike.%${managerName}%,manager_name.eq.${managerName}`);
    
    if (updateError) {
      console.error(`  ❌ Ошибка обновления granted_by:`, updateError.message);
      return 0;
    }

    // Затем считаем количество обновленных записей
    const { count, error: countError } = await supabaseAdmin
      .from('tripwire_users')
      .select('*', { count: 'exact', head: true })
      .eq('granted_by', managerId);

    if (countError) {
      console.error(`  ❌ Ошибка подсчета записей:`, countError.message);
      return 0;
    }

    console.log(`  ✅ Обновлено записей: ${count || 0}`);
    return count || 0;
  } catch (error) {
    console.error(`  ❌ Неожиданная ошибка:`, error);
    return 0;
  }
}

// Главная функция
async function main() {
  console.log('=====================================================');
  console.log('🚀 СОЗДАНИЕ МЕНЕДЖЕРОВ В TRIPWIRE AUTH.USERS');
  console.log('=====================================================\n');

  const managerIds: { [key: string]: string } = {};

  // Шаг 1: Создаем всех менеджеров в auth.users
  console.log('📋 ШАГ 1: Создание менеджеров в auth.users');
  console.log('=====================================================');
  
  for (const manager of managers) {
    const managerId = await createManager(manager);
    if (managerId) {
      managerIds[manager.email] = managerId;
    }
  }

  // Шаг 2: Обновляем granted_by в tripwire_users
  console.log('\n\n📋 ШАГ 2: Обновление granted_by в tripwire_users');
  console.log('=====================================================');
  
  let totalUpdated = 0;
  for (const manager of managers) {
    const managerId = managerIds[manager.email];
    if (managerId) {
      const updated = await updateGrantedBy(manager.email, managerId, manager.full_name);
      totalUpdated += updated;
    }
  }

  // Шаг 3: Проверка результатов
  console.log('\n\n📋 ШАГ 3: Проверка результатов');
  console.log('=====================================================\n');

  // Проверяем, что все менеджеры созданы
  console.log('📊 Менеджеры в auth.users:');
  const { data: authUsers, error: authError } = await supabaseAdmin
    .from('auth.users')
    .select('id, email, raw_user_meta_data')
    .in('email', managers.map(m => m.email));

  if (authError) {
    console.error('❌ Ошибка получения auth.users:', authError.message);
  } else {
    authUsers?.forEach(user => {
      console.log(`  ✅ ${user.email} (${user.id})`);
      console.log(`     Role: ${user.raw_user_meta_data.role}`);
      console.log(`     Is Sales Manager: ${user.raw_user_meta_data.is_sales_manager}`);
    });
  }

  // Проверяем granted_by в tripwire_users
  console.log('\n📊 Статистика по granted_by:');
  const { data: tripwireStats, error: statsError } = await supabaseAdmin
    .from('tripwire_users')
    .select('manager_name, granted_by')
    .not('granted_by', 'is', null);

  if (statsError) {
    console.error('❌ Ошибка получения статистики:', statsError.message);
  } else {
    const managerCounts: { [key: string]: number } = {};
    tripwireStats?.forEach(student => {
      const managerName = student.manager_name || 'Unknown';
      managerCounts[managerName] = (managerCounts[managerName] || 0) + 1;
    });

    Object.entries(managerCounts).forEach(([manager, count]) => {
      console.log(`  📊 ${manager}: ${count} студентов`);
    });
  }

  // Итоговый отчет
  console.log('\n\n=====================================================');
  console.log('📊 ИТОГОВЫЙ ОТЧЕТ');
  console.log('=====================================================\n');
  console.log(`✅ Создано менеджеров: ${Object.keys(managerIds).length}`);
  console.log(`✅ Обновлено записей tripwire_users: ${totalUpdated}`);
  console.log('\n⚠️  ВАЖНО: Все менеджеры получили временный пароль "TempPassword123!"');
  console.log('⚠️  Нужно изменить пароли при первом входе!');
  console.log('\n=====================================================\n');
}

// Запускаем скрипт
main().catch(console.error);
