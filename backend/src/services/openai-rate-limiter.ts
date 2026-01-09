/**
 * OpenAI Rate Limiter
 *
 * Профессиональная система управления rate limits для OpenAI Assistants API.
 *
 * Функции:
 * - Priority Queue (CRITICAL > HIGH > MEDIUM > LOW)
 * - Circuit Breaker (CLOSED → OPEN → HALF-OPEN)
 * - Exponential Backoff при 429 ошибках
 * - Self-healing (автоматическое восстановление)
 * - User-friendly сообщения об ошибках
 *
 * OpenAI Tier 1 Limits:
 * - RPM: 500 (мы используем 400 для запаса)
 * - TPM: 30,000 (мы используем 25,000)
 *
 * @see https://platform.openai.com/docs/guides/rate-limits
 */

import { EventEmitter } from 'events';
import { clientPool, AssistantType } from './openai-client-pool';

export type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF-OPEN';

interface QueuedRequest {
  id: string;
  assistantType: AssistantType;
  priority: Priority;
  operation: string;
  fn: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timestamp: number;
  retryCount: number;
  userId?: string;
}

export interface RateLimiterStats {
  status: 'healthy' | 'degraded' | 'critical';
  queueLength: number;
  queues: Record<AssistantType, {
    length: number;
    rpm: number;
    processing: boolean;
  }>;
  circuitBreakers: Record<AssistantType, CircuitState>;
  estimatedWaitSeconds: number;
  uptime: number;
}

/**
 * Custom error class for rate limit errors
 */
export class RateLimitError extends Error {
  public readonly waitSeconds: number;
  public readonly assistantType: string;
  public readonly userMessage: string;
  public readonly isRateLimit: boolean = true;

  constructor(message: string, waitSeconds: number, assistantType: string) {
    super(message);
    this.name = 'RateLimitError';
    this.userMessage = message;
    this.waitSeconds = waitSeconds;
    this.assistantType = assistantType;
  }

  toJSON() {
    return {
      error: 'rate_limit',
      message: this.userMessage,
      waitSeconds: this.waitSeconds,
      assistantType: this.assistantType,
    };
  }
}

class OpenAIRateLimiter extends EventEmitter {
  private queues: Map<AssistantType, QueuedRequest[]> = new Map();
  private processing: Map<AssistantType, boolean> = new Map();
  private circuitState: Map<AssistantType, CircuitState> = new Map();
  private consecutiveFailures: Map<AssistantType, number> = new Map();
  private circuitOpenTime: Map<AssistantType, number> = new Map();
  private startTime: number = Date.now();

  // ====== CONFIGURATION ======
  // 80% от официального лимита OpenAI Tier 1 (500 RPM)
  private readonly MAX_REQUESTS_PER_MINUTE = 400;

  // Максимум retry при 429
  private readonly MAX_RETRIES = 3;

  // Circuit breaker откроется после 5 consecutive failures
  private readonly CIRCUIT_OPEN_THRESHOLD = 5;

  // Circuit breaker перейдёт в HALF-OPEN через 30 секунд
  private readonly CIRCUIT_RESET_MS = 30000;

  // Базовый backoff при retry (будет умножаться экспоненциально)
  private readonly BASE_BACKOFF_MS = 1000;

  // User-friendly сообщения об ошибках
  private readonly ERROR_MESSAGES = [
    'Я немного перегрелся! Подождите пару минут, пожалуйста.',
    'Слишком много запросов! Дайте мне секундочку отдышаться.',
    'Высокая нагрузка! Ваш запрос в очереди, скоро отвечу.',
    'Небольшая пауза... Уже почти готов!',
    'Много студентов сейчас со мной общаются. Подождите немного!',
  ];

  constructor() {
    super();
    this.initializeQueues();
    console.log('🚀 [Rate Limiter] OpenAI Rate Limiter initialized');
    console.log(`   Max RPM: ${this.MAX_REQUESTS_PER_MINUTE} (80% of 500)`);
    console.log(`   Circuit threshold: ${this.CIRCUIT_OPEN_THRESHOLD} failures`);
    console.log(`   Circuit reset: ${this.CIRCUIT_RESET_MS}ms`);
  }

  /**
   * Инициализация очередей для каждого типа ассистента
   */
  private initializeQueues() {
    const types: AssistantType[] = ['curator', 'mentor', 'analyst'];

    for (const type of types) {
      this.queues.set(type, []);
      this.processing.set(type, false);
      this.circuitState.set(type, 'CLOSED');
      this.consecutiveFailures.set(type, 0);
      this.circuitOpenTime.set(type, 0);
    }
  }

  /**
   * Добавить запрос в очередь с приоритетом
   *
   * @param assistantType - Тип ассистента (curator, mentor, analyst)
   * @param operation - Название операции (для логирования)
   * @param fn - Функция для выполнения
   * @param priority - Приоритет (CRITICAL, HIGH, MEDIUM, LOW)
   * @param userId - ID пользователя (опционально)
   */
  async enqueue<T>(
    assistantType: AssistantType,
    operation: string,
    fn: () => Promise<T>,
    priority: Priority = 'MEDIUM',
    userId?: string
  ): Promise<T> {
    // Проверка circuit breaker
    const state = this.circuitState.get(assistantType) || 'CLOSED';

    if (state === 'OPEN') {
      // Проверяем, не пора ли перейти в HALF-OPEN
      const openTime = this.circuitOpenTime.get(assistantType) || 0;
      if (Date.now() - openTime >= this.CIRCUIT_RESET_MS) {
        this.circuitState.set(assistantType, 'HALF-OPEN');
        console.log(`🟡 [Rate Limiter] ${assistantType} circuit breaker → HALF-OPEN`);
      } else {
        const waitTime = Math.ceil((this.CIRCUIT_RESET_MS - (Date.now() - openTime)) / 1000);
        throw new RateLimitError(
          this.getRandomErrorMessage(),
          waitTime,
          assistantType
        );
      }
    }

    return new Promise((resolve, reject) => {
      const request: QueuedRequest = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        assistantType,
        priority,
        operation,
        fn,
        resolve,
        reject,
        timestamp: Date.now(),
        retryCount: 0,
        userId,
      };

      this.insertByPriority(assistantType, request);
      this.emit('queue-updated', this.getStats());

      console.log(
        `📥 [Rate Limiter] Queued: ${operation} (${priority}) for ${assistantType} | ` +
        `Queue: ${this.queues.get(assistantType)?.length || 0}`
      );

      // Запускаем обработку если не запущена
      if (!this.processing.get(assistantType)) {
        this.processQueue(assistantType);
      }
    });
  }

  /**
   * Вставка в очередь по приоритету
   */
  private insertByPriority(type: AssistantType, request: QueuedRequest) {
    const queue = this.queues.get(type)!;
    const priorityOrder: Record<Priority, number> = {
      CRITICAL: 0,
      HIGH: 1,
      MEDIUM: 2,
      LOW: 3,
    };

    const insertIndex = queue.findIndex(
      r => priorityOrder[r.priority] > priorityOrder[request.priority]
    );

    if (insertIndex === -1) {
      queue.push(request);
    } else {
      queue.splice(insertIndex, 0, request);
    }
  }

  /**
   * Обработка очереди для типа ассистента
   */
  private async processQueue(type: AssistantType) {
    this.processing.set(type, true);
    const queue = this.queues.get(type)!;

    while (queue.length > 0) {
      // Проверка rate limit
      const currentRPM = clientPool.getCurrentRPM(type);

      if (currentRPM >= this.MAX_REQUESTS_PER_MINUTE) {
        // Ждём до сброса счетчика (максимум 60 секунд)
        const waitTime = 5000; // Проверяем каждые 5 секунд
        console.log(
          `⏳ [Rate Limiter] ${type} rate limit reached (${currentRPM}/${this.MAX_REQUESTS_PER_MINUTE}), ` +
          `waiting ${waitTime}ms...`
        );
        await this.sleep(waitTime);
        continue;
      }

      const request = queue.shift()!;
      const waitTime = Date.now() - request.timestamp;

      try {
        console.log(
          `🚀 [Rate Limiter] Executing: ${request.operation} (${request.priority}) | ` +
          `Wait: ${waitTime}ms | Retry: ${request.retryCount}/${this.MAX_RETRIES}`
        );

        const result = await request.fn();

        // Успех - обновляем статистику
        clientPool.incrementRequest(type, true);
        this.consecutiveFailures.set(type, 0);

        // Если были в HALF-OPEN, закрываем circuit
        if (this.circuitState.get(type) === 'HALF-OPEN') {
          this.circuitState.set(type, 'CLOSED');
          console.log(`✅ [Rate Limiter] ${type} circuit breaker → CLOSED`);
        }

        request.resolve(result);

        this.emit('request-success', {
          type,
          operation: request.operation,
          waitTime,
        });

      } catch (error: any) {
        console.error(
          `❌ [Rate Limiter] Error in ${request.operation}: ${error.message}`
        );

        if (this.isRateLimitError(error)) {
          // Rate limit error - инкрементируем failures
          const failures = (this.consecutiveFailures.get(type) || 0) + 1;
          this.consecutiveFailures.set(type, failures);

          console.warn(
            `⚠️ [Rate Limiter] ${type} rate limit hit. ` +
            `Consecutive failures: ${failures}/${this.CIRCUIT_OPEN_THRESHOLD}`
          );

          // Проверяем, нужно ли открыть circuit breaker
          if (failures >= this.CIRCUIT_OPEN_THRESHOLD) {
            this.openCircuit(type);
          }

          // Retry с exponential backoff
          if (request.retryCount < this.MAX_RETRIES) {
            request.retryCount++;
            const backoff = Math.pow(2, request.retryCount) * this.BASE_BACKOFF_MS;

            console.log(
              `🔄 [Rate Limiter] Retry ${request.retryCount}/${this.MAX_RETRIES} ` +
              `in ${backoff}ms for ${request.operation}`
            );

            await this.sleep(backoff);
            this.insertByPriority(type, request);
            continue;
          }
        }

        // Финальный failure
        clientPool.incrementRequest(type, false);

        const rateLimitError = new RateLimitError(
          this.getRandomErrorMessage(),
          this.getEstimatedWaitTime(type),
          type
        );

        request.reject(rateLimitError);

        this.emit('request-failed', {
          type,
          operation: request.operation,
          error: error.message,
        });
      }

      this.emit('queue-updated', this.getStats());
    }

    this.processing.set(type, false);
    console.log(`✅ [Rate Limiter] ${type} queue empty, stopping processor`);
  }

  /**
   * Открыть circuit breaker
   */
  private openCircuit(type: AssistantType) {
    this.circuitState.set(type, 'OPEN');
    this.circuitOpenTime.set(type, Date.now());

    console.log(
      `🔴 [Rate Limiter] ${type} circuit breaker → OPEN ` +
      `(will reset in ${this.CIRCUIT_RESET_MS / 1000}s)`
    );

    this.emit('circuit-open', { type });

    // Автоматически переходим в HALF-OPEN через timeout
    setTimeout(() => {
      if (this.circuitState.get(type) === 'OPEN') {
        this.circuitState.set(type, 'HALF-OPEN');
        console.log(`🟡 [Rate Limiter] ${type} circuit breaker → HALF-OPEN`);
        this.emit('circuit-half-open', { type });
      }
    }, this.CIRCUIT_RESET_MS);
  }

  /**
   * Проверка на rate limit ошибку
   */
  private isRateLimitError(error: any): boolean {
    if (error.status === 429) return true;

    const message = (error.message || '').toLowerCase();
    return (
      message.includes('rate limit') ||
      message.includes('too many requests') ||
      message.includes('rate_limit_exceeded') ||
      message.includes('quota exceeded')
    );
  }

  /**
   * Получить случайное user-friendly сообщение
   */
  private getRandomErrorMessage(): string {
    return this.ERROR_MESSAGES[
      Math.floor(Math.random() * this.ERROR_MESSAGES.length)
    ];
  }

  /**
   * Оценка времени ожидания
   */
  private getEstimatedWaitTime(type: AssistantType): number {
    const queue = this.queues.get(type)!;
    const avgProcessTime = 2000; // ~2 секунды на запрос
    return Math.max(5, Math.ceil((queue.length * avgProcessTime) / 1000));
  }

  /**
   * Получить статистику rate limiter
   */
  getStats(): RateLimiterStats {
    const queues: RateLimiterStats['queues'] = {} as any;
    const circuitBreakers: RateLimiterStats['circuitBreakers'] = {} as any;
    let totalQueue = 0;
    let hasOpenCircuit = false;
    let hasDegraded = false;

    const types: AssistantType[] = ['curator', 'mentor', 'analyst'];

    for (const type of types) {
      const queueLength = this.queues.get(type)?.length || 0;
      const rpm = clientPool.getCurrentRPM(type);
      const circuitState = this.circuitState.get(type) || 'CLOSED';

      queues[type] = {
        length: queueLength,
        rpm,
        processing: this.processing.get(type) || false,
      };

      circuitBreakers[type] = circuitState;
      totalQueue += queueLength;

      if (circuitState === 'OPEN') hasOpenCircuit = true;
      if (circuitState === 'HALF-OPEN' || queueLength > 10) hasDegraded = true;
    }

    let status: RateLimiterStats['status'] = 'healthy';
    if (hasOpenCircuit) status = 'critical';
    else if (hasDegraded) status = 'degraded';

    return {
      status,
      queueLength: totalQueue,
      queues,
      circuitBreakers,
      estimatedWaitSeconds: Math.max(0, Math.ceil(totalQueue * 2)),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  /**
   * Принудительный сброс circuit breaker (для тестирования)
   */
  resetCircuitBreaker(type: AssistantType) {
    this.circuitState.set(type, 'CLOSED');
    this.consecutiveFailures.set(type, 0);
    console.log(`🔧 [Rate Limiter] ${type} circuit breaker manually reset`);
  }

  /**
   * Очистка очереди (для тестирования)
   */
  clearQueue(type: AssistantType) {
    const queue = this.queues.get(type);
    if (queue) {
      const count = queue.length;
      queue.forEach(req => req.reject(new Error('Queue cleared')));
      queue.length = 0;
      console.log(`🧹 [Rate Limiter] Cleared ${count} requests from ${type} queue`);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const openAIRateLimiter = new OpenAIRateLimiter();

console.log('✅ OpenAI Rate Limiter module loaded');
