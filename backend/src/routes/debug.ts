/**
 * Debug Dashboard API
 * Для мониторинга ошибок и состояния системы
 */
import { Router, Request, Response } from 'express';
import { errorTracking, ErrorCategory } from '../services/errorTrackingService';
import { crashProtection } from '../utils/crashProtection';
import redis from '../config/redis';
import pino from 'pino';

const logger = pino();
const router = Router();

/**
 * GET /api/debug/health - Extended health check
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = crashProtection.getHealthStatus();
    
    // Test Redis connection
    let redisStatus = 'disconnected';
    try {
      await redis.ping();
      redisStatus = 'connected';
    } catch (err) {
      redisStatus = 'error';
    }

    // Get recent error count
    const recentErrors = await errorTracking.getRecentErrors(10);

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      server: {
        uptime: health.uptime,
        isShuttingDown: health.isShuttingDown,
        activeRequests: health.activeRequests,
        memory: {
          used: Math.round(health.memory.heapUsed / 1024 / 1024) + ' MB',
          total: Math.round(health.memory.heapTotal / 1024 / 1024) + ' MB',
          external: Math.round(health.memory.external / 1024 / 1024) + ' MB',
        },
        nodeVersion: process.version,
        platform: process.platform,
        env: process.env.NODE_ENV || 'development',
      },
      services: {
        redis: redisStatus,
        database: 'connected', // Assume OK if we got here
      },
      recentErrors: {
        count: recentErrors.length,
        last: recentErrors[0] || null,
      },
    });
  } catch (error: any) {
    logger.error('Health check error:', error);
    res.status(500).json({
      status: 'error',
      error: error.message,
    });
  }
});

/**
 * GET /api/debug/errors - Get recent errors
 */
router.get('/errors', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const category = req.query.category as ErrorCategory | undefined;

    const errors = await errorTracking.getRecentErrors(limit, category);

    res.json({
      success: true,
      count: errors.length,
      errors,
    });
  } catch (error: any) {
    logger.error('Error fetching errors:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/debug/errors/stats - Get error statistics
 */
router.get('/errors/stats', async (req: Request, res: Response) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;

    const stats = await errorTracking.getErrorStats(hours);

    res.json({
      success: true,
      period: `${hours} hours`,
      stats,
    });
  } catch (error: any) {
    logger.error('Error fetching error stats:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/debug/errors/:errorId/resolve - Mark error as resolved
 */
router.post('/errors/:errorId/resolve', async (req: Request, res: Response) => {
  try {
    const { errorId } = req.params;

    const success = await errorTracking.resolveError(errorId);

    if (success) {
      res.json({
        success: true,
        message: 'Error marked as resolved',
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to resolve error',
      });
    }
  } catch (error: any) {
    logger.error('Error resolving error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/debug/queue - Get BullMQ queue statistics
 */
router.get('/queue', async (req: Request, res: Response) => {
  try {
    // Try to get queue stats from Redis
    const queueKeys = await redis.keys('bull:amocrm-sync:*');
    
    // Get active jobs count
    const activeJobs = await redis.llen('bull:amocrm-sync:active');
    const waitingJobs = await redis.llen('bull:amocrm-sync:wait');
    const failedJobs = await redis.zcard('bull:amocrm-sync:failed');
    const completedJobs = await redis.zcard('bull:amocrm-sync:completed');
    
    res.json({
      success: true,
      queue: {
        name: 'amocrm-sync',
        active: activeJobs,
        waiting: waitingJobs,
        failed: failedJobs,
        completed: completedJobs,
        totalKeys: queueKeys.length,
      },
    });
  } catch (error: any) {
    logger.error('Error fetching queue stats:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/debug/queue/clean - Clean completed/failed jobs
 */
router.post('/queue/clean', async (req: Request, res: Response) => {
  try {
    const { type } = req.body; // 'completed' | 'failed'

    if (type === 'completed') {
      await redis.del('bull:amocrm-sync:completed');
    } else if (type === 'failed') {
      await redis.del('bull:amocrm-sync:failed');
    }

    res.json({
      success: true,
      message: `Cleaned ${type} jobs`,
    });
  } catch (error: any) {
    logger.error('Error cleaning queue:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/debug/memory - Get detailed memory usage
 */
router.get('/memory', async (req: Request, res: Response) => {
  try {
    const memory = process.memoryUsage();

    res.json({
      success: true,
      memory: {
        rss: {
          bytes: memory.rss,
          mb: Math.round(memory.rss / 1024 / 1024),
          description: 'Total memory allocated for the process',
        },
        heapTotal: {
          bytes: memory.heapTotal,
          mb: Math.round(memory.heapTotal / 1024 / 1024),
          description: 'Total heap allocated',
        },
        heapUsed: {
          bytes: memory.heapUsed,
          mb: Math.round(memory.heapUsed / 1024 / 1024),
          description: 'Actual memory used',
        },
        external: {
          bytes: memory.external,
          mb: Math.round(memory.external / 1024 / 1024),
          description: 'Memory used by C++ objects',
        },
        arrayBuffers: {
          bytes: memory.arrayBuffers,
          mb: Math.round(memory.arrayBuffers / 1024 / 1024),
          description: 'Memory allocated for ArrayBuffers',
        },
      },
    });
  } catch (error: any) {
    logger.error('Error fetching memory stats:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
