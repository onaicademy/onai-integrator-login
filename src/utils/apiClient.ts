/**
 * API Client для работы с Backend API
 * 
 * Все запросы к данным должны идти через Backend API, а не напрямую к Supabase.
 * Backend будет использовать Supabase service_role_key для безопасной работы с БД.
 */

interface ApiRequestOptions extends RequestInit {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
}

/**
 * ✅ Helper: Get JWT token from localStorage (correct key)
 */
export function getAuthToken(): string | null {
  // Try old key first (for backward compatibility)
  let token = localStorage.getItem('supabase_token');
  
  // If not found, get from Supabase session
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
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  // Получаем JWT токен из localStorage (сохраняется после авторизации)
  const token = getAuthToken();
  
  // 🏗️ АРХИТЕКТУРНОЕ РЕШЕНИЕ: Единая точка правды для API URL
  // Production fallback утвержден архитектором (Вариант A)
  const baseUrl = import.meta.env.VITE_API_URL || 'https://api.onai.academy';
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
    console.log('='.repeat(80));
    console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);
    console.log('📦 Body type:', isFormData ? 'FormData' : typeof options.body);
    console.log('📋 Headers:', headers);
    
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
    
    const response = await fetch(url, {
      ...options,
      headers,
      body,
    });
    
    // Если ответ не OK - обрабатываем ошибку
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || errorData.message || `HTTP Error ${response.status}`;
      
      console.error(`❌ API Error: ${errorMessage}`, errorData);
      
      // 🚨 CRITICAL SECURITY: Force logout on 401 Unauthorized
      if (response.status === 401) {
        console.error('🚨 401 UNAUTHORIZED: Принудительный выход из системы');
        
        // Clear all auth data
        localStorage.removeItem('supabase_token');
        localStorage.removeItem('sb-arqhkacellqbhjhbebfh-auth-token');
        sessionStorage.clear();
        
        // Redirect to login after a short delay
        setTimeout(() => {
          const currentPath = window.location.pathname;
          const returnUrl = encodeURIComponent(currentPath);
          
          // Check if it's a Tripwire route
          if (currentPath.startsWith('/tripwire')) {
            window.location.href = `/tripwire/login?returnUrl=${returnUrl}`;
          } else {
            window.location.href = '/login';
          }
        }, 500);
      }
      
      throw new Error(errorMessage);
    }
    
    // Парсим JSON ответ
    const data = await response.json();
    console.log('='.repeat(80));
    console.log(`✅ API Response ${response.status}:`, data);
    console.log('='.repeat(80));
    
    return data as T;
    
  } catch (error: any) {
    console.error(`❌ API Request Failed: ${options.method || 'GET'} ${url}`, error);
    
    // Если Backend недоступен - показываем понятное сообщение
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Backend API недоступен. Убедитесь, что сервер запущен на ' + baseUrl);
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

