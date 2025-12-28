/**
 * Circuit Breaker & Retry Service
 * 
 * Защита от превышения лимитов API и автоматический retry с exponential backoff
 */

interface CircuitBreakerConfig {
  threshold: number;        // Количество ошибок до открытия
  timeout: number;          // Время ожидания перед повторной попыткой (ms)
  halfOpenAttempts: number; // Количество попыток в half-open состоянии
}

interface RetryConfig {
  maxAttempts: number;      // Максимальное количество попыток
  baseDelay: number;        // Базовая задержка (ms)
  maxDelay: number;         // Максимальная задержка (ms)
  backoffMultiplier: number; // Множитель для exponential backoff
}

/**
 * Circuit Breaker - защита от каскадных сбоев
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private halfOpenSuccessCount = 0;
  
  constructor(private config: CircuitBreakerConfig) {}
  
  /**
   * Выполняет функцию с защитой circuit breaker
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Если circuit breaker открыт, проверяем, можно ли перейти в half-open
    if (this.state === 'open') {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure < this.config.timeout) {
        throw new Error(`Circuit breaker is OPEN. Retry after ${this.config.timeout - timeSinceLastFailure}ms`);
      }
      
      // Переходим в half-open состояние
      this.state = 'half-open';
      this.halfOpenSuccessCount = 0;
      console.log('🔓 Circuit breaker transitioned to HALF-OPEN');
    }
    
    try {
      const result = await fn();
      
      // Если успешно, сбрасываем счетчик ошибок
      if (this.state === 'half-open') {
        this.halfOpenSuccessCount++;
        if (this.halfOpenSuccessCount >= this.config.halfOpenAttempts) {
          this.state = 'closed';
          this.failures = 0;
          console.log('✅ Circuit breaker transitioned to CLOSED');
        }
      } else {
        this.failures = 0;
      }
      
      return result;
    } catch (error: any) {
      this.failures++;
      this.lastFailureTime = Date.now();
      
      // Проверяем, нужно ли открыть circuit breaker
      if (this.failures >= this.config.threshold) {
        this.state = 'open';
        console.error(`🔴 Circuit breaker OPENED after ${this.failures} failures`);
      }
      
      throw error;
    }
  }
  
  /**
   * Получает текущее состояние circuit breaker
   */
  getState(): 'closed' | 'open' | 'half-open' {
    return this.state;
  }
  
  /**
   * Сбрасывает circuit breaker в закрытое состояние
   */
  reset(): void {
    this.failures = 0;
    this.lastFailureTime = 0;
    this.state = 'closed';
    this.halfOpenSuccessCount = 0;
    console.log('🔄 Circuit breaker reset to CLOSED');
  }
  
  /**
   * Проверяет, является ли ошибка временной (повторяемой)
   */
  isRetryableError(error: any): boolean {
    if (!error) return false;
    
    // HTTP ошибки, которые можно повторить
    const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
    const isRetryableStatusCode = error.response?.status && 
      retryableStatusCodes.includes(error.response.status);
    
    // Ошибки сети
    const isNetworkError = error.code === 'ECONNREFUSED' ||
      error.code === 'ECONNRESET' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ENOTFOUND' ||
      error.message?.includes('timeout') ||
      error.message?.includes('ETIMEDOUT');
    
    // Rate limit от Facebook
    const isRateLimit = error.response?.data?.error?.code === 4 ||
      error.response?.data?.error?.code === 17 ||
      error.response?.data?.error?.code === 32 ||
      error.response?.data?.error?.code === 80004;
    
    return isRetryableStatusCode || isNetworkError || isRateLimit;
  }
}

/**
 * Retry Logic - автоматический повтор с exponential backoff
 */
export class RetryManager {
  constructor(private config: RetryConfig) {}
  
  /**
   * Выполняет функцию с автоматическим retry
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        
        // Если это последняя попытка, выбрасываем ошибку
        if (attempt === this.config.maxAttempts) {
          console.error(`❌ All ${this.config.maxAttempts} attempts failed`);
          throw error;
        }
        
        // Проверяем, можно ли повторить
        const circuitBreaker = new CircuitBreaker({
          threshold: 5,
          timeout: 60000,
          halfOpenAttempts: 2,
        });
        
        if (!circuitBreaker.isRetryableError(error)) {
          console.log(`⚠️ Error is not retryable: ${error.message}`);
          throw error;
        }
        
        // Рассчитываем задержку с exponential backoff
        const delay = this.calculateDelay(attempt);
        console.warn(`⚠️ Attempt ${attempt}/${this.config.maxAttempts} failed. Retrying in ${delay}ms...`);
        
        // Ждем перед следующей попыткой
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }
  
  /**
   * Рассчитывает задержку с exponential backoff
   */
  private calculateDelay(attempt: number): number {
    const exponentialDelay = this.config.baseDelay * 
      Math.pow(this.config.backoffMultiplier, attempt - 1);
    const jitter = exponentialDelay * 0.1; // Добавляем случайный джиттер ±10%
    const delay = exponentialDelay + (Math.random() * jitter - jitter / 2);
    
    return Math.min(delay, this.config.maxDelay);
  }
  
  /**
   * Асинхронная задержка
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Комбинированный сервис с Circuit Breaker и Retry
 */
export class ResilientRequestManager {
  private circuitBreaker: CircuitBreaker;
  private retryManager: RetryManager;
  
  constructor(
    circuitBreakerConfig: CircuitBreakerConfig,
    retryConfig: RetryConfig
  ) {
    this.circuitBreaker = new CircuitBreaker(circuitBreakerConfig);
    this.retryManager = new RetryManager(retryConfig);
  }
  
  /**
   * Выполняет запрос с защитой circuit breaker и retry logic
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await this.circuitBreaker.execute(async () => {
        return await this.retryManager.execute(fn);
      });
    } catch (error: any) {
      console.error(`❌ Resilient request failed:`, error.message);
      throw error;
    }
  }
  
  /**
   * Получает состояние circuit breaker
   */
  getCircuitBreakerState(): 'closed' | 'open' | 'half-open' {
    return this.circuitBreaker.getState();
  }
  
  /**
   * Сбрасывает circuit breaker
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
  }
}

// Дефолтные конфигурации
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  threshold: 5,           // 5 ошибок до открытия
  timeout: 60000,         // 1 минута ожидания
  halfOpenAttempts: 2,    // 2 успешные попытки для закрытия
};

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,         // Максимум 3 попытки
  baseDelay: 1000,        // 1 секунда базовая задержка
  maxDelay: 30000,        // 30 секунд максимальная задержка
  backoffMultiplier: 2,   // Удваиваем задержку каждый раз
};

// Создаем дефолтный экземпляр для Facebook API
export const facebookRequestManager = new ResilientRequestManager(
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
  DEFAULT_RETRY_CONFIG
);
