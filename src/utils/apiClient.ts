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
 * Базовая функция для выполнения HTTP запросов к Backend API
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  // Получаем JWT токен из localStorage (сохраняется после авторизации)
  const token = localStorage.getItem('supabase_token');
  
  // Формируем URL для запроса
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  const url = `${baseUrl}${endpoint}`;
  
  // Подготавливаем headers
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  // Добавляем Authorization header если есть токен
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Подготавливаем body (если есть)
  const body = options.body
    ? typeof options.body === 'string'
      ? options.body
      : JSON.stringify(options.body)
    : undefined;
  
  try {
    console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);
    
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
      throw new Error(errorMessage);
    }
    
    // Парсим JSON ответ
    const data = await response.json();
    console.log(`✅ API Response:`, data);
    
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

