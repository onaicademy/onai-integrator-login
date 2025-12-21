import { Request, Response } from 'express';
import * as tripwireManagerService from '../services/tripwireManagerService';
import { supabase } from '../config/supabase';
import { tripwireAdminSupabase } from '../config/supabase-tripwire'; // 🔥 TRIPWIRE SUPABASE
import { tripwirePool } from '../config/tripwire-pool'; // 🔥 DIRECT POSTGRES для stats
import { getSystemMode, enqueueUserCreation, logHealthEvent } from '../services/queueService'; // 🚀 QUEUE

/**
 * POST /api/admin/tripwire/users
 * Создает нового Tripwire пользователя
 * 🚀 QUEUE-BASED: Routes through Redis Queue or fallback to sync
 */
export async function createTripwireUser(req: Request, res: Response) {
  try {
    const { full_name, email, password } = req.body;

    // Валидация входных данных
    if (!full_name || !email) {
      return res.status(400).json({
        error: 'Full name and email are required',
      });
    }

    // Валидация пароля
    if (!password || password.length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters',
      });
    }

    // Валидация email формата
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email format',
      });
    }

    // Получаем данные текущего менеджера
    const currentUser = (req as any).user;
    
    if (!currentUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // ✅ В JWT токене ID пользователя хранится в поле 'sub' (subject)
    const currentUserId = currentUser.sub || currentUser.id;
    
    if (!currentUserId) {
      return res.status(400).json({ error: 'User ID not found in token' });
    }
    const currentUserEmail = currentUser.email;
    const currentUserName = currentUser.user_metadata?.full_name;

    // Проверяем роль пользователя
    const userRole = currentUser.user_metadata?.role || currentUser.role;
    if (userRole !== 'admin' && userRole !== 'sales') {
      return res.status(403).json({
        error: 'Forbidden: Only admins and sales managers can create tripwire users',
      });
    }

    // 🚀 QUEUE LOGIC: Check system mode
    const mode = await getSystemMode();
    console.log(`🔄 [CREATE_USER] System mode: ${mode}`);
    
    // ASYNC MODE (default)
    if (mode === 'async_queue') {
      try {
        console.log(`🚀 [QUEUE] Enqueueing user creation for ${email}`);
        
        await enqueueUserCreation({
          full_name,
          email,
          password,
          currentUserId,
          currentUserEmail,
          currentUserName,
        });
        
        // 202 Accepted - job queued
        return res.status(202).json({
          success: true,
          message: 'User creation queued',
          email,
          status: 'processing',
          mode: 'async',
        });
      } catch (queueError: any) {
        // AUTOMATIC FALLBACK: If Redis fails, use sync mode
        console.error('❌ [QUEUE] Redis failed, falling back to sync:', queueError.message);
        
        // 🚨 CRITICAL: Log with Telegram alert
        await logHealthEvent('CRITICAL', `Redis queue failed! Auto-fallback to sync mode for ${email}`, {
          error: queueError.message,
          email,
          stack: queueError.stack
        });
        
        // Continue to sync processing below
      }
    }
    
    // SYNC MODE (fallback or manual override)
    console.log(`⚠️ [SYNC] Processing user creation synchronously for ${email}`);
    
    const result = await tripwireManagerService.createTripwireUser({
      full_name,
      email,
      password,
      currentUserId,
      currentUserEmail,
      currentUserName,
    });

    return res.status(201).json({
      ...result,
      mode: 'sync',
    });
  } catch (error: any) {
    console.error('❌ Error in createTripwireUser:', error);

    if (error.message.includes('duplicate') || error.message.includes('already exists')) {
      return res.status(409).json({
        error: 'User with this email already exists',
      });
    }

    return res.status(500).json({
      error: error.message || 'Internal server error',
    });
  }
}

/**
 * GET /api/admin/tripwire/users
 * Получает список Tripwire пользователей
 */
export async function getTripwireUsers(req: Request, res: Response) {
  try {
    const currentUser = (req as any).user;
    if (!currentUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Проверяем роль
    const userRole = currentUser.user_metadata?.role || currentUser.role;
    if (userRole !== 'admin' && userRole !== 'sales') {
      return res.status(403).json({
        error: 'Forbidden: Only admins and sales managers can view tripwire users',
      });
    }

    // Параметры запроса
    const managerId = req.query.manager_id as string | undefined;
    const status = req.query.status as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    // 🔥 FIX: Use currentUser.sub for manager ID
    const currentUserId = currentUser.sub || currentUser.id;
    if (!currentUserId && userRole !== 'admin') {
      return res.status(400).json({ error: 'Invalid user token: missing user ID' });
    }

    // Если не админ, показываем только своих пользователей
    const finalManagerId = userRole === 'admin' ? managerId : currentUserId;

    const result = await tripwireManagerService.getTripwireUsers({
      managerId: finalManagerId,
      status,
      page,
      limit,
      startDate,
      endDate,
    });

    // 🔥 FORMAT RESPONSE: Frontend expects { users: [...], total: N }
    const total = result.length > 0 ? parseInt(result[0].total_count) || result.length : 0;
    
    console.log(`✅ Returning ${result.length} users, total=${total}`);
    
    return res.status(200).json({
      users: result,
      total: total,
    });
  } catch (error: any) {
    console.error('❌ Error in getTripwireUsers:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error',
    });
  }
}

/**
 * GET /api/admin/tripwire/stats
 * Получает статистику по Tripwire пользователям
 */
export async function getTripwireStats(req: Request, res: Response) {
  try {
    const currentUser = (req as any).user;
    if (!currentUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Проверяем роль
    const userRole = currentUser.user_metadata?.role || currentUser.role;
    if (userRole !== 'admin' && userRole !== 'sales') {
      return res.status(403).json({
        error: 'Forbidden',
      });
    }

    // 🔥 FIX: Use currentUser.sub for manager ID
    const currentUserId = currentUser.sub || currentUser.id;
    if (!currentUserId && userRole !== 'admin') {
      return res.status(400).json({ error: 'Invalid user token: missing user ID' });
    }

    // Если не админ, показываем только свою статистику
    const managerId = userRole === 'admin' ? undefined : currentUserId;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const stats = await tripwireManagerService.getTripwireStats(managerId, startDate, endDate);

    return res.status(200).json(stats);
  } catch (error: any) {
    console.error('❌ Error in getTripwireStats:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error',
    });
  }
}

/**
 * PATCH /api/admin/tripwire/users/:id
 * Обновляет статус Tripwire пользователя
 */
export async function updateTripwireUserStatus(req: Request, res: Response) {
  try {
    const currentUser = (req as any).user;
    if (!currentUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userRole = currentUser.user_metadata?.role || currentUser.role;
    if (userRole !== 'admin' && userRole !== 'sales') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const validStatuses = ['active', 'inactive', 'completed', 'blocked'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    // 🔥 FIX: Use currentUser.sub for manager ID
    const currentUserId = currentUser.sub || currentUser.id;
    if (!currentUserId) {
      return res.status(400).json({ error: 'Invalid user token: missing user ID' });
    }

    const result = await tripwireManagerService.updateTripwireUserStatus(
      id,
      status,
      currentUserId
    );

    // Логируем изменение статуса в activity log
    try {
      await tripwirePool.query(
        `INSERT INTO sales_activity_log (manager_id, action_type, target_user_id, details, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [
          currentUserId,
          'status_changed',
          id,
          JSON.stringify({
            new_status: status,
            changed_by: currentUser.email,
          }),
        ]
      );
      console.log('✅ [STATUS] Logged to sales_activity_log');
    } catch (logError) {
      console.error('⚠️ [STATUS] Failed to log status change:', logError);
      // Не критичная ошибка, продолжаем
    }

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('❌ Error in updateTripwireUserStatus:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error',
    });
  }
}

/**
 * GET /api/admin/tripwire/activity
 * Получает историю действий менеджера
 */
export async function getSalesActivityLog(req: Request, res: Response) {
  try {
    const currentUser = (req as any).user;
    if (!currentUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userRole = currentUser.user_metadata?.role || currentUser.role;
    if (userRole !== 'admin' && userRole !== 'sales') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // 🔥 FIX: Use currentUser.sub (JWT standard claim for user ID)
    const currentUserId = currentUser.sub || currentUser.id;
    if (!currentUserId) {
      console.error('❌ No user ID in JWT token:', currentUser);
      return res.status(400).json({ error: 'Invalid user token: missing user ID' });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const activity = await tripwireManagerService.getSalesActivityLog(currentUserId, limit, startDate, endDate);

    return res.status(200).json(activity);
  } catch (error: any) {
    console.error('❌ Error in getSalesActivityLog:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error',
    });
  }
}

/**
 * GET /api/admin/tripwire/leaderboard
 * Получает рейтинг всех менеджеров
 */
export async function getSalesLeaderboard(req: Request, res: Response) {
  try {
    const currentUser = (req as any).user;
    if (!currentUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userRole = currentUser.user_metadata?.role || currentUser.role;
    if (userRole !== 'admin' && userRole !== 'sales') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const leaderboard = await tripwireManagerService.getSalesLeaderboard();

    return res.status(200).json(leaderboard);
  } catch (error: any) {
    console.error('❌ Error in getSalesLeaderboard:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error',
    });
  }
}

/**
 * GET /api/admin/tripwire/sales-chart
 * Получает данные для графика продаж
 */
export async function getSalesChartData(req: Request, res: Response) {
  try {
    const currentUser = (req as any).user;
    if (!currentUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userRole = currentUser.user_metadata?.role || currentUser.role;
    if (userRole !== 'admin' && userRole !== 'sales') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const managerId = req.query.manager_id as string | undefined;
    const period = (req.query.period as string) || 'month';
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const chartData = await tripwireManagerService.getSalesChartData(managerId, period, startDate, endDate);

    return res.status(200).json(chartData);
  } catch (error: any) {
    console.error('❌ Error in getSalesChartData:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error',
    });
  }
}

/**
 * Получить МОЮ статистику продаж (для конкретного пользователя)
 * GET /api/admin/tripwire/my-stats
 * Возвращает: мои продажи, моя выручка, мои клиенты (привязаны к моему user_id)
 */
export async function getMyStats(req: Request, res: Response) {
  try {
    const currentUser = (req as any).user;
    if (!currentUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Получаем user_id текущего пользователя
    const userId = currentUser.sub || currentUser.id;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID not found' });
    }

    console.log(`📊 Getting personal stats for user_id: ${userId}`);

    // 🔧 FIX: Ищем в tripwire_users по granted_by (правильная колонка!)
    const { data: myUsers, error: usersError } = await tripwireAdminSupabase
      .from('tripwire_users')
      .select('*')
      .eq('granted_by', userId);

    if (usersError) {
      console.error('❌ Error fetching my users:', usersError);
      throw usersError;
    }

    console.log(`📊 Found ${myUsers?.length || 0} users for manager ${userId}`);

    const totalUsers = myUsers?.length || 0;
    
    // Считаем активных (status = 'active')
    const activeUsers = myUsers?.filter((u: any) => u.status === 'active').length || 0;

    // Считаем выручку: сумма всех price
    const totalRevenue = myUsers?.reduce((sum: number, u: any) => sum + (u.price || 0), 0) || 0;

    // Продажи за этот месяц
    const currentMonth = new Date().toISOString().slice(0, 7); // "2025-12"
    const thisMonthSales = myUsers?.filter((u: any) => {
      const createdAt = new Date(u.created_at).toISOString().slice(0, 7);
      return createdAt === currentMonth;
    }).length || 0;

    const stats = {
      totalSales: totalUsers,
      totalRevenue,
      activeUsers,
      thisMonthSales,
      userId, // Для отладки
    };

    console.log('✅ My personal stats:', stats);

    return res.status(200).json(stats);
  } catch (error: any) {
    console.error('❌ Error in getMyStats:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error',
    });
  }
}

/**
 * DELETE /api/admin/tripwire/users/:userId
 * Удаляет Tripwire студента
 * 🔥 ONLY FOR ADMIN (smmmcwin@gmail.com)
 */
/**
 * DELETE /api/admin/tripwire/users/:userId
 * Удаляет Tripwire пользователя полностью из системы
 * Доступ: admin и sales роли (SalesGuard на фронте + requireSalesOrAdmin middleware)
 */
export async function deleteTripwireUser(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const currentUser = (req as any).user;

    if (!currentUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userEmail = currentUser.email;
    const currentUserId = currentUser.sub || currentUser.id;

    console.log(`🗑️ [DELETE] Sales Manager ${userEmail} (ID: ${currentUserId}) is deleting user ${userId}`);

    // Удаляем через service
    const result = await tripwireManagerService.deleteTripwireUser(userId);

    // Логируем успешное удаление в activity log
    try {
      await tripwirePool.query(
        `INSERT INTO sales_activity_log (manager_id, action_type, target_user_id, details, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [
          currentUserId,
          'user_deleted',
          userId,
          JSON.stringify({
            email: result.email,
            full_name: result.full_name,
            deleted_by: userEmail,
          }),
        ]
      );
      console.log('✅ [DELETE] Logged to sales_activity_log');
    } catch (logError) {
      console.error('⚠️ [DELETE] Failed to log deletion:', logError);
      // Не критичная ошибка, продолжаем
    }

    return res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      ...result,
    });
  } catch (error: any) {
    console.error('❌ Error in deleteTripwireUser:', error);
    
    // Возвращаем детальную ошибку для Sales Manager
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      details: error.details || null,
      timestamp: new Date().toISOString(),
      userId: req.params.userId,
    });
  }
}

