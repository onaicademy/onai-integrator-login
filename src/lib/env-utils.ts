/**
 * Утилиты для работы с окружением (DEV/PROD)
 */

/**
 * Проверка: запущено ли приложение в режиме разработки
 */
export const isDevelopment = (): boolean => {
  return import.meta.env.DEV || 
         import.meta.env.MODE === 'development' ||
         window.location.hostname === 'localhost';
};

/**
 * Проверка: запущено ли приложение в продакшн
 */
export const isProduction = (): boolean => {
  return !isDevelopment();
};

/**
 * Получить значение в зависимости от окружения
 * @param devValue - значение для DEV
 * @param prodValue - значение для PROD
 */
export const getEnvValue = <T>(devValue: T, prodValue: T): T => {
  return isDevelopment() ? devValue : prodValue;
};

/**
 * Логирование только в DEV
 */
export const devLog = (...args: any[]) => {
  if (isDevelopment()) {
    console.log('[DEV]', ...args);
  }
};

/**
 * Предупреждение только в DEV
 */
export const devWarn = (...args: any[]) => {
  if (isDevelopment()) {
    console.warn('[DEV]', ...args);
  }
};

/**
 * Использовать mock данные или реальные
 * @param mockData - mock данные для DEV
 * @param realData - реальные данные из БД
 */
export const useMockOrReal = <T>(mockData: T, realData: T): T => {
  return getEnvValue(mockData, realData);
};

