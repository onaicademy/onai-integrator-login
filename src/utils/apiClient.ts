import { getApiBaseUrl } from '@/lib/runtime-config';
/**
 * API Client для работы с Backend API
 * 
 * Все запросы к данным должны идти через Backend API, а не напрямую к Supabase.
 * Backend будет использовать Supabase service_role_key для безопасной работы с БД.
 * 
 * 🚀 ОПТИМИЗАЦИЯ: In-memory кэш для GET запросов
 */

interface ApiRequestOptions extends RequestInit {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  cache?: boolean; // 🚀 Включить кэширование для этого запроса
  cacheTTL?: number; // 🚀 Время жизни кэша в ms (default: 60000 = 1 минута)
}

// 🚀 ОПТИМИЗАЦИЯ: Простой in-memory кэш
interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

const apiCache = new Map<string, CacheEntry>();

// 🚀 Функция очистки устаревшего кэша
function clearExpiredCache() {
  const now = Date.now();
  for (const [key, entry] of apiCache.entries()) {
    if (now - entry.timestamp > entry.ttl) {
      apiCache.delete(key);
    }
  }
}

// 🚀 Очистка кэша каждые 5 минут
setInterval(clearExpiredCache, 5 * 60 * 1000);

/**
 * ✅ Helper: Get JWT token from localStorage
 * Supports both Main Platform and Tripwire tokens
 */
export function getAuthToken(endpoint?: string): string | null {
  // Если это Tripwire API endpoint - пробуем Tripwire токен ПЕРВЫМ
  if (endpoint && endpoint.includes('/tripwire')) {
    // 1. Проверяем Tripwire JWT токен (сохранённый после логина)
    const tripwireToken = localStorage.getItem('tripwire_supabase_token');
    if (tripwireToken) {
      console.log('🔑 [apiClient] Using tripwire_supabase_token');
      return tripwireToken;
    }
    
    // 2. Проверяем Tripwire Supabase session (ПРАВИЛЬНЫЙ КЛЮЧ!)
    const tripwireSessionKey = 'sb-pjmvxecykysfrzppdcto-auth-token';
    const tripwireSessionData = localStorage.getItem(tripwireSessionKey);
    if (tripwireSessionData) {
      try {
        const parsed = JSON.parse(tripwireSessionData);
        // Supabase хранит токен в access_token
        if (parsed?.access_token) {
          console.log('🔑 [apiClient] Using Tripwire Supabase session token');
          return parsed.access_token;
        }
      } catch (e) {
        console.error('Failed to parse Tripwire Supabase token:', e);
      }
    }
  }
  
  // Fallback: пробуем основной Platform токен
  let token = localStorage.getItem('supabase_token');
  
  if (!token) {
    const sessionData = localStorage.getItem('sb-arqhkacellqbhjhbebfh-auth-token');
    if (sessionData) {
      try {
        const parsed = JSON.parse(sessionData);
        token = parsed?.access_token || null;
      } catch (e) {
        console.error('Failed to parse Supabase token:', e);
      }
    }
  }
  
  return token;
}

/**
 * Базовая функция для выполнения HTTP запросов к Backend API
 * 🚀 ОПТИМИЗАЦИЯ: Поддержка кэширования для GET запросов
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { cache = false, cacheTTL = 60000, ...fetchOptions } = options;
  
  // 🚀 ОПТИМИЗАЦИЯ: Проверяем кэш для GET запросов
  const method = options.method || 'GET';
  const cacheKey = `${method}:${endpoint}`;
  
  if (method === 'GET' && cache) {
    const cached = apiCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
      console.log(`✨ [API Cache HIT] ${endpoint}`);
      return cached.data;
    }
  }
  
  // Получаем JWT токен из localStorage (сохраняется после авторизации)
  // Передаём endpoint чтобы определить какой токен использовать (Main или Tripwire)
  const token = getAuthToken(endpoint);
  
  // 🏗️ АРХИТЕКТУРНОЕ РЕШЕНИЕ: Умный fallback в зависимости от окружения
  // Development: localhost:3000, Production: api.onai.academy
  const isDevelopment = import.meta.env.DEV; // Vite встроенная переменная
  const defaultApiUrl = isDevelopment 
    ? 'http://localhost:3000'      // localhost для development
    : 'https://api.onai.academy';  // production для prod
  
  const baseUrl = getApiBaseUrl() || defaultApiUrl;
  
  // 🔌 Логирование для отладки (ТОЛЬКО в development!)
  if (!window.__apiClientInitialized && isDevelopment) {
    console.log('🔌 API Client initialized');
    console.log('📍 URL:', baseUrl);
    window.__apiClientInitialized = true;
  }
  
  const url = `${baseUrl}${endpoint}`;
  
  // ✅ Проверяем тип body (FormData или JSON)
  const isFormData = options.body instanceof FormData;
  
  // Подготавливаем headers
  const headers: HeadersInit = {
    // ✅ НЕ устанавливаем Content-Type для FormData (браузер сам добавит boundary)
    ...(!isFormData && { 'Content-Type': 'application/json' }),
    ...options.headers,
  };
  
  // Добавляем Authorization header если есть токен
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Подготавливаем body (если есть)
  let body: any = undefined;
  if (options.body) {
    if (isFormData) {
      // ✅ FormData отправляем как есть (НЕ делаем JSON.stringify!)
      body = options.body;
    } else if (typeof options.body === 'string') {
      body = options.body;
    } else {
      body = JSON.stringify(options.body);
    }
  }
  
  try {
    // 🔒 Логи ТОЛЬКО в development (безопасность в production!)
    if (isDevelopment) {
      console.log('='.repeat(80));
      console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);
      console.log('📦 Body type:', isFormData ? 'FormData' : typeof options.body);
      
      if (isFormData) {
        console.log('📤 FormData detected - checking entries:');
        const formData = options.body as FormData;
        for (const [key, value] of formData.entries()) {
          if (value instanceof File) {
            console.log(`  - ${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
          } else {
            console.log(`  - ${key}: ${value}`);
          }
        }
      } else if (options.body) {
        console.log('📤 Body:', options.body);
      }
      console.log('='.repeat(80));
    }
    
    const response = await fetch(url, {
      ...options,
      headers,
      body,
    });
    
    // Если ответ не OK - обрабатываем ошибку
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || errorData.message || `HTTP Error ${response.status}`;
      
      // 🔒 Логи ТОЛЬКО в development
      if (isDevelopment) {
        console.error(`❌ API Error: ${errorMessage}`, errorData);
      } else {
        // Production: только Error ID
        console.error(`Error ID: ERR-${Date.now()}`);
      }
      
      // 🚨 CRITICAL SECURITY: Force logout on 401 Unauthorized
      if (response.status === 401) {
        if (isDevelopment) {
          console.error('🚨 401 UNAUTHORIZED: Принудительный выход');
        }

        // Clear all auth data
        localStorage.removeItem('supabase_token');
        localStorage.removeItem('tripwire_supabase_token'); // ✅ FIX: Remove Tripwire token
        localStorage.removeItem('tripwire_supabase_session');
        localStorage.removeItem('sb-arqhkacellqbhjhbebfh-auth-token'); // Main Supabase
        localStorage.removeItem('sb-pjmvxecykysfrzppdcto-auth-token'); // ✅ FIX: Tripwire Supabase
        localStorage.removeItem('sb-tripwire-auth-token'); // ✅ FIX: Unified Tripwire key
        sessionStorage.clear();
        
        // Redirect to login after a short delay
        setTimeout(() => {
          const currentPath = window.location.pathname;
          const isTripwireDomain = window.location.hostname === 'expresscourse.onai.academy';
          const isLegacyTripwirePath = currentPath.startsWith('/integrator') || currentPath.startsWith('/tripwire');
          let tripwirePath = currentPath;

          if (currentPath.startsWith('/integrator')) {
            tripwirePath = currentPath.replace('/integrator', '') || '/';
          } else if (currentPath.startsWith('/tripwire')) {
            tripwirePath = currentPath.replace('/tripwire', '') || '/';
          }

          const returnUrl = encodeURIComponent(tripwirePath);

          if (isTripwireDomain || isLegacyTripwirePath) {
            const loginPath = `/login?returnUrl=${returnUrl}`;
            window.location.href = isTripwireDomain
              ? loginPath
              : `https://expresscourse.onai.academy${loginPath}`;
          } else {
            window.location.href = '/login';
          }
        }, 500);
      }
      
      throw new Error(errorMessage);
    }
    
    // Парсим JSON ответ
    const data = await response.json();
    
    // 🔒 Логи ТОЛЬКО в development
    if (isDevelopment) {
      console.log('='.repeat(80));
      console.log(`✅ API Response ${response.status}:`, data);
      console.log('='.repeat(80));
    }

    // 🚀 ОПТИМИЗАЦИЯ: Сохраняем в кэш для GET запросов
    if (method === 'GET' && cache && response.ok) {
      apiCache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        ttl: cacheTTL
      });
      
      if (isDevelopment) {
        console.log(`💾 [API Cache SAVE] ${endpoint} (TTL: ${cacheTTL}ms)`);
      }
    }

    return data as T;
    
  } catch (error: any) {
    // 🔒 Логи ТОЛЬКО в development
    if (isDevelopment) {
      console.error(`❌ API Request Failed: ${options.method || 'GET'} ${url}`, error);
    } else {
      // Production: только Error ID
      console.error(`Error ID: ERR-${Date.now()}`);
    }
    
    // Если Backend недоступен - показываем понятное сообщение
    if (error.message.includes('Failed to fetch')) {
      const message = isDevelopment 
        ? `Backend API недоступен: ${baseUrl}`
        : 'Service temporarily unavailable';
      throw new Error(message);
    }
    
    throw error;
  }
}

/**
 * Вспомогательные функции для разных HTTP методов
 */

export const api = {
  /**
   * GET запрос
   */
  get: <T = any>(endpoint: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),
  
  /**
   * POST запрос
   */
  post: <T = any>(endpoint: string, body?: any, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'POST', body }),
  
  /**
   * PUT запрос
   */
  put: <T = any>(endpoint: string, body?: any, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'PUT', body }),
  
  /**
   * PATCH запрос
   */
  patch: <T = any>(endpoint: string, body?: any, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'PATCH', body }),
  
  /**
   * DELETE запрос
   */
  delete: <T = any>(endpoint: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};

// ✅ Export as both 'api' and 'apiClient' for compatibility
export const apiClient = api;

/**
 * Примеры использования:
 * 
 * // GET запрос
 * const users = await api.get('/api/users');
 * 
 * // POST запрос
 * const newUser = await api.post('/api/users', { email: 'test@test.com', name: 'Test' });
 * 
 * // PUT запрос
 * const updated = await api.put('/api/users/123', { name: 'Updated Name' });
 * 
 * // DELETE запрос
 * await api.delete('/api/users/123');
 */
