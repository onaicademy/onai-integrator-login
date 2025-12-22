/**
 * Error Tracking Service
 * Централизованная система для отслеживания и логирования ошибок
 * + Telegram notifications for CRITICAL errors
 */
import { createClient } from '@supabase/supabase-js';
import pino from 'pino';
import axios from 'axios';

// Безопасная инициализация logger с проверкой окружения
let logger: pino.Logger;

try {
  // Попытка использовать pino-pretty только в development
  if (process.env.NODE_ENV === 'development') {
    logger = pino({
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
    });
  } else {
    // В production - простой JSON logger
    logger = pino();
  }
} catch (error) {
  // Fallback на простой logger если pino-pretty недоступен
  console.warn('⚠️ pino-pretty not available, using basic logger');
  logger = pino();
}

const LANDING_SUPABASE_URL = process.env.LANDING_SUPABASE_URL || '';
const LANDING_SUPABASE_SERVICE_KEY = process.env.LANDING_SUPABASE_SERVICE_KEY || '';

const supabase = createClient(LANDING_SUPABASE_URL, LANDING_SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ErrorCategory {
  AMOCRM = 'amocrm',
  TELEGRAM = 'telegram',
  DATABASE = 'database',
  QUEUE = 'queue',
  API = 'api',
  VALIDATION = 'validation',
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  UNKNOWN = 'unknown',
}

interface ErrorContext {
  userId?: string;
  leadId?: string;
  syncId?: string;
  jobId?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  requestBody?: any;
  metadata?: Record<string, any>;
}

interface ErrorLog {
  id?: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  message: string;
  stack?: string;
  context?: ErrorContext;
  timestamp: string;
  environment: string;
  resolved: boolean;
}

class ErrorTrackingService {
  /**
   * Track error и сохранить в БД
   */
  async trackError(
    error: Error | string,
    severity: ErrorSeverity,
    category: ErrorCategory,
    context?: ErrorContext
  ): Promise<string | null> {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorStack = typeof error === 'string' ? undefined : error.stack;

    const errorLog: ErrorLog = {
      severity,
      category,
      message: errorMessage,
      stack: errorStack,
      context,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      resolved: false,
    };

    // Log to console
    this.logToConsole(errorLog);

    // Save to database
    return await this.saveToDatabase(errorLog);
  }

  /**
   * Log to console с цветами и форматированием
   */
  private logToConsole(errorLog: ErrorLog): void {
    const emoji = this.getSeverityEmoji(errorLog.severity);
    const categoryEmoji = this.getCategoryEmoji(errorLog.category);

    logger.error({
      emoji: `${emoji} ${categoryEmoji}`,
      severity: errorLog.severity.toUpperCase(),
      category: errorLog.category,
      message: errorLog.message,
      context: errorLog.context,
      stack: errorLog.stack?.split('\n').slice(0, 3).join('\n'), // First 3 lines
    });
  }

  /**
   * Save error to database
   */
  private async saveToDatabase(errorLog: ErrorLog): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('error_logs')
        .insert({
          severity: errorLog.severity,
          category: errorLog.category,
          message: errorLog.message,
          stack: errorLog.stack,
          context: errorLog.context,
          timestamp: errorLog.timestamp,
          environment: errorLog.environment,
          resolved: errorLog.resolved,
        })
        .select('id')
        .single();

      if (error) {
        logger.warn('Failed to save error to database:', error.message);
        return null;
      }

      return data?.id || null;
    } catch (err) {
      logger.warn('Exception while saving error to database:', err);
      return null;
    }
  }

  /**
   * Get recent errors (для debug dashboard)
   */
  async getRecentErrors(limit: number = 50, category?: ErrorCategory): Promise<ErrorLog[]> {
    try {
      let query = supabase
        .from('error_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];
    } catch (err) {
      logger.error('Error fetching recent errors:', err);
      return [];
    }
  }

  /**
   * Get error statistics
   */
  async getErrorStats(hours: number = 24): Promise<any> {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase.rpc('get_error_stats', {
        since_timestamp: since,
      });

      if (error) {
        // Fallback to manual counting
        return await this.getErrorStatsManual(since);
      }

      return data;
    } catch (err) {
      logger.error('Error fetching error stats:', err);
      return null;
    }
  }

  /**
   * Manual error stats calculation
   */
  private async getErrorStatsManual(since: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('error_logs')
        .select('severity, category')
        .gte('timestamp', since);

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        by_severity: {} as Record<string, number>,
        by_category: {} as Record<string, number>,
      };

      data?.forEach((log: any) => {
        stats.by_severity[log.severity] = (stats.by_severity[log.severity] || 0) + 1;
        stats.by_category[log.category] = (stats.by_category[log.category] || 0) + 1;
      });

      return stats;
    } catch (err) {
      logger.error('Error calculating error stats manually:', err);
      return null;
    }
  }

  /**
   * Mark error as resolved
   */
  async resolveError(errorId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('error_logs')
        .update({ resolved: true })
        .eq('id', errorId);

      return !error;
    } catch (err) {
      logger.error('Error resolving error:', err);
      return false;
    }
  }

  /**
   * Helper: Get emoji for severity
   */
  private getSeverityEmoji(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.LOW:
        return '🟢';
      case ErrorSeverity.MEDIUM:
        return '🟡';
      case ErrorSeverity.HIGH:
        return '🟠';
      case ErrorSeverity.CRITICAL:
        return '🔴';
      default:
        return '⚪';
    }
  }

  /**
   * Helper: Get emoji for category
   */
  private getCategoryEmoji(category: ErrorCategory): string {
    switch (category) {
      case ErrorCategory.AMOCRM:
        return '💼';
      case ErrorCategory.TELEGRAM:
        return '📱';
      case ErrorCategory.DATABASE:
        return '🗄️';
      case ErrorCategory.QUEUE:
        return '📋';
      case ErrorCategory.API:
        return '🌐';
      case ErrorCategory.VALIDATION:
        return '✅';
      case ErrorCategory.NETWORK:
        return '🌍';
      case ErrorCategory.AUTHENTICATION:
        return '🔐';
      default:
        return '❓';
    }
  }

  /**
   * Wrap async function with error tracking
   */
  wrapAsync<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    category: ErrorCategory,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM
  ): T {
    return (async (...args: Parameters<T>) => {
      try {
        return await fn(...args);
      } catch (error: any) {
        await this.trackError(error, severity, category, {
          metadata: { functionName: fn.name, args },
        });
        throw error;
      }
    }) as T;
  }
}

// Export singleton instance
export const errorTracking = new ErrorTrackingService();
export default errorTracking;

