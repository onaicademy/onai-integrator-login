/**
 * TRIPWIRE SERVICE
 * 
 * ✅ ИЗОЛИРОВАННАЯ БАЗА ДАННЫХ: Использует tripwireAdminSupabase
 * ✅ Все операции с Tripwire пользователями и контентом
 * ✅ Отдельный проект Supabase для полной изоляции
 */

import { tripwireAdminSupabase } from '../../config/supabase-tripwire';

/**
 * Создать нового Tripwire пользователя
 * (Вызывается Sales Manager'ом)
 */
export async function createTripwireUser(data: {
  email: string;
  full_name: string;
  password: string;
  granted_by: string; // UUID менеджера
  manager_name: string;
}) {
  try {
    console.log('🔧 [TripwireService] Creating Tripwire user:', data.email);

    // 1. Создаём пользователя в Supabase Auth (Tripwire База)
    const { data: authData, error: authError } = await tripwireAdminSupabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.full_name,
        role: 'student',
      },
    });

    if (authError) {
      console.error('❌ [TripwireService] Auth error:', authError);
      throw authError;
    }

    console.log('✅ [TripwireService] User created in auth.users:', authData.user.id);

    // 2. Создаём запись в public.users
    const { error: usersError } = await tripwireAdminSupabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: data.email,
        full_name: data.full_name,
        role: 'student',
        platform: 'tripwire',
      });

    if (usersError) {
      console.error('❌ [TripwireService] Users table error:', usersError);
      throw usersError;
    }

    // 3. Создаём запись в tripwire_users (метаданные)
    const { error: tripwireUsersError } = await tripwireAdminSupabase
      .from('tripwire_users')
      .insert({
        user_id: authData.user.id,
        email: data.email,
        full_name: data.full_name,
        granted_by: data.granted_by,
        manager_name: data.manager_name,
        generated_password: data.password,
        status: 'active',
      });

    if (tripwireUsersError) {
      console.error('❌ [TripwireService] Tripwire users table error:', tripwireUsersError);
      throw tripwireUsersError;
    }

    // 4. Создаём профиль
    const { error: profileError } = await tripwireAdminSupabase
      .from('tripwire_user_profile')
      .insert({
        user_id: authData.user.id,
        modules_completed: 0,
        total_modules: 3,
        completion_percentage: 0,
        certificate_issued: false,
      });

    if (profileError) {
      console.error('❌ [TripwireService] Profile error:', profileError);
      throw profileError;
    }

    // 5. Создаём 3 достижения (заблокированные)
    const achievements = [
      { achievement_type: 'module_1_completed', title: 'Первый шаг', description: 'Завершите первый модуль', icon: '🎯' },
      { achievement_type: 'module_2_completed', title: 'GPT Мастер', description: 'Завершите второй модуль', icon: '🚀' },
      { achievement_type: 'module_3_completed', title: 'Вирусный Создатель', description: 'Завершите третий модуль', icon: '⚡' },
    ];

    const { error: achievementsError } = await tripwireAdminSupabase
      .from('tripwire_achievements')
      .insert(achievements.map(ach => ({
        user_id: authData.user.id,
        ...ach,
        unlocked: false,
      })));

    if (achievementsError) {
      console.error('❌ [TripwireService] Achievements error:', achievementsError);
      throw achievementsError;
    }

    console.log('✅ [TripwireService] Tripwire user fully created:', authData.user.id);

    return {
      success: true,
      user_id: authData.user.id,
      email: data.email,
    };
  } catch (error: any) {
    console.error('❌ [TripwireService] Critical error:', error);
    throw error;
  }
}

/**
 * Получить список всех Tripwire пользователей
 */
export async function getTripwireUsers() {
  const { data, error } = await tripwireAdminSupabase
    .from('tripwire_users')
    .select(`
      *,
      user_profile:tripwire_user_profile!user_id(*)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Обновить статус Tripwire пользователя
 */
export async function updateTripwireUserStatus(userId: string, status: 'active' | 'inactive' | 'completed' | 'blocked') {
  const { error } = await tripwireAdminSupabase
    .from('tripwire_users')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('user_id', userId);

  if (error) throw error;
  return { success: true };
}

/**
 * Получить статистику Tripwire
 */
export async function getTripwireStats() {
  const { data: users, error } = await tripwireAdminSupabase
    .from('tripwire_users')
    .select('status, modules_completed');

  if (error) throw error;

  const stats = {
    total: users?.length || 0,
    active: users?.filter(u => u.status === 'active').length || 0,
    completed: users?.filter(u => u.status === 'completed').length || 0,
    avg_progress: users?.reduce((sum, u) => sum + (u.modules_completed || 0), 0) / (users?.length || 1),
  };

  return stats;
}

