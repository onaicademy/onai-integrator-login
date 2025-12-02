import { adminSupabase } from '../config/supabase';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

/**
 * Sales Manager Service - создание и управление Tripwire пользователями
 */

interface CreateTripwireUserParams {
  full_name: string;
  email: string;
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
 * Отправляет Welcome Email с учетными данными
 */
async function sendWelcomeEmail(params: {
  to: string;
  full_name: string;
  email: string;
  password: string;
}): Promise<boolean> {
  try {
    // Проверяем наличие SMTP настроек
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.warn('SMTP credentials not configured, skipping email send');
      return false;
    }

    // Настройка SMTP транспорта
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    // HTML шаблон письма
    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            background: #030303;
            color: #FFFFFF;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background: linear-gradient(135deg, #0A0A0A 0%, #1a1a1a 100%);
            border: 2px solid rgba(0, 255, 148, 0.3);
            border-radius: 24px;
            padding: 40px;
            box-shadow: 0 0 60px rgba(0, 255, 148, 0.2);
          }
          .logo {
            text-align: center;
            margin-bottom: 30px;
            font-size: 32px;
            font-weight: bold;
            color: #00FF94;
            text-shadow: 0 0 20px rgba(0, 255, 148, 0.6);
          }
          .title {
            font-size: 32px;
            font-weight: bold;
            color: #00FF94;
            text-align: center;
            text-shadow: 0 0 20px rgba(0, 255, 148, 0.6);
            margin-bottom: 20px;
          }
          .credentials-box {
            background: rgba(0, 255, 148, 0.1);
            border: 1px solid rgba(0, 255, 148, 0.3);
            border-radius: 12px;
            padding: 24px;
            margin: 30px 0;
          }
          .credential-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 16px;
            padding-bottom: 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          }
          .credential-row:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
          }
          .label {
            color: #9CA3AF;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .value {
            color: #00FF94;
            font-weight: bold;
            font-size: 18px;
          }
          .button {
            display: block;
            width: 100%;
            padding: 16px;
            background: linear-gradient(135deg, #00FF94, #00CC6A);
            color: #000000;
            text-align: center;
            text-decoration: none;
            font-weight: bold;
            font-size: 18px;
            border-radius: 12px;
            margin: 30px 0;
            box-shadow: 0 0 30px rgba(0, 255, 148, 0.4);
          }
          .footer {
            text-align: center;
            color: #9CA3AF;
            font-size: 14px;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">onAI Academy</div>
          
          <h1 class="title">ДОБРО ПОЖАЛОВАТЬ!</h1>
          
          <p style="text-align: center; color: #9CA3AF; margin-bottom: 30px;">
            Привет, <strong style="color: #FFFFFF;">${params.full_name}</strong>!<br>
            Для вас создан аккаунт на платформе <strong>onAI Academy</strong>.<br>
            Начните обучение прямо сейчас!
          </p>
          
          <div class="credentials-box">
            <div class="credential-row">
              <span class="label">Login (Email)</span>
              <span class="value">${params.email}</span>
            </div>
            <div class="credential-row">
              <span class="label">Password</span>
              <span class="value">${params.password}</span>
            </div>
          </div>
          
          <a href="https://onai.academy/tripwire/login" class="button">
            ВОЙТИ В TRIPWIRE →
          </a>
          
          <p style="text-align: center; color: #9CA3AF; font-size: 14px;">
            ⚠️ <strong>Важно:</strong> Рекомендуем сменить пароль после первого входа в настройках профиля.
          </p>
          
          <div class="footer">
            <p>© 2025 onAI Academy • Tripwire Course</p>
            <p>Если у вас возникли вопросы, напишите нам: 
              <a href="mailto:support@onaiacademy.kz" style="color: #00FF94;">support@onaiacademy.kz</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Отправка email
    await transporter.sendMail({
      from: '"onAI Academy" <support@onaiacademy.kz>',
      to: params.to,
      subject: '🎓 Добро пожаловать в onAI Academy - Ваши учетные данные',
      html: htmlTemplate,
    });

    console.log(`✅ Welcome email sent to ${params.to}`);
    return true;
  } catch (error: any) {
    console.error('❌ Error sending welcome email:', error.message);
    return false;
  }
}

/**
 * Создает нового Tripwire пользователя
 */
export async function createTripwireUser(params: CreateTripwireUserParams) {
  const { full_name, email, currentUserId, currentUserEmail, currentUserName } = params;

  try {
    // 1. Генерируем временный пароль
    const generatedPassword = generateTemporaryPassword();
    console.log(`Generated password for ${email}: ${generatedPassword}`);

    // 2. Создаем пользователя в Supabase Auth (используем admin client)
    const { data: newUser, error: authError } = await adminSupabase.auth.admin.createUser({
      email: email,
      password: generatedPassword,
      email_confirm: true, // Автоподтверждение email
      user_metadata: {
        role: 'tripwire',
        granted_by: currentUserId,
        created_by_manager: true,
        full_name: full_name,
      },
    });

    if (authError) {
      throw new Error(`Auth error: ${authError.message}`);
    }

    if (!newUser || !newUser.user) {
      throw new Error('Failed to create user in auth.users');
    }

    console.log(`✅ Created user in auth.users: ${newUser.user.id}`);

    // 3. Сохраняем в tripwire_users
    const { error: dbError } = await adminSupabase
      .from('tripwire_users')
      .insert({
        user_id: newUser.user.id,
        full_name: full_name,
        email: email,
        granted_by: currentUserId,
        manager_name: currentUserName || currentUserEmail || 'Unknown Manager',
        generated_password: generatedPassword, // В production хэшировать!
      });

    if (dbError) {
      console.error('❌ Error inserting to tripwire_users:', dbError);
      // Откатываем создание пользователя в auth
      await adminSupabase.auth.admin.deleteUser(newUser.user.id);
      throw new Error(`Database error: ${dbError.message}`);
    }

    console.log(`✅ Saved to tripwire_users table`);

    // 4. Отправляем Welcome Email
    const emailSent = await sendWelcomeEmail({
      to: email,
      full_name: full_name,
      email: email,
      password: generatedPassword,
    });

    // 5. Обновляем статус отправки email
    if (emailSent) {
      await adminSupabase
        .from('tripwire_users')
        .update({
          welcome_email_sent: true,
          welcome_email_sent_at: new Date().toISOString(),
        })
        .eq('user_id', newUser.user.id);
    }

    // 6. Логируем действие
    await adminSupabase.from('sales_activity_log').insert({
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
      generated_password: generatedPassword,
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
 */
export async function getTripwireUsers(params: GetTripwireUsersParams) {
  const { managerId, status, page = 1, limit = 20 } = params;

  try {
    let query = adminSupabase
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
 */
export async function getTripwireStats(managerId?: string) {
  try {
    const TRIPWIRE_PRICE = 5000; // Цена в тенге

    let query = adminSupabase
      .from('tripwire_users')
      .select('status, created_at, modules_completed');

    if (managerId) {
      query = query.eq('granted_by', managerId);
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
    const { error } = await adminSupabase
      .from('tripwire_users')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    // Логируем действие
    await adminSupabase.from('sales_activity_log').insert({
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
 */
export async function getSalesActivityLog(managerId: string, limit = 50) {
  try {
    const { data, error } = await adminSupabase
      .from('sales_activity_log')
      .select('*')
      .eq('manager_id', managerId)
      .order('created_at', { ascending: false })
      .limit(limit);

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
    const { data, error } = await adminSupabase.from('tripwire_users').select('*');

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
export async function getSalesChartData(managerId?: string, period: string = 'month') {
  try {
    const TRIPWIRE_PRICE = 5000;

    let query = adminSupabase.from('tripwire_users').select('created_at, granted_by');

    if (managerId) {
      query = query.eq('granted_by', managerId);
    }

    // Определяем период
    const now = new Date();
    let startDate: Date;

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

    query = query.gte('created_at', startDate.toISOString());

    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    // Группируем по датам
    const salesByDate = new Map<string, number>();

    for (const user of data || []) {
      const date = new Date(user.created_at);
      const dateKey =
        period === 'week'
          ? date.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric' })
          : period === 'year'
          ? date.toLocaleDateString('ru-RU', { month: 'short' })
          : date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });

      salesByDate.set(dateKey, (salesByDate.get(dateKey) || 0) + 1);
    }

    // Преобразуем в массив для графика
    const chartData = Array.from(salesByDate.entries()).map(([date, sales]) => ({
      date,
      sales,
      revenue: sales * TRIPWIRE_PRICE,
    }));

    return { data: chartData };
  } catch (error: any) {
    console.error('❌ Error fetching sales chart data:', error);
    throw error;
  }
}

