/**
 * AmoCRM Service - интеграция с amoCRM для автоматического перемещения сделок
 * При прохождении уроков в Tripwire воронке
 * 
 * 🔥 С АВТОМАТИЧЕСКИМ ОБНОВЛЕНИЕМ ТОКЕНОВ (Refresh Token Flow)
 * 🎯 ИСПОЛЬЗУЕТ LANDING SUPABASE - там хранятся токены и лиды
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { landingSupabase } from '../config/supabase-landing';
import { IntegrationLogger } from './integrationLogger';

// ========================================
// КОНФИГУРАЦИЯ ЭТАПОВ AMOCRM
// ========================================
const AMO_STAGES = {
  LESSON_1_COMPLETED: parseInt(process.env.AMOCRM_STAGE_LESSON_1 || '0'),
  LESSON_2_COMPLETED: parseInt(process.env.AMOCRM_STAGE_LESSON_2 || '0'),
  LESSON_3_COMPLETED: parseInt(process.env.AMOCRM_STAGE_LESSON_3 || '0'),
};

const AMO_PIPELINE_ID = parseInt(process.env.AMOCRM_PIPELINE_ID || '10350882');

// ========================================
// ХРАНИЛИЩЕ ТОКЕНОВ (В БД + ПАМЯТИ)
// ========================================
// ✅ Токены хранятся в БД для персистентности при рестартах
let currentAccessToken = process.env.AMOCRM_ACCESS_TOKEN || '';
let currentRefreshToken = process.env.AMOCRM_REFRESH_TOKEN || '';

/**
 * 💾 Загрузка токенов из БД при старте сервера
 */
async function loadTokensFromDB(): Promise<void> {
  try {
    console.log('📥 [AmoCRM] Загружаем токены из LANDING БД...');
    
    const { data, error } = await landingSupabase
      .from('integration_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('service_name', 'amocrm')
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // Запись не найдена - это нормально при первом запуске
        console.log('ℹ️ [AmoCRM] Токены в БД не найдены, используем env переменные');
        
        // Если есть токены в env - сохраним их в БД
        if (currentAccessToken && currentRefreshToken) {
          console.log('💾 [AmoCRM] Сохраняем токены из env в БД...');
          await saveTokens(currentAccessToken, currentRefreshToken);
        }
        return;
      }
      
      console.error('❌ [AmoCRM] Ошибка загрузки токенов из БД:', error);
      return;
    }
    
    if (data && data.access_token && data.refresh_token) {
      currentAccessToken = data.access_token;
      currentRefreshToken = data.refresh_token;
      console.log('✅ [AmoCRM] Токены успешно загружены из БД');
      console.log(`   - Access Token: ${currentAccessToken.substring(0, 20)}...`);
      console.log(`   - Expires at: ${data.expires_at || 'unknown'}`);
    } else {
      console.warn('⚠️ [AmoCRM] Токены в БД найдены, но пустые');
    }
  } catch (error) {
    console.error('❌ [AmoCRM] Критическая ошибка при загрузке токенов:', error);
  }
}

/**
 * 💾 Сохранение токенов в БД (и память)
 */
async function saveTokens(accessToken: string, refreshToken: string): Promise<void> {
  // 1. Обновляем токены в памяти (для текущей сессии)
  currentAccessToken = accessToken;
  currentRefreshToken = refreshToken;
  
  // 2. Сохраняем в LANDING БД (для персистентности)
  try {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // AmoCRM токены живут 24 часа
    
    const { error } = await landingSupabase
      .from('integration_tokens')
      .upsert({
        service_name: 'amocrm',
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt.toISOString(),
        metadata: {
          token_type: 'Bearer',
          last_refreshed: new Date().toISOString()
        }
      }, {
        onConflict: 'service_name'
      });
    
    if (error) {
      console.error('❌ [AmoCRM] Ошибка сохранения токенов в БД:', error);
      console.warn('⚠️ [AmoCRM] Токены обновлены только в памяти (могут потеряться при рестарте)');
      return;
    }
    
    console.log('✅ [AmoCRM] Токены сохранены в БД и памяти');
  } catch (error) {
    console.error('❌ [AmoCRM] Критическая ошибка при сохранении токенов:', error);
    console.warn('⚠️ [AmoCRM] Токены обновлены только в памяти');
  }
}

// ========================================
// ИНИЦИАЛИЗАЦИЯ: Загрузка токенов при старте
// ========================================
// Загружаем токены из БД асинхронно (не блокируем импорт модуля)
loadTokensFromDB().catch((error) => {
  console.error('❌ [AmoCRM] Не удалось загрузить токены при старте:', error);
});

/**
 * Обновление Access Token через Refresh Token
 */
async function refreshAccessToken(): Promise<boolean> {
  return await IntegrationLogger.track(
    'amocrm',
    'refresh_access_token',
    async () => {
      console.log('🔄 [AmoCRM] Токен истёк, запрашиваем новый через Refresh Token...');

      const subdomain = process.env.AMOCRM_SUBDOMAIN;
      const clientId = process.env.AMOCRM_CLIENT_ID;
      const clientSecret = process.env.AMOCRM_CLIENT_SECRET;
      const redirectUri = process.env.AMOCRM_REDIRECT_URI || 'https://onai.academy';

      if (!subdomain || !clientId || !clientSecret || !currentRefreshToken) {
        console.error('❌ [AmoCRM] Не хватает данных для обновления токена:');
        if (!subdomain) console.error('  - AMOCRM_SUBDOMAIN не задан');
        if (!clientId) console.error('  - AMOCRM_CLIENT_ID не задан');
        if (!clientSecret) console.error('  - AMOCRM_CLIENT_SECRET не задан');
        if (!currentRefreshToken) console.error('  - AMOCRM_REFRESH_TOKEN не задан');
        throw new Error('Missing AmoCRM OAuth credentials');
      }

      // Запрос на обновление токена (БЕЗ interceptors, чтобы не зациклиться)
      const response = await axios.post(
        `https://${subdomain}.amocrm.ru/oauth2/access_token`,
        {
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token',
          refresh_token: currentRefreshToken,
          redirect_uri: redirectUri,
        },
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const { access_token, refresh_token } = response.data;

      if (!access_token || !refresh_token) {
        console.error('❌ [AmoCRM] Не получили токены в ответе от amoCRM');
        throw new Error('Invalid token response from AmoCRM');
      }

      // Сохраняем новые токены
      await saveTokens(access_token, refresh_token);

      console.log('✅ [AmoCRM] Токены успешно обновлены!');
      console.log(`   - Access Token: ${access_token.substring(0, 20)}...`);
      console.log(`   - Refresh Token: ${refresh_token.substring(0, 20)}...`);

      return true;
    },
    {
      includeRequest: false, // Не логируем секретные данные
      includeResponse: false,
    }
  ).catch((error: any) => {
    console.error('❌ [AmoCRM] Не удалось обновить токен:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });

    console.error('💡 [AmoCRM] Возможно, Refresh Token истёк или интеграция деактивирована.');
    console.error('   Необходима повторная OAuth авторизация через amoCRM.');

    return false;
  });
}

// ========================================
// AXIOS CLIENT С INTERCEPTORS
// ========================================

/**
 * Создание глобального Axios instance с автообновлением токенов
 */
let amoClient: AxiosInstance | null = null;
let isRefreshing = false; // Флаг, чтобы не обновлять токен параллельно
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

/**
 * Обработка очереди запросов, которые ждали обновления токена
 */
function processQueue(error: any = null) {
  failedQueue.forEach(promise => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve();
    }
  });
  failedQueue = [];
}

/**
 * Получить или создать axios client с настроенными interceptors
 */
function getAmoCrmClient(): AxiosInstance | null {
  // Проверка минимальной конфигурации
  if (!process.env.AMOCRM_SUBDOMAIN || !currentAccessToken) {
    return null;
  }

  // Если клиент уже создан, возвращаем его
  if (amoClient) {
    return amoClient;
  }

  const baseURL = `https://${process.env.AMOCRM_SUBDOMAIN}.amocrm.ru/api/v4`;
  
  // Создаём axios instance
  amoClient = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 15000, // 15 секунд
  });

  // ========================================
  // REQUEST INTERCEPTOR - Добавление токена
  // ========================================
  amoClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      // Автоматически добавляем текущий токен к каждому запросу
      if (currentAccessToken) {
        config.headers.Authorization = `Bearer ${currentAccessToken}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // ========================================
  // RESPONSE INTERCEPTOR - Обработка 401 и автообновление
  // ========================================
  amoClient.interceptors.response.use(
    (response) => {
      // Если запрос успешен, просто возвращаем ответ
      return response;
    },
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      // Проверяем: ошибка 401 (Unauthorized) и мы ещё не пытались обновить токен
      if (error.response?.status === 401 && !originalRequest._retry) {
        
        // Если уже идёт обновление токена, добавляем запрос в очередь
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then(() => {
              // После обновления токена повторяем запрос
              originalRequest.headers.Authorization = `Bearer ${currentAccessToken}`;
              return amoClient!(originalRequest);
            })
            .catch((err) => {
              return Promise.reject(err);
            });
        }

        // Помечаем, что запрос уже пытались повторить
        originalRequest._retry = true;
        isRefreshing = true;

        try {
          // Пытаемся обновить токен
          const refreshed = await refreshAccessToken();

          if (refreshed) {
            // Токен обновлён успешно
            isRefreshing = false;
            processQueue(); // Обрабатываем очередь ожидающих запросов

            // Повторяем оригинальный запрос с новым токеном
            originalRequest.headers.Authorization = `Bearer ${currentAccessToken}`;
            return amoClient!(originalRequest);
          } else {
            // Не удалось обновить токен
            isRefreshing = false;
            processQueue(new Error('Failed to refresh token'));
            return Promise.reject(error);
          }
        } catch (refreshError) {
          // Ошибка при обновлении токена
          isRefreshing = false;
          processQueue(refreshError);
          return Promise.reject(refreshError);
        }
      }

      // Для всех остальных ошибок просто возвращаем reject
      return Promise.reject(error);
    }
  );

  return amoClient;
}

/**
 * Проверка полной конфигурации amoCRM
 */
function isAmoCrmConfigured(): boolean {
  const hasOAuth = Boolean(
    process.env.AMOCRM_CLIENT_ID &&
    process.env.AMOCRM_CLIENT_SECRET &&
    currentRefreshToken
  );

  const isConfigured = Boolean(
    process.env.AMOCRM_SUBDOMAIN &&
    currentAccessToken &&
    AMO_PIPELINE_ID > 0 &&
    AMO_STAGES.LESSON_1_COMPLETED > 0 &&
    AMO_STAGES.LESSON_2_COMPLETED > 0 &&
    AMO_STAGES.LESSON_3_COMPLETED > 0
  );

  if (!isConfigured) {
    console.warn('⚠️ amoCRM не полностью сконфигурирован. Проверьте переменные окружения:');
    if (!process.env.AMOCRM_SUBDOMAIN) console.warn('  - AMOCRM_SUBDOMAIN не задан');
    if (!currentAccessToken) console.warn('  - AMOCRM_ACCESS_TOKEN не задан');
    if (!AMO_PIPELINE_ID) console.warn('  - AMOCRM_PIPELINE_ID не задан');
    if (!AMO_STAGES.LESSON_1_COMPLETED) console.warn('  - AMOCRM_STAGE_LESSON_1 не задан');
    if (!AMO_STAGES.LESSON_2_COMPLETED) console.warn('  - AMOCRM_STAGE_LESSON_2 не задан');
    if (!AMO_STAGES.LESSON_3_COMPLETED) console.warn('  - AMOCRM_STAGE_LESSON_3 не задан');
  }

  if (!hasOAuth) {
    console.warn('⚠️ OAuth credentials не заданы (автообновление токенов не будет работать):');
    if (!process.env.AMOCRM_CLIENT_ID) console.warn('  - AMOCRM_CLIENT_ID не задан');
    if (!process.env.AMOCRM_CLIENT_SECRET) console.warn('  - AMOCRM_CLIENT_SECRET не задан');
    if (!currentRefreshToken) console.warn('  - AMOCRM_REFRESH_TOKEN не задан');
    console.warn('💡 Токен будет работать 24 часа, затем потребуется ручное обновление');
  }

  return isConfigured;
}

// ========================================
// ОСНОВНЫЕ ФУНКЦИИ
// ========================================

/**
 * Находит активную сделку пользователя по Email
 */
async function findLeadIdByEmail(email: string): Promise<number | null> {
  const client = getAmoCrmClient();
  if (!client) {
    console.log('[AmoCRM] Сервис не сконфигурирован, пропускаем поиск сделки');
    return null;
  }

  return await IntegrationLogger.track(
    'amocrm',
    'find_lead_by_email',
    async () => {
      console.log(`[AmoCRM] Поиск контакта по email: ${email}`);

      // 1. Ищем контакт по email
      const contactRes = await client.get('/contacts', {
        params: { query: email },
      });

      const contact = contactRes.data._embedded?.contacts?.[0];
      if (!contact) {
        console.log(`[AmoCRM] Контакт с email ${email} не найден`);
        return null;
      }

      console.log(`[AmoCRM] Найден контакт: ID ${contact.id}, имя "${contact.name}"`);

      // 2. Ищем сделки, привязанные к этому контакту в нужной воронке
      const leadsRes = await client.get('/leads', {
        params: {
          'filter[id]': contact.id,
          'filter[pipeline_id]': AMO_PIPELINE_ID,
        },
      });

      const leads = leadsRes.data._embedded?.leads;
      if (!leads || leads.length === 0) {
        console.log(`[AmoCRM] Сделки для контакта ${contact.id} в воронке ${AMO_PIPELINE_ID} не найдены`);
        return null;
      }

      // Берем самую свежую сделку
      const latestLead = leads.reduce((latest: any, current: any) => {
        return current.updated_at > latest.updated_at ? current : latest;
      }, leads[0]);

      console.log(`[AmoCRM] Найдена сделка: ID ${latestLead.id}, статус ${latestLead.status_id}`);
      return latestLead.id;
    },
    {
      metadata: { email, pipeline_id: AMO_PIPELINE_ID },
      includeRequest: true,
      includeResponse: true,
    }
  ).catch((error: any) => {
    handleAmoCrmError('[AmoCRM] Ошибка при поиске сделки', error);
    return null;
  });
}

/**
 * Обновляет статус сделки (перемещает на новый этап)
 */
async function moveLeadToStage(leadId: number, stageId: number): Promise<boolean> {
  const client = getAmoCrmClient();
  if (!client) {
    console.log('[AmoCRM] Сервис не сконфигурирован, пропускаем перемещение сделки');
    return false;
  }

  return await IntegrationLogger.track(
    'amocrm',
    'move_lead_to_stage',
    async () => {
      console.log(`[AmoCRM] Перемещаем сделку ${leadId} на этап ${stageId}`);

      const response = await client.patch(`/leads/${leadId}`, {
        status_id: stageId,
      });

      console.log(`✅ [AmoCRM] Сделка ${leadId} успешно перемещена на этап ${stageId}`);
      return true;
    },
    {
      metadata: { lead_id: leadId, stage_id: stageId },
      includeRequest: true,
      includeResponse: true,
    }
  ).catch((error: any) => {
    handleAmoCrmError(`[AmoCRM] Не удалось переместить сделку ${leadId}`, error);
    return false;
  });
}

/**
 * Главная функция: вызывается когда урок завершен
 */
export async function onLessonCompleted(userEmail: string, lessonNumber: number): Promise<void> {
  if (!isAmoCrmConfigured()) {
    console.log('[AmoCRM] Интеграция не сконфигурирована, пропускаем обновление CRM');
    return;
  }

  let targetStageId: number | null = null;

  if (lessonNumber === 1) targetStageId = AMO_STAGES.LESSON_1_COMPLETED;
  else if (lessonNumber === 2) targetStageId = AMO_STAGES.LESSON_2_COMPLETED;
  else if (lessonNumber === 3) targetStageId = AMO_STAGES.LESSON_3_COMPLETED;

  if (!targetStageId) {
    console.log(`[AmoCRM] Урок ${lessonNumber} не привязан к этапу воронки, пропускаем`);
    return;
  }

  console.log(`🎯 [AmoCRM] Пользователь ${userEmail} завершил урок ${lessonNumber}. Обновляем CRM...`);

  const leadId = await findLeadIdByEmail(userEmail);
  
  if (leadId) {
    await moveLeadToStage(leadId, targetStageId);
  } else {
    console.log(`[AmoCRM] Сделка для ${userEmail} не найдена в amoCRM`);
  }
}

/**
 * Обработка ошибок amoCRM API
 */
function handleAmoCrmError(message: string, error: unknown): void {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    console.error(message, {
      status: axiosError.response?.status,
      statusText: axiosError.response?.statusText,
      data: axiosError.response?.data,
      message: axiosError.message,
    });

    if (axiosError.response?.status === 401) {
      console.error('❌ [AmoCRM] Ошибка авторизации (401)');
      console.error('💡 Токен будет автоматически обновлён, если настроен Refresh Token');
    } else if (axiosError.response?.status === 403) {
      console.error('❌ [AmoCRM] Нет доступа к ресурсу (403)');
    } else if (axiosError.response?.status === 404) {
      console.error('❌ [AmoCRM] Ресурс не найден (404)');
    } else if (axiosError.response?.status === 429) {
      console.error('❌ [AmoCRM] Превышен лимит запросов (429)');
    }
  } else {
    console.error(message, error);
  }
}

// ========================================
// ДОПОЛНИТЕЛЬНЫЕ УТИЛИТЫ
// ========================================

/**
 * Тестовая функция для проверки подключения к amoCRM
 */
export async function testAmoCrmConnection(): Promise<boolean> {
  const client = getAmoCrmClient();
  if (!client) {
    console.error('❌ [AmoCRM] Сервис не сконфигурирован');
    return false;
  }

  try {
    console.log('[AmoCRM] Тестируем подключение...');
    
    const response = await client.get('/account');
    console.log('✅ [AmoCRM] Подключение успешно!', {
      id: response.data.id,
      name: response.data.name,
      subdomain: response.data.subdomain,
    });
    
    return true;
  } catch (error) {
    handleAmoCrmError('❌ [AmoCRM] Ошибка подключения', error);
    return false;
  }
}

/**
 * Получить список всех воронок (для отладки)
 */
export async function listPipelines(): Promise<void> {
  const client = getAmoCrmClient();
  if (!client) {
    console.error('❌ [AmoCRM] Сервис не сконфигурирован');
    return;
  }

  try {
    const response = await client.get('/leads/pipelines');
    console.log('[AmoCRM] Список воронок:');
    
    const pipelines = response.data._embedded?.pipelines || [];
    pipelines.forEach((pipeline: any) => {
      console.log(`\n📊 Воронка: ${pipeline.name} (ID: ${pipeline.id})`);
      console.log('   Этапы:');
      
      Object.values(pipeline._embedded?.statuses || {}).forEach((status: any) => {
        console.log(`   - ${status.name} (ID: ${status.id})`);
      });
    });
  } catch (error) {
    handleAmoCrmError('❌ [AmoCRM] Ошибка получения воронок', error);
  }
}

/**
 * Ручное обновление токена (для тестирования)
 */
export async function manualRefreshToken(): Promise<boolean> {
  console.log('🔄 [AmoCRM] Запуск ручного обновления токена...');
  return await refreshAccessToken();
}

// ========================================
// ЭКСПОРТ
// ========================================

export const amoCrmService = {
  onLessonCompleted,
  testConnection: testAmoCrmConnection,
  listPipelines,
  findLeadIdByEmail,
  moveLeadToStage,
  manualRefreshToken, // Для тестирования
};

export default amoCrmService;


























