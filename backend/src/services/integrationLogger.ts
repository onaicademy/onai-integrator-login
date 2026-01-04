/**
 * Integration Logger Service
 * Централизованное логирование всех интеграций с внешними API
 *
 * Используется для:
 * - AmoCRM (sync_lead, create_deal, update_stage)
 * - Resend (send_email)
 * - Telegram (send_message)
 * - Mobizon (send_sms)
 * - Whapi (send_whatsapp)
 */

import { trafficAdminSupabase } from '../config/supabase-traffic';

/**
 * Тип сервиса интеграции
 */
export type IntegrationService = 'amocrm' | 'resend' | 'telegram' | 'mobizon' | 'whapi';

/**
 * Статус операции
 */
export type IntegrationStatus = 'success' | 'failed' | 'pending' | 'retrying';

/**
 * Тип связанной сущности
 */
export type RelatedEntityType = 'lead' | 'student' | 'tripwire_user' | 'traffic_user';

/**
 * Данные для логирования
 */
export interface IntegrationLogData {
  serviceName: IntegrationService;
  action: string;
  status: IntegrationStatus;
  relatedEntityType?: RelatedEntityType;
  relatedEntityId?: string;
  requestPayload?: any;
  responsePayload?: any;
  errorMessage?: string;
  errorCode?: string;
  durationMs?: number;
  retryCount?: number;
}

/**
 * Опции для track метода
 */
export interface TrackOptions {
  relatedEntityType?: RelatedEntityType;
  relatedEntityId?: string;
  includeRequest?: boolean;
  includeResponse?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Сервис логирования интеграций
 */
export class IntegrationLogger {
  /**
   * Записать лог интеграции
   */
  static async log(data: IntegrationLogData): Promise<void> {
    try {
      const { error } = await trafficAdminSupabase
        .from('integration_logs')
        .insert({
          service_name: data.serviceName,
          action: data.action,
          status: data.status,
          related_entity_type: data.relatedEntityType,
          related_entity_id: data.relatedEntityId,
          request_payload: data.requestPayload,
          response_payload: data.responsePayload,
          error_message: data.errorMessage,
          error_code: data.errorCode,
          duration_ms: data.durationMs,
          retry_count: data.retryCount || 0,
        });

      if (error) {
        console.error('[IntegrationLogger] Failed to log:', error);
        // НЕ бросаем ошибку - логирование не должно ломать основной флоу
      }
    } catch (err) {
      console.error('[IntegrationLogger] Exception:', err);
      // НЕ бросаем ошибку - логирование не должно ломать основной флоу
    }
  }

  /**
   * Обёртка для логирования асинхронной операции
   *
   * @example
   * ```typescript
   * const result = await IntegrationLogger.track(
   *   'amocrm',
   *   'sync_lead',
   *   async () => {
   *     return await amoCrmClient.post('/api/v4/leads', leadData);
   *   },
   *   {
   *     relatedEntityType: 'lead',
   *     relatedEntityId: leadData.id,
   *   }
   * );
   * ```
   */
  static async track<T>(
    serviceName: IntegrationService,
    action: string,
    operation: () => Promise<T>,
    options?: TrackOptions
  ): Promise<T> {
    const startTime = Date.now();
    let responsePayload: any;
    let status: IntegrationStatus = 'success';
    let errorMessage: string | undefined;
    let errorCode: string | undefined;

    try {
      const result = await operation();
      responsePayload = options?.includeResponse !== false ? result : undefined;

      // Добавляем metadata к response payload если указано
      if (options?.metadata && responsePayload !== undefined) {
        responsePayload = {
          ...responsePayload,
          _metadata: options.metadata
        };
      } else if (options?.metadata) {
        responsePayload = { _metadata: options.metadata };
      }

      return result;
    } catch (error: any) {
      status = 'failed';
      errorMessage = error.message || 'Unknown error';
      errorCode = error.code || error.status?.toString() || error.response?.status?.toString();

      // Добавляем metadata к response даже при ошибке
      if (options?.metadata) {
        responsePayload = { _metadata: options.metadata };
      }

      // Логируем стек ошибки для debugging
      if (error.stack) {
        console.error(`[IntegrationLogger] ${serviceName}.${action} error stack:`, error.stack);
      }

      throw error; // Пробрасываем дальше
    } finally {
      const durationMs = Date.now() - startTime;

      await this.log({
        serviceName,
        action,
        status,
        relatedEntityType: options?.relatedEntityType,
        relatedEntityId: options?.relatedEntityId,
        requestPayload: undefined, // request не сохраняем для безопасности (может содержать токены)
        responsePayload,
        errorMessage,
        errorCode,
        durationMs,
      });
    }
  }

  /**
   * Логировать успешную операцию
   */
  static async logSuccess(
    serviceName: IntegrationService,
    action: string,
    options?: {
      relatedEntityType?: RelatedEntityType;
      relatedEntityId?: string;
      responsePayload?: any;
      durationMs?: number;
    }
  ): Promise<void> {
    await this.log({
      serviceName,
      action,
      status: 'success',
      relatedEntityType: options?.relatedEntityType,
      relatedEntityId: options?.relatedEntityId,
      responsePayload: options?.responsePayload,
      durationMs: options?.durationMs,
    });
  }

  /**
   * Логировать ошибку операции
   */
  static async logError(
    serviceName: IntegrationService,
    action: string,
    error: Error,
    options?: {
      relatedEntityType?: RelatedEntityType;
      relatedEntityId?: string;
      errorCode?: string;
      durationMs?: number;
    }
  ): Promise<void> {
    await this.log({
      serviceName,
      action,
      status: 'failed',
      relatedEntityType: options?.relatedEntityType,
      relatedEntityId: options?.relatedEntityId,
      errorMessage: error.message,
      errorCode: options?.errorCode || (error as any).code,
      durationMs: options?.durationMs,
    });
  }

  /**
   * Получить статистику интеграций за последние 24 часа
   */
  static async getHourlyStats(): Promise<any[]> {
    try {
      const { data, error } = await trafficAdminSupabase
        .from('integration_stats_hourly')
        .select('*')
        .order('hour', { ascending: false });

      if (error) {
        console.error('[IntegrationLogger] Failed to get hourly stats:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('[IntegrationLogger] Exception getting hourly stats:', err);
      return [];
    }
  }

  /**
   * Получить статистику интеграций за последние 30 дней
   */
  static async getDailyStats(): Promise<any[]> {
    try {
      const { data, error } = await trafficAdminSupabase
        .from('integration_stats_daily')
        .select('*')
        .order('day', { ascending: false });

      if (error) {
        console.error('[IntegrationLogger] Failed to get daily stats:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('[IntegrationLogger] Exception getting daily stats:', err);
      return [];
    }
  }

  /**
   * Получить последние ошибки интеграций
   */
  static async getRecentFailures(limit: number = 50): Promise<any[]> {
    try {
      const { data, error } = await trafficAdminSupabase
        .from('integration_logs')
        .select('*')
        .eq('status', 'failed')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[IntegrationLogger] Failed to get recent failures:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('[IntegrationLogger] Exception getting recent failures:', err);
      return [];
    }
  }

  /**
   * Получить логи конкретного сервиса
   */
  static async getServiceLogs(
    serviceName: IntegrationService,
    limit: number = 100
  ): Promise<any[]> {
    try {
      const { data, error } = await trafficAdminSupabase
        .from('integration_logs')
        .select('*')
        .eq('service_name', serviceName)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[IntegrationLogger] Failed to get service logs:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('[IntegrationLogger] Exception getting service logs:', err);
      return [];
    }
  }
}
