/**
 * 🔄 RETRY WITH EXPONENTIAL BACKOFF
 * 
 * Умная система повторов при сбоях внешних API:
 * - Экспоненциальная задержка: 1s → 2s → 4s → 8s
 * - Защита от перегрузки сервисов
 * - Логирование попыток
 * - Гибкая настройка
 * 
 * Использование:
 * ```typescript
 * import { retryWithBackoff } from '@/utils/retryWithBackoff';
 * 
 * const result = await retryWithBackoff(
 *   async () => {
 *     const response = await fetch('https://api.example.com/data');
 *     return response.json();
 *   },
 *   {
 *     maxRetries: 3,
 *     initialDelay: 1000,
 *     shouldRetry: (error) => error.code === 'NETWORK_ERROR'
 *   }
 * );
 * ```
 */

import { logger } from './logger';

export interface RetryOptions {
  /** Максимальное количество попыток (по умолчанию: 3) */
  maxRetries?: number;
  
  /** Начальная задержка в миллисекундах (по умолчанию: 1000ms) */
  initialDelay?: number;
  
  /** Множитель для экспоненциального роста (по умолчанию: 2) */
  backoffMultiplier?: number;
  
  /** Максимальная задержка в миллисекундах (по умолчанию: 30000ms = 30s) */
  maxDelay?: number;
  
  /** Функция для определения, стоит ли повторять попытку */
  shouldRetry?: (error: any, attempt: number) => boolean;
  
  /** Callback перед каждой попыткой */
  onRetry?: (error: any, attempt: number, delay: number) => void;
  
  /** Имя операции для логирования */
  operationName?: string;
}

export interface RetryResult<T> {
  /** Результат успешного выполнения */
  data?: T;
  
  /** Ошибка после всех попыток */
  error?: any;
  
  /** Успешно ли выполнена операция */
  success: boolean;
  
  /** Количество попыток */
  attempts: number;
  
  /** Общее время выполнения */
  totalTime: number;
}

/**
 * Выполнить функцию с автоматическими повторами при ошибке
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    backoffMultiplier = 2,
    maxDelay = 30000,
    shouldRetry = () => true,
    onRetry,
    operationName = 'Operation',
  } = options;

  const startTime = Date.now();
  let lastError: any;
  let currentDelay = initialDelay;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.debug(`🔄 ${operationName}: Attempt ${attempt}/${maxRetries}`);
      
      const result = await fn();
      
      const totalTime = Date.now() - startTime;
      logger.debug(
        `✅ ${operationName}: Success on attempt ${attempt} (${totalTime}ms)`
      );
      
      return result;
    } catch (error) {
      lastError = error;
      
      // Проверяем, стоит ли повторять
      const retry = attempt < maxRetries && shouldRetry(error, attempt);
      
      if (!retry) {
        logger.error(
          `❌ ${operationName}: Failed after ${attempt} attempts`,
          error
        );
        throw error;
      }
      
      // Вызываем callback если есть
      if (onRetry) {
        onRetry(error, attempt, currentDelay);
      }
      
      // Логируем попытку повтора
      logger.warn(
        `⚠️ ${operationName}: Attempt ${attempt} failed, retrying in ${currentDelay}ms...`,
        { error: (error as any)?.message || String(error) }
      );
      
      // Ждём перед следующей попыткой
      await sleep(currentDelay);
      
      // Увеличиваем задержку (экспоненциально)
      currentDelay = Math.min(currentDelay * backoffMultiplier, maxDelay);
    }
  }

  // Если дошли сюда - все попытки исчерпаны
  const totalTime = Date.now() - startTime;
  logger.error(
    `💥 ${operationName}: All ${maxRetries} attempts failed (${totalTime}ms)`,
    lastError
  );
  
  throw lastError;
}

/**
 * Обёртка для использования с Result-паттерном (без throw)
 */
export async function retryWithBackoffSafe<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const startTime = Date.now();
  
  try {
    const data = await retryWithBackoff(fn, options);
    return {
      data,
      success: true,
      attempts: 1, // TODO: добавить счётчик попыток в результат
      totalTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      error,
      success: false,
      attempts: options.maxRetries || 3,
      totalTime: Date.now() - startTime,
    };
  }
}

/**
 * Специализированные retry функции для разных сервисов
 */

/**
 * Retry для AmoCRM API (учитывает специфику: 401, 429, 500+)
 */
export async function retryAmoCRM<T>(
  fn: () => Promise<T>,
  operationName: string = 'AmoCRM API'
): Promise<T> {
  return retryWithBackoff(fn, {
    maxRetries: 3,
    initialDelay: 2000, // 2 секунды для AmoCRM
    shouldRetry: (error, attempt) => {
      // Не повторяем при 401 (нужна переавторизация)
      if (error.response?.status === 401) {
        logger.warn('🔐 AmoCRM: 401 Unauthorized - need token refresh');
        return false;
      }
      
      // Повторяем при 429 (rate limit) и 5xx (server error)
      if (error.response?.status === 429 || error.response?.status >= 500) {
        return true;
      }
      
      // Повторяем при сетевых ошибках
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        return true;
      }
      
      return false;
    },
    operationName,
  });
}

/**
 * Retry для OpenAI API
 */
export async function retryOpenAI<T>(
  fn: () => Promise<T>,
  operationName: string = 'OpenAI API'
): Promise<T> {
  return retryWithBackoff(fn, {
    maxRetries: 3,
    initialDelay: 1000,
    backoffMultiplier: 3, // Быстрее растёт задержка (1s, 3s, 9s)
    shouldRetry: (error, attempt) => {
      // 429 = rate limit, 500+ = server error
      const status = error.response?.status || error.status;
      return status === 429 || status >= 500;
    },
    operationName,
  });
}

/**
 * Retry для Email сервисов (Resend)
 */
export async function retryEmail<T>(
  fn: () => Promise<T>,
  operationName: string = 'Email Service'
): Promise<T> {
  return retryWithBackoff(fn, {
    maxRetries: 5, // Больше попыток для email
    initialDelay: 1000,
    shouldRetry: (error) => {
      // Повторяем при любых ошибках, кроме 4xx (invalid data)
      const status = error.response?.status;
      return !status || status >= 500 || status === 429;
    },
    operationName,
  });
}

/**
 * Retry для SMS сервисов (Mobizon)
 */
export async function retrySMS<T>(
  fn: () => Promise<T>,
  operationName: string = 'SMS Service'
): Promise<T> {
  return retryWithBackoff(fn, {
    maxRetries: 4,
    initialDelay: 2000, // SMS может быть медленным
    shouldRetry: (error) => {
      const status = error.response?.status;
      // Не повторяем при 402 (недостаточно средств)
      if (status === 402) {
        logger.error('💰 SMS: Insufficient balance');
        return false;
      }
      return !status || status >= 500 || status === 429;
    },
    operationName,
  });
}

/**
 * Вспомогательная функция для задержки
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Экспортируем все функции
 */
export default {
  retryWithBackoff,
  retryWithBackoffSafe,
  retryAmoCRM,
  retryOpenAI,
  retryEmail,
  retrySMS,
};
