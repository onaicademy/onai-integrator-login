// @ts-nocheck
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import type { Express, Request, Response, NextFunction } from 'express';

/**
 * 🛡️ SENTRY CONFIGURATION - PARANOID SAFETY MODE
 * 
 * ⚠️ КРИТИЧНО: Этот модуль НЕ ДОЛЖЕН крашить backend ни при каких обстоятельствах!
 * 
 * Принцип работы:
 * - Если Sentry не настроен → молча игнорируем
 * - Если Sentry крашится → логируем и продолжаем работу
 * - Backend ВСЕГДА должен запуститься, даже если Sentry полностью сломан
 * 
 * 🔒 Защита:
 * - Triple try-catch на всех уровнях
 * - Graceful degradation
 * - Fail-safe by design
 */

/**
 * 🎯 Инициализация Sentry (PARANOID SAFE VERSION)
 */
export const initSentry = (app: Express) => {
  // 🔒 УРОВЕНЬ ЗАЩИТЫ #1: Проверка feature flag
  const sentryEnabled = process.env.SENTRY_ENABLED === 'true';
  const sentryDsn = process.env.SENTRY_DSN;

  if (!sentryEnabled) {
    console.log('ℹ️  Sentry is DISABLED (SENTRY_ENABLED !== "true")');
    console.log('   → Backend will run without error monitoring');
    return; // ✅ Выходим БЕЗ ошибок
  }

  if (!sentryDsn || sentryDsn === 'placeholder' || sentryDsn === 'placeholder_key') {
    console.warn('⚠️  SENTRY_DSN not configured - error monitoring disabled');
    console.log('   → Backend will run without error monitoring');
    return; // ✅ Выходим БЕЗ ошибок
  }

  // 🔒 УРОВЕНЬ ЗАЩИТЫ #2: Outer try-catch (защита от фатальных ошибок)
  try {
    console.log('🔄 Initializing Sentry...');
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   DSN: ${sentryDsn.substring(0, 30)}...`);

    // 🔒 УРОВЕНЬ ЗАЩИТЫ #3: Inner try-catch (защита инициализации)
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

          // ✅ Node.js built-ins
          Sentry.nativeNodeFetchIntegration(),

          // ✅ Console logs
          Sentry.consoleIntegration(),

          // ✅ CPU/Memory profiling
          nodeProfilingIntegration(),
        ],

        // 📊 Performance Monitoring
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

        // 📊 Profiling
        profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

        // 🔍 Debug mode (только в development)
        debug: process.env.NODE_ENV !== 'production',

        // 🎯 Фильтрация чувствительных данных (SECURITY!)
        beforeSend(event, hint) {
          try {
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
          } catch (filterError) {
            // 🔒 Если фильтрация упала - отправляем событие как есть
            console.warn('⚠️  Sentry beforeSend filter failed:', filterError);
            return event;
          }
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
          
          // Client-side errors
          'Network request failed',
          'Failed to fetch',
          
          // Spam/bot errors
          'favicon.ico',
          'robots.txt',
        ],
      });

      console.log('✅ Sentry.init() completed successfully');

    } catch (initError) {
      // 🔒 ЗАЩИТА: Если Sentry.init() упал - НЕ крашим backend!
      console.error('❌ Sentry.init() FAILED, but backend will continue:');
      console.error('   Error:', initError instanceof Error ? initError.message : String(initError));
      console.error('   Stack:', initError instanceof Error ? initError.stack : 'N/A');
      console.log('✅ Backend continues WITHOUT Sentry monitoring');
      return; // ✅ Выходим БЕЗ крasha
    }

    // 🔒 УРОВЕНЬ ЗАЩИТЫ #4: Защита middleware
    try {
      // ✅ Request handler - ПЕРВЫМ middleware
      app.use(Sentry.Handlers.requestHandler());
      console.log('✅ Sentry requestHandler added');

      // ✅ Tracing handler - для performance monitoring
      app.use(Sentry.Handlers.tracingHandler());
      console.log('✅ Sentry tracingHandler added');

    } catch (handlerError) {
      // 🔒 ЗАЩИТА: Если middleware упал - НЕ крашим backend!
      console.error('❌ Sentry handlers FAILED, but backend will continue:');
      console.error('   Error:', handlerError instanceof Error ? handlerError.message : String(handlerError));
      console.log('✅ Backend continues WITHOUT Sentry middleware');
      return; // ✅ Выходим БЕЗ крasha
    }

    console.log('🎉 Sentry initialized successfully!');
    console.log('   → Error monitoring is ACTIVE');

  } catch (outerError) {
    // 🔒 ФИНАЛЬНАЯ ЗАЩИТА: Даже если ВСЁ упало - backend продолжает работу!
    console.error('💥 CRITICAL: Sentry initialization completely failed!');
    console.error('   Error:', outerError instanceof Error ? outerError.message : String(outerError));
    console.error('   Stack:', outerError instanceof Error ? outerError.stack : 'N/A');
    console.log('');
    console.log('⚠️  Sentry failed to initialize, but App is running!');
    console.log('✅ Backend, CRM, Telegram will continue to work normally');
    console.log('');
    
    // 🔒 Логируем в файл для дальнейшего анализа
    if (process.env.NODE_ENV === 'production') {
      try {
        const fs = require('fs');
        const logPath = '/tmp/sentry-init-error.log';
        const logData = {
          timestamp: new Date().toISOString(),
          error: outerError instanceof Error ? outerError.message : String(outerError),
          stack: outerError instanceof Error ? outerError.stack : undefined,
          env: {
            NODE_ENV: process.env.NODE_ENV,
            SENTRY_ENABLED: process.env.SENTRY_ENABLED,
            SENTRY_DSN: sentryDsn ? `${sentryDsn.substring(0, 30)}...` : 'NOT_SET',
          }
        };
        fs.appendFileSync(logPath, JSON.stringify(logData, null, 2) + '\n\n');
        console.log(`📄 Error logged to: ${logPath}`);
      } catch (logError) {
        // 🔒 Даже логирование не должно крашить backend
        console.error('Failed to log Sentry error to file:', logError);
      }
    }
  }
};

/**
 * 🚨 Error handler - PARANOID SAFE VERSION
 */
export const sentryErrorHandler = () => {
  const sentryEnabled = process.env.SENTRY_ENABLED === 'true';
  const sentryDsn = process.env.SENTRY_DSN;

  // 🔒 Если Sentry не настроен - возвращаем простой error handler
  if (!sentryEnabled || !sentryDsn || sentryDsn === 'placeholder' || sentryDsn === 'placeholder_key') {
    return (err: Error, _req: Request, _res: Response, next: NextFunction) => {
      console.error('❌ Error (Sentry disabled):', err.message);
      console.error('   Stack:', err.stack);
      next(err);
    };
  }

  // 🔒 Возвращаем Sentry error handler с защитой
  try {
    return Sentry.Handlers.errorHandler({
      shouldHandleError(error) {
        // Отправляем все ошибки со статусом >= 500 в Sentry
        const statusCode = (error as any).status || (error as any).statusCode || 500;
        return statusCode >= 500;
      },
    });
  } catch (e) {
    // 🔒 Если Sentry.Handlers.errorHandler упал - возвращаем fallback
    console.warn('⚠️  Sentry errorHandler not available, using fallback');
    return (err: Error, _req: Request, _res: Response, next: NextFunction) => {
      console.error('❌ Error (Sentry fallback):', err.message);
      console.error('   Stack:', err.stack);
      next(err);
    };
  }
};

/**
 * 🔄 Track long operations (SAFE VERSION)
 */
export const trackLongOperation = (
  operationName: string,
  durationMs: number,
  context?: Record<string, any>
) => {
  // 🔒 Проверяем что Sentry включен
  if (process.env.SENTRY_ENABLED !== 'true') {
    return;
  }

  // 🔒 Защита от краша
  try {
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
  } catch (error) {
    // 🔒 Подавляем ошибку - не крашим приложение
    console.warn('⚠️  Failed to track long operation in Sentry (ignored)');
  }
};

/**
 * 🎯 Track API endpoint performance (SAFE VERSION)
 */
export const trackAPIPerformance = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // 🔒 Проверяем что Sentry включен
  if (process.env.SENTRY_ENABLED !== 'true') {
    return next();
  }

  // 🔒 Защита от краша
  try {
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
        } catch (captureError) {
          // 🔒 Подавляем ошибку
          console.warn('⚠️  Failed to capture slow API in Sentry (ignored)');
        }
      }

      // Добавляем breadcrumb
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
      } catch (breadcrumbError) {
        // 🔒 Подавляем ошибку
        console.warn('⚠️  Failed to add breadcrumb in Sentry (ignored)');
      }

      return originalEnd.apply(res, args);
    };

    next();
  } catch (error) {
    // 🔒 Если весь middleware упал - просто пропускаем
    console.warn('⚠️  Sentry performance tracking failed (ignored)');
    next();
  }
};

/**
 * 🎯 Track database queries (SAFE VERSION)
 */
export const trackDatabaseQuery = (
  query: string,
  durationMs: number,
  error?: any
) => {
  // 🔒 Проверяем что Sentry включен
  if (process.env.SENTRY_ENABLED !== 'true') {
    return;
  }

  // 🔒 Защита от краша
  try {
    if (error) {
      Sentry.captureException(error, {
        tags: {
          type: 'database_error',
          query_type: query.split(' ')[0],
        },
        extra: {
          query: query.substring(0, 200),
          duration_ms: durationMs,
        },
      });
    }

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
    // 🔒 Подавляем ошибку
    console.warn('⚠️  Failed to track database query in Sentry (ignored)');
  }
};

/**
 * 🔄 Track infinite loop detection (SAFE VERSION)
 */
export const trackPotentialInfiniteLoop = (
  operation: string,
  iterations: number,
  context?: Record<string, any>
) => {
  // 🔒 Проверяем что Sentry включен
  if (process.env.SENTRY_ENABLED !== 'true') {
    return;
  }

  // 🔒 Защита от краша
  try {
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
  } catch (error) {
    // 🔒 Подавляем ошибку
    console.warn('⚠️  Failed to track infinite loop in Sentry (ignored)');
  }
};

/**
 * 🎯 Track memory usage (SAFE VERSION)
 */
export const trackMemoryUsage = () => {
  // 🔒 Проверяем что Sentry включен
  if (process.env.SENTRY_ENABLED !== 'true') {
    return;
  }

  // 🔒 Защита от краша
  try {
    const usage = process.memoryUsage();
    const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);

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
    // 🔒 Подавляем ошибку
    console.warn('⚠️  Failed to track memory usage in Sentry (ignored)');
  }
};

// Export Sentry для прямого использования (с защитой)
export { Sentry };

/**
 * 🛡️ PARANOID SAFETY MODE АКТИВЕН
 * 
 * Этот модуль НЕ МОЖЕТ уронить backend ни при каких обстоятельствах:
 * ✅ Triple try-catch protection
 * ✅ Feature flag (SENTRY_ENABLED)
 * ✅ Graceful degradation
 * ✅ Fail-safe by design
 * ✅ Backend ВСЕГДА запустится
 * 
 * Даже если Sentry полностью сломан → Backend, CRM, Telegram продолжат работу!
 */
