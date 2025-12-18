/**
 * 🛡️ ERROR RECOVERY UTILITIES
 * Автоматическое восстановление при ошибках загрузки чанков
 * 
 * Проблема: ChunkLoadError возникает когда:
 * - Новый деплой изменил хеши чанков
 * - Пользователь остался на старой версии страницы
 * - Браузер пытается загрузить несуществующий чанк
 * 
 * Решение: Автоматический retry с обновлением страницы
 */

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 секунда

/**
 * Проверяет, является ли ошибка ChunkLoadError
 */
export function isChunkLoadError(error: any): boolean {
  // Проверяем разные варианты ChunkLoadError
  const errorMessage = error?.message || error?.toString() || '';
  
  return (
    errorMessage.includes('Loading chunk') ||
    errorMessage.includes('ChunkLoadError') ||
    errorMessage.includes('Failed to fetch dynamically imported module') ||
    error?.name === 'ChunkLoadError'
  );
}

/**
 * 🔄 Retry механизм для загрузки чанков
 * Автоматически перезагружает страницу при ChunkLoadError
 * 
 * @param importFn - Функция динамического импорта
 * @param retries - Количество оставшихся попыток
 * @returns Promise с загруженным модулем
 * 
 * @example
 * const MyComponent = lazy(() => retryChunkLoad(() => import('./MyComponent')));
 */
export async function retryChunkLoad<T>(
  importFn: () => Promise<T>,
  retries: number = MAX_RETRIES
): Promise<T> {
  try {
    return await importFn();
  } catch (error) {
    // Проверяем, является ли это ChunkLoadError
    if (!isChunkLoadError(error)) {
      console.error('❌ Non-chunk error during import:', error);
      throw error; // Пробрасываем другие ошибки
    }

    console.warn(`⚠️ ChunkLoadError detected. Retries left: ${retries}`, error);

    // Если попытки закончились - перезагружаем страницу
    if (retries <= 0) {
      console.error('🔄 Max retries reached. Reloading page to get fresh chunks...');
      
      // Показываем уведомление пользователю (опционально)
      if (typeof window !== 'undefined') {
        console.log('🔄 Обновление страницы для получения актуальной версии...');
        
        // Перезагружаем страницу без кеша
        window.location.reload();
      }
      
      // Выбрасываем ошибку (на случай если reload не сработал)
      throw new Error('ChunkLoadError: Max retries exceeded, page reload initiated');
    }

    // Ждем перед следующей попыткой
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));

    // Пробуем снова
    console.log(`🔄 Retrying chunk load... (${MAX_RETRIES - retries + 1}/${MAX_RETRIES})`);
    return retryChunkLoad(importFn, retries - 1);
  }
}

/**
 * 🧹 Очистка кеша Service Worker (если установлен)
 * Используется при критических ошибках загрузки
 */
export async function clearServiceWorkerCache(): Promise<void> {
  if ('serviceWorker' in navigator && 'caches' in window) {
    try {
      console.log('🧹 Clearing Service Worker cache...');
      
      // Получаем все ключи кешей
      const cacheKeys = await caches.keys();
      
      // Удаляем все кеши
      await Promise.all(
        cacheKeys.map(key => {
          console.log(`🗑️ Deleting cache: ${key}`);
          return caches.delete(key);
        })
      );
      
      // Пытаемся отрегистрировать Service Worker
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map(registration => {
          console.log('🗑️ Unregistering Service Worker...');
          return registration.unregister();
        })
      );
      
      console.log('✅ Service Worker cache cleared successfully');
    } catch (error) {
      console.error('❌ Error clearing Service Worker cache:', error);
    }
  }
}

/**
 * 🚨 Глобальный обработчик ошибок для ChunkLoadError
 * Устанавливается один раз при инициализации приложения
 */
export function setupGlobalChunkErrorHandler(): void {
  if (typeof window === 'undefined') return;

  // Отслеживаем количество ChunkLoadError для предотвращения бесконечного цикла
  let chunkErrorCount = 0;
  const MAX_CHUNK_ERRORS = 3;
  const ERROR_RESET_TIME = 60000; // 1 минута

  // Сбрасываем счетчик через минуту
  setInterval(() => {
    if (chunkErrorCount > 0) {
      console.log('🔄 Resetting chunk error count');
      chunkErrorCount = 0;
    }
  }, ERROR_RESET_TIME);

  // Глобальный обработчик unhandledrejection
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;

    if (isChunkLoadError(error)) {
      console.error('🚨 Unhandled ChunkLoadError detected:', error);
      
      chunkErrorCount++;
      
      if (chunkErrorCount >= MAX_CHUNK_ERRORS) {
        console.error('🔴 Too many ChunkLoadErrors. Clearing cache and reloading...');
        event.preventDefault(); // Предотвращаем вывод ошибки в консоль
        
        // Очищаем кеш и перезагружаем
        clearServiceWorkerCache().then(() => {
          window.location.reload();
        });
      } else {
        console.warn(`⚠️ ChunkLoadError #${chunkErrorCount}/${MAX_CHUNK_ERRORS}. Will reload if it continues.`);
      }
    }
  });

  console.log('✅ Global ChunkLoadError handler installed');
}

/**
 * 🔍 Проверка доступности статических ресурсов
 * Используется для диагностики проблем с кешированием
 */
export async function checkStaticResourcesAvailability(): Promise<{
  available: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  
  try {
    // Пробуем загрузить index.html
    const response = await fetch(window.location.origin, { 
      method: 'HEAD',
      cache: 'no-cache' 
    });
    
    if (!response.ok) {
      errors.push(`Failed to load index.html: ${response.status}`);
    }
  } catch (error) {
    errors.push(`Network error: ${error}`);
  }

  return {
    available: errors.length === 0,
    errors
  };
}

/**
 * 📊 Логирование информации о деплое
 * Помогает диагностировать проблемы с версиями
 */
export function logDeploymentInfo(): void {
  if (typeof window === 'undefined') return;

  const info = {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    location: window.location.href,
    referrer: document.referrer,
    localStorage_keys: Object.keys(localStorage).length,
    sessionStorage_keys: Object.keys(sessionStorage).length,
    cookies_enabled: navigator.cookieEnabled,
    online: navigator.onLine,
  };

  console.log('📊 Deployment Info:', info);
}

/**
 * 🛡️ Safe JSON Parse
 * Безопасный парсинг JSON с fallback значением
 * 
 * @param jsonString - JSON строка для парсинга
 * @param fallback - Значение по умолчанию если парсинг неудачен
 * @returns Распарсенное значение или fallback
 */
export function safeJSONParse<T = any>(jsonString: string | null | undefined, fallback: T): T {
  if (!jsonString) return fallback;
  
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.warn('⚠️ [safeJSONParse] Failed to parse JSON:', error);
    return fallback;
  }
}

/**
 * 🛡️ Safe JSON Stringify
 * Безопасная сериализация в JSON с fallback значением
 * 
 * @param value - Значение для сериализации
 * @param fallback - Значение по умолчанию если сериализация неудачна
 * @returns JSON строка или fallback
 */
export function safeJSONStringify<T = any>(value: T, fallback: string = '{}'): string {
  try {
    return JSON.stringify(value);
  } catch (error) {
    console.warn('⚠️ [safeJSONStringify] Failed to stringify value:', error);
    return fallback;
  }
}

/**
 * 🛡️ Safe Session Storage
 * Обертка над sessionStorage с защитой от ошибок
 */
export const safeSessionStorage = {
  getItem(key: string): string | null {
    try {
      return sessionStorage.getItem(key);
    } catch (error) {
      console.warn(`⚠️ [safeSessionStorage] Failed to get item "${key}":`, error);
      return null;
    }
  },
  
  setItem(key: string, value: string): void {
    try {
      sessionStorage.setItem(key, value);
    } catch (error) {
      console.warn(`⚠️ [safeSessionStorage] Failed to set item "${key}":`, error);
    }
  },
  
  removeItem(key: string): void {
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      console.warn(`⚠️ [safeSessionStorage] Failed to remove item "${key}":`, error);
    }
  },
  
  clear(): void {
    try {
      sessionStorage.clear();
    } catch (error) {
      console.warn('⚠️ [safeSessionStorage] Failed to clear storage:', error);
    }
  },
};

/**
 * 🛡️ Safe Local Storage
 * Обертка над localStorage с защитой от ошибок
 */
export const safeLocalStorage = {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn(`⚠️ [safeLocalStorage] Failed to get item "${key}":`, error);
      return null;
    }
  },
  
  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn(`⚠️ [safeLocalStorage] Failed to set item "${key}":`, error);
    }
  },
  
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`⚠️ [safeLocalStorage] Failed to remove item "${key}":`, error);
    }
  },
  
  clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.warn('⚠️ [safeLocalStorage] Failed to clear storage:', error);
    }
  },
};

/**
 * 🔄 Setup Supabase Reconnection Handler
 * Автоматическое переподключение при разрыве соединения
 * 
 * @param supabaseClient - Supabase client instance
 * @param options - Настройки переподключения
 * @returns Cleanup function для отмены подписок
 */
export function setupSupabaseReconnection(
  supabaseClient: any,
  options: {
    pingInterval?: number;
    maxReconnectAttempts?: number;
    onReconnect?: () => void;
    onDisconnect?: () => void;
  } = {}
): () => void {
  const {
    pingInterval = 60000, // 1 минута
    maxReconnectAttempts = 5,
    onReconnect,
    onDisconnect,
  } = options;

  let reconnectAttempts = 0;
  let isConnected = true;
  let pingIntervalId: NodeJS.Timeout | null = null;

  // Функция проверки соединения
  const checkConnection = async () => {
    try {
      // Простой запрос для проверки соединения
      const { error } = await supabaseClient.from('users').select('count', { count: 'exact', head: true });
      
      if (error && !isConnected) {
        reconnectAttempts++;
        
        if (reconnectAttempts <= maxReconnectAttempts) {
          console.warn(`🔄 [Supabase] Reconnecting... Attempt ${reconnectAttempts}/${maxReconnectAttempts}`);
        } else {
          console.error('❌ [Supabase] Max reconnection attempts reached');
        }
      } else if (!error && !isConnected) {
        // Соединение восстановлено
        isConnected = true;
        reconnectAttempts = 0;
        console.log('✅ [Supabase] Connection restored');
        onReconnect?.();
      }
    } catch (error) {
      if (isConnected) {
        isConnected = false;
        console.warn('⚠️ [Supabase] Connection lost', error);
        onDisconnect?.();
      }
    }
  };

  // Запускаем периодическую проверку
  pingIntervalId = setInterval(checkConnection, pingInterval);

  // Cleanup function
  return () => {
    if (pingIntervalId) {
      clearInterval(pingIntervalId);
      pingIntervalId = null;
    }
  };
}

// ════════════════════════════════════════════════════════════════
// 🎯 UTILITY EXPORTS
// ════════════════════════════════════════════════════════════════

/**
 * ✅ Проверка, является ли ошибка ChunkLoadError
 */
export function isChunkLoadError(error: any): boolean {
  return (
    error?.name === 'ChunkLoadError' ||
    error?.message?.includes('Failed to fetch dynamically imported module') ||
    error?.message?.includes('Importing a module script failed') ||
    error?.message?.includes('Loading chunk') ||
    error?.message?.includes('Loading CSS chunk')
  );
}

/**
 * ✅ Проверка, является ли ошибка network error
 */
export function isNetworkError(error: any): boolean {
  return (
    error?.message?.includes('Network request failed') ||
    error?.message?.includes('Failed to fetch') ||
    error?.message?.includes('Load failed') ||
    error?.name === 'NetworkError' ||
    error?.code === 'ECONNREFUSED' ||
    error?.code === 'ENOTFOUND'
  );
}

/**
 * ✅ Проверка, доступен ли storage
 */
export function isStorageAvailable(type: 'localStorage' | 'sessionStorage'): boolean {
  try {
    const storage = window[type];
    const testKey = '__storage_test__';
    storage.setItem(testKey, 'test');
    storage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}
