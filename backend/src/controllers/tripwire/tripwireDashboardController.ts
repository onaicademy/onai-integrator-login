/**
 * Tripwire Dashboard Controller
 * HTTP Controller для dashboard (ИЗОЛИРОВАННЫЙ для Tripwire DB)
 */

import { Request, Response } from 'express';
import { getStudentDashboard } from '../../services/tripwire/tripwireDashboardService';

/**
 * GET /api/tripwire/analytics/student/:userId/dashboard
 * Получить данные для dashboard студента
 */
export async function getDashboard(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.params;
    console.log('📊 [Tripwire DashboardController] Получение dashboard для:', userId);
    
    const dashboardData = await getStudentDashboard(userId);
    
    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error: any) {
    console.error('❌ [Tripwire DashboardController] Ошибка getDashboard:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch dashboard'
    });
  }
}

