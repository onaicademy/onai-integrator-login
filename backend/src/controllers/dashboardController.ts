/**
 * Dashboard Controller
 * Контроллер для дашборда студента (/neurohub)
 */

import { Request, Response } from 'express';
import { getStudentDashboard } from '../services/dashboardService';

/**
 * GET /api/analytics/student/:userId/dashboard
 * Получить данные дашборда для студента
 */
export async function getDashboard(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.params;

    console.log('📊 [DashboardController] Запрос dashboard для:', userId);

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    const dashboardData = await getStudentDashboard(userId);

    console.log('✅ [DashboardController] Dashboard отправлен');

    res.status(200).json({
      success: true,
      data: dashboardData,
    });
  } catch (error: any) {
    console.error('❌ [DashboardController] Ошибка:', error);
    res.status(500).json({
      error: 'Failed to fetch dashboard',
      message: error.message,
    });
  }
}

