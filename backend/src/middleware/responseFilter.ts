/**
 * Response Filter Middleware
 *
 * Фильтрует секретные данные из API responses перед отправкой клиенту.
 * Гарантирует что токены, ключи и другие секреты НИКОГДА не попадут к клиенту.
 *
 * @security КРИТИЧЕСКИ ВАЖНЫЙ middleware для безопасности
 */

import { Request, Response, NextFunction } from 'express';
import { dataMasker } from '../core/data-masker.js';

// Поля которые НИКОГДА не должны попадать в response
const FORBIDDEN_FIELDS = new Set([
  // Токены и ключи
  'accessToken', 'access_token', 'refreshToken', 'refresh_token',
  'apiKey', 'api_key', 'apikey', 'secretKey', 'secret_key',
  'privateKey', 'private_key', 'serviceKey', 'service_key',
  'anonKey', 'anon_key', 'supabaseKey', 'supabase_key',
  'jwtSecret', 'jwt_secret', 'encryptionKey', 'encryption_key',

  // Пароли и credentials
  'password', 'pass', 'pwd', 'secret', 'credential', 'credentials',
  'hash', 'passwordHash', 'password_hash', 'salt',

  // Внутренняя информация
  'internalId', 'internal_id', 'systemId', 'system_id',
  'connectionString', 'connection_string', 'databaseUrl', 'database_url',

  // Debug информация
  'stack', 'stackTrace', 'stack_trace', 'debug', 'debugInfo', 'debug_info',
  'trace', 'internalError', 'internal_error',
]);

// Поля которые нужно маскировать частично
const PARTIAL_MASK_FIELDS = new Set([
  'email', 'phone', 'telegram', 'telegramUsername',
]);

// Поля которые безопасны для передачи
const SAFE_FIELDS = new Set([
  'id', 'name', 'title', 'description', 'status', 'type',
  'createdAt', 'created_at', 'updatedAt', 'updated_at',
  'level', 'xp', 'points', 'score', 'progress',
  'count', 'total', 'page', 'limit', 'offset',
  'success', 'message', 'error', 'code',
]);

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Рекурсивно фильтрует объект, удаляя/маскируя секретные поля
 */
function filterObject(obj: any, depth = 0): any {
  if (depth > 20) return '[MAX_DEPTH]';
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => filterObject(item, depth + 1));
  }

  const filtered: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    // Полностью запрещенные поля - удаляем
    if (FORBIDDEN_FIELDS.has(key) || FORBIDDEN_FIELDS.has(lowerKey)) {
      // В production не включаем вообще
      if (isProduction) continue;
      // В dev показываем что поле отфильтровано
      filtered[key] = '[FILTERED]';
      continue;
    }

    // Частично маскируемые поля
    if (PARTIAL_MASK_FIELDS.has(key) || PARTIAL_MASK_FIELDS.has(lowerKey)) {
      if (typeof value === 'string' && value.length > 4) {
        if (isProduction) {
          // В production маскируем более агрессивно
          if (lowerKey === 'email') {
            const [local, domain] = value.split('@');
            if (local && domain) {
              filtered[key] = `${local[0]}***@${domain}`;
            } else {
              filtered[key] = '***';
            }
          } else if (lowerKey === 'phone') {
            filtered[key] = `${value.slice(0, 3)}*****${value.slice(-2)}`;
          } else {
            filtered[key] = `${value[0]}***${value[value.length - 1]}`;
          }
        } else {
          // В dev показываем больше
          filtered[key] = value;
        }
        continue;
      }
    }

    // Рекурсивная обработка вложенных объектов
    if (typeof value === 'object' && value !== null) {
      filtered[key] = filterObject(value, depth + 1);
      continue;
    }

    // Проверяем строки на секретные паттерны
    if (typeof value === 'string' && isProduction) {
      filtered[key] = dataMasker.mask(value);
      continue;
    }

    // Безопасное значение - копируем как есть
    filtered[key] = value;
  }

  return filtered;
}

/**
 * Middleware для фильтрации response
 */
export function responseFilter(req: Request, res: Response, next: NextFunction) {
  // Сохраняем оригинальный json метод
  const originalJson = res.json.bind(res);

  // Переопределяем json метод
  res.json = function(data: any): Response {
    try {
      // Фильтруем данные перед отправкой
      const filteredData = filterObject(data);
      return originalJson(filteredData);
    } catch (error) {
      // При ошибке фильтрации - отправляем безопасный ответ
      console.error('[ResponseFilter] Error filtering response:', error);
      return originalJson({
        error: 'Internal server error',
        message: 'Response filtering failed',
      });
    }
  };

  next();
}

/**
 * Middleware для добавления security headers
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Запрещаем кэширование чувствительных данных
  if (req.path.includes('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  // Защита от MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Защита от clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // XSS protection (для старых браузеров)
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Запрещаем передачу referrer на другие домены
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  next();
}

/**
 * Error response sanitizer - для использования в error handler
 */
export function sanitizeErrorResponse(error: any): object {
  const isProduction = process.env.NODE_ENV === 'production';

  const response: Record<string, any> = {
    error: true,
    message: isProduction ? 'An error occurred' : (error.message || 'Unknown error'),
  };

  // В production не раскрываем детали
  if (!isProduction) {
    if (error.code) response.code = error.code;
    if (error.status) response.status = error.status;
    if (error.details) response.details = filterObject(error.details);
  }

  // Никогда не включаем stack trace в production
  if (!isProduction && error.stack) {
    // Маскируем пути в stack trace
    response.stack = dataMasker.mask(error.stack);
  }

  return response;
}

export default responseFilter;
