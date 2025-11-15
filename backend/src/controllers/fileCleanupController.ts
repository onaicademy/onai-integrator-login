import { Request, Response } from 'express';
import * as fileCleanupService from '../services/fileCleanupService';

/**
 * POST /api/admin/cleanup/run
 * Запускает очистку файлов вручную (только для админов)
 */
export async function runCleanup(req: Request, res: Response) {
  try {
    console.log('[CleanupController] Запуск ручной очистки...');

    const result = await fileCleanupService.runManualCleanup();

    res.json({
      success: true,
      message: 'Cleanup completed successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('[CleanupController] ❌ Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to run cleanup',
    });
  }
}

/**
 * GET /api/admin/cleanup/stats
 * Получает статистику по файлам для очистки
 */
export async function getStats(req: Request, res: Response) {
  try {
    console.log('[CleanupController] Получение статистики...');

    const stats = await fileCleanupService.getCleanupStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('[CleanupController] ❌ Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get stats',
    });
  }
}

/**
 * GET /api/admin/cleanup/history
 * Получает историю выполнения очисток
 */
export async function getHistory(req: Request, res: Response) {
  try {
    console.log('[CleanupController] Получение истории...');

    const limit = parseInt(req.query.limit as string) || 20;
    const history = await fileCleanupService.getCleanupHistory(limit);

    res.json({
      success: true,
      data: history,
    });
  } catch (error: any) {
    console.error('[CleanupController] ❌ Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get history',
    });
  }
}


