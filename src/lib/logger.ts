// ============================================
// Logger - Система логирования с фильтрацией для production
// ============================================
// В production показываем только ошибки, в development - все логи

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableSentry: boolean;
}

// Получаем уровень логирования из окружения
const getLogLevel = (): LogLevel => {
  const env = import.meta.env.MODE || process.env.NODE_ENV;

  if (env === 'production') {
    return 'error'; // В production только ошибки
  }

  return 'debug'; // В development все логи
};

const config: LoggerConfig = {
  level: getLogLevel(),
  enableConsole: true,
  enableSentry: import.meta.env.VITE_SENTRY_DSN !== undefined,
};

// Уровни логирования
const levels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Проверка, нужно ли логировать
const shouldLog = (level: LogLevel): boolean => {
  return levels[level] >= levels[config.level];
};

// Форматирование сообщения
const formatMessage = (level: LogLevel, message: string, data?: any): string => {
  const timestamp = new Date().toISOString();
  const prefix = `[${level.toUpperCase()}]`;

  if (data) {
    return `${timestamp} ${prefix} ${message} ${JSON.stringify(data)}`;
  }

  return `${timestamp} ${prefix} ${message}`;
};

// Логирование в консоль
const logToConsole = (level: LogLevel, message: string, data?: any): void => {
  if (!config.enableConsole || !shouldLog(level)) {
    return;
  }

  const formattedMessage = formatMessage(level, message, data);

  switch (level) {
    case 'debug':
      console.log(formattedMessage);
      break;
    case 'info':
      console.info(formattedMessage);
      break;
    case 'warn':
      console.warn(formattedMessage);
      break;
    case 'error':
      console.error(formattedMessage);
      break;
  }
};

// Логирование в Sentry (только ошибки)
const logToSentry = (level: LogLevel, message: string, error?: Error): void => {
  if (!config.enableSentry || level !== 'error') {
    return;
  }

  // Sentry будет автоматически ловить ошибки через window.onerror
  // Здесь можно добавить дополнительную логику для отправки ошибок
};

// ============================================
// Public API
// ============================================

export const logger = {
  debug: (message: string, data?: any): void => {
    logToConsole('debug', message, data);
  },

  info: (message: string, data?: any): void => {
    logToConsole('info', message, data);
  },

  warn: (message: string, data?: any): void => {
    logToConsole('warn', message, data);
  },

  error: (message: string, error?: Error | any): void => {
    logToConsole('error', message, error);
    logToSentry('error', message, error);
  },

  // Для совместимости с существующим кодом
  log: (message: string, data?: any): void => {
    logToConsole('info', message, data);
  },
};

// ============================================
// Утилиты для скрытия чувствительных данных
// ============================================

export const sanitizeData = (data: any): any => {
  if (!data) return data;

  const sensitiveKeys = [
    'password',
    'token',
    'api_key',
    'secret',
    'jwt',
    'authorization',
    'access_token',
    'refresh_token',
  ];

  const sanitized = { ...data };

  Object.keys(sanitized).forEach(key => {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
      sanitized[key] = '***REDACTED***';
    }
  });

  return sanitized;
};

// ============================================
// Экспорт для использования в компонентах
// ============================================

export default logger;
