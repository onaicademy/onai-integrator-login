/**
 * 🔒 PRODUCTION-SAFE LOGGER
 * В production показываем только критические ошибки
 * В development - полные логи для отладки
 */

const isDev = import.meta.env.DEV;
const isProd = import.meta.env.PROD;

/**
 * Генерирует уникальный ID ошибки для отслеживания
 */
function generateErrorId(): string {
  return `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Логирование только для development
 */
export const devLog = {
  info: (...args: any[]) => {
    if (isDev) {
      console.log(...args);
    }
  },
  
  warn: (...args: any[]) => {
    if (isDev) {
      console.warn(...args);
    }
  },
  
  debug: (...args: any[]) => {
    if (isDev) {
      console.debug(...args);
    }
  },
};

/**
 * Логирование ошибок (работает везде, но в production без деталей)
 */
export const errorLog = {
  /**
   * Критическая ошибка
   * В production: только Error ID
   * В development: полная информация
   */
  critical: (message: string, error?: any) => {
    const errorId = generateErrorId();
    
    if (isProd) {
      // Production: только ID ошибки
      console.error(`Error ID: ${errorId}`);
      
      // Отправляем детали на сервер для логирования (опционально)
      sendToServer(errorId, message, error);
    } else {
      // Development: полная информация
      console.error(`[${errorId}] ${message}`, error);
    }
    
    return errorId;
  },
  
  /**
   * API ошибка
   */
  api: (endpoint: string, status: number, error?: any) => {
    const errorId = generateErrorId();
    
    if (isProd) {
      console.error(`API Error ID: ${errorId}`);
    } else {
      console.error(`[${errorId}] API Error: ${endpoint} (${status})`, error);
    }
    
    return errorId;
  },
};

/**
 * Отправка ошибок на сервер для логирования (опционально)
 */
async function sendToServer(errorId: string, message: string, error: any) {
  try {
    // Здесь можно отправлять на сервер для сохранения логов
    // await fetch('/api/logs/error', {
    //   method: 'POST',
    //   body: JSON.stringify({ errorId, message, error }),
    // });
  } catch (e) {
    // Тихо игнорируем ошибки логирования
  }
}

/**
 * Обертка для API запросов с чистым логированием
 */
export function logApiRequest(method: string, url: string) {
  if (isDev) {
    console.log(`🌐 API Request: ${method} ${url}`);
  }
}

export function logApiResponse(status: number, data?: any) {
  if (isDev) {
    console.log(`✅ API Response ${status}:`, data);
  }
}

export function logApiError(method: string, url: string, status: number, error: any) {
  const errorId = generateErrorId();
  
  if (isProd) {
    console.error(`API Error ID: ${errorId}`);
  } else {
    console.error(`[${errorId}] API Error: ${method} ${url} (${status})`, error);
  }
  
  return errorId;
}

