/**
 * 🎯 УМНЫЙ RATE LIMITER ДЛЯ AMOCRM
 *
 * Лимит AmoCRM: 7 запросов/секунду
 * Наша стратегия: 5 запросов/секунду (запас безопасности)
 *
 * ПРИОРИТЕТЫ:
 * 1. CRITICAL (лиды с лендингов) - максимальный приоритет
 * 2. HIGH (синхронизация воронок) - важная операция
 * 3. MEDIUM (получение данных для дашбордов) - можно подождать
 * 4. LOW (массовые обновления) - фоновые задачи
 */

import { EventEmitter } from 'events';

interface QueuedRequest {
  id: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  operation: string;
  fn: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timestamp: number;
  retryCount: number;
}

class AmoCRMRateLimiter extends EventEmitter {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private requestsThisSecond = 0;
  private lastResetTime = Date.now();

  // Конфигурация
  private readonly MAX_REQUESTS_PER_SECOND = 5; // Запас от 7
  private readonly MAX_RETRIES = 3;
  private readonly RESET_INTERVAL = 1000; // 1 секунда

  // Метрики для UI
  private stats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    queueLength: 0,
    averageWaitTime: 0,
    lastSyncTime: null as Date | null,
  };

  constructor() {
    super();
    this.startResetTimer();
  }

  /**
   * Добавить запрос в очередь с приоритетом
   */
  async enqueue<T>(
    operation: string,
    fn: () => Promise<T>,
    priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM'
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const request: QueuedRequest = {
        id: `${Date.now()}-${Math.random()}`,
        priority,
        operation,
        fn,
        resolve,
        reject,
        timestamp: Date.now(),
        retryCount: 0,
      };

      // Вставляем с учетом приоритета
      this.insertByPriority(request);
      this.stats.queueLength = this.queue.length;

      // Эмитим событие для UI
      this.emit('queue-updated', this.getStats());

      // Запускаем обработку если не запущена
      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  /**
   * Вставка в очередь по приоритету
   */
  private insertByPriority(request: QueuedRequest) {
    const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

    const insertIndex = this.queue.findIndex(
      (r) => priorityOrder[r.priority] > priorityOrder[request.priority]
    );

    if (insertIndex === -1) {
      this.queue.push(request);
    } else {
      this.queue.splice(insertIndex, 0, request);
    }
  }

  /**
   * Обработка очереди
   */
  private async processQueue() {
    this.processing = true;

    while (this.queue.length > 0) {
      // Проверяем лимит
      if (this.requestsThisSecond >= this.MAX_REQUESTS_PER_SECOND) {
        // Ждём до следующей секунды
        const waitTime = this.RESET_INTERVAL - (Date.now() - this.lastResetTime);
        if (waitTime > 0) {
          console.log(`⏳ [AmoCRM] Rate limit reached, waiting ${waitTime}ms`);
          await this.sleep(waitTime);
        }
        continue;
      }

      // Берем запрос с наивысшим приоритетом
      const request = this.queue.shift();
      if (!request) continue;

      this.stats.queueLength = this.queue.length;

      try {
        console.log(`🚀 [AmoCRM] Executing: ${request.operation} (priority: ${request.priority})`);

        const result = await request.fn();

        this.requestsThisSecond++;
        this.stats.totalRequests++;
        this.stats.successfulRequests++;
        this.stats.lastSyncTime = new Date();

        // Считаем среднее время ожидания
        const waitTime = Date.now() - request.timestamp;
        this.stats.averageWaitTime =
          (this.stats.averageWaitTime * (this.stats.totalRequests - 1) + waitTime) /
          this.stats.totalRequests;

        request.resolve(result);

        this.emit('request-success', {
          operation: request.operation,
          waitTime,
        });

      } catch (error: any) {
        console.error(`❌ [AmoCRM] Error in ${request.operation}:`, error.message);

        // Проверяем если это rate limit error - делаем retry
        if (this.isRateLimitError(error) && request.retryCount < this.MAX_RETRIES) {
          console.log(`🔄 [AmoCRM] Retrying ${request.operation} (attempt ${request.retryCount + 1}/${this.MAX_RETRIES})`);

          request.retryCount++;
          this.insertByPriority(request); // Возвращаем в очередь

          // Ждём дольше перед retry
          await this.sleep(2000);

        } else {
          this.stats.failedRequests++;
          request.reject(error);

          this.emit('request-failed', {
            operation: request.operation,
            error: error.message,
          });
        }
      }

      this.emit('queue-updated', this.getStats());
    }

    this.processing = false;
  }

  /**
   * Проверка на rate limit ошибку
   */
  private isRateLimitError(error: any): boolean {
    const message = error.message?.toLowerCase() || '';
    return (
      message.includes('rate limit') ||
      message.includes('too many requests') ||
      error.status === 429
    );
  }

  /**
   * Сброс счетчика каждую секунду
   */
  private startResetTimer() {
    setInterval(() => {
      if (this.requestsThisSecond > 0) {
        console.log(`📊 [AmoCRM] Requests this second: ${this.requestsThisSecond}/${this.MAX_REQUESTS_PER_SECOND}`);
      }
      this.requestsThisSecond = 0;
      this.lastResetTime = Date.now();
    }, this.RESET_INTERVAL);
  }

  /**
   * Получить статистику для UI
   */
  getStats() {
    return {
      ...this.stats,
      queueLength: this.queue.length,
      requestsThisSecond: this.requestsThisSecond,
      maxRequestsPerSecond: this.MAX_REQUESTS_PER_SECOND,
    };
  }

  /**
   * Сбросить статистику
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      queueLength: this.queue.length,
      averageWaitTime: 0,
      lastSyncTime: null,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const amoCRMRateLimiter = new AmoCRMRateLimiter();
