/**
 * OpenAI Status API
 *
 * Мониторинг endpoint для проверки состояния Rate Limiter и Client Pool.
 *
 * Endpoints:
 * - GET /api/admin/openai-status - Полный статус
 * - GET /api/admin/openai-status/health - Быстрая проверка здоровья
 * - POST /api/admin/openai-status/reset/:type - Сброс circuit breaker (для тестирования)
 */

import { Router, Request, Response } from 'express';
import { getRateLimiterStats, getClientPoolStats, openAIRateLimiter } from '../../services/openaiService';
import { AssistantType } from '../../services/openai-client-pool';

const router = Router();

/**
 * GET /api/admin/openai-status
 * Полный статус Rate Limiter и Client Pool
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const rateLimiterStats = getRateLimiterStats();
    const clientPoolStats = getClientPoolStats();

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      rateLimiter: rateLimiterStats,
      clientPool: clientPoolStats,
    });
  } catch (error: any) {
    console.error('[OpenAI Status] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/admin/openai-status/health
 * Быстрая проверка здоровья (для мониторинга)
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const stats = getRateLimiterStats();

    // Определяем HTTP статус по состоянию системы
    const statusCode = stats.status === 'critical' ? 503
      : stats.status === 'degraded' ? 200
      : 200;

    res.status(statusCode).json({
      status: stats.status,
      queueLength: stats.queueLength,
      circuitBreakers: stats.circuitBreakers,
      estimatedWaitSeconds: stats.estimatedWaitSeconds,
      uptime: stats.uptime,
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      error: error.message,
    });
  }
});

/**
 * POST /api/admin/openai-status/reset/:type
 * Сброс circuit breaker для типа ассистента (для тестирования)
 *
 * ВНИМАНИЕ: Только для тестирования! Не использовать в продакшене без причины.
 */
router.post('/reset/:type', async (req: Request, res: Response) => {
  try {
    const { type } = req.params;

    if (!['curator', 'mentor', 'analyst'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid type: ${type}. Must be curator, mentor, or analyst.`,
      });
    }

    openAIRateLimiter.resetCircuitBreaker(type as AssistantType);

    res.json({
      success: true,
      message: `Circuit breaker for ${type} has been reset`,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[OpenAI Status] Reset error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/admin/openai-status/queues
 * Детальная информация по очередям
 */
router.get('/queues', async (req: Request, res: Response) => {
  try {
    const stats = getRateLimiterStats();

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      totalQueue: stats.queueLength,
      queues: stats.queues,
      estimatedWaitSeconds: stats.estimatedWaitSeconds,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
