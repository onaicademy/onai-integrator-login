import { api } from '@/utils/apiClient';

/**
 * Production Error Tracking Service
 * Отправляет client-side ошибки на backend для логирования
 */

interface ErrorReport {
  message: string;
  stack?: string;
  userAgent: string;
  url: string;
  timestamp: number;
  userId?: string;
}

/**
 * Get current user ID from localStorage
 */
function getCurrentUserId(): string | undefined {
  try {
    // Try Tripwire token first
    const tripwireToken = localStorage.getItem('tripwire_supabase_token');
    if (tripwireToken) {
      const decoded = JSON.parse(atob(tripwireToken.split('.')[1]));
      return decoded.sub;
    }
    
    // Try Main Platform token
    const mainToken = localStorage.getItem('supabase_token');
    if (mainToken) {
      const decoded = JSON.parse(atob(mainToken.split('.')[1]));
      return decoded.sub;
    }
  } catch (e) {
    // Ignore parsing errors
  }
  
  return undefined;
}

/**
 * Track client-side error
 * Sends error to backend for logging in system_health_logs
 */
export async function trackError(error: Error, context?: any) {
  const report: ErrorReport = {
    message: error.message,
    stack: error.stack,
    userAgent: navigator.userAgent,
    url: window.location.href,
    timestamp: Date.now(),
    userId: getCurrentUserId(),
  };

  try {
    // Send to backend
    await api.post('/api/tripwire/debug/client-error', {
      ...report,
      context,
    });
    
    console.log('📱 [ERROR TRACKER] Error sent to backend:', error.message);
  } catch (e) {
    // Fallback: save to localStorage
    try {
      const errors = JSON.parse(localStorage.getItem('client_errors') || '[]');
      errors.push(report);
      // Keep only last 10 errors
      localStorage.setItem('client_errors', JSON.stringify(errors.slice(-10)));
      console.log('💾 [ERROR TRACKER] Error saved to localStorage (backend unavailable)');
    } catch (storageError) {
      // Can't even save to localStorage - just log to console
      console.error('❌ [ERROR TRACKER] Failed to track error:', e);
    }
  }
}

/**
 * Initialize global error handlers
 * Call this once in your app initialization
 */
export function initErrorTracking() {
  // Only in production
  if (import.meta.env.DEV) {
    console.log('🔍 [ERROR TRACKER] Skipping in development mode');
    return;
  }

  console.log('🚀 [ERROR TRACKER] Production error tracking initialized');

  // Global unhandled error handler
  window.addEventListener('error', (event) => {
    trackError(event.error || new Error(event.message), { 
      type: 'unhandled',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  // Unhandled promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    trackError(
      event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason)),
      { type: 'promise_rejection' }
    );
  });
}

/**
 * Manually track a custom error
 * Use this in catch blocks where you want explicit tracking
 * 
 * @example
 * try {
 *   await api.get('/some/endpoint');
 * } catch (error) {
 *   trackCustomError('API call failed', error, { endpoint: '/some/endpoint' });
 * }
 */
export function trackCustomError(message: string, error: any, context?: any) {
  const err = error instanceof Error ? error : new Error(message);
  trackError(err, { ...context, custom: true, originalMessage: message });
}
