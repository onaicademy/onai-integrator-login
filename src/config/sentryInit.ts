/**
 * 🛡️ SENTRY MONITORING - Unified Configuration
 * 
 * Официальная инициализация Sentry + Кастомные утилиты мониторинга
 * 
 * @see https://docs.sentry.io/platforms/javascript/guides/react/
 */

import * as Sentry from "@sentry/react";

// ═══════════════════════════════════════════════════════════════
// 🎯 SENTRY INITIALIZATION (Official)
// ═══════════════════════════════════════════════════════════════

export const initSentry = () => {
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;

  if (!sentryDsn) {
    console.warn('⚠️ VITE_SENTRY_DSN not configured - error monitoring disabled');
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    
    // 🏷️ Environment & Release
    environment: import.meta.env.MODE || 'development',
    release: `frontend@${import.meta.env.VITE_APP_VERSION || '1.0.0'}`,
    
    // 🎯 Integrations (Official)
    integrations: [
      // ✅ Browser Tracing - автоматический мониторинг производительности
      Sentry.browserTracingIntegration(),
      
      // ✅ Replay - записывает сессии с ошибками
      Sentry.replayIntegration({
        maskAllText: true, // 🔒 БЕЗОПАСНОСТЬ: маскируем весь текст
        blockAllMedia: true,
      }),
      
      // ✅ Replay Canvas - для canvas элементов
      Sentry.replayCanvasIntegration(),
      
      // ✅ Feedback - сбор отзывов от пользователей
      Sentry.feedbackIntegration({
        colorScheme: 'dark',
        showBranding: false,
      }),
      
      // ✅ Console Logging - отправляет console.log/warn/error в Sentry
      // ВРЕМЕННО ОТКЛЮЧЕНО: consoleIntegration deprecated in newer Sentry versions
      // Sentry.consoleIntegration({ 
      //   levels: ['log', 'warn', 'error'] 
      // }),
    ],

    // 📊 Performance Monitoring
    // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
    
    // 🎯 Error Sampling
    sampleRate: import.meta.env.PROD ? 0.1 : 1.0, // 10% ошибок в prod, 100% в dev
    
    // 🎥 Session Replay
    replaysSessionSampleRate: 0.1, // 10% всех сессий
    replaysOnErrorSampleRate: 1.0, // 100% сессий с ошибками
    
    // 📝 Enable logs to be sent to Sentry
    enableLogs: true,
    
    // 🔒 Security & Privacy
    sendDefaultPii: false, // НЕ отправляем PII (персональные данные)
    attachStacktrace: true, // Везде показывать stacktrace
    maxBreadcrumbs: 100, // Отслеживать последние 100 действий

    // 🌐 Distributed Tracing - Set `tracePropagationTargets` to control for which URLs distributed tracing should be enabled
    tracePropagationTargets: [
      'localhost',
      'onai.academy',
      /^\//,  // Relative URLs
    ],

    // 🔍 Debug mode (только в dev)
    debug: import.meta.env.DEV,

    // 🎯 Before Send - фильтруем и обогащаем события
    beforeSend(event, hint) {
      // Добавляем контекст для Tripwire/Integrator
      if (event.request?.url?.includes('/tripwire') || 
          event.request?.url?.includes('/integrator')) {
        event.tags = {
          ...event.tags,
          product: 'tripwire',
          platform: 'integrator',
        };
      }

      // Фильтруем browser extensions errors
      if (event.exception) {
        const exceptionValue = event.exception.values?.[0]?.value || '';
        
        if (exceptionValue.includes('Extension context invalidated')) {
          return null;
        }
        
        if (exceptionValue.includes('Request aborted') || 
            exceptionValue.includes('Request canceled')) {
          return null;
        }
      }

      return event;
    },
    
    // 🎯 Before Send Transaction - фильтруем health-check и метрики
    beforeSendTransaction(event) {
      // Игнорируем health check запросы
      if (event.transaction?.includes('/health') || 
          event.transaction?.includes('/metrics') ||
          event.transaction?.includes('/status') ||
          event.transaction?.includes('favicon.ico')) {
        return null;
      }
      
      return event;
    },

    // 🚫 Ignore patterns
    ignoreErrors: [
      // Browser extensions
      'Extension context invalidated',
      'chrome-extension://',
      'moz-extension://',
      
      // Network errors
      'Network request failed',
      'Failed to fetch',
      'Load failed',
      
      // ResizeObserver (safe to ignore)
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed',
    ],
    
    // 🚫 Ignore Transactions - не трекать служебные запросы
    ignoreTransactions: [
      '/health',
      '/metrics',
      '/status',
      '/favicon.ico',
      /^\/api\/health/,
      /^\/api\/metrics/,
    ],
  });

  console.log('✅ Sentry initialized for frontend monitoring');
};

// ═══════════════════════════════════════════════════════════════
// 🎯 CUSTOM MONITORING UTILITIES
// ═══════════════════════════════════════════════════════════════

/**
 * 🎯 Monitor Tripwire Lesson Loading
 * 
 * @example
 * const lesson = await monitorLessonLoading(lessonId, async () => {
 *   const res = await fetch(`/api/tripwire/lessons/${lessonId}`);
 *   return res.json();
 * });
 */
export const monitorLessonLoading = async <T>(
  lessonId: string,
  operation: () => Promise<T>
): Promise<T> => {
  const startTime = Date.now();
  const transaction = Sentry.startTransaction({
    name: 'tripwire.lesson.load',
    op: 'lesson.load',
    tags: { lesson_id: lessonId },
  });

  try {
    Sentry.addBreadcrumb({
      category: 'tripwire.lesson',
      message: `Loading lesson ${lessonId}`,
      level: 'info',
    });

    const result = await operation();
    
    const duration = Date.now() - startTime;
    
    // Если загрузка > 5 секунд - это долго
    if (duration > 5000) {
      Sentry.captureMessage(`Slow lesson loading: ${lessonId}`, {
        level: 'warning',
        tags: { type: 'slow_lesson_load', lesson_id: lessonId },
        extra: { duration_ms: duration },
      });
    }

    transaction.setStatus('ok');
    transaction.finish();

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    Sentry.captureException(error, {
      tags: { type: 'lesson_load_error', lesson_id: lessonId },
      extra: { duration_ms: duration, lesson_id: lessonId },
    });

    transaction.setStatus('unknown_error');
    transaction.finish();

    throw error;
  }
};

/**
 * 🎯 Monitor AI Content Generation
 * 
 * @example
 * const response = await monitorAIGeneration(
 *   'ai_curator_chat',
 *   { lessonId, messageLength: message.length },
 *   async () => {
 *     const res = await fetch('/api/tripwire/ai/chat', {...});
 *     return res.json();
 *   }
 * );
 */
export const monitorAIGeneration = async <T>(
  operationType: string,
  context: Record<string, any>,
  operation: () => Promise<T>
): Promise<T> => {
  const startTime = Date.now();
  const transaction = Sentry.startTransaction({
    name: `tripwire.ai.${operationType}`,
    op: 'ai.generation',
    tags: { operation_type: operationType, ...context },
  });

  try {
    Sentry.addBreadcrumb({
      category: 'tripwire.ai',
      message: `AI Generation: ${operationType}`,
      level: 'info',
      data: context,
    });

    const result = await operation();
    
    const duration = Date.now() - startTime;
    
    // AI генерация > 10 секунд - это долго
    if (duration > 10000) {
      Sentry.captureMessage(`Slow AI generation: ${operationType}`, {
        level: 'warning',
        tags: { type: 'slow_ai_generation', operation: operationType },
        extra: { duration_ms: duration, context },
      });
    }

    transaction.setStatus('ok');
    transaction.finish();

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    Sentry.captureException(error, {
      tags: { type: 'ai_generation_error', operation: operationType },
      extra: { duration_ms: duration, context },
    });

    transaction.setStatus('unknown_error');
    transaction.finish();

    throw error;
  }
};

/**
 * 🎯 Monitor Payment Processing
 * 
 * @example
 * const result = await monitorPaymentProcessing(
 *   { method: 'card', amount: 990, currency: 'RUB' },
 *   async () => {
 *     const res = await fetch('/api/tripwire/payment', {...});
 *     return res.json();
 *   }
 * );
 */
export const monitorPaymentProcessing = async <T>(
  paymentData: Record<string, any>,
  operation: () => Promise<T>
): Promise<T> => {
  const startTime = Date.now();
  const transaction = Sentry.startTransaction({
    name: 'tripwire.payment.process',
    op: 'payment.process',
    tags: { 
      payment_method: paymentData.method,
      amount: paymentData.amount,
    },
  });

  // НЕ логируем sensitive данные
  const safePaymentData = {
    method: paymentData.method,
    amount: paymentData.amount,
    currency: paymentData.currency,
  };

  try {
    Sentry.addBreadcrumb({
      category: 'tripwire.payment',
      message: 'Processing payment',
      level: 'info',
      data: safePaymentData,
    });

    const result = await operation();
    
    const duration = Date.now() - startTime;
    
    if (duration > 5000) {
      Sentry.captureMessage('Slow payment processing', {
        level: 'warning',
        tags: { type: 'slow_payment' },
        extra: { duration_ms: duration },
      });
    }

    transaction.setStatus('ok');
    transaction.finish();

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    Sentry.captureException(error, {
      tags: { type: 'payment_error', payment_method: paymentData.method },
      extra: { duration_ms: duration, safe_payment_data: safePaymentData },
    });

    transaction.setStatus('unknown_error');
    transaction.finish();

    throw error;
  }
};

/**
 * 🎯 Monitor Video Loading
 * 
 * @example
 * await monitorVideoLoading(videoId, videoUrl, async () => {
 *   const video = document.querySelector('video');
 *   return new Promise((resolve) => {
 *     video.onloadeddata = () => resolve(true);
 *     video.src = videoUrl;
 *   });
 * });
 */
export const monitorVideoLoading = async <T>(
  videoId: string,
  videoUrl: string,
  operation: () => Promise<T>
): Promise<T> => {
  const startTime = Date.now();
  const transaction = Sentry.startTransaction({
    name: 'tripwire.video.load',
    op: 'video.load',
    tags: { video_id: videoId },
  });

  try {
    Sentry.addBreadcrumb({
      category: 'tripwire.video',
      message: `Loading video ${videoId}`,
      level: 'info',
      data: { video_id: videoId, video_url: videoUrl },
    });

    const result = await operation();
    
    const duration = Date.now() - startTime;
    
    // Видео загружается > 15 секунд - проблема с CDN
    if (duration > 15000) {
      Sentry.captureMessage('Slow video loading', {
        level: 'warning',
        tags: { type: 'slow_video_load', video_id: videoId },
        extra: { duration_ms: duration, video_url: videoUrl },
      });
    }

    transaction.setStatus('ok');
    transaction.finish();

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    Sentry.captureException(error, {
      tags: { type: 'video_load_error', video_id: videoId },
      extra: { duration_ms: duration, video_url: videoUrl },
    });

    transaction.setStatus('unknown_error');
    transaction.finish();

    throw error;
  }
};

/**
 * 🎯 Monitor API Requests
 * 
 * @example
 * const data = await monitorAPIRequest(
 *   '/api/tripwire/progress',
 *   'POST',
 *   async () => {
 *     const res = await fetch('/api/tripwire/progress', {...});
 *     return res.json();
 *   }
 * );
 */
export const monitorAPIRequest = async <T>(
  endpoint: string,
  method: string,
  operation: () => Promise<T>
): Promise<T> => {
  const startTime = Date.now();
  const transaction = Sentry.startTransaction({
    name: `api.${method}.${endpoint}`,
    op: 'http.request',
    tags: { endpoint, method },
  });

  try {
    Sentry.addBreadcrumb({
      category: 'api',
      message: `${method} ${endpoint}`,
      level: 'info',
    });

    const result = await operation();
    
    const duration = Date.now() - startTime;
    
    if (duration > 5000) {
      Sentry.captureMessage(`Slow API request: ${method} ${endpoint}`, {
        level: 'warning',
        tags: { type: 'slow_api', endpoint, method },
        extra: { duration_ms: duration },
      });
    }

    transaction.setStatus('ok');
    transaction.finish();

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    Sentry.captureException(error, {
      tags: { type: 'api_error', endpoint, method },
      extra: { duration_ms: duration },
    });

    transaction.setStatus('unknown_error');
    transaction.finish();

    throw error;
  }
};

/**
 * 🔄 Detect potential infinite loops
 * 
 * @example
 * let iterations = 0;
 * for (const lesson of lessons) {
 *   iterations++;
 *   if (iterations % 100 === 0) {
 *     detectInfiniteLoop('process_lessons', iterations);
 *   }
 * }
 */
export const detectInfiniteLoop = (
  operationName: string,
  iterations: number,
  maxIterations: number = 1000
) => {
  if (iterations > maxIterations) {
    Sentry.captureMessage(`Potential infinite loop detected: ${operationName}`, {
      level: 'error',
      tags: { type: 'infinite_loop', operation: operationName },
      extra: {
        iterations,
        max_iterations: maxIterations,
        timestamp: new Date().toISOString(),
      },
    });
  }
};

/**
 * 🎯 Track custom event
 * 
 * @example
 * trackEvent('lesson_completed', { lessonId, duration: 1234 });
 */
export const trackEvent = (
  eventName: string,
  data?: Record<string, any>
) => {
  Sentry.addBreadcrumb({
    category: 'user_action',
    message: eventName,
    level: 'info',
    data,
  });
};

// Export Sentry for direct usage
export { Sentry };
