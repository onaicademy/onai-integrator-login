import { tripwireAdminSupabase } from '../config/supabase-tripwire'; // 🔥 НОВЫЙ КЛИЕНТ
import { tripwirePool } from '../config/tripwire-pool'; // 🔥 DIRECT POSTGRES для транзакций
import crypto from 'crypto';
import { sendWelcomeEmail } from './emailService';
import { withRetry, supabaseRpcWithRetry } from '../utils/retry-wrapper'; // 🛡️ RETRY PROTECTION

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

    // 🔒 STEP 0: CHECK IF EMAIL ALREADY EXISTS
    // ✅ Используем listUsers вместо getUserByEmail (deprecated)
    const { data: userData, error: checkError } = await tripwireAdminSupabase.auth.admin.listUsers();
    
    if (checkError) {
      console.error('❌ Error checking existing users:', checkError);
      throw new Error(`Error checking existing users: ${checkError.message}`);
    }
    
    const existingUser = userData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      console.warn(`⚠️ Email already exists: ${email}`);
      throw new Error(`User with email ${email} already exists`);
    }

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
      console.error('❌ Auth creation failed:', authError);
      throw new Error(`Auth error: ${authError?.message || 'No user returned'}`);
    }

    const userId = newUser.user.id;
    console.log(`✅ [SUPABASE] User created in auth.users: ${userId}`);

    // 2️⃣ INSERT В ТАБЛИЦЫ через Supabase JS (без tripwirePool!)
    try {
      console.log(`📝 [SUPABASE] Создаём записи в таблицах...`);

      // 1. public.users (КРИТИЧНО! Нужно для foreign keys)
      const { error: usersError } = await tripwireAdminSupabase
        .from('users')
        .insert({
          id: userId,
          email,
          full_name,
          role: 'student'
        });
      if (usersError) throw new Error(`users: ${usersError.message}`);
      console.log('   ✅ users');

      // 2. tripwire_users
      const { error: twError } = await tripwireAdminSupabase
        .from('tripwire_users')
        .insert({
          user_id: userId,
          email,
          full_name,
          granted_by: currentUserId,
          manager_name: currentUserName || currentUserEmail || 'Unknown Manager',
          status: 'active',
          modules_completed: 0,
          price: 5000
        });
      if (twError) throw new Error(`tripwire_users: ${twError.message}`);
      console.log('   ✅ tripwire_users');

      // 3. tripwire_user_profile
      const { error: profileError } = await tripwireAdminSupabase
        .from('tripwire_user_profile')
        .insert({
          user_id: userId,
          full_name,
          total_modules: 3,
          modules_completed: 0
        });
      if (profileError) throw new Error(`tripwire_user_profile: ${profileError.message}`);
      console.log('   ✅ tripwire_user_profile');

      // 4. module_unlocks - ПРОПУСКАЕМ! 
      // Триггер auto_unlock_first_module_on_user_creation автоматически создаст запись
      console.log('   ⏭️  module_unlocks (skipped - will be created by trigger)');

      // 🔥 5. CREATE tripwire_progress for Lesson 67 (КРИТИЧНО!)
      // ВАЖНО: tripwire_progress.tripwire_user_id = userId (из auth.users), НЕ tripwire_users.id!
      const { error: progressError } = await tripwireAdminSupabase
        .from('tripwire_progress')
        .insert({
          tripwire_user_id: userId, // ✅ userId из auth.users (foreign key на users.id)
          module_id: 16,
          lesson_id: 67,
          is_completed: false,
          watch_time_seconds: 0,
          video_progress_percent: 0,
          last_position_seconds: 0,
          video_qualified_for_completion: false
        });
      if (progressError) throw new Error(`tripwire_progress: ${progressError.message}`);
      console.log('   ✅ tripwire_progress (Lesson 67)');

      // 6. sales_activity_log
      const { error: activityError } = await tripwireAdminSupabase
        .from('sales_activity_log')
        .insert({
          manager_id: currentUserId,
          action_type: 'user_created',
          target_user_id: userId,
          target_user_email: email,
          details: { email, full_name }
        });
      if (activityError) console.warn('⚠️ sales_activity_log:', activityError.message);

      console.log(`✅ [SUPABASE] All tables initialized for ${email}`);

    } catch (dbError: any) {
      console.error('❌ [SUPABASE] Insert failed:', dbError);
      
      // 🔥 ROLLBACK: Delete from ALL tables
      try {
        console.log(`🗑️ Rolling back user ${userId}...`);
        
        // 1. Delete from public.users (если успели создать)
        await tripwireAdminSupabase
          .from('users')
          .delete()
          .eq('id', userId);
        console.log(`   ✅ Deleted from public.users`);
        
        // 2. Delete from auth.users
        await tripwireAdminSupabase.auth.admin.deleteUser(userId);
        console.log(`   ✅ Deleted from auth.users`);
        
        console.log(`✅ Rollback complete`);
      } catch (rollbackError: any) {
        console.error('❌ Failed to rollback:', rollbackError.message);
      }
      
      throw dbError;
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

        // Логируем отправку email
        try {
          await tripwireAdminSupabase
            .from('sales_activity_log')
            .insert({
              manager_id: currentUserId,
              action_type: 'email_sent',
              target_user_id: userId,
              details: { email, full_name, email_type: 'welcome' }
            });
          console.log('✅ [EMAIL] Logged to sales_activity_log');
        } catch (logError) {
          console.warn('⚠️ [EMAIL] Failed to log email send:', logError);
        }
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
 * ✅ USING SUPABASE CLIENT (tripwirePool connection issue fixed)
 * ✅ С REAL-TIME расчетом modules_completed из tripwire_progress
 */
export async function getTripwireUsers(params: GetTripwireUsersParams & { startDate?: string; endDate?: string }) {
  // 🔥 DEFAULT LIMIT: защита от неограниченной загрузки
  const { managerId, status, page = 1, limit = 50, startDate, endDate } = params;

  try {
    console.log(`🔌 [SUPABASE] getTripwireUsers called with manager=${managerId}, status=${status}`);

    const offset = (page - 1) * limit;

    // Базовый запрос через Supabase
    let query = tripwireAdminSupabase
      .from('tripwire_users')
      .select('*, tripwire_progress!inner(module_id, is_completed)', { count: 'exact' });

    // Фильтры
    if (managerId) {
      query = query.eq('granted_by', managerId);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    // Пагинация и сортировка
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('❌ [SUPABASE] Error fetching tripwire users:', error);
      throw new Error(error.message);
    }

    console.log(`✅ [SUPABASE] Found ${data?.length || 0} users`);

    // Подсчитываем real_modules_completed для каждого пользователя
    const usersWithModules = await Promise.all((data || []).map(async (user) => {
      // Подсчет завершенных модулей через progress
      const { count: completedModules } = await tripwireAdminSupabase
        .from('tripwire_progress')
        .select('module_id', { count: 'exact', head: true })
        .eq('tripwire_user_id', user.user_id)
        .eq('is_completed', true);

      return {
        ...user,
        modules_completed: completedModules || user.modules_completed || 0,
        total_count: count || 0
      };
    }));

    return usersWithModules;
  } catch (error: any) {
    console.error('❌ [SUPABASE] Error fetching tripwire users:', error);
    throw error;
  }
}

/**
 * Получает статистику по Tripwire пользователям для менеджера
 * ⚡ TEMPORARY FIX: Using Supabase RPC instead of direct Postgres (Pool connection issue)
 */
export async function getTripwireStats(managerId?: string, startDate?: string, endDate?: string) {
  try {
    console.log(`🔌 [SUPABASE RPC] getTripwireStats called for manager=${managerId}`);

    // 🛡️ RETRY PROTECTION
    const data = await supabaseRpcWithRetry(
      () => tripwireAdminSupabase.rpc('rpc_get_tripwire_stats', {
        p_end_date: endDate || null,
        p_manager_id: managerId || null,
        p_start_date: startDate || null
      }),
      {
        maxRetries: 3,
        delayMs: 500,
        onRetry: (attempt) => console.warn(`   ⚠️ Retry ${attempt}/3 for getTripwireStats`)
      }
    );

    console.log(`✅ [SUPABASE RPC] Stats:`, data);
    
    // 🔧 FIX: RPC возвращает массив, берём первый элемент
    if (Array.isArray(data) && data.length > 0) {
      return data[0];
    }
    
    // Fallback: пустой объект если нет данных
    return {
      total_students: 0,
      active_students: 0,
      completed_students: 0,
      inactive_students: 0,
      total_revenue: 0,
      avg_completion_rate: 0,
      students_this_month: 0,
      students_this_week: 0,
      revenue_this_month: 0,
      avg_modules_completed: 0
    };
  } catch (error: any) {
    console.error('❌ [SUPABASE RPC] Error fetching tripwire stats:', error);
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
    console.log('📊 [LEADERBOARD] Fetching sales leaderboard via SUPABASE');
    
    // 🛡️ RETRY PROTECTION
    const data = await withRetry(
      async () => {
        const { data, error } = await tripwireAdminSupabase
          .from('tripwire_users')
          .select('granted_by, manager_name, created_at, price, status')
          .not('granted_by', 'is', null);

        if (error) throw error;
        return data;
      },
      {
        maxRetries: 3,
        delayMs: 500,
        onRetry: (attempt) => console.warn(`   ⚠️ Retry ${attempt}/3 for getSalesLeaderboard`)
      }
    );

    // Агрегируем данные на клиенте
    const leaderboard = data.reduce((acc: any, user: any) => {
      const managerId = user.granted_by;
      if (!acc[managerId]) {
        acc[managerId] = {
          manager_id: managerId,
          manager_name: user.manager_name,
          total_sales: 0,
          total_revenue: 0,
          active_users: 0,
          completed_users: 0,
          this_month_sales: 0,
          this_month_revenue: 0
        };
      }

      acc[managerId].total_sales++;
      acc[managerId].total_revenue += user.price || 0;
      
      if (user.status === 'active') acc[managerId].active_users++;
      if (user.status === 'completed') acc[managerId].completed_users++;
      
      const createdAt = new Date(user.created_at);
      const now = new Date();
      if (createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear()) {
        acc[managerId].this_month_sales++;
        acc[managerId].this_month_revenue += user.price || 0;
      }

      return acc;
    }, {});

    const result = Object.values(leaderboard)
      .sort((a: any, b: any) => b.total_sales - a.total_sales)
      .slice(0, 10);

    console.log(`✅ [LEADERBOARD] Found ${result.length} managers`);
    return result;
  } catch (error: any) {
    console.error('❌ Error fetching sales leaderboard:', error);
    throw error;
  }
}

/**
 * Получает данные для графика продаж (via DIRECT SQL)
 */
export async function getSalesChartData(
  managerId?: string,
  period: string = 'month',
  customStartDate?: string,
  customEndDate?: string
) {
  try {
    console.log('📊 [SALES_CHART] Fetching chart data via DIRECT SQL');
    
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

    // 🛡️ RETRY PROTECTION
    const data = await withRetry(
      async () => {
        let query = tripwireAdminSupabase
          .from('tripwire_users')
          .select('created_at, price')
          .gte('created_at', startDate)
          .lte('created_at', endDate);

        if (managerId) {
          query = query.eq('granted_by', managerId);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data;
      },
      {
        maxRetries: 3,
        delayMs: 500,
        onRetry: (attempt) => console.warn(`   ⚠️ Retry ${attempt}/3 for getSalesChartData`)
      }
    );

    // Агрегируем данные по датам на клиенте
    const chartData = data.reduce((acc: any, user: any) => {
      const date = user.created_at.split('T')[0]; // YYYY-MM-DD
      if (!acc[date]) {
        acc[date] = { date, sales: 0, revenue: 0 };
      }
      acc[date].sales++;
      acc[date].revenue += user.price || 0;
      return acc;
    }, {});

    const result = Object.values(chartData).sort((a: any, b: any) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    console.log(`✅ [SALES_CHART] Found ${result.length} data points`);
    return result;
  } catch (error: any) {
    console.error('❌ Error fetching sales chart data:', error);
    throw error;
  }
}

/**
 * Удаляет Tripwire студента
 * 🔥 ONLY FOR ADMIN (smmmcwin@gmail.com)
 * ✅ Удаляет из auth.users, tripwire_users, sales_activity_log, tripwire_user_profile, public.users
 */
/**
 * Удаляет Tripwire пользователя полностью из системы
 * @param userId - UUID пользователя
 * @returns Объект с информацией об удалении
 */
export async function deleteTripwireUser(userId: string) {
  try {
    console.log(`🗑️ [DELETE] Starting deletion process for user: ${userId}`);

    // 1. Вызываем улучшенную RPC для удаления из всех DB tables
    const { data: rpcResult, error: rpcError } = await tripwireAdminSupabase.rpc('rpc_delete_tripwire_user', {
      p_user_id: userId
    });

    if (rpcError) {
      console.error('❌ [DELETE] RPC error:', rpcError);
      throw new Error(`Database deletion failed: ${rpcError.message || rpcError.hint || 'Unknown RPC error'}`);
    }

    console.log('✅ [DELETE] RPC result:', rpcResult);

    if (!rpcResult || !rpcResult.success) {
      const errorMsg = rpcResult?.error || 'Failed to delete user from database';
      const errorDetails = rpcResult?.details || 'No additional details';
      
      console.error('❌ [DELETE] RPC returned failure:', errorMsg, errorDetails);
      
      throw new Error(`${errorMsg}\n\nDetails: ${errorDetails}`);
    }

    // 2. Удаляем из auth.users через Admin API
    console.log('🔐 [DELETE] Attempting to delete from auth.users...');
    const { error: authError } = await tripwireAdminSupabase.auth.admin.deleteUser(userId);

    if (authError) {
      console.error('⚠️ [DELETE] Auth deletion error:', authError.message);
      
      // Если auth.users удалить не удалось - это НЕ критично
      // Пользователь уже удален из всех таблиц БД
      return {
        success: true,
        email: rpcResult.email,
        full_name: rpcResult.full_name,
        warning: `User deleted from database, but auth deletion failed: ${authError.message}`,
        details: rpcResult.details,
      };
    }

    console.log('✅ [DELETE] Deleted from auth.users successfully');

    return {
      success: true,
      email: rpcResult.email,
      full_name: rpcResult.full_name,
      message: rpcResult.message || 'User deleted completely',
      details: rpcResult.details,
    };
  } catch (error: any) {
    console.error('❌ [DELETE] Error deleting user:', error);
    
    // Возвращаем детальную ошибку для фронтенда
    throw {
      message: error.message || 'Unknown error during user deletion',
      details: error.details || error.stack || 'No additional details available',
      userId: userId,
      timestamp: new Date().toISOString(),
    };
  }
}

