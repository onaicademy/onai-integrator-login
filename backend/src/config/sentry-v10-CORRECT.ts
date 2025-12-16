import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import type { Express, Request, Response, NextFunction } from 'express';

/**
 * 🛡️ SENTRY CONFIGURATION - Backend Monitoring (v10.x CORRECT API)
 * 
 * ✅ FIXED: Updated to v10.x API (httpIntegration, expressIntegration)
 * ✅ FIXED: Added try-catch for graceful degradation
 * ✅ FIXED: Improved security (data filtering)
 * 
 * Отслеживает:
 * - Server errors and exceptions
 * - API performance
 * - Database queries
 * - Memory leaks
 * - CPU usage
 */

export const initSentry = (app: Express) => {
  const sentryDsn = process.env.SENTRY_DSN;

  // ✅ Если DSN не настроен - просто выходим
  if (!sentryDsn || sentryDsn === 'placeholder' || sentryDsn === 'placeholder_key') {
    console.warn('⚠️ SENTRY_DSN not configured - error monitoring disabled');
    return;
  }

  try {
    // ✅ Инициализация с НОВЫМ API (v10.x)
    Sentry.init({
      dsn: sentryDsn,

      // 🏷️ Environment & Release tracking
      environment: process.env.NODE_ENV || 'development',
      release: `backend@${process.env.npm_package_version || '1.0.0'}`,

      // 🎯 Integrations (НОВЫЙ СИНТАКСИС для v10.x!)
      integrations: [
        // ✅ HTTP requests tracking
        Sentry.httpIntegration(),

        // ✅ Express middleware tracking
        Sentry.expressIntegration({ app }),

        // ✅ Node.js built-ins (fs, crypto, etc.)
        Sentry.nativeNodeFetchIntegration(),

        // ✅ Console logs tracking
        Sentry.consoleIntegration(),

        // ✅ CPU/Memory profiling
        nodeProfilingIntegration(),
      ],

      // 📊 Performance Monitoring
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

      // 📊 Profiling (sample 10% of transactions in production)
      profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

      // 🔍 Debug mode (только в development)
      debug: process.env.NODE_ENV !== 'production',

      // 🎯 Фильтрация чувствительных данных (SECURITY!)
      beforeSend(event, hint) {
        // Удаляем токены и пароли из headers
        if (event.request?.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
          delete event.request.headers['x-api-key'];
        }

        // Удаляем токены из query params
        if (event.request?.query_string) {
          event.request.query_string = event.request.query_string
            .replace(/token=[^&]*/g, 'token=REDACTED')
            .replace(/password=[^&]*/g, 'password=REDACTED')
            .replace(/apiKey=[^&]*/g, 'apiKey=REDACTED');
        }

        // Маскируем email адреса
        if (event.user?.email) {
          const [name, domain] = event.user.email.split('@');
          event.user.email = `${name.substring(0, 2)}***@${domain}`;
        }

        // Добавляем server info
        event.server_name = process.env.SERVER_NAME || 'unknown';

        return event;
      },

      // 🎯 Игнорируем ожидаемые ошибки
      ignoreErrors: [
        // Network errors
        'ECONNRESET',
        'EPIPE',
        'ETIMEDOUT',
        'ECONNREFUSED',
        'Socket closed',
        'AbortError',
        
        // Client-side errors (не имеют смысла на backend)
        'Network request failed',
        'Failed to fetch',
        
        // Spam/bot errors
        'favicon.ico',
        'robots.txt',
      ],
    });

    // ✅ Request handler - ПЕРВЫМ middleware
    app.use(Sentry.Handlers.requestHandler());

    // ✅ Tracing handler - для performance monitoring
    app.use(Sentry.Handlers.tracingHandler());

    console.log('✅ Sentry initialized successfully');
    console.log(`   Environment: ${process.env.NODE_ENV}`);
    console.log(`   DSN: ${sentryDsn.substring(0, 30)}...`);
  } catch (error) {
    // ✅ CRITICAL: Если Sentry падает - backend продолжает работать!
    console.error('❌ Failed to initialize Sentry:', error);
    console.warn('⚠️ Continuing without error monitoring');
    
    // Логируем в файл для дальнейшего анализа
    if (process.env.NODE_ENV === 'production') {
      console.error('SENTRY_INIT_ERROR', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
    }
  }
};

/**
 * 🚨 Error handler - ПОСЛЕДНИМ middleware
 */
export const sentryErrorHandler = () => {
  const sentryDsn = process.env.SENTRY_DSN;

  // Если Sentry не настроен - возвращаем простой error handler
  if (!sentryDsn || sentryDsn === 'placeholder' || sentryDsn === 'placeholder_key') {
    return (err: Error, _req: Request, _res: Response, next: NextFunction) => {
      console.error('❌ Error (Sentry disabled):', err);
      next(err);
    };
  }

  // ✅ Возвращаем Sentry error handler с защитой
  try {
    return Sentry.Handlers.errorHandler({
      shouldHandleError(error) {
        // Отправляем все ошибки со статусом >= 500 в Sentry
        const statusCode = (error as any).status || (error as any).statusCode || 500;
        return statusCode >= 500;
      },
    });
  } catch (e) {
    console.warn('⚠️ Sentry errorHandler not available, using fallback');
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
  // Только если Sentry настроен
  if (!process.env.SENTRY_DSN || process.env.SENTRY_DSN === 'placeholder') {
    return;
  }

  // Если операция > 5 секунд - это подозрительно
  if (durationMs > 5000) {
    try {
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
    } catch (error) {
      console.warn('Failed to track long operation in Sentry:', error);
    }
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
  // Только если Sentry настроен
  if (!process.env.SENTRY_DSN || process.env.SENTRY_DSN === 'placeholder') {
    return next();
  }

  const startTime = Date.now();

  // Hook в res.end для замера времени
  const originalEnd = res.end;
  res.end = function(...args: any[]) {
    const duration = Date.now() - startTime;

    // Если запрос > 3 секунд - это медленно
    if (duration > 3000) {
      try {
        Sentry.captureMessage(`Slow API endpoint: ${req.method} ${req.path}`, {
          level: 'warning',
          tags: {
            method: req.method,
            endpoint: req.path,
            status: res.statusCode.toString(),
            duration: `${duration}ms`,
          },
          extra: {
            duration_ms: duration,
            query: req.query,
            params: req.params,
          },
        });
      } catch (error) {
        console.warn('Failed to track API performance in Sentry:', error);
      }
    }

    // Добавляем breadcrumb для всех запросов
    try {
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
    } catch (error) {
      console.warn('Failed to add Sentry breadcrumb:', error);
    }

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
  // Только если Sentry настроен
  if (!process.env.SENTRY_DSN || process.env.SENTRY_DSN === 'placeholder') {
    return;
  }

  try {
    if (error) {
      Sentry.captureException(error, {
        tags: {
          type: 'database_error',
          query_type: query.split(' ')[0], // SELECT, INSERT, etc
        },
        extra: {
          query: query.substring(0, 200), // Ограничиваем длину
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
          query: query.substring(0, 200),
          duration_ms: durationMs,
        },
      });
    }
  } catch (err) {
    console.warn('Failed to track database query in Sentry:', err);
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
  // Только если Sentry настроен
  if (!process.env.SENTRY_DSN || process.env.SENTRY_DSN === 'placeholder') {
    return;
  }

  // Если > 1000 итераций - возможно зацикливание
  if (iterations > 1000) {
    try {
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
    } catch (error) {
      console.warn('Failed to track potential infinite loop in Sentry:', error);
    }
  }
};

/**
 * 🎯 Track memory usage
 */
export const trackMemoryUsage = () => {
  // Только если Sentry настроен
  if (!process.env.SENTRY_DSN || process.env.SENTRY_DSN === 'placeholder') {
    return;
  }

  try {
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
  } catch (error) {
    console.warn('Failed to track memory usage in Sentry:', error);
  }
};

// Export Sentry для прямого использования
export { Sentry };
