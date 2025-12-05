/**
 * TRIPWIRE CONTROLLER V2 - DIRECT DB PATTERN
 * HTTP endpoints для Tripwire сервиса
 */

import { Request, Response } from 'express';
import * as TripwireService from '../services/tripwireService_V2';

/**
 * POST /api/tripwire/users
 * Создать нового Tripwire студента
 */
export async function createUser(req: Request, res: Response) {
  try {
    const { email, full_name, password, granted_by, manager_name } = req.body;

    // Валидация
    if (!email || !full_name || !password || !granted_by) {
      return res.status(400).json({
        error: 'Missing required fields: email, full_name, password, granted_by'
      });
    }

    const result = await TripwireService.createTripwireUser({
      email,
      full_name,
      password,
      granted_by,
      manager_name: manager_name || 'Unknown Manager'
    });

    res.status(201).json(result);
  } catch (error: any) {
    console.error('❌ [TripwireController] Create user error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to create tripwire user' 
    });
  }
}

/**
 * GET /api/tripwire/users
 * Получить список Tripwire студентов
 */
export async function getUsers(req: Request, res: Response) {
  try {
    const managerId = req.query.managerId as string | undefined;
    const status = req.query.status as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    const users = await TripwireService.getTripwireUsers({
      managerId,
      status,
      limit,
      offset
    });

    res.json({ users, count: users.length });
  } catch (error: any) {
    console.error('❌ [TripwireController] Get users error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to get tripwire users' 
    });
  }
}

/**
 * POST /api/tripwire/lessons/:lessonId/complete
 * Завершить урок (с автоматическим открытием следующего модуля)
 */
export async function completeLesson(req: Request, res: Response) {
  try {
    const { lessonId } = req.params;
    const { user_id, module_id } = req.body;

    if (!user_id || !module_id) {
      return res.status(400).json({
        error: 'Missing required fields: user_id, module_id'
      });
    }

    const result = await TripwireService.completeLesson({
      user_id,
      lesson_id: parseInt(lessonId),
      module_id: parseInt(module_id)
    });

    res.json(result);
  } catch (error: any) {
    console.error('❌ [TripwireController] Complete lesson error:', error);
    
    // Special handling для 80% rule violation
    if (error.message.includes('not watched enough')) {
      return res.status(400).json({ 
        error: error.message,
        code: 'INSUFFICIENT_WATCH_TIME'
      });
    }

    res.status(500).json({ 
      error: error.message || 'Failed to complete lesson' 
    });
  }
}

/**
 * POST /api/tripwire/lessons/:lessonId/video-tracking
 * Обновить прогресс просмотра видео (честный трекинг)
 */
export async function updateVideoTracking(req: Request, res: Response) {
  try {
    const { lessonId } = req.params;
    const { user_id, watched_segments, video_duration, current_position } = req.body;

    if (!user_id || !watched_segments || !video_duration) {
      return res.status(400).json({
        error: 'Missing required fields: user_id, watched_segments, video_duration'
      });
    }

    const result = await TripwireService.updateVideoTracking(
      user_id,
      parseInt(lessonId),
      watched_segments,
      video_duration,
      current_position || 0
    );

    res.json(result);
  } catch (error: any) {
    console.error('❌ [TripwireController] Update video tracking error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to update video tracking' 
    });
  }
}

/**
 * GET /api/tripwire/sales/stats
 * Получить статистику Sales Manager (RPC)
 */
export async function getSalesStats(req: Request, res: Response) {
  try {
    const managerId = req.query.managerId as string;

    if (!managerId) {
      return res.status(400).json({
        error: 'Missing required query parameter: managerId'
      });
    }

    const stats = await TripwireService.getSalesStats(managerId);
    res.json(stats);
  } catch (error: any) {
    console.error('❌ [TripwireController] Get sales stats error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to get sales stats' 
    });
  }
}

/**
 * GET /api/tripwire/sales/leaderboard
 * Получить рейтинг Sales Managers (RPC)
 */
export async function getLeaderboard(req: Request, res: Response) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const leaderboard = await TripwireService.getSalesLeaderboard(limit);
    res.json(leaderboard);
  } catch (error: any) {
    console.error('❌ [TripwireController] Get leaderboard error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to get leaderboard' 
    });
  }
}

/**
 * GET /api/tripwire/sales/chart
 * Получить данные для графика продаж (RPC)
 */
export async function getChartData(req: Request, res: Response) {
  try {
    const managerId = req.query.managerId as string;
    const daysBack = req.query.daysBack ? parseInt(req.query.daysBack as string) : 30;

    if (!managerId) {
      return res.status(400).json({
        error: 'Missing required query parameter: managerId'
      });
    }

    const chartData = await TripwireService.getSalesChartData(managerId, daysBack);
    res.json(chartData);
  } catch (error: any) {
    console.error('❌ [TripwireController] Get chart data error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to get chart data' 
    });
  }
}

/**
 * GET /api/tripwire/sales/activity
 * Получить историю действий менеджера (RPC)
 */
export async function getActivity(req: Request, res: Response) {
  try {
    const managerId = req.query.managerId as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    if (!managerId) {
      return res.status(400).json({
        error: 'Missing required query parameter: managerId'
      });
    }

    const activity = await TripwireService.getManagerActivity(managerId, limit);
    res.json(activity);
  } catch (error: any) {
    console.error('❌ [TripwireController] Get activity error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to get activity' 
    });
  }
}

/**
 * Health check endpoint
 */
export async function healthCheck(req: Request, res: Response) {
  res.json({
    status: 'ok',
    version: '2.0',
    architecture: 'Direct DB Pattern (90% Direct + 10% RPC)',
    timestamp: new Date().toISOString()
  });
}
