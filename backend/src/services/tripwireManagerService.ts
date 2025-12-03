import { tripwireAdminSupabase } from '../config/supabase-tripwire'; // 🔥 НОВЫЙ КЛИЕНТ
import crypto from 'crypto';
import { sendWelcomeEmail } from './emailService';

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
 */
export async function createTripwireUser(params: CreateTripwireUserParams) {
  const { full_name, email, password, currentUserId, currentUserEmail, currentUserName } = params;

  try {
    // 1. Используем пароль из формы (уже сгенерирован на фронте)
    const userPassword = password;
    console.log(`Creating user ${email} with provided password`);

    // 2. Создаем пользователя в Supabase Auth (используем admin client)
    const { data: newUser, error: authError } = await tripwireAdminSupabase.auth.admin.createUser({
      email: email,
      password: userPassword,
      email_confirm: true, // Автоподтверждение email
      user_metadata: {
        granted_by: currentUserId,
        created_by_manager: true,
        full_name: full_name,
        platform: 'tripwire', // Платформа для разделения баз
      },
    });

    if (authError) {
      throw new Error(`Auth error: ${authError.message}`);
    }

    if (!newUser || !newUser.user) {
      throw new Error('Failed to create user in auth.users');
    }

    console.log(`✅ Created user in auth.users: ${newUser.user.id}`);

    // 2.5. public.users заполняется АВТОМАТИЧЕСКИ через database trigger
    // Подождем 500ms чтобы trigger сработал
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log(`✅ public.users will be filled by database trigger automatically`);

    // 3. Сохраняем в tripwire_users И логируем через RPC (обход Schema Cache)
    const { data: tripwireUserData, error: dbError } = await tripwireAdminSupabase
      .rpc('rpc_create_tripwire_user_full', {
        p_user_id: newUser.user.id,
        p_full_name: full_name,
        p_email: email,
        p_granted_by: currentUserId,
        p_manager_name: currentUserName || currentUserEmail || 'Unknown Manager',
        p_generated_password: userPassword,
        p_welcome_email_sent: false, // Будет обновлено после отправки email
      });

    if (dbError) {
      console.error('❌ RPC rpc_create_tripwire_user_full failed:', dbError);
      // Откатываем создание пользователя в auth
      await tripwireAdminSupabase.auth.admin.deleteUser(newUser.user.id);
      throw new Error(`Database RPC error: ${dbError.message}`);
    }

    console.log(`✅ Saved to tripwire_users and logged to sales_activity_log via RPC`);

    // 4. Отправляем Welcome Email (используем новый emailService)
    let emailSent = false;
    try {
      emailSent = await sendWelcomeEmail({
        toEmail: email,
        name: full_name,
        password: userPassword,
      });
    } catch (emailError: any) {
      console.error(`⚠️ Email sending failed, but user created successfully:`, emailError.message);
      // Не бросаем ошибку - пользователь создан, просто email не отправился
    }

    // 5. Обновляем статус отправки email через RPC
    if (emailSent) {
      const { error: updateError } = await tripwireAdminSupabase.rpc('rpc_update_email_status', {
        p_user_id: newUser.user.id,
        p_email_sent: true,
      });

      if (updateError) {
        console.warn('⚠️ Failed to update email status via RPC:', updateError.message);
        // Не критичная ошибка, продолжаем
      } else {
        console.log(`✅ Updated email status via RPC`);
      }
    }

    // 6. Возвращаем результат
    return {
      success: true,
      user_id: newUser.user.id,
      email: email,
      generated_password: userPassword,
      welcome_email_sent: emailSent,
      message: 'Пользователь успешно создан (via RPC)',
    };
  } catch (error: any) {
    console.error('❌ Error creating tripwire user:', error);
    throw error;
  }
}

/**
 * Получает список Tripwire пользователей (via RPC)
 * 🎯 ARCHITECT SOLUTION #3: Поддержка startDate/endDate фильтрации
 */
export async function getTripwireUsers(params: GetTripwireUsersParams & { startDate?: string; endDate?: string }) {
  const { managerId, status, page = 1, limit = 20, startDate, endDate } = params;

  try {
    const { data, error } = await tripwireAdminSupabase.rpc('rpc_get_tripwire_users', {
      p_manager_id: managerId || null,
      p_status: status || null,
      p_page: page,
      p_limit: limit,
      p_start_date: startDate || null,
      p_end_date: endDate || null,
    });

    if (error) {
      throw new Error(`RPC error: ${error.message}`);
    }

    return data;
  } catch (error: any) {
    console.error('❌ Error fetching tripwire users via RPC:', error);
    throw error;
  }
}

/**
 * Получает статистику по Tripwire пользователям для менеджера (via RPC)
 * 🎯 ARCHITECT SOLUTION #3: Поддержка startDate/endDate фильтрации
 */
export async function getTripwireStats(managerId?: string, startDate?: string, endDate?: string) {
  try {
    const { data, error } = await tripwireAdminSupabase.rpc('rpc_get_tripwire_stats', {
      p_manager_id: managerId || null,
      p_start_date: startDate || null,
      p_end_date: endDate || null,
    });

    if (error) {
      throw new Error(`RPC error: ${error.message}`);
    }

    return data;
  } catch (error: any) {
    console.error('❌ Error fetching tripwire stats via RPC:', error);
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

