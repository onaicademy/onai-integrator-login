import { tripwireAdminSupabase } from '../config/supabase-tripwire'; // 🔥 НОВЫЙ КЛИЕНТ
import crypto from 'crypto';
import { sendWelcomeEmail } from './emailService';
import { tripwirePool } from '../config/tripwire-db'; // 🔥 DIRECT POSTGRES CONNECTION!

/**
 * Sales Manager Service - создание и управление Tripwire пользователями
 * 
 * ✅ ИЗОЛИРОВАННАЯ БАЗА ДАННЫХ: Использует tripwireAdminSupabase
 * ✅ Все операции создания пользователей выполняются в ОТДЕЛЬНОМ Supabase проекте
 */

interface CreateTripwireUserParams {
  full_name: string;
  email: string;
  password: string; // Пароль из формы или автогенерированный
  currentUserId: string;
  currentUserEmail?: string;
  currentUserName?: string;
}

interface GetTripwireUsersParams {
  managerId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

/**
 * Генерирует безопасный временный пароль
 */
function generateTemporaryPassword(): string {
  // Генерируем 12 случайных символов
  return crypto.randomBytes(6).toString('hex'); // Например: "a7b3c9d1e5f2"
}

/**
 * Создает нового Tripwire пользователя
 * 🔥 DIRECT DB VERSION - БЕЗ TRIGGERS!
 */
export async function createTripwireUser(params: CreateTripwireUserParams) {
  const { full_name, email, password, currentUserId, currentUserEmail, currentUserName } = params;

  try {
    console.log(`🚀 [DIRECT DB] Creating Tripwire user: ${email}`);

    // 1️⃣ CREATE USER IN auth.users
    const { data: newUser, error: authError } = await tripwireAdminSupabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name,
        role: 'student',
      },
      app_metadata: {
        role: 'student',
      },
    });

    if (authError || !newUser?.user) {
      throw new Error(`Auth error: ${authError?.message || 'No user returned'}`);
    }

    const userId = newUser.user.id;
    console.log(`✅ [DIRECT DB] User created in auth.users: ${userId}`);

    // 2️⃣ DIRECT DB INSERT - ВСЕ ТАБЛИЦЫ
    const client = await tripwirePool.connect();
    try {
      await client.query('BEGIN');

      // ✅ public.users
      await client.query(`
        INSERT INTO public.users (id, email, full_name, role, created_at, updated_at)
        VALUES ($1, $2, $3, 'student', NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, updated_at = NOW()
      `, [userId, email, full_name]);

      // ✅ tripwire_users
      await client.query(`
        INSERT INTO public.tripwire_users (
          id, user_id, email, full_name, granted_by, manager_name,
          status, modules_completed, price, created_at
        )
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'active', 0, 5000, NOW())
        ON CONFLICT (user_id) DO NOTHING
      `, [userId, email, full_name, currentUserId, currentUserName || currentUserEmail || 'Unknown Manager']);

      // ✅ tripwire_user_profile
      await client.query(`
        INSERT INTO public.tripwire_user_profile (
          id, user_id, total_modules, modules_completed, created_at
        )
        VALUES (gen_random_uuid(), $1, 3, 0, NOW())
        ON CONFLICT (user_id) DO NOTHING
      `, [userId]);

      // ✅ module_unlocks (открываем Module 16)
      await client.query(`
        INSERT INTO public.module_unlocks (id, user_id, module_id, unlocked_at)
        VALUES (gen_random_uuid(), $1, 16, NOW())
        ON CONFLICT (user_id, module_id) DO NOTHING
      `, [userId]);

      // ✅ student_progress (ТОЛЬКО для Module 16 - первый модуль!)
      // Остальные модули откроются после завершения предыдущего
      // Используем WHERE NOT EXISTS вместо ON CONFLICT (нет UNIQUE constraint)
      await client.query(`
        INSERT INTO public.student_progress (
          id, user_id, module_id, lesson_id, status, created_at
        )
        SELECT gen_random_uuid(), $1, 16, 67, 'not_started', NOW()
        WHERE NOT EXISTS (
          SELECT 1 FROM public.student_progress 
          WHERE user_id = $1 AND lesson_id = 67
        )
      `, [userId]);

      // ✅ user_achievements (4 достижения для Tripwire)
      const achievements = [
        'first_module_complete',
        'second_module_complete',
        'third_module_complete',
        'tripwire_graduate'
      ];

      for (const achievement of achievements) {
        await client.query(`
          INSERT INTO public.user_achievements (
            id, user_id, achievement_id, current_value, required_value, is_completed, created_at
          )
          VALUES (gen_random_uuid(), $1, $2, 0, 1, false, NOW())
          ON CONFLICT (user_id, achievement_id) DO NOTHING
        `, [userId, achievement]);
    }

      // ✅ user_statistics
      await client.query(`
        INSERT INTO public.user_statistics (
          user_id, lessons_completed, total_time_spent, created_at
        )
        VALUES ($1, 0, 0, NOW())
        ON CONFLICT (user_id) DO NOTHING
      `, [userId]);

      // ✅ sales_activity_log
      const tripwireUserResult = await client.query(`
        SELECT id FROM public.tripwire_users WHERE user_id = $1
      `, [userId]);

      if (tripwireUserResult.rows.length > 0) {
        await client.query(`
          INSERT INTO public.sales_activity_log (
            id, manager_id, action_type, target_user_id, details, created_at
          )
          VALUES (gen_random_uuid(), $1, 'user_created', $2, $3, NOW())
        `, [
          currentUserId,
          userId,
          JSON.stringify({ email, full_name })
        ]);
      }

      await client.query('COMMIT');
      console.log(`✅ [DIRECT DB] All tables initialized for ${email}`);

    } catch (dbError) {
      await client.query('ROLLBACK');
      console.error('❌ [DIRECT DB] Transaction failed:', dbError);
      throw dbError;
    } finally {
      client.release();
    }

    // 3️⃣ SEND WELCOME EMAIL
    let emailSent = false;
    try {
      emailSent = await sendWelcomeEmail({
        toEmail: email,
        name: full_name,
        password: password,
      });

    if (emailSent) {
        await tripwireAdminSupabase
        .from('tripwire_users')
          .update({
            welcome_email_sent: true,
            welcome_email_sent_at: new Date().toISOString()
          })
          .eq('user_id', userId);

        console.log(`✅ Welcome email sent to ${email}`);
      }
    } catch (emailError: any) {
      console.warn(`⚠️ Email sending failed: ${emailError.message}`);
      }

    return {
      success: true,
      user_id: userId,
      email: email,
      generated_password: password,
      welcome_email_sent: emailSent,
      message: '✅ User created successfully (Direct DB)',
    };
  } catch (error: any) {
    console.error('❌ Error creating tripwire user:', error);
    throw error;
  }
}

/**
 * Получает список Tripwire пользователей
 * 🔥 DIRECT POSTGRES CONNECTION - обход PostgREST/Kong cache!
 */
export async function getTripwireUsers(params: GetTripwireUsersParams & { startDate?: string; endDate?: string }) {
  const { managerId, status, page = 1, limit = 20, startDate, endDate } = params;

  try {
    console.log(`🔌 [DIRECT] getTripwireUsers called with manager=${managerId}, status=${status}`);

    // 🔥 DIRECT PostgreSQL connection
    const client = await tripwirePool.connect();
    try {
      const result = await client.query(`
        SELECT * FROM public.rpc_get_tripwire_users(
          p_end_date := $1,
          p_limit := $2,
          p_manager_id := $3,
          p_page := $4,
          p_start_date := $5,
          p_status := $6
        )
      `, [
        endDate || null,
        limit,
        managerId || null,
        page,
        startDate || null,
        status || null
      ]);

      console.log(`✅ [DIRECT] Found ${result.rows.length} users`);
      return result.rows;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('❌ [DIRECT] Error fetching tripwire users:', error);
    throw error;
  }
}

/**
 * Получает статистику по Tripwire пользователям для менеджера
 * 🔥 DIRECT POSTGRES CONNECTION - обход PostgREST/Kong cache!
 */
export async function getTripwireStats(managerId?: string, startDate?: string, endDate?: string) {
  try {
    console.log(`🔌 [DIRECT] getTripwireStats called for manager=${managerId}`);

    // 🔥 DIRECT PostgreSQL connection
    const client = await tripwirePool.connect();
    try {
      const result = await client.query(`
        SELECT * FROM public.rpc_get_tripwire_stats(
          p_end_date := $1,
          p_manager_id := $2,
          p_start_date := $3
        )
      `, [endDate || null, managerId || null, startDate || null]);

      console.log(`✅ [DIRECT] Stats:`, result.rows[0]);
      return result.rows[0];
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('❌ [DIRECT] Error fetching tripwire stats:', error);
    throw error;
  }
}

/**
 * Обновляет статус Tripwire пользователя (via RPC)
 */
export async function updateTripwireUserStatus(
  userId: string,
  status: string,
  managerId: string
) {
  try {
    const { data, error } = await tripwireAdminSupabase.rpc('rpc_update_tripwire_user_status', {
      p_user_id: userId,
      p_status: status,
      p_manager_id: managerId,
      });

    if (error) {
      throw new Error(`RPC error: ${error.message}`);
    }

    return data;
  } catch (error: any) {
    console.error('❌ Error updating tripwire user status via RPC:', error);
    throw error;
  }
}

/**
 * Получает историю действий менеджера (via RPC)
 * 🎯 ARCHITECT SOLUTION #3: Поддержка startDate/endDate фильтрации
 */
export async function getSalesActivityLog(managerId: string, limit = 50, startDate?: string, endDate?: string) {
  try {
    const { data, error } = await tripwireAdminSupabase.rpc('rpc_get_sales_activity_log', {
      p_manager_id: managerId,
      p_limit: limit,
      p_start_date: startDate || null,
      p_end_date: endDate || null,
    });

    if (error) {
      throw new Error(`RPC error: ${error.message}`);
    }

    return data || [];
  } catch (error: any) {
    console.error('❌ Error fetching sales activity log via RPC:', error);
    throw error;
  }
}

/**
 * Получает рейтинг менеджеров (leaderboard) (via RPC)
 */
export async function getSalesLeaderboard() {
  try {
    const { data, error } = await tripwireAdminSupabase.rpc('rpc_get_sales_leaderboard');

    if (error) {
      throw new Error(`RPC error: ${error.message}`);
    }

    return data;
  } catch (error: any) {
    console.error('❌ Error fetching sales leaderboard via RPC:', error);
    throw error;
  }
}

/**
 * Получает данные для графика продаж (via RPC)
 */
export async function getSalesChartData(
  managerId?: string,
  period: string = 'month',
  customStartDate?: string,
  customEndDate?: string
) {
  try {
    // Вычисляем даты если не указаны
    const now = new Date();
    let startDate: string;
    let endDate: string = now.toISOString();

    if (customStartDate && customEndDate) {
      startDate = customStartDate;
      endDate = customEndDate;
    } else {
      const startDateObj = 
        period === 'week' ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) :
        period === 'year' ? new Date(now.getFullYear(), 0, 1) :
        new Date(now.getFullYear(), now.getMonth(), 1); // month
      
      startDate = startDateObj.toISOString();
    }

    const { data, error } = await tripwireAdminSupabase.rpc('rpc_get_sales_chart_data', {
      p_manager_id: managerId || null,
      p_start_date: startDate,
      p_end_date: endDate,
    });

    if (error) {
      throw new Error(`RPC error: ${error.message}`);
    }

    return data;
  } catch (error: any) {
    console.error('❌ Error fetching sales chart data via RPC:', error);
    throw error;
  }
}

/**
 * Удаляет Tripwire студента
 * 🔥 ONLY FOR ADMIN (smmmcwin@gmail.com)
 * ✅ Удаляет из auth.users, tripwire_users, sales_activity_log, tripwire_user_profile, public.users
 */
export async function deleteTripwireUser(userId: string) {
  try {
    console.log(`🗑️ [DELETE] Deleting user: ${userId}`);

    // 1. Вызываем RPC для удаления из DB tables (через DIRECT connection)
    const client = await tripwirePool.connect();
    try {
      const result = await client.query(`
        SELECT * FROM public.rpc_delete_tripwire_user(p_user_id := $1)
      `, [userId]);

      const rpcResult = result.rows[0];
      console.log('✅ [DELETE] RPC result:', rpcResult);

      if (!rpcResult || !rpcResult.success) {
        throw new Error(rpcResult?.error || 'Failed to delete user from database');
      }

      // 2. Удаляем из auth.users через Admin API
      const { error: authError } = await tripwireAdminSupabase.auth.admin.deleteUser(userId);
      
      if (authError) {
        console.error('⚠️ [DELETE] Auth deletion error:', authError.message);
        // Не критичная ошибка, продолжаем
      } else {
        console.log('✅ [DELETE] Deleted from auth.users');
      }

      return {
        success: true,
        email: rpcResult.email,
        full_name: rpcResult.full_name,
      };
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('❌ [DELETE] Error deleting user:', error);
    throw error;
  }
}

