/**
 * Service Registry - Pre-configured service health checks
 *
 * Registers all critical platform services with the HealthManager.
 * Each service has:
 * - Health check function
 * - Recovery function (where applicable)
 * - Dependency declarations
 * - Priority levels
 *
 * @architecture This file should be imported early in server startup
 * to ensure all services are monitored from the beginning.
 */

import { healthManager, ServiceConfig } from './service-health-manager.js';
import { getLogger } from './secure-logger.js';

const logger = getLogger('ServiceRegistry');

// =====================================================
// Database Services
// =====================================================

/**
 * Register Supabase Main Database
 */
export function registerSupabaseMain(): void {
  const config: ServiceConfig = {
    name: 'supabase-main',
    priority: 'critical',
    checkIntervalMs: 30000,
    timeoutMs: 5000,
    maxConsecutiveFailures: 3,

    async healthCheck() {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.SUPABASE_URL || '',
          process.env.SUPABASE_SERVICE_ROLE_KEY || ''
        );

        const start = Date.now();
        const { error } = await supabase.from('profiles').select('id').limit(1);
        const latencyMs = Date.now() - start;

        if (error) {
          return { healthy: false, message: error.message, latencyMs };
        }

        return { healthy: true, latencyMs };
      } catch (error: any) {
        return { healthy: false, message: error.message };
      }
    },

    async recover() {
      // Supabase clients are stateless, just verify connection
      logger.info('Attempting Supabase Main recovery...');
      return true; // Let next health check verify
    },
  };

  healthManager.register(config);
}

/**
 * Register Supabase Tripwire Database
 */
export function registerSupabaseTripwire(): void {
  const config: ServiceConfig = {
    name: 'supabase-tripwire',
    priority: 'high',
    checkIntervalMs: 30000,
    timeoutMs: 5000,
    maxConsecutiveFailures: 3,

    async healthCheck() {
      try {
        const { tripwirePool } = await import('../config/tripwire-pool.js');
        const start = Date.now();
        const result = await tripwirePool.query('SELECT 1 as health');
        const latencyMs = Date.now() - start;

        return { healthy: result.rows.length > 0, latencyMs };
      } catch (error: any) {
        return { healthy: false, message: error.message };
      }
    },

    async recover() {
      logger.info('Attempting Tripwire DB recovery...');
      try {
        const { tripwirePool } = await import('../config/tripwire-pool.js');
        // Try to reconnect by executing a simple query
        await tripwirePool.query('SELECT 1');
        return true;
      } catch {
        return false;
      }
    },
  };

  healthManager.register(config);
}

/**
 * Register Traffic Database
 */
export function registerTrafficDB(): void {
  const config: ServiceConfig = {
    name: 'traffic-db',
    priority: 'medium',
    checkIntervalMs: 60000, // Less frequent
    timeoutMs: 5000,
    maxConsecutiveFailures: 5,

    async healthCheck() {
      try {
        const { getPool } = await import('../config/traffic-db.js');
        const pool = getPool(); // Это инициализирует pool если он null
        const start = Date.now();
        const result = await pool.query('SELECT 1 as health');
        const latencyMs = Date.now() - start;

        return { healthy: result.rows.length > 0, latencyMs };
      } catch (error: any) {
        return { healthy: false, message: error.message };
      }
    },
  };

  healthManager.register(config);
}

// =====================================================
// External API Services
// =====================================================

/**
 * Register OpenAI API
 */
export function registerOpenAI(): void {
  const config: ServiceConfig = {
    name: 'openai-api',
    priority: 'high',
    dependencies: ['supabase-main'], // Needs DB for assistant IDs
    checkIntervalMs: 60000,
    timeoutMs: 10000,
    maxConsecutiveFailures: 3,

    async healthCheck() {
      try {
        const { clientPool } = await import('../services/openai-client-pool.js');
        const start = Date.now();

        // Simple API test - list models (low cost)
        const { client } = clientPool.getClient('curator');
        await client.models.list();

        const latencyMs = Date.now() - start;
        return { healthy: true, latencyMs };
      } catch (error: any) {
        // Rate limit is not unhealthy, just busy
        if (error.status === 429) {
          return { healthy: true, message: 'Rate limited but operational' };
        }
        return { healthy: false, message: error.message };
      }
    },

    async onDependencyFailed(dependency: string) {
      logger.warn(`OpenAI pausing due to dependency failure: ${dependency}`);
      // Could pause rate limiter queue here
    },
  };

  healthManager.register(config);
}

/**
 * Register Groq API
 */
export function registerGroq(): void {
  const config: ServiceConfig = {
    name: 'groq-api',
    priority: 'medium',
    checkIntervalMs: 60000,
    timeoutMs: 10000,
    maxConsecutiveFailures: 5,

    async healthCheck() {
      try {
        const OpenAI = (await import('openai')).default;
        const groq = new OpenAI({
          apiKey: process.env.GROQ_API_KEY || '',
          baseURL: 'https://api.groq.com/openai/v1',
        });

        const start = Date.now();
        await groq.models.list();
        const latencyMs = Date.now() - start;

        return { healthy: true, latencyMs };
      } catch (error: any) {
        return { healthy: false, message: error.message };
      }
    },
  };

  healthManager.register(config);
}

/**
 * Register AmoCRM API
 */
export function registerAmoCRM(): void {
  const config: ServiceConfig = {
    name: 'amocrm-api',
    priority: 'high',
    dependencies: ['supabase-main'], // Token stored in DB
    checkIntervalMs: 60000,
    timeoutMs: 30000, // AmoCRM can be slow
    maxConsecutiveFailures: 3,
    recoveryBackoffMs: 10000,

    async healthCheck() {
      try {
        const token = process.env.AMOCRM_ACCESS_TOKEN;
        const domain = process.env.AMOCRM_DOMAIN || 'onaiagencykz';

        if (!token) {
          return { healthy: false, message: 'AmoCRM token not configured' };
        }

        const start = Date.now();
        const response = await fetch(`https://${domain}.amocrm.ru/api/v4/account`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        const latencyMs = Date.now() - start;

        if (response.status === 401) {
          return { healthy: false, message: 'Token expired or invalid', latencyMs };
        }

        return { healthy: response.ok, latencyMs };
      } catch (error: any) {
        return { healthy: false, message: error.message };
      }
    },

    async onDependencyFailed(dependency: string) {
      logger.warn(`AmoCRM pausing due to dependency failure: ${dependency}`);
    },
  };

  healthManager.register(config);
}

/**
 * Register Telegram Bot
 */
export function registerTelegram(): void {
  const config: ServiceConfig = {
    name: 'telegram-bot',
    priority: 'medium',
    checkIntervalMs: 60000,
    timeoutMs: 10000,
    maxConsecutiveFailures: 5,

    async healthCheck() {
      try {
        const botToken = process.env.TELEGRAM_BOT_TOKEN_MENTOR;
        if (!botToken) {
          return { healthy: false, message: 'Bot token not configured' };
        }

        const start = Date.now();
        const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
        const data = await response.json() as { ok?: boolean };
        const latencyMs = Date.now() - start;

        return { healthy: data.ok === true, latencyMs };
      } catch (error: any) {
        return { healthy: false, message: error.message };
      }
    },
  };

  healthManager.register(config);
}

// =====================================================
// Internal Services
// =====================================================

/**
 * Register Rate Limiter
 */
export function registerRateLimiter(): void {
  const config: ServiceConfig = {
    name: 'openai-rate-limiter',
    priority: 'high',
    dependencies: ['openai-api'],
    checkIntervalMs: 30000,
    timeoutMs: 5000,
    maxConsecutiveFailures: 5,

    async healthCheck() {
      try {
        const { openAIRateLimiter } = await import('../services/openai-rate-limiter.js');
        const stats = openAIRateLimiter.getStats();

        // Check if queues are backing up
        const totalQueued = stats.queueLength;
        const healthy = totalQueued < 100; // Threshold

        return {
          healthy,
          message: healthy ? undefined : `Queue backup: ${totalQueued} items`,
          details: {
            queueLength: totalQueued,
            circuitBreakers: stats.circuitBreakers,
          },
        };
      } catch (error: any) {
        return { healthy: false, message: error.message };
      }
    },

    async onDependencyFailed(dependency: string) {
      if (dependency === 'openai-api') {
        logger.warn('Rate limiter: OpenAI API down, pausing queue processing');
        // Could implement queue pause here
      }
    },
  };

  healthManager.register(config);
}

/**
 * Register Memory Monitor
 */
export function registerMemoryMonitor(): void {
  const config: ServiceConfig = {
    name: 'memory-monitor',
    priority: 'critical',
    checkIntervalMs: 10000, // Frequent checks
    timeoutMs: 1000,
    maxConsecutiveFailures: 3,

    async healthCheck() {
      const used = process.memoryUsage();
      const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(used.heapTotal / 1024 / 1024);
      const usagePercent = Math.round((used.heapUsed / used.heapTotal) * 100);

      const healthy = usagePercent < 90;

      return {
        healthy,
        message: healthy ? undefined : `High memory usage: ${usagePercent}%`,
        details: {
          heapUsedMB,
          heapTotalMB,
          usagePercent,
        },
      };
    },

    async recover() {
      logger.warn('Attempting memory recovery - triggering GC...');
      if (global.gc) {
        global.gc();
        return true;
      }
      return false;
    },
  };

  healthManager.register(config);
}

// =====================================================
// Registry Initialization
// =====================================================

/**
 * Register all services
 */
export async function initializeServiceRegistry(): Promise<void> {
  logger.info('Initializing service registry...');

  // Critical services first
  registerMemoryMonitor();

  // Database services
  registerSupabaseMain();
  registerSupabaseTripwire();
  registerTrafficDB();

  // External APIs
  registerOpenAI();
  registerGroq();
  registerAmoCRM();
  registerTelegram();

  // Internal services
  registerRateLimiter();

  // Create watchdog pairs for critical mutual monitoring
  healthManager.createWatchdogPair('supabase-main', 'memory-monitor');
  healthManager.createWatchdogPair('openai-api', 'openai-rate-limiter');

  logger.info('Service registry initialized', {
    services: healthManager.getSystemHealth().services,
  });
}

/**
 * Quick registration for custom services
 */
export function registerCustomService(config: ServiceConfig): void {
  healthManager.register(config);
}
