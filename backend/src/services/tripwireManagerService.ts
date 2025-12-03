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

    // 2.5. Создаем запись в public.users с role='student' и platform='tripwire'
    const { error: usersError } = await tripwireAdminSupabase
      .from('users')
      .insert({
        id: newUser.user.id,
        email: email,
        full_name: full_name,
        role: 'student',
        platform: 'tripwire', // Важно! Разделяем базы по платформам
      });

    if (usersError) {
      console.error('❌ Error inserting to users:', usersError);
      // Откатываем создание пользователя в auth
      await tripwireAdminSupabase.auth.admin.deleteUser(newUser.user.id);
      throw new Error(`Users table error: ${usersError.message}`);
    }

    console.log(`✅ Created user in public.users with role=student, platform=tripwire`);

    // 3. Сохраняем в tripwire_users
    const { error: dbError } = await tripwireAdminSupabase
      .from('tripwire_users')
      .insert({
        user_id: newUser.user.id,
        full_name: full_name,
        email: email,
        granted_by: currentUserId,
        manager_name: currentUserName || currentUserEmail || 'Unknown Manager',
        generated_password: userPassword, // Сохраняем пароль для отправки по email
      });

    if (dbError) {
      console.error('❌ Error inserting to tripwire_users:', dbError);
      // Откатываем создание пользователя в auth
      await tripwireAdminSupabase.auth.admin.deleteUser(newUser.user.id);
      throw new Error(`Database error: ${dbError.message}`);
    }

    console.log(`✅ Saved to tripwire_users table`);

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

    // 5. Обновляем статус отправки email
    if (emailSent) {
      await tripwireAdminSupabase
        .from('tripwire_users')
        .update({
          welcome_email_sent: true,
          welcome_email_sent_at: new Date().toISOString(),
        })
        .eq('user_id', newUser.user.id);
    }

    // 6. Логируем действие
    await tripwireAdminSupabase.from('sales_activity_log').insert({
      manager_id: currentUserId,
      action_type: 'user_created',
      target_user_id: newUser.user.id,
      details: {
        full_name: full_name,
        email: email,
        email_sent: emailSent,
      },
    });

    console.log(`✅ Logged activity to sales_activity_log`);

    // 7. Возвращаем результат
    return {
      success: true,
      user_id: newUser.user.id,
      email: email,
      generated_password: userPassword,
      welcome_email_sent: emailSent,
      message: 'Пользователь успешно создан',
    };
  } catch (error: any) {
    console.error('❌ Error creating tripwire user:', error);
    throw error;
  }
}

/**
 * Получает список Tripwire пользователей
 * 🎯 ARCHITECT SOLUTION #3: Поддержка startDate/endDate фильтрации
 */
export async function getTripwireUsers(params: GetTripwireUsersParams & { startDate?: string; endDate?: string }) {
  const { managerId, status, page = 1, limit = 20, startDate, endDate } = params;

  try {
    let query = tripwireAdminSupabase
      .from('tripwire_users')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Фильтр по менеджеру
    if (managerId) {
      query = query.eq('granted_by', managerId);
    }

    // Фильтр по статусу
    if (status) {
      query = query.eq('status', status);
    }

    // Фильтр по датам
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    // Пагинация
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return {
      users: data || [],
      total: count || 0,
      page: page,
      pages: Math.ceil((count || 0) / limit),
      limit: limit,
    };
  } catch (error: any) {
    console.error('❌ Error fetching tripwire users:', error);
    throw error;
  }
}

/**
 * Получает статистику по Tripwire пользователям для менеджера
 * 🎯 ARCHITECT SOLUTION #3: Поддержка startDate/endDate фильтрации
 */
export async function getTripwireStats(managerId?: string, startDate?: string, endDate?: string) {
  try {
    const TRIPWIRE_PRICE = 5000; // Цена в тенге

    let query = tripwireAdminSupabase
      .from('tripwire_users')
      .select('status, created_at, modules_completed');

    if (managerId) {
      query = query.eq('granted_by', managerId);
    }

    // Применяем фильтр по датам если указаны
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalUsers = data?.length || 0;
    const thisMonth = data?.filter((u: any) => new Date(u.created_at) >= thisMonthStart).length || 0;

    const stats = {
      total_users: totalUsers,
      active_users: data?.filter((u: any) => u.status === 'active').length || 0,
      completed_users: data?.filter((u: any) => u.status === 'completed').length || 0,
      this_month: thisMonth,
      total_revenue: totalUsers * TRIPWIRE_PRICE, // Общая выручка
      monthly_revenue: thisMonth * TRIPWIRE_PRICE, // Выручка за месяц
    };

    return stats;
  } catch (error: any) {
    console.error('❌ Error fetching tripwire stats:', error);
    throw error;
  }
}

/**
 * Обновляет статус Tripwire пользователя
 */
export async function updateTripwireUserStatus(
  userId: string,
  status: string,
  managerId: string
) {
  try {
    const { error } = await tripwireAdminSupabase
      .from('tripwire_users')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    // Логируем действие
    await tripwireAdminSupabase.from('sales_activity_log').insert({
      manager_id: managerId,
      action_type: 'status_changed',
      target_user_id: userId,
      details: {
        new_status: status,
      },
    });

    return { success: true, message: 'Статус обновлен' };
  } catch (error: any) {
    console.error('❌ Error updating tripwire user status:', error);
    throw error;
  }
}

/**
 * Получает историю действий менеджера
 * 🎯 ARCHITECT SOLUTION #3: Поддержка startDate/endDate фильтрации
 */
export async function getSalesActivityLog(managerId: string, limit = 50, startDate?: string, endDate?: string) {
  try {
    let query = tripwireAdminSupabase
      .from('sales_activity_log')
      .select('*')
      .eq('manager_id', managerId)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Фильтр по датам
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data || [];
  } catch (error: any) {
    console.error('❌ Error fetching sales activity log:', error);
    throw error;
  }
}

/**
 * Получает рейтинг менеджеров (leaderboard)
 */
export async function getSalesLeaderboard() {
  try {
    const TRIPWIRE_PRICE = 5000; // Цена Tripwire в тенге

    // Получаем всех менеджеров и их статистику
    const { data, error } = await tripwireAdminSupabase.from('tripwire_users').select('*');

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    // Группируем по менеджерам
    const managersMap = new Map<string, any>();

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    for (const user of data || []) {
      const managerId = user.granted_by;
      const managerName = user.manager_name || 'Unknown';

      if (!managersMap.has(managerId)) {
        managersMap.set(managerId, {
          manager_id: managerId,
          manager_name: managerName,
          total_sales: 0,
          total_revenue: 0,
          active_users: 0,
          completed_users: 0,
          this_month_sales: 0,
          this_month_revenue: 0,
        });
      }

      const stats = managersMap.get(managerId);
      stats.total_sales += 1;
      stats.total_revenue += TRIPWIRE_PRICE;

      if (user.status === 'active') stats.active_users += 1;
      if (user.status === 'completed' || user.modules_completed === 3) stats.completed_users += 1;

      // Статистика за текущий месяц
      const createdAt = new Date(user.created_at);
      if (createdAt >= thisMonthStart) {
        stats.this_month_sales += 1;
        stats.this_month_revenue += TRIPWIRE_PRICE;
      }
    }

    // Преобразуем Map в массив и сортируем по total_sales
    const managers = Array.from(managersMap.values()).sort(
      (a, b) => b.total_sales - a.total_sales
    );

    return { managers };
  } catch (error: any) {
    console.error('❌ Error fetching sales leaderboard:', error);
    throw error;
  }
}

/**
 * Получает данные для графика продаж
 */
export async function getSalesChartData(
  managerId?: string,
  period: string = 'month',
  customStartDate?: string,
  customEndDate?: string
) {
  try {
    const TRIPWIRE_PRICE = 5000;

    let query = tripwireAdminSupabase.from('tripwire_users').select('created_at, granted_by');

    if (managerId) {
      query = query.eq('granted_by', managerId);
    }

    // 🎯 ARCHITECT SOLUTION #3: Support custom date range
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    if (customStartDate && customEndDate) {
      startDate = new Date(customStartDate);
      endDate = new Date(customEndDate);
    } else {
      switch (period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        case 'month':
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
      }
    }

    query = query
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    // 🎯 ARCHITECT SOLUTION #2: Backend-side Interpolation
    // Генерируем ПОЛНЫЙ массив дат в диапазоне
    const allDates: Array<{ date: string; displayDate: string; sales: number; revenue: number }> = [];
    const currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);
    const finalDate = new Date(endDate);
    finalDate.setHours(23, 59, 59, 999);

    // Группируем продажи по датам (ISO формат)
    const salesByISODate = new Map<string, number>();
    for (const user of data || []) {
      const date = new Date(user.created_at);
      const isoDateKey = date.toISOString().split('T')[0]; // "2025-12-03"
      salesByISODate.set(isoDateKey, (salesByISODate.get(isoDateKey) || 0) + 1);
    }

    // Генерируем массив со ВСЕМИ датами (заполняя пропуски нулями)
    while (currentDate <= finalDate) {
      const isoDate = currentDate.toISOString().split('T')[0];
      const sales = salesByISODate.get(isoDate) || 0;

      let displayDate: string;
      if (period === 'week') {
        displayDate = currentDate.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric' });
      } else if (period === 'year') {
        displayDate = currentDate.toLocaleDateString('ru-RU', { month: 'short' });
      } else {
        displayDate = currentDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
      }

      allDates.push({
        date: isoDate,
        displayDate,
        sales,
        revenue: sales * TRIPWIRE_PRICE,
      });

      // Переходим к следующему дню
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return { data: allDates };
  } catch (error: any) {
    console.error('❌ Error fetching sales chart data:', error);
    throw error;
  }
}

