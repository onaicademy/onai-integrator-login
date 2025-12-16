import * as Sentry from "@sentry/node";
import { ProfilingIntegration } from "@sentry/profiling-node";
import type { Express, Request, Response, NextFunction } from "express";

/**
 * 🛡️ SENTRY CONFIGURATION - Backend Monitoring
 * 
 * Отслеживает:
 * - Server errors and exceptions
 * - API performance
 * - Database queries
 * - Зацикливания и долгие операции
 * - Memory leaks
 * - CPU usage
 */

export const initSentry = (app: Express) => {
  const sentryDsn = process.env.SENTRY_DSN;

  if (!sentryDsn) {
    console.warn('⚠️ SENTRY_DSN not configured - error monitoring disabled');
    return;
  }

  Sentry.init({
    dsn: sentryDsn,

    // 🏷️ Environment & Release tracking
    environment: process.env.NODE_ENV || 'development',
    release: `backend@${process.env.npm_package_version || '1.0.0'}`,

    // 🎯 Integrations
    integrations: [
      // ✅ Express integration - автоматически трекает все requests
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app }),
      
      // ✅ Profiling - CPU/Memory профилирование
      new ProfilingIntegration(),
    ],

    // 📊 Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    
    // 📊 Profiling
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // 🔍 Debug mode
    debug: process.env.NODE_ENV !== 'production',

    // 🎯 Custom before send
    beforeSend(event, hint) {
      // Добавляем server info
      event.server_name = process.env.SERVER_NAME || 'unknown';
      
      // Фильтруем чувствительные данные
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }

      return event;
    },

    // 🎯 Ignore patterns
    ignoreErrors: [
      'ECONNRESET',
      'EPIPE',
      'ETIMEDOUT',
      'Socket closed',
    ],
  });

  // ✅ Request handler - должен быть первым middleware
  app.use(Sentry.Handlers.requestHandler());

  // ✅ Tracing handler - для performance monitoring
  app.use(Sentry.Handlers.tracingHandler());

  console.log('✅ Sentry initialized for backend monitoring');
};

export const sentryErrorHandler = () => {
  const sentryDsn = process.env.SENTRY_DSN;
  
  // Return no-op middleware if Sentry not configured
  if (!sentryDsn) {
    return (err: Error, _req: Request, _res: Response, next: NextFunction) => {
      console.error('❌ Error (Sentry disabled):', err);
      next(err);
    };
  }

  // Otherwise, return Sentry errorHandler
  try {
    return Sentry.Handlers.errorHandler({
      shouldHandleError(error) {
        return true;
      },
    });
  } catch (e) {
    console.warn('Sentry errorHandler not available, using fallback');
    return (err: Error, _req: Request, _res: Response, next: NextFunction) => {
      console.error('❌ Error (Sentry fallback):', err);
      next(err);
    };
  }
};

/**
 * 🔄 Track long operations
 */
export const trackLongOperation = (
  operationName: string,
  durationMs: number,
  context?: Record<string, any>
) => {
  // Если операция > 5 секунд - это подозрительно
  if (durationMs > 5000) {
    Sentry.captureMessage(`Long operation detected: ${operationName}`, {
      level: 'warning',
      tags: {
        operation: operationName,
        duration: `${durationMs}ms`,
      },
      extra: {
        duration_ms: durationMs,
        context,
        timestamp: new Date().toISOString(),
      },
    });
  }
};

/**
 * 🎯 Track API endpoint performance
 */
export const trackAPIPerformance = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();

  // Hook в res.end для замера времени
  const originalEnd = res.end;
  res.end = function(...args: any[]) {
    const duration = Date.now() - startTime;

    // Если запрос > 3 секунд - это медленно
    if (duration > 3000) {
      Sentry.captureMessage(`Slow API endpoint: ${req.method} ${req.path}`, {
        level: 'warning',
        tags: {
          method: req.method,
          endpoint: req.path,
          status: res.statusCode,
          duration: `${duration}ms`,
        },
        extra: {
          duration_ms: duration,
          query: req.query,
          params: req.params,
        },
      });
    }

    // Добавляем breadcrumb для всех запросов
    Sentry.addBreadcrumb({
      category: 'api',
      message: `${req.method} ${req.path}`,
      level: 'info',
      data: {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration_ms: duration,
      },
    });

    return originalEnd.apply(res, args);
  };

  next();
};

/**
 * 🎯 Track database queries
 */
export const trackDatabaseQuery = (
  query: string,
  durationMs: number,
  error?: any
) => {
  if (error) {
    Sentry.captureException(error, {
      tags: {
        type: 'database_error',
        query_type: query.split(' ')[0], // SELECT, INSERT, etc
      },
      extra: {
        query,
        duration_ms: durationMs,
      },
    });
  }

  // Если query > 2 секунд - это медленно
  if (durationMs > 2000) {
    Sentry.captureMessage(`Slow database query`, {
      level: 'warning',
      tags: {
        type: 'slow_query',
        query_type: query.split(' ')[0],
        duration: `${durationMs}ms`,
      },
      extra: {
        query,
        duration_ms: durationMs,
      },
    });
  }
};

/**
 * 🔄 Track infinite loop detection
 */
export const trackPotentialInfiniteLoop = (
  operation: string,
  iterations: number,
  context?: Record<string, any>
) => {
  // Если > 1000 итераций - возможно зацикливание
  if (iterations > 1000) {
    Sentry.captureMessage(`Potential infinite loop detected: ${operation}`, {
      level: 'error',
      tags: {
        type: 'infinite_loop',
        operation,
        iterations: iterations.toString(),
      },
      extra: {
        iterations,
        context,
        timestamp: new Date().toISOString(),
      },
    });
  }
};

/**
 * 🎯 Track memory usage
 */
export const trackMemoryUsage = () => {
  const usage = process.memoryUsage();
  const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);

  // Если использование памяти > 80% - это опасно
  const usagePercent = (heapUsedMB / heapTotalMB) * 100;
  if (usagePercent > 80) {
    Sentry.captureMessage(`High memory usage detected`, {
      level: 'warning',
      tags: {
        type: 'memory_usage',
        usage_percent: `${Math.round(usagePercent)}%`,
      },
      extra: {
        heap_used_mb: heapUsedMB,
        heap_total_mb: heapTotalMB,
        usage_percent: usagePercent,
        rss_mb: Math.round(usage.rss / 1024 / 1024),
        external_mb: Math.round(usage.external / 1024 / 1024),
      },
    });
  }
};

// Export Sentry for direct usage
export { Sentry };

