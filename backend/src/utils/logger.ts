/**
 * 📝 LOGGER UTILITY - Flexible Logging System
 * 
 * Замена console.log с поддержкой уровней логирования.
 * Позволяет контролировать объём логов через переменную окружения.
 * 
 * Использование:
 * ```typescript
 * import { logger } from '@/utils/logger';
 * 
 * logger.debug('Детальная информация для отладки');
 * logger.info('Общая информация о работе');
 * logger.warn('Предупреждения');
 * logger.error('Ошибки');
 * ```
 * 
 * Настройка через .env:
 * LOG_LEVEL=debug  // Показывать всё
 * LOG_LEVEL=info   // Показывать info, warn, error (по умолчанию)
 * LOG_LEVEL=warn   // Показывать только warn и error
 * LOG_LEVEL=error  // Показывать только error
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private currentLevel: LogLevel;

  constructor() {
    // Получаем уровень из env или используем 'info' по умолчанию
    const envLevel = (process.env.LOG_LEVEL || 'info').toLowerCase() as LogLevel;
    this.currentLevel = LOG_LEVELS[envLevel] !== undefined ? envLevel : 'info';

    // В production по умолчанию только warn и error
    if (process.env.NODE_ENV === 'production' && !process.env.LOG_LEVEL) {
      this.currentLevel = 'warn';
    }
  }

  /**
   * Проверить, нужно ли логировать сообщение этого уровня
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.currentLevel];
  }

  /**
   * Форматировать timestamp
   */
  private getTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Форматировать префикс лога
   */
  private getPrefix(level: string): string {
    const timestamp = this.getTimestamp();
    return `[${timestamp}] [${level.toUpperCase()}]`;
  }

  /**
   * 🐛 DEBUG: Детальная информация для отладки
   * Показывается только в development или при LOG_LEVEL=debug
   */
  debug(...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.log(this.getPrefix('debug'), ...args);
    }
  }

  /**
   * ℹ️ INFO: Общая информация о работе приложения
   * Показывается в dev и production (если LOG_LEVEL=info)
   */
  info(...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log(this.getPrefix('info'), ...args);
    }
  }

  /**
   * ⚠️ WARN: Предупреждения (не критичные проблемы)
   * Показывается всегда, кроме LOG_LEVEL=error
   */
  warn(...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.getPrefix('warn'), ...args);
    }
  }

  /**
   * 🔴 ERROR: Ошибки (критичные проблемы)
   * Показывается ВСЕГДА
   */
  error(...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(this.getPrefix('error'), ...args);
    }
  }

  /**
   * 🎯 API Request Log: Специальный формат для HTTP запросов
   */
  request(method: string, path: string, statusCode?: number, duration?: number): void {
    if (this.shouldLog('info')) {
      const durationStr = duration ? `${duration}ms` : '';
      const statusStr = statusCode ? `${statusCode}` : '';
      console.log(
        this.getPrefix('info'),
        `${method} ${path}`,
        statusStr,
        durationStr
      );
    }
  }

  /**
   * 📊 Performance Log: Замер времени выполнения
   */
  performance(label: string, startTime: number): void {
    if (this.shouldLog('debug')) {
      const duration = Date.now() - startTime;
      console.log(this.getPrefix('debug'), `⏱️ ${label}: ${duration}ms`);
    }
  }

  /**
   * 🔍 Database Query Log
   */
  query(table: string, operation: string, duration?: number): void {
    if (this.shouldLog('debug')) {
      const durationStr = duration ? `(${duration}ms)` : '';
      console.log(
        this.getPrefix('debug'),
        `🗄️ DB: ${operation} ${table}`,
        durationStr
      );
    }
  }

  /**
   * 🌐 External API Log
   */
  externalApi(service: string, method: string, success: boolean, duration?: number): void {
    if (this.shouldLog('info')) {
      const statusEmoji = success ? '✅' : '❌';
      const durationStr = duration ? `${duration}ms` : '';
      console.log(
        this.getPrefix('info'),
        `${statusEmoji} ${service}: ${method}`,
        durationStr
      );
    }
  }

  /**
   * Изменить уровень логирования во время выполнения
   */
  setLevel(level: LogLevel): void {
    this.currentLevel = level;
    console.log(this.getPrefix('info'), `Log level changed to: ${level}`);
  }

  /**
   * Получить текущий уровень
   */
  getLevel(): LogLevel {
    return this.currentLevel;
  }
}

// Экспортируем singleton instance
export const logger = new Logger();

// Экспорт для использования в других файлах
export default logger;
