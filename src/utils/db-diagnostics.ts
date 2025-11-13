/**
 * 🔍 ДИАГНОСТИКА БАЗЫ ДАННЫХ
 * Проверка структуры таблиц и RLS политик
 */

import { supabase } from '@/lib/supabase';

export async function runDatabaseDiagnostics() {
  console.log('🔍 ===== ДИАГНОСТИКА БД НАЧАТА =====');
  
  try {
    // 1. Проверка таблицы profiles
    console.log('\n📊 1. Проверка таблицы PROFILES:');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, role, is_active, account_expires_at, created_at')
      .limit(5);
    
    if (profilesError) {
      console.error('❌ Ошибка чтения profiles:', profilesError);
    } else {
      console.log(`✅ Найдено профилей: ${profiles?.length || 0}`);
      console.table(profiles);
    }

    // 2. Проверка таблицы student_profiles
    console.log('\n📊 2. Проверка таблицы STUDENT_PROFILES:');
    const { data: studentProfiles, error: studentError } = await supabase
      .from('student_profiles')
      .select('id, full_name, phone, created_at')
      .limit(5);
    
    if (studentError) {
      console.error('❌ Ошибка чтения student_profiles:', studentError);
    } else {
      console.log(`✅ Найдено студентов: ${studentProfiles?.length || 0}`);
      console.table(studentProfiles);
    }

    // 3. Проверка текущей сессии
    console.log('\n🔐 3. Проверка текущей сессии:');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Ошибка getSession():', sessionError);
    } else if (session) {
      console.log('✅ Сессия активна:');
      console.log('  - Email:', session.user.email);
      console.log('  - ID:', session.user.id);
      console.log('  - Token expires:', new Date(session.expires_at! * 1000).toLocaleString());
      
      // Проверяем роль из JWT токена
      try {
        const payload = JSON.parse(atob(session.access_token.split('.')[1]));
        console.log('  - JWT user_role:', payload.user_role || 'НЕ УКАЗАНА');
        console.log('  - JWT user_metadata:', payload.user_metadata);
      } catch (e) {
        console.warn('⚠️ Не удалось распарсить JWT:', e);
      }
    } else {
      console.log('ℹ️ Сессия отсутствует (пользователь не залогинен)');
    }

    // 4. Проверка таблицы auth.users (через RPC или админский запрос)
    console.log('\n👤 4. Проверка auth.users (если есть права):');
    const { data: authUsers, error: authError } = await supabase.rpc('get_auth_users_count');
    
    if (authError) {
      console.warn('⚠️ Не удалось получить auth.users:', authError.message);
      console.log('ℹ️ Это нормально если нет функции get_auth_users_count');
    } else {
      console.log(`✅ Пользователей в auth.users: ${authUsers}`);
    }

    // 5. Проверка RLS политик (проверим можем ли создавать/обновлять)
    console.log('\n🔒 5. Проверка RLS политик:');
    
    // Тест SELECT (должен работать для всех по политике "Anyone can view profiles")
    const { error: selectError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    console.log(selectError ? '❌ SELECT заблокирован RLS' : '✅ SELECT разрешён');

    // Тест UPDATE (должен работать только для своего профиля)
    if (session) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', session.user.id);
      
      console.log(updateError ? `⚠️ UPDATE своего профиля: ${updateError.message}` : '✅ UPDATE своего профиля разрешён');
    }

    // 6. Проверка структуры колонок
    console.log('\n📋 6. Структура таблицы profiles:');
    const { data: sampleProfile } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)
      .single();
    
    if (sampleProfile) {
      console.log('Колонки в profiles:');
      console.log(Object.keys(sampleProfile).join(', '));
    }

    console.log('\n✅ ===== ДИАГНОСТИКА ЗАВЕРШЕНА =====\n');
    
    return {
      success: true,
      profilesCount: profiles?.length || 0,
      studentProfilesCount: studentProfiles?.length || 0,
      hasSession: !!session,
      sessionEmail: session?.user.email,
    };
    
  } catch (error) {
    console.error('💥 КРИТИЧЕСКАЯ ОШИБКА В ДИАГНОСТИКЕ:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// SQL запрос для проверки RLS политик (выполняется через Supabase Dashboard)
export const CHECK_RLS_POLICIES_SQL = `
-- Проверка RLS политик на таблице profiles
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
`;

// SQL запрос для проверки структуры таблиц
export const CHECK_TABLE_STRUCTURE_SQL = `
-- Проверка структуры таблицы profiles
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND table_schema = 'public'
ORDER BY ordinal_position;
`;

// SQL запрос для проверки пользователей
export const CHECK_USERS_SQL = `
-- Проверка пользователей (profiles + auth.users)
SELECT 
  p.id,
  p.email,
  p.role,
  p.is_active,
  p.account_expires_at,
  p.created_at,
  (SELECT email FROM auth.users WHERE id = p.id) as auth_email
FROM profiles p
ORDER BY p.created_at DESC
LIMIT 10;
`;

