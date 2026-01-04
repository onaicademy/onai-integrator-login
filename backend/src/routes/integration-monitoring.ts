/**
 * Integration Monitoring Routes
 * API endpoints для просмотра логов интеграций и аналитики
 */

import express from 'express';
import { trafficAdminSupabase } from '../config/supabase-traffic';

const router = express.Router();

/**
 * GET /api/integration-monitoring/stats
 * Получить статистику интеграций за последние 24 часа (или кастомный период)
 */
router.get('/stats', async (req, res) => {
  try {
    const { period = '24h', serviceName } = req.query;

    // Определяем временной период
    let hoursAgo = 24;
    if (period === '1h') hoursAgo = 1;
    else if (period === '6h') hoursAgo = 6;
    else if (period === '24h') hoursAgo = 24;
    else if (period === '7d') hoursAgo = 24 * 7;
    else if (period === '30d') hoursAgo = 24 * 30;

    const since = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();

    // Базовый запрос
    let query = trafficAdminSupabase
      .from('integration_logs')
      .select('*')
      .gte('created_at', since);

    // Фильтр по сервису если указан
    if (serviceName && typeof serviceName === 'string') {
      query = query.eq('service_name', serviceName);
    }

    const { data: logs, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching integration logs:', error);
      return res.status(500).json({ error: 'Failed to fetch logs' });
    }

    // Группируем статистику
    const stats: Record<string, {
      total: number;
      success: number;
      failed: number;
      pending: number;
      retrying: number;
      avgDuration: number;
      recentErrors: Array<{ action: string; error: string; timestamp: string }>;
    }> = {};

    logs?.forEach((log: any) => {
      if (!stats[log.service_name]) {
        stats[log.service_name] = {
          total: 0,
          success: 0,
          failed: 0,
          pending: 0,
          retrying: 0,
          avgDuration: 0,
          recentErrors: [],
        };
      }

      const service = stats[log.service_name];
      service.total++;

      if (log.status === 'success') service.success++;
      else if (log.status === 'failed') service.failed++;
      else if (log.status === 'pending') service.pending++;
      else if (log.status === 'retrying') service.retrying++;

      if (log.duration_ms) {
        service.avgDuration = (service.avgDuration * (service.total - 1) + log.duration_ms) / service.total;
      }

      if (log.status === 'failed' && service.recentErrors.length < 5) {
        service.recentErrors.push({
          action: log.action,
          error: log.error_message || 'Unknown error',
          timestamp: log.created_at,
        });
      }
    });

    res.json({
      period: `${hoursAgo}h`,
      since,
      services: stats,
      totalLogs: logs?.length || 0,
    });
  } catch (error: any) {
    console.error('❌ Error in /stats endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/integration-monitoring/failures
 * Получить последние ошибки интеграций
 */
router.get('/failures', async (req, res) => {
  try {
    const { limit = '50', serviceName } = req.query;

    let query = trafficAdminSupabase
      .from('integration_logs')
      .select('*')
      .eq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit as string));

    if (serviceName && typeof serviceName === 'string') {
      query = query.eq('service_name', serviceName);
    }

    const { data: failures, error } = await query;

    if (error) {
      console.error('❌ Error fetching failures:', error);
      return res.status(500).json({ error: 'Failed to fetch failures' });
    }

    res.json({
      failures: failures || [],
      count: failures?.length || 0,
    });
  } catch (error: any) {
    console.error('❌ Error in /failures endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/integration-monitoring/service/:serviceName
 * Получить логи конкретного сервиса
 */
router.get('/service/:serviceName', async (req, res) => {
  try {
    const { serviceName } = req.params;
    const { limit = '100', status, action } = req.query;

    let query = trafficAdminSupabase
      .from('integration_logs')
      .select('*')
      .eq('service_name', serviceName)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit as string));

    if (status && typeof status === 'string') {
      query = query.eq('status', status);
    }

    if (action && typeof action === 'string') {
      query = query.eq('action', action);
    }

    const { data: logs, error } = await query;

    if (error) {
      console.error('❌ Error fetching service logs:', error);
      return res.status(500).json({ error: 'Failed to fetch logs' });
    }

    res.json({
      service: serviceName,
      logs: logs || [],
      count: logs?.length || 0,
    });
  } catch (error: any) {
    console.error('❌ Error in /service/:serviceName endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/integration-monitoring/recent
 * Получить последние логи всех интеграций
 */
router.get('/recent', async (req, res) => {
  try {
    const { limit = '50' } = req.query;

    const { data: logs, error } = await trafficAdminSupabase
      .from('integration_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit as string));

    if (error) {
      console.error('❌ Error fetching recent logs:', error);
      return res.status(500).json({ error: 'Failed to fetch logs' });
    }

    res.json({
      logs: logs || [],
      count: logs?.length || 0,
    });
  } catch (error: any) {
    console.error('❌ Error in /recent endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/integration-monitoring/health
 * Health check endpoint для мониторинга системы интеграций
 */
router.get('/health', async (req, res) => {
  try {
    // Проверяем последние 10 минут
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const { data: recentLogs, error } = await trafficAdminSupabase
      .from('integration_logs')
      .select('service_name, status')
      .gte('created_at', since);

    if (error) {
      return res.status(500).json({
        status: 'unhealthy',
        error: 'Failed to fetch logs',
      });
    }

    // Подсчитываем метрики
    const total = recentLogs?.length || 0;
    const failed = recentLogs?.filter((log: any) => log.status === 'failed').length || 0;
    const failureRate = total > 0 ? (failed / total) * 100 : 0;

    // Определяем статус здоровья
    let status = 'healthy';
    if (failureRate > 50) status = 'critical';
    else if (failureRate > 20) status = 'degraded';
    else if (failureRate > 5) status = 'warning';

    res.json({
      status,
      metrics: {
        totalRequests: total,
        failedRequests: failed,
        failureRate: Math.round(failureRate * 100) / 100,
        period: '10m',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Error in /health endpoint:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});

export default router;
