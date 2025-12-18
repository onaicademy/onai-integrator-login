/**
 * 🛡️ ERROR RECOVERY UTILITIES
 * 
 * Набор утилит для graceful error handling и auto-recovery
 * 
 * WHY:
 * - ChunkLoadError после деплоя (старые chunks удаляются)
 * - JSON.parse падает на невалидных данных
 * - localStorage недоступен в privacy mode
 * - Supabase WebSocket разрывается после простоя
 * 
 * SAFE: Все функции fail-safe, не ломают текущий функционал
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ════════════════════════════════════════════════════════════════
// 🔄 CHUNK LOADING WITH RETRY
// ════════════════════════════════════════════════════════════════

interface RetryChunkLoadOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * ✅ Retry для lazy-loaded компонентов (ChunkLoadError fix)
 * 
 * ПРОБЛЕМА:
 * - После деплоя старые chunks удаляются
 * - Пользователи со старой версией страницы получают 404 на chunks
 * - Белый экран или "Failed to fetch dynamically imported module"
 * 
 * РЕШЕНИЕ:
 * - 3 попытки с exponential backoff
 * - После 3 неудач - force reload страницы
 * - Сохраняет состояние в sessionStorage для предотвращения бесконечных reload
 * 
 * @example
 * const Profile = lazy(() => retryChunkLoad(() => import('./pages/Profile')));
 */
export function retryChunkLoad<T>(
  importFn: () => Promise<T>,
  options: RetryChunkLoadOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 500,
    maxDelay = 3000,
    onRetry,
  } = options;

  return new Promise((resolve, reject) => {
    let attempt = 0;

    const attemptLoad = async () => {
      try {
        const module = await importFn();
        
        // ✅ Успех - очищаем счетчик reload
        try {
          sessionStorage.removeItem('chunk_reload_count');
        } catch (e) {
          // Ignore storage errors
        }
        
        resolve(module);
      } catch (error: any) {
        attempt++;
        
        // 🔍 Проверяем тип ошибки
        const isChunkError = 
          error?.name === 'ChunkLoadError' ||
          error?.message?.includes('Failed to fetch dynamically imported module') ||
          error?.message?.includes('Importing a module script failed') ||
          error?.message?.includes('Loading chunk') ||
          error?.message?.includes('Loading CSS chunk');
        
        if (!isChunkError) {
          // Не chunk error - отклоняем сразу
          reject(error);
          return;
        }
        
        console.warn(
          `⚠️ [Chunk Loader] Attempt ${attempt}/${maxRetries} failed:`,
          error.message
        );
        
        if (onRetry) {
          onRetry(attempt, error);
        }
        
        if (attempt >= maxRetries) {
          // 🔄 После maxRetries попыток - пробуем force reload
          console.error(
            '❌ [Chunk Loader] Max retries exceeded. Force reloading page...'
          );
          
          // Проверяем счетчик reload (защита от бесконечных reload)
          let reloadCount = 0;
          try {
            const stored = sessionStorage.getItem('chunk_reload_count');
            reloadCount = stored ? parseInt(stored, 10) : 0;
          } catch (e) {
            // Ignore storage errors
          }
          
          if (reloadCount < 3) {
            // Увеличиваем счетчик
            try {
              sessionStorage.setItem('chunk_reload_count', String(reloadCount + 1));
            } catch (e) {
              // Ignore storage errors
            }
            
            // Force reload
            window.location.reload();
          } else {
            // После 3 reload - показываем ошибку
            console.error(
              '❌ [Chunk Loader] Too many reloads. Please clear cache manually.'
            );
            reject(new Error(
              'Не удалось загрузить модуль после нескольких попыток. ' +
              'Пожалуйста, очистите кэш браузера (Ctrl+Shift+R / Cmd+Shift+R) и перезагрузите страницу.'
            ));
          }
          
          return;
        }
        
        // ⏳ Exponential backoff
        const delay = Math.min(initialDelay * Math.pow(2, attempt - 1), maxDelay);
        
        console.log(`⏳ [Chunk Loader] Retrying in ${delay}ms...`);
        
        setTimeout(attemptLoad, delay);
      }
    };

    attemptLoad();
  });
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
    onReconnectFailed?: () => void;
  } = {}
): () => void {
  const {
    pingInterval = 60000, // 1 минута
    maxReconnectAttempts = 5,
    onReconnect,
    onReconnectFailed,
  } = options;

  let reconnectAttempts = 0;
  let pingIntervalId: NodeJS.Timeout | null = null;
  let isReconnecting = false;

  // 🔄 Периодический ping для keep-alive
  const startPing = () => {
    if (pingIntervalId) {
      clearInterval(pingIntervalId);
    }

    pingIntervalId = setInterval(async () => {
      try {
        // Простой запрос для проверки соединения
        const { error } = await supabaseClient.auth.getSession();
        
        if (error) {
          throw error;
        }
        
        // Успех - сбрасываем счетчик
        if (reconnectAttempts > 0) {
          console.log('✅ [Supabase] Connection restored');
          reconnectAttempts = 0;
          if (onReconnect) {
            onReconnect();
          }
        }
      } catch (error: any) {
        console.warn('⚠️ [Supabase] Ping failed:', error.message);
        
        // Не инициируем reconnect если уже в процессе
        if (!isReconnecting) {
          handleReconnect();
        }
      }
    }, pingInterval);
  };

  // 🔄 Обработка reconnection
  const handleReconnect = async () => {
    if (isReconnecting) return;
    
    isReconnecting = true;
    reconnectAttempts++;
    
    console.log(
      `🔄 [Supabase] Reconnecting (attempt ${reconnectAttempts}/${maxReconnectAttempts})...`
    );

    try {
      // Пробуем обновить сессию
      const { error } = await supabaseClient.auth.refreshSession();
      
      if (error) {
        throw error;
      }
      
      // Успех
      console.log('✅ [Supabase] Reconnected successfully');
      reconnectAttempts = 0;
      isReconnecting = false;
      
      if (onReconnect) {
        onReconnect();
      }
    } catch (error: any) {
      console.error(
        `❌ [Supabase] Reconnect failed (${reconnectAttempts}/${maxReconnectAttempts}):`,
        error.message
      );
      
      isReconnecting = false;
      
      if (reconnectAttempts >= maxReconnectAttempts) {
        console.error(
          '❌ [Supabase] Max reconnect attempts exceeded.'
        );
        
        if (onReconnectFailed) {
          onReconnectFailed();
        }
      }
    }
  };

  // 🎧 Слушаем события auth
  const { data: authListener } = supabaseClient.auth.onAuthStateChange((event: string) => {
    if (event === 'SIGNED_OUT') {
      console.log('👋 [Supabase] User signed out');
      reconnectAttempts = 0;
    }
    
    if (event === 'TOKEN_REFRESHED') {
      console.log('🔄 [Supabase] Token refreshed');
      reconnectAttempts = 0; // Reset на успешное обновление
    }
    
    if (event === 'SIGNED_IN') {
      console.log('✅ [Supabase] User signed in');
      reconnectAttempts = 0;
    }
  });

  // Запускаем ping
  startPing();

  console.log(
    `✅ [Supabase] Reconnection handler initialized (ping every ${pingInterval}ms)`
  );

  // Cleanup function
  return () => {
    if (pingIntervalId) {
      clearInterval(pingIntervalId);
    }
    authListener.subscription.unsubscribe();
    console.log('🧹 [Supabase] Reconnection handler cleaned up');
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
