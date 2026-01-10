/**
 * Production Console Override
 *
 * Заменяет стандартный console в production:
 * - console.log, console.info, console.debug -> ОТКЛЮЧЕНЫ
 * - console.warn -> только критичные предупреждения
 * - console.error -> сохранены, но фильтруются секреты
 *
 * В development все работает как обычно.
 *
 * @security Фильтрует все секреты через DataMasker
 */

import { dataMasker } from './data-masker.js';
import { getLogger } from './secure-logger.js';

const isProduction = process.env.NODE_ENV === 'production';
const logger = getLogger('console');

// Сохраняем оригинальные методы
const originalConsole = {
  log: console.log.bind(console),
  info: console.info.bind(console),
  debug: console.debug.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};

// Счетчик подавленных логов для мониторинга
let suppressedLogs = {
  log: 0,
  info: 0,
  debug: 0,
  warn: 0,
};

/**
 * Маскировать аргументы для безопасного вывода
 */
function maskArgs(args: any[]): any[] {
  return args.map(arg => {
    if (typeof arg === 'string') {
      return dataMasker.mask(arg);
    }
    if (typeof arg === 'object' && arg !== null) {
      return dataMasker.mask(arg);
    }
    return arg;
  });
}

/**
 * Проверить, является ли сообщение критической ошибкой
 */
function isCriticalError(args: any[]): boolean {
  const criticalPatterns = [
    /fatal/i,
    /critical/i,
    /unhandled/i,
    /uncaught/i,
    /crash/i,
    /oom/i,
    /out of memory/i,
    /heap/i,
    /ECONNREFUSED/i,
    /ENOTFOUND/i,
    /ETIMEDOUT/i,
    /database.*error/i,
    /connection.*failed/i,
    /auth.*failed/i,
  ];

  const message = args.map(a => String(a)).join(' ');
  return criticalPatterns.some(pattern => pattern.test(message));
}

/**
 * Проверить, содержит ли сообщение критичное предупреждение
 */
function isCriticalWarning(args: any[]): boolean {
  const criticalPatterns = [
    /deprecated/i,
    /security/i,
    /rate.?limit/i,
    /quota/i,
    /memory/i,
    /disk.?space/i,
    /certificate/i,
    /ssl/i,
    /tls/i,
  ];

  const message = args.map(a => String(a)).join(' ');
  return criticalPatterns.some(pattern => pattern.test(message));
}

/**
 * Установить production console
 */
export function installProductionConsole(): void {
  if (!isProduction) {
    originalConsole.log('[Console] Development mode - full logging enabled');
    return;
  }

  // В production - заменяем console методы
  console.log = (...args: any[]) => {
    suppressedLogs.log++;
    // Полностью подавляем console.log в production
  };

  console.info = (...args: any[]) => {
    suppressedLogs.info++;
    // Полностью подавляем console.info в production
  };

  console.debug = (...args: any[]) => {
    suppressedLogs.debug++;
    // Полностью подавляем console.debug в production
  };

  console.warn = (...args: any[]) => {
    // В production показываем только критичные предупреждения
    if (isCriticalWarning(args)) {
      const maskedArgs = maskArgs(args);
      logger.warn(maskedArgs.join(' '));
    } else {
      suppressedLogs.warn++;
    }
  };

  console.error = (...args: any[]) => {
    // Ошибки всегда показываем, но фильтруем секреты
    const maskedArgs = maskArgs(args);

    // Используем SecureLogger для структурированного вывода
    const message = maskedArgs.map(a => {
      if (typeof a === 'object') {
        try {
          return JSON.stringify(a);
        } catch {
          return String(a);
        }
      }
      return String(a);
    }).join(' ');

    // Определяем уровень критичности
    if (isCriticalError(args)) {
      logger.fatal(message);
    } else {
      logger.error(message);
    }
  };

  // Логируем что production console установлен
  logger.info('Production console installed - verbose logging disabled');
}

/**
 * Восстановить оригинальный console (для тестов)
 */
export function restoreOriginalConsole(): void {
  console.log = originalConsole.log;
  console.info = originalConsole.info;
  console.debug = originalConsole.debug;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
}

/**
 * Получить статистику подавленных логов
 */
export function getSuppressedLogsStats(): typeof suppressedLogs {
  return { ...suppressedLogs };
}

/**
 * Сбросить статистику подавленных логов
 */
export function resetSuppressedLogsStats(): void {
  suppressedLogs = { log: 0, info: 0, debug: 0, warn: 0 };
}

/**
 * Получить оригинальные методы console (для критичных случаев)
 * Использовать ТОЛЬКО в крайних случаях!
 */
export function getOriginalConsole(): typeof originalConsole {
  return originalConsole;
}

// Экспорт для health endpoint
export { suppressedLogs };
