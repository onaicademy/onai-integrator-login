/**
 * ✅ Smart API Client with Exponential Backoff Retries
 * 
 * WHY:
 * - Автоматические retries при rate limiting (429)
 * - Exponential backoff предотвращает thundering herd
 * - Jitter для распределения нагрузки
 * - Уважает Retry-After header
 * 
 * SAFE: Обратная совместимость - можно использовать вместо fetch()
 */

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

/**
 * Fetch с автоматическими smart retries
 */
export async function fetchWithSmartRetry(
  url: string,
  options: RequestInit = {},
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < retryConfig.maxAttempts; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          // ✅ Сообщаем backend что это retry (для adaptive rate limiting)
          'X-Retry-Attempt': attempt > 0 ? 'true' : 'false',
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
      
    } catch (error) {
      lastError = error as Error;
      
      // Network errors - retry
      if (attempt < retryConfig.maxAttempts - 1) {
        const delay = Math.min(
          retryConfig.baseDelay * Math.pow(retryConfig.backoffMultiplier, attempt),
          retryConfig.maxDelay
        );
        
        console.warn(
          `🔌 [API] Network error on attempt ${attempt + 1}. Retrying after ${delay}ms...`
        );
        
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
  }
  
  // Если все попытки failed
  console.error(`❌ [API] Max retry attempts (${retryConfig.maxAttempts}) exceeded`);
  throw lastError || new Error('Max retry attempts exceeded');
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
