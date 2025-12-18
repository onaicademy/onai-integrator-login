/**
 * ✅ Smart API Client with Exponential Backoff Retries + Circuit Breaker
 * 
 * WHY:
 * - Автоматические retries при rate limiting (429)
 * - Exponential backoff предотвращает thundering herd
 * - Jitter для распределения нагрузки
 * - Уважает Retry-After header
 * - Circuit breaker предотвращает каскадные сбои
 * 
 * SAFE: Обратная совместимость - можно использовать вместо fetch()
 */

import { isNetworkError } from '@/utils/error-recovery';

interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // ms
  maxDelay: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 100,     // Первая попытка через 100ms
  maxDelay: 5000,     // Максимум 5 секунд между попытками
  backoffMultiplier: 2, // Exponential: 100ms → 200ms → 400ms
};

// ════════════════════════════════════════════════════════════════
// 🔌 CIRCUIT BREAKER PATTERN
// ════════════════════════════════════════════════════════════════

class CircuitBreaker {
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  private readonly failureThreshold = 5; // Открываем после 5 ошибок
  private readonly successThreshold = 2; // Закрываем после 2 успехов
  private readonly timeout = 30000; // 30 секунд в OPEN state
  
  constructor(private name: string) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Проверяем состояние circuit breaker
    if (this.state === 'OPEN') {
      // Проверяем, не пора ли перейти в HALF_OPEN
      if (Date.now() - this.lastFailureTime > this.timeout) {
        console.log(`🔄 [Circuit Breaker: ${this.name}] Переход в HALF_OPEN state`);
        this.state = 'HALF_OPEN';
        this.successCount = 0;
      } else {
        // Circuit открыт - не делаем запросы
        throw new Error(`Circuit breaker is OPEN for ${this.name}`);
      }
    }
    
    try {
      const result = await fn();
      
      // Успех
      this.onSuccess();
      return result;
    } catch (error) {
      // Ошибка
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failureCount = 0;
    
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      
      if (this.successCount >= this.successThreshold) {
        console.log(`✅ [Circuit Breaker: ${this.name}] Переход в CLOSED state`);
        this.state = 'CLOSED';
        this.successCount = 0;
      }
    }
  }
  
  private onFailure() {
    this.lastFailureTime = Date.now();
    this.failureCount++;
    
    if (this.state === 'HALF_OPEN') {
      console.warn(`⚠️ [Circuit Breaker: ${this.name}] Ошибка в HALF_OPEN, возврат в OPEN`);
      this.state = 'OPEN';
      this.successCount = 0;
      return;
    }
    
    if (this.failureCount >= this.failureThreshold) {
      console.error(`🔴 [Circuit Breaker: ${this.name}] Переход в OPEN state (${this.failureCount} ошибок)`);
      this.state = 'OPEN';
    }
  }
  
  getState() {
    return this.state;
  }
  
  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    console.log(`🔄 [Circuit Breaker: ${this.name}] Reset`);
  }
}

// Global circuit breaker instance
const globalCircuitBreaker = new CircuitBreaker('API');

// Export для тестирования/отладки
export { globalCircuitBreaker };

/**
 * Fetch с автоматическими smart retries + Circuit Breaker
 */
export async function fetchWithSmartRetry(
  url: string,
  options: RequestInit = {},
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<Response> {
  // 🔌 Используем circuit breaker для защиты от каскадных сбоев
  return await globalCircuitBreaker.execute(async () => {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < retryConfig.maxAttempts; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          // ✅ Сообщаем backend что это retry (для adaptive rate limiting)
          'X-Retry-Attempt': attempt > 0 ? 'true' : 'false',
            // ✅ Добавляем circuit breaker state для мониторинга
            'X-Circuit-State': globalCircuitBreaker.getState(),
        },
      });
      
      // ✅ 429 Too Many Requests - делаем паузу и повторяем
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        
        // Используем Retry-After header если есть, иначе exponential backoff
        let delayMs = retryAfter 
          ? parseInt(retryAfter) * 1000 
          : Math.min(
              retryConfig.baseDelay * Math.pow(retryConfig.backoffMultiplier, attempt),
              retryConfig.maxDelay
            );
        
        // ✅ Jitter (random +0-1000ms) чтобы избежать thundering herd
        delayMs += Math.random() * 1000;
        
        console.warn(
          `⏳ [API] Rate limited (429) on attempt ${attempt + 1}/${retryConfig.maxAttempts}. ` +
          `Retrying after ${Math.round(delayMs)}ms...`
        );
        
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue; // Retry
      }
      
      // ✅ 5xx Server errors - retry
      if (response.status >= 500 && response.status < 600) {
        if (attempt < retryConfig.maxAttempts - 1) {
          const delay = Math.min(
            retryConfig.baseDelay * Math.pow(retryConfig.backoffMultiplier, attempt),
            retryConfig.maxDelay
          );
          
          console.warn(
            `⚠️ [API] Server error (${response.status}) on attempt ${attempt + 1}. ` +
            `Retrying after ${delay}ms...`
          );
          
          await new Promise(resolve => setTimeout(resolve, delay));
          continue; // Retry
        }
      }
      
      // ✅ Успех или client error (4xx кроме 429) - возвращаем сразу
      return response;
      
      } catch (error: any) {
        lastError = error;
      
        // 🔍 Проверяем тип ошибки
        const isNetError = isNetworkError(error);
        
        if (isNetError && attempt < retryConfig.maxAttempts - 1) {
        const delay = Math.min(
          retryConfig.baseDelay * Math.pow(retryConfig.backoffMultiplier, attempt),
          retryConfig.maxDelay
        );
        
        console.warn(
            `🔌 [API] Network error on attempt ${attempt + 1}/${retryConfig.maxAttempts}. ` +
            `Retrying after ${delay}ms...`,
            '\nError:', error.message
        );
        
        await new Promise(resolve => setTimeout(resolve, delay));
          continue; // Retry
        }
        
        // Не network error или последняя попытка - выбрасываем
        if (attempt >= retryConfig.maxAttempts - 1) {
          console.error(
            `❌ [API] Max retry attempts (${retryConfig.maxAttempts}) exceeded`,
            '\nLast error:', lastError?.message
          );
          throw lastError;
      }
    }
  }
  
  // Если все попытки failed
  console.error(`❌ [API] Max retry attempts (${retryConfig.maxAttempts}) exceeded`);
  throw lastError || new Error('Max retry attempts exceeded');
  });
}

/**
 * ✅ API Client с удобными методами
 */
export const apiClient = {
  /**
   * GET request с автоматическими retries
   */
  get: async (url: string, options: RequestInit = {}) => {
    return fetchWithSmartRetry(url, { 
      ...options, 
      method: 'GET' 
    });
  },
  
  /**
   * POST request с автоматическими retries
   */
  post: async (url: string, body: any, options: RequestInit = {}) => {
    return fetchWithSmartRetry(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  },
  
  /**
   * PUT request с автоматическими retries
   */
  put: async (url: string, body: any, options: RequestInit = {}) => {
    return fetchWithSmartRetry(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  },
  
  /**
   * DELETE request с автоматическими retries
   */
  delete: async (url: string, options: RequestInit = {}) => {
    return fetchWithSmartRetry(url, {
      ...options,
      method: 'DELETE',
    });
  },
};

/**
 * ✅ USAGE EXAMPLE:
 * 
 * БЫЛО:
 * const response = await fetch('/api/tripwire/complete', {
 *   method: 'POST',
 *   body: JSON.stringify({ lesson_id: 67, ... }),
 *   headers: { 'Content-Type': 'application/json' }
 * });
 * 
 * СТАЛО:
 * const response = await apiClient.post('/api/tripwire/complete', {
 *   lesson_id: 67,
 *   module_id: 16,
 *   tripwire_user_id: userId,
 * });
 * 
 * ✅ Автоматически:
 * - Retries при 429 (rate limiting)
 * - Retries при 5xx (server errors)
 * - Retries при network errors
 * - Exponential backoff с jitter
 * - Уважает Retry-After header
 */

export default apiClient;
