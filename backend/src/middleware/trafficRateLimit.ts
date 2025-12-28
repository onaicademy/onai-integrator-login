/**
 * Rate Limiting Middleware для Traffic Dashboard
 *
 * Защита от:
 * - Brute force атак на вход
 * - DDoS атак на API
 * - Перебор паролей
 */

import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
    blocked: boolean;
    blockUntil?: number;
  };
}

const store: RateLimitStore = {};

// Очистка старых записей каждые 10 минут
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now && !store[key].blocked) {
      delete store[key];
    }
  });
}, 10 * 60 * 1000);

interface RateLimitOptions {
  windowMs: number;  // Окно времени в миллисекундах
  maxRequests: number;  // Максимум запросов в окне
  blockDuration?: number;  // Время блокировки при превышении (опционально)
  message?: string;  // Сообщение об ошибке
  keyGenerator?: (req: Request) => string;  // Функция генерации ключа
}

/**
 * Создаёт rate limit middleware
 */
export function createRateLimit(options: RateLimitOptions) {
  const {
    windowMs,
    maxRequests,
    blockDuration = 15 * 60 * 1000, // 15 минут по умолчанию
    message = 'Слишком много запросов. Попробуйте позже.',
    keyGenerator = (req) => req.ip || 'unknown'
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();

    // Инициализируем запись если её нет
    if (!store[key]) {
      store[key] = {
        count: 0,
        resetTime: now + windowMs,
        blocked: false
      };
    }

    const record = store[key];

    // Проверяем, заблокирован ли IP
    if (record.blocked && record.blockUntil) {
      if (now < record.blockUntil) {
        const remainingMinutes = Math.ceil((record.blockUntil - now) / 60000);
        return res.status(429).json({
          error: 'IP заблокирован',
          message: `Ваш IP временно заблокирован. Попробуйте через ${remainingMinutes} минут.`,
          retryAfter: Math.ceil((record.blockUntil - now) / 1000)
        });
      } else {
        // Блокировка истекла, сбрасываем
        record.blocked = false;
        record.blockUntil = undefined;
        record.count = 0;
        record.resetTime = now + windowMs;
      }
    }

    // Сбрасываем счётчик если окно истекло
    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + windowMs;
    }

    // Увеличиваем счётчик
    record.count++;

    // Проверяем лимит
    if (record.count > maxRequests) {
      // Блокируем IP
      record.blocked = true;
      record.blockUntil = now + blockDuration;

      console.warn(`🚨 [Rate Limit] IP ${key} заблокирован на ${blockDuration / 60000} минут (превышен лимит: ${record.count}/${maxRequests})`);

      return res.status(429).json({
        error: 'Превышен лимит запросов',
        message,
        retryAfter: Math.ceil(blockDuration / 1000)
      });
    }

    // Добавляем заголовки
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - record.count));
    res.setHeader('X-RateLimit-Reset', new Date(record.resetTime).toISOString());

    next();
  };
}

/**
 * Rate limit для входа в Traffic Dashboard
 * 5 попыток в 15 минут, блокировка на 15 минут при превышении
 */
export const trafficLoginRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  maxRequests: 5, // 5 попыток
  blockDuration: 15 * 60 * 1000, // Блокировка на 15 минут
  message: 'Слишком много попыток входа. Ваш IP временно заблокирован.',
  keyGenerator: (req) => {
    // Используем IP + User-Agent для более точной идентификации
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return `login:${ip}`;
  }
});

/**
 * Rate limit для API запросов
 * 100 запросов в минуту
 */
export const trafficApiRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 минута
  maxRequests: 100, // 100 запросов
  blockDuration: 5 * 60 * 1000, // Блокировка на 5 минут
  message: 'Слишком много API запросов.',
  keyGenerator: (req) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return `api:${ip}`;
  }
});

/**
 * Rate limit для создания/изменения данных
 * 20 запросов в минуту
 */
export const trafficMutationRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 минута
  maxRequests: 20, // 20 запросов
  blockDuration: 10 * 60 * 1000, // Блокировка на 10 минут
  message: 'Слишком много запросов на изменение данных.',
  keyGenerator: (req) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return `mutation:${ip}`;
  }
});

/**
 * Получить статистику rate limiting (для админа)
 */
export function getRateLimitStats() {
  const now = Date.now();
  const stats = {
    total: Object.keys(store).length,
    blocked: 0,
    active: 0,
    byType: {
      login: 0,
      api: 0,
      mutation: 0,
      other: 0
    }
  };

  Object.entries(store).forEach(([key, record]) => {
    if (record.blocked && record.blockUntil && now < record.blockUntil) {
      stats.blocked++;
    } else if (record.count > 0) {
      stats.active++;
    }

    if (key.startsWith('login:')) stats.byType.login++;
    else if (key.startsWith('api:')) stats.byType.api++;
    else if (key.startsWith('mutation:')) stats.byType.mutation++;
    else stats.byType.other++;
  });

  return stats;
}

/**
 * Очистить блокировку для конкретного IP (для админа)
 */
export function clearRateLimitBlock(ip: string) {
  const keys = Object.keys(store).filter(k => k.includes(ip));
  keys.forEach(key => {
    delete store[key];
  });
  console.log(`✅ [Rate Limit] Блокировка снята для IP ${ip} (${keys.length} записей удалено)`);
  return keys.length;
}
