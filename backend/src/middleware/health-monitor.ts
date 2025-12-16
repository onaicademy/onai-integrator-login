/**
 * 🛡️ HEALTH MONITORING & CIRCUIT BREAKER STATUS
 * Endpoint для проверки здоровья сервера + защита от перегрузки
 */

import { Request, Response, NextFunction } from 'express';
import { amoCRMCircuitBreaker, openAICircuitBreaker, bunnyCDNCircuitBreaker, supabaseCircuitBreaker } from './circuit-breaker.js';

/**
 * Middleware для мониторинга памяти и автоматической защиты
 */
export function memoryGuard(req: Request, res: Response, next: NextFunction) {
  const memUsage = process.memoryUsage();
  const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
  const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
  const usagePercent = (heapUsedMB / heapTotalMB) * 100;

  // Критический порог - 98% памяти (ещё более терпимое значение для стабильной работы)
  if (usagePercent > 98) {
    console.error(`🚨 CRITICAL MEMORY: ${Math.round(usagePercent)}% (${Math.round(heapUsedMB)}MB / ${Math.round(heapTotalMB)}MB)`);
    
    // Принудительный GC если доступен
    if (global.gc) {
      console.log('🧹 Running garbage collection...');
      global.gc();
    }
    
    return res.status(503).json({
      error: 'Server overloaded',
      message: 'Server is under heavy memory pressure. Please try again later.',
      retryAfter: 30,
    });
  }

  // Предупреждение при 80%
  if (usagePercent > 80) {
    console.warn(`⚠️ HIGH MEMORY: ${Math.round(usagePercent)}% (${Math.round(heapUsedMB)}MB / ${Math.round(heapTotalMB)}MB)`);
  }

  next();
}

/**
 * Health check endpoint
 */
export function healthCheck(req: Request, res: Response) {
  const memUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
  const rssMB = Math.round(memUsage.rss / 1024 / 1024);
  const usagePercent = Math.round((heapUsedMB / heapTotalMB) * 100);

  const uptime = process.uptime();
  const uptimeFormatted = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`;

  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: uptimeFormatted,
    uptimeSeconds: Math.floor(uptime),
    memory: {
      heapUsed: `${heapUsedMB}MB`,
      heapTotal: `${heapTotalMB}MB`,
      rss: `${rssMB}MB`,
      usagePercent: `${usagePercent}%`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
    },
    circuitBreakers: {
      amocrm: {
        state: amoCRMCircuitBreaker.getState(),
        isOpen: amoCRMCircuitBreaker.isOpen(),
      },
      openai: {
        state: openAICircuitBreaker.getState(),
        isOpen: openAICircuitBreaker.isOpen(),
      },
      bunnyCDN: {
        state: bunnyCDNCircuitBreaker.getState(),
        isOpen: bunnyCDNCircuitBreaker.isOpen(),
      },
      supabase: {
        state: supabaseCircuitBreaker.getState(),
        isOpen: supabaseCircuitBreaker.isOpen(),
      },
    },
    warnings: [] as string[],
  };

  // Проверяем критические состояния
  if (usagePercent > 90) {
    health.status = 'critical';
    health.warnings.push('Critical memory usage');
  } else if (usagePercent > 80) {
    health.status = 'degraded';
    health.warnings.push('High memory usage');
  }

  // Проверяем circuit breakers
  const openCircuits = Object.entries(health.circuitBreakers)
    .filter(([_, cb]) => cb.isOpen)
    .map(([name]) => name);

  if (openCircuits.length > 0) {
    health.status = 'degraded';
    health.warnings.push(`Circuit breakers OPEN: ${openCircuits.join(', ')}`);
  }

  const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 503 : 500;
  
  res.status(statusCode).json(health);
}

/**
 * Периодический мониторинг памяти (каждые 30 секунд)
 */
export function startMemoryMonitoring() {
  const INTERVAL = 30000; // 30 секунд

  setInterval(() => {
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
    const usagePercent = (heapUsedMB / heapTotalMB) * 100;

    if (usagePercent > 85) {
      console.warn(`⚠️ [Memory Monitor] High memory usage: ${Math.round(usagePercent)}% (${Math.round(heapUsedMB)}MB / ${Math.round(heapTotalMB)}MB)`);
      
      // Принудительный GC если доступен и памяти мало
      if (global.gc && usagePercent > 90) {
        console.log('🧹 [Memory Monitor] Running garbage collection...');
        global.gc();
        
        // Повторная проверка после GC
        const newMemUsage = process.memoryUsage();
        const newHeapUsedMB = newMemUsage.heapUsed / 1024 / 1024;
        const freed = heapUsedMB - newHeapUsedMB;
        console.log(`🧹 [Memory Monitor] GC freed ${Math.round(freed)}MB`);
      }
    }
  }, INTERVAL);

  console.log('✅ Memory monitoring started (interval: 30s)');
}
