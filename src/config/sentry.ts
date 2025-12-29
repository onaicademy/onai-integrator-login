import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";
import { useEffect } from "react";
import { 
  useLocation, 
  useNavigationType, 
  createRoutesFromChildren, 
  matchRoutes 
} from "react-router-dom";

/**
 * 🛡️ SENTRY CONFIGURATION - Frontend Monitoring
 * 
 * Отслеживает:
 * - Ошибки и исключения
 * - Производительность (Performance)
 * - Зацикливания и долгие операции
 * - User interactions
 * - API calls
 * - Navigation
 */

export const initSentry = () => {
  // Проверяем что Sentry DSN настроен
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
  
  if (!sentryDsn) {
    console.warn('⚠️ SENTRY_DSN not configured - error monitoring disabled');
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    
    // 🏷️ Environment & Release tracking
    environment: import.meta.env.MODE || 'development',
    release: `frontend@${import.meta.env.VITE_APP_VERSION || '1.0.0'}`,
    
    // 🎯 Integrations
    integrations: [
      // ✅ Browser Tracing - отслеживает navigation и page loads
      new BrowserTracing({
        // Отслеживаем React Router
        routingInstrumentation: Sentry.reactRouterV6Instrumentation(
          useEffect,
          useLocation,
          useNavigationType,
          createRoutesFromChildren,
          matchRoutes
        ),
        // Отслеживаем API запросы
        tracingOrigins: [
          'localhost',
          'onai.academy',
          /^\//,
        ],
      }),
      
      // ✅ Replay - записывает сессии с ошибками (для debugging)
      new Sentry.Replay({
        maskAllText: false, // Показываем текст (кроме паролей)
        blockAllMedia: true, // Блокируем видео/аудио
      }),
    ],

    // 📊 Performance Monitoring
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0, // 20% в prod, 100% в dev
    
    // 🎥 Session Replay
    replaysSessionSampleRate: 0.1, // 10% всех сессий
    replaysOnErrorSampleRate: 1.0, // 100% сессий с ошибками

    // 🔍 Debug mode (только в dev)
    debug: import.meta.env.DEV,

    // 🎯 Custom before send - фильтруем и обогащаем события
    beforeSend(event, hint) {
      // Добавляем контекст для Tripwire (expresscourse.onai.academy)
      if (event.request?.url?.includes('expresscourse.onai.academy')) {
        event.tags = {
          ...event.tags,
          product: 'tripwire',
          platform: 'expresscourse',
        };
      }

      // Фильтруем известные игнорируемые ошибки
      if (event.exception) {
        const exceptionValue = event.exception.values?.[0]?.value || '';
        
        // Игнорируем network errors от расширений браузера
        if (exceptionValue.includes('Extension context invalidated')) {
          return null;
        }
        
        // Игнорируем cancelled requests (не ошибки)
        if (exceptionValue.includes('Request aborted') || 
            exceptionValue.includes('Request canceled')) {
          return null;
        }
      }

      return event;
    },

    // 🎯 Ignore patterns
    ignoreErrors: [
      // Browser extensions
      'Extension context invalidated',
      'chrome-extension://',
      'moz-extension://',
      
      // Network errors
      'Network request failed',
      'Failed to fetch',
      'Load failed',
      
      // ResizeObserver (безопасно игнорировать)
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed',
    ],
  });

  console.log('✅ Sentry initialized for frontend monitoring');
};

/**
 * 🎯 Track custom Tripwire events
 */
export const trackTripwireEvent = (
  eventName: string,
  data?: Record<string, any>
) => {
  Sentry.addBreadcrumb({
    category: 'tripwire',
    message: eventName,
    level: 'info',
    data,
  });
};

/**
 * 🔄 Track long operations (для обнаружения зацикливаний)
 */
export const trackLongOperation = (
  operationName: string,
  startTime: number
) => {
  const duration = Date.now() - startTime;
  
  // Если операция длится больше 5 секунд - это подозрительно
  if (duration > 5000) {
    Sentry.captureMessage(`Long operation detected: ${operationName}`, {
      level: 'warning',
      tags: {
        operation: operationName,
        duration: `${duration}ms`,
      },
      extra: {
        duration_ms: duration,
        timestamp: new Date().toISOString(),
      },
    });
  }
};

/**
 * 🎯 Track API errors
 */
export const trackAPIError = (
  endpoint: string,
  error: any,
  context?: Record<string, any>
) => {
  Sentry.captureException(error, {
    tags: {
      type: 'api_error',
      endpoint,
    },
    extra: {
      endpoint,
      context,
      error_message: error?.message,
      status_code: error?.response?.status,
    },
  });
};

// Export Sentry for direct usage
export { Sentry };
