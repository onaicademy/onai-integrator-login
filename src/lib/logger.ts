/**
 * Logger utility для правильного логирования
 * В production режиме логируются только errors и warnings
 * В dev режиме логируется все
 */

const isDev = import.meta.env.DEV;

export const logger = {
  /**
   * Логирование обычных сообщений (только в dev)
   */
  log: (...args: unknown[]) => {
    if (isDev) {
      console.log(...args);
    }
  },

  /**
   * Логирование информационных сообщений (только в dev)
   */
  info: (...args: unknown[]) => {
    if (isDev) {
      console.info(...args);
    }
  },

  /**
   * Логирование предупреждений (всегда)
   */
  warn: (...args: unknown[]) => {
    console.warn(...args);
  },

  /**
   * Логирование ошибок (всегда)
   */
  error: (...args: unknown[]) => {
    console.error(...args);
  },

  /**
   * Логирование успешных операций (только в dev)
   */
  success: (message: string, ...args: unknown[]) => {
    if (isDev) {
      console.log(`✅ ${message}`, ...args);
    }
  },
};

