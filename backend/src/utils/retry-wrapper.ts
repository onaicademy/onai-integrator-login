/**
 * 🛡️ RETRY WRAPPER - Защита от временных сбоев
 * 
 * Автоматически повторяет запросы при временных ошибках
 */

export interface RetryOptions {
  maxRetries?: number;
  delayMs?: number;
  exponentialBackoff?: boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Обёртка с retry логикой для асинхронных функций
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delayMs = 1000,
    exponentialBackoff = true,
    onRetry
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Не ретраим для некоторых типов ошибок
      if (isNonRetryableError(error)) {
        throw error;
      }

      // Последняя попытка - бросаем ошибку
      if (attempt === maxRetries) {
        console.error(`❌ [RETRY] Все ${maxRetries + 1} попыток провалились`);
        throw error;
      }

      // Вычисляем задержку
      const delay = exponentialBackoff 
        ? delayMs * Math.pow(2, attempt)
        : delayMs;

      console.warn(`⚠️ [RETRY] Попытка ${attempt + 1}/${maxRetries + 1} провалилась: ${error.message}`);
      console.warn(`   Повтор через ${delay}ms...`);

      if (onRetry) {
        onRetry(attempt + 1, error);
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Проверяет является ли ошибка non-retryable
 */
function isNonRetryableError(error: any): boolean {
  // Не ретраим ошибки валидации, авторизации и т.д.
  const nonRetryableCodes = [
    'PGRST116', // Row not found
    '23505',    // Unique constraint violation
    '23503',    // Foreign key violation
    '42P01',    // Undefined table
    '42703',    // Undefined column
  ];

  const nonRetryableMessages = [
    'invalid login credentials',
    'email already exists',
    'duplicate key',
    'not found',
    'unauthorized',
    'forbidden'
  ];

  const errorMsg = (error.message || '').toLowerCase();
  const errorCode = error.code || '';

  // Проверяем код
  if (nonRetryableCodes.includes(errorCode)) {
    return true;
  }

  // Проверяем сообщение
  if (nonRetryableMessages.some(msg => errorMsg.includes(msg))) {
    return true;
  }

  return false;
}

/**
 * Обёртка для Supabase RPC с retry
 */
export async function supabaseRpcWithRetry<T>(
  rpcCall: () => Promise<{ data: T | null; error: any }>,
  options: RetryOptions = {}
): Promise<T> {
  return withRetry(async () => {
    const { data, error } = await rpcCall();
    
    if (error) {
      throw new Error(error.message || 'RPC error');
    }
    
    return data as T;
  }, options);
}
