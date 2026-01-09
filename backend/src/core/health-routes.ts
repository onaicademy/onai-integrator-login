/**
 * Health Routes - Unified health monitoring endpoints
 *
 * Provides a single source of truth for system health.
 * All other health endpoints should be deprecated in favor of these.
 *
 * Endpoints:
 * - GET /health - Quick liveness check
 * - GET /health/ready - Readiness check (all critical services)
 * - GET /health/detailed - Full system status (protected)
 * - POST /health/recover/:service - Force recovery attempt
 */

import { Router, Request, Response } from 'express';
import { healthManager, SystemHealth } from './service-health-manager.js';
import { getLogger } from './secure-logger.js';
import { dataMasker } from './data-masker.js';

const router = Router();
const logger = getLogger('HealthRoutes');

/**
 * GET /health
 * Quick liveness check - returns 200 if server is running
 * Used by load balancers and Kubernetes probes
 */
router.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /health/ready
 * Readiness check - returns 200 only if all critical services are healthy
 * Used by load balancers to determine if traffic should be routed
 */
router.get('/ready', (req: Request, res: Response) => {
  const health = healthManager.getSystemHealth();

  const isReady = health.status !== 'critical';
  const statusCode = isReady ? 200 : 503;

  res.status(statusCode).json({
    ready: isReady,
    status: health.status,
    criticalServicesDown: health.criticalServicesDown,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /health/detailed
 * Full system health status
 * Should be protected in production (requires auth or internal network)
 */
router.get('/detailed', (req: Request, res: Response) => {
  const isProduction = process.env.NODE_ENV === 'production';

  // In production, require authorization or internal header
  if (isProduction) {
    const authHeader = req.headers.authorization;
    const internalHeader = req.headers['x-internal-request'];

    if (!authHeader && internalHeader !== 'true') {
      // Still return basic info without auth
      const health = healthManager.getSystemHealth();
      return res.json({
        status: health.status,
        uptime: formatUptime(health.uptime),
        services: Object.fromEntries(
          Object.entries(health.services).map(([name, info]) => [
            name,
            { status: info.status },
          ])
        ),
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Full detailed response
  const health = healthManager.getSystemHealth();

  const response = {
    status: health.status,
    uptime: formatUptime(health.uptime),
    uptimeMs: health.uptime,
    services: health.services,
    criticalServicesDown: health.criticalServicesDown,
    warnings: health.warnings,
    memory: getMemoryStats(),
    timestamp: new Date().toISOString(),
    environment: isProduction ? 'production' : 'development',
  };

  // Mask any sensitive data in the response
  const maskedResponse = dataMasker.mask(response);

  res.json(maskedResponse);
});

/**
 * GET /health/service/:name
 * Get status of a specific service
 */
router.get('/service/:name', (req: Request, res: Response) => {
  const { name } = req.params;
  const health = healthManager.getSystemHealth();
  const service = health.services[name];

  if (!service) {
    return res.status(404).json({
      error: 'Service not found',
      availableServices: Object.keys(health.services),
    });
  }

  res.json({
    name,
    ...service,
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /health/recover/:service
 * Force recovery attempt for a specific service
 * Should be protected in production
 */
router.post('/recover/:service', async (req: Request, res: Response) => {
  const isProduction = process.env.NODE_ENV === 'production';

  // In production, require authorization
  if (isProduction) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization required' });
    }
    // TODO: Validate auth token
  }

  const { service } = req.params;

  logger.info(`Manual recovery requested for ${service}`);

  const success = await healthManager.forceRecovery(service);

  if (success) {
    res.json({
      message: `Recovery initiated for ${service}`,
      timestamp: new Date().toISOString(),
    });
  } else {
    res.status(404).json({
      error: 'Service not found or recovery not available',
    });
  }
});

/**
 * GET /health/metrics
 * Prometheus-compatible metrics endpoint
 */
router.get('/metrics', (req: Request, res: Response) => {
  const health = healthManager.getSystemHealth();
  const memory = process.memoryUsage();

  const metrics: string[] = [
    '# HELP system_health Overall system health status',
    '# TYPE system_health gauge',
    `system_health{status="${health.status}"} ${health.status === 'healthy' ? 1 : health.status === 'degraded' ? 0.5 : 0}`,
    '',
    '# HELP system_uptime_seconds System uptime in seconds',
    '# TYPE system_uptime_seconds counter',
    `system_uptime_seconds ${Math.floor(health.uptime / 1000)}`,
    '',
    '# HELP service_health Service health status',
    '# TYPE service_health gauge',
  ];

  for (const [name, info] of Object.entries(health.services)) {
    const value = info.status === 'healthy' ? 1 : info.status === 'degraded' ? 0.5 : 0;
    metrics.push(`service_health{service="${name}",status="${info.status}"} ${value}`);
  }

  metrics.push('');
  metrics.push('# HELP service_latency_ms Service latency in milliseconds');
  metrics.push('# TYPE service_latency_ms gauge');

  for (const [name, info] of Object.entries(health.services)) {
    if (info.latencyMs !== null) {
      metrics.push(`service_latency_ms{service="${name}"} ${info.latencyMs}`);
    }
  }

  metrics.push('');
  metrics.push('# HELP nodejs_memory_heap_used_bytes Node.js heap memory used');
  metrics.push('# TYPE nodejs_memory_heap_used_bytes gauge');
  metrics.push(`nodejs_memory_heap_used_bytes ${memory.heapUsed}`);

  metrics.push('');
  metrics.push('# HELP nodejs_memory_heap_total_bytes Node.js heap memory total');
  metrics.push('# TYPE nodejs_memory_heap_total_bytes gauge');
  metrics.push(`nodejs_memory_heap_total_bytes ${memory.heapTotal}`);

  res.set('Content-Type', 'text/plain');
  res.send(metrics.join('\n'));
});

// =====================================================
// Utility Functions
// =====================================================

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

function getMemoryStats(): Record<string, string | number> {
  const used = process.memoryUsage();
  return {
    heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)}MB`,
    external: `${Math.round(used.external / 1024 / 1024)}MB`,
    rss: `${Math.round(used.rss / 1024 / 1024)}MB`,
    usagePercent: Math.round((used.heapUsed / used.heapTotal) * 100),
  };
}

export default router;
