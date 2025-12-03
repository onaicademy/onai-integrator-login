import { Request, Response } from 'express';
import * as tripwireManagerService from '../services/tripwireManagerService';

/**
 * POST /api/admin/tripwire/users
 * Создает нового Tripwire пользователя
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

    const currentUserId = currentUser.id;
    const currentUserEmail = currentUser.email;
    const currentUserName = currentUser.user_metadata?.full_name;

    // Проверяем роль пользователя
    const userRole = currentUser.user_metadata?.role || currentUser.role;
    if (userRole !== 'admin' && userRole !== 'sales') {
      return res.status(403).json({
        error: 'Forbidden: Only admins and sales managers can create tripwire users',
      });
    }

    // Создаем пользователя
    const result = await tripwireManagerService.createTripwireUser({
      full_name,
      email,
      password, // Передаем пароль из формы
      currentUserId,
      currentUserEmail,
      currentUserName,
    });

    return res.status(201).json(result);
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

    // Если не админ, показываем только своих пользователей
    const finalManagerId = userRole === 'admin' ? managerId : currentUser.id;

    const result = await tripwireManagerService.getTripwireUsers({
      managerId: finalManagerId,
      status,
      page,
      limit,
    });

    return res.status(200).json(result);
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

    // Если не админ, показываем только свою статистику
    const managerId = userRole === 'admin' ? undefined : currentUser.id;

    const stats = await tripwireManagerService.getTripwireStats(managerId);

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

    const result = await tripwireManagerService.updateTripwireUserStatus(
      id,
      status,
      currentUser.id
    );

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

    const limit = parseInt(req.query.limit as string) || 50;

    const activity = await tripwireManagerService.getSalesActivityLog(currentUser.id, limit);

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

    const chartData = await tripwireManagerService.getSalesChartData(managerId, period);

    return res.status(200).json(chartData);
  } catch (error: any) {
    console.error('❌ Error in getSalesChartData:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error',
    });
  }
}

