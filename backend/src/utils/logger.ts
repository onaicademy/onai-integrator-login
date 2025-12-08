/**
 * Production-Safe Logger
 * 
 * ✅ Development: Shows all logs (debug, info, warn, error)
 * ✅ Production: Shows only errors and warnings
 * ❌ Never logs sensitive data (passwords, tokens, etc.)
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogData {
  [key: string]: any;
}

class Logger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production';
  }

  /**
   * Debug - только для development
   * Используй для детальной отладки
   */
  debug(message: string, data?: LogData): void {
    if (this.isDevelopment) {
      console.log(`🐛 [DEBUG] ${message}`, data ? this.sanitize(data) : '');
    }
  }

  /**
   * Info - только для development
   * Используй для общей информации
   */
  info(message: string, data?: LogData): void {
    if (this.isDevelopment) {
      console.log(`ℹ️ [INFO] ${message}`, data ? this.sanitize(data) : '');
    }
  }

  /**
   * Warning - работает везде
   * Используй для потенциальных проблем
   */
  warn(message: string, data?: LogData): void {
    console.warn(`⚠️ [WARN] ${message}`, data ? this.sanitize(data) : '');
  }

  /**
   * Error - работает везде
   * Используй для критических ошибок
   */
  error(message: string, error?: Error | LogData): void {
    if (error instanceof Error) {
      console.error(`❌ [ERROR] ${message}`, {
        message: error.message,
        stack: this.isDevelopment ? error.stack : undefined,
      });
    } else {
      console.error(`❌ [ERROR] ${message}`, error ? this.sanitize(error) : '');
    }
  }

  /**
   * Sanitize - удаляет чувствительные данные
   */
  private sanitize(data: LogData): LogData {
    const sensitiveKeys = [
      'password',
      'token',
      'secret',
      'apiKey',
      'api_key',
      'serviceRoleKey',
      'service_role_key',
      'jwt',
      'authorization',
      'cookie',
      'session',
    ];

    const sanitized: LogData = {};

    for (const [key, value] of Object.entries(data)) {
      // Проверяем есть ли sensitive key
      const isSensitive = sensitiveKeys.some((sensitiveKey) =>
        key.toLowerCase().includes(sensitiveKey.toLowerCase())
      );

      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        // Рекурсивно sanitize вложенные объекты
        sanitized[key] = this.sanitize(value as LogData);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Success - только для development
   * Используй для успешных операций
   */
  success(message: string, data?: LogData): void {
    if (this.isDevelopment) {
      console.log(`✅ [SUCCESS] ${message}`, data ? this.sanitize(data) : '');
    }
  }
}

// Singleton instance
const logger = new Logger();

export default logger;

// Named exports для удобства
export const { debug, info, warn, error, success } = logger;

