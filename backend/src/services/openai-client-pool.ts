/**
 * OpenAI Client Pool
 *
 * Пул клиентов с отдельными API ключами для каждого типа ассистента.
 * Это позволяет иметь независимые rate limits и изоляцию проблем.
 *
 * @see https://platform.openai.com/docs/guides/rate-limits
 */

import OpenAI from 'openai';

export type AssistantType = 'curator' | 'mentor' | 'analyst';

export interface AssistantClient {
  client: OpenAI;
  type: AssistantType;
  assistantId: string;
  apiKeyPrefix: string; // Для логирования (первые 8 символов)
  stats: {
    requestsThisMinute: number;
    lastResetTime: number;
    totalRequests: number;
    successfulRequests: number;
    failures: number;
  };
}

interface ClientPoolStats {
  clients: Record<AssistantType, {
    apiKeyPrefix: string;
    assistantId: string;
    requestsThisMinute: number;
    totalRequests: number;
    successRate: number;
  }>;
  initialized: boolean;
}

class OpenAIClientPool {
  private clients: Map<AssistantType, AssistantClient> = new Map();
  private initialized = false;

  constructor() {
    this.initializeClients();
    this.startResetTimer();
  }

  /**
   * Инициализация клиентов с отдельными API ключами
   */
  private initializeClients() {
    console.log('🔧 [OpenAI Pool] Initializing client pool...');

    const configs: Array<{
      type: AssistantType;
      apiKeyEnv: string;
      assistantIdEnv: string;
      fallbackApiKeyEnv: string;
    }> = [
      {
        type: 'curator',
        apiKeyEnv: 'OPENAI_API_KEY_CURATOR',
        assistantIdEnv: 'OPENAI_ASSISTANT_CURATOR_ID',
        fallbackApiKeyEnv: 'OPENAI_API_KEY',
      },
      {
        type: 'mentor',
        apiKeyEnv: 'OPENAI_API_KEY_MENTOR',
        assistantIdEnv: 'OPENAI_ASSISTANT_MENTOR_ID',
        fallbackApiKeyEnv: 'OPENAI_API_KEY',
      },
      {
        type: 'analyst',
        apiKeyEnv: 'OPENAI_API_KEY_ANALYST',
        assistantIdEnv: 'OPENAI_ASSISTANT_ANALYST_ID',
        fallbackApiKeyEnv: 'OPENAI_API_KEY',
      },
    ];

    for (const config of configs) {
      // Используем отдельный ключ или fallback на общий
      const apiKey = process.env[config.apiKeyEnv] || process.env[config.fallbackApiKeyEnv];
      const assistantId = process.env[config.assistantIdEnv] || '';

      if (!apiKey) {
        console.warn(`⚠️ [OpenAI Pool] No API key for ${config.type}, skipping...`);
        continue;
      }

      const client: AssistantClient = {
        client: new OpenAI({
          apiKey,
          defaultHeaders: {
            'OpenAI-Beta': 'assistants=v2',
          },
        }),
        type: config.type,
        assistantId,
        apiKeyPrefix: apiKey.substring(0, 12) + '...',
        stats: {
          requestsThisMinute: 0,
          lastResetTime: Date.now(),
          totalRequests: 0,
          successfulRequests: 0,
          failures: 0,
        },
      };

      this.clients.set(config.type, client);

      const hasOwnKey = !!process.env[config.apiKeyEnv];
      console.log(
        `✅ [OpenAI Pool] ${config.type}: ${hasOwnKey ? 'dedicated key' : 'shared key'} | ` +
        `Assistant: ${assistantId ? assistantId.substring(0, 12) + '...' : 'NOT SET'}`
      );
    }

    this.initialized = this.clients.size > 0;
    console.log(`🚀 [OpenAI Pool] Initialized ${this.clients.size} clients`);
  }

  /**
   * Сброс счетчиков каждую минуту
   */
  private startResetTimer() {
    setInterval(() => {
      const now = Date.now();

      for (const [type, client] of this.clients) {
        if (now - client.stats.lastResetTime >= 60000) {
          if (client.stats.requestsThisMinute > 0) {
            console.log(
              `📊 [OpenAI Pool] ${type}: ${client.stats.requestsThisMinute} req/min ` +
              `(total: ${client.stats.totalRequests}, success: ${client.stats.successfulRequests})`
            );
          }
          client.stats.requestsThisMinute = 0;
          client.stats.lastResetTime = now;
        }
      }
    }, 10000); // Проверяем каждые 10 секунд
  }

  /**
   * Получить клиент для типа ассистента
   */
  getClient(type: AssistantType): AssistantClient {
    const client = this.clients.get(type);

    if (!client) {
      // Fallback на curator если тип не найден
      const fallback = this.clients.get('curator');
      if (fallback) {
        console.warn(`⚠️ [OpenAI Pool] No client for ${type}, using curator fallback`);
        return fallback;
      }

      throw new Error(
        `[OpenAI Pool] No client available for type: ${type}. ` +
        `Available: ${Array.from(this.clients.keys()).join(', ')}`
      );
    }

    return client;
  }

  /**
   * Проверить доступность клиента
   */
  hasClient(type: AssistantType): boolean {
    return this.clients.has(type);
  }

  /**
   * Инкрементировать счетчик запросов
   */
  incrementRequest(type: AssistantType, success: boolean = true) {
    const client = this.clients.get(type);
    if (client) {
      client.stats.requestsThisMinute++;
      client.stats.totalRequests++;
      if (success) {
        client.stats.successfulRequests++;
      } else {
        client.stats.failures++;
      }
    }
  }

  /**
   * Получить текущий RPM для типа
   */
  getCurrentRPM(type: AssistantType): number {
    const client = this.clients.get(type);
    return client?.stats.requestsThisMinute || 0;
  }

  /**
   * Получить статистику пула
   */
  getStats(): ClientPoolStats {
    const clients: ClientPoolStats['clients'] = {} as any;

    for (const [type, client] of this.clients) {
      const successRate = client.stats.totalRequests > 0
        ? (client.stats.successfulRequests / client.stats.totalRequests) * 100
        : 100;

      clients[type] = {
        apiKeyPrefix: client.apiKeyPrefix,
        assistantId: client.assistantId,
        requestsThisMinute: client.stats.requestsThisMinute,
        totalRequests: client.stats.totalRequests,
        successRate: Math.round(successRate * 10) / 10,
      };
    }

    return {
      clients,
      initialized: this.initialized,
    };
  }

  /**
   * Проверка инициализации
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Singleton instance
export const clientPool = new OpenAIClientPool();

console.log('✅ OpenAI Client Pool module loaded');
