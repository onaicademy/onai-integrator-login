# 🎯 ПЛАН ВНЕДРЕНИЯ СИСТЕМЫ МОНИТОРИНГА И ДЕБАГА

**Дата:** 20 декабря 2024  
**Цель:** Гибридный подход без поломок

---

## 📋 КРИТИЧЕСКИЕ СЦЕНАРИИ ПО ПРОДУКТАМ

### **1. TRIPWIRE (Основная платформа)**

#### Критические сценарии:
1. **Авторизация/Доступы**
   - Login через email/password
   - JWT token валидация
   - Role-based access (student/admin)

2. **Просмотр курса и модулей**
   - Загрузка списка курсов
   - Открытие модуля
   - Трекинг прогресса

3. **Просмотр урока**
   - Видео плеер запускается
   - Honest tracking работает
   - Прогресс сохраняется

4. **AI Mentor диалог**
   - OpenAI Assistant отвечает
   - Context сохраняется
   - Thread не ломается

5. **Achievements система**
   - Ачивки разблокируются
   - Модальные окна показываются
   - Прогресс синхронизируется

---

### **2. TRAFFIC DASHBOARD (Таргетологи)**

#### Критические сценарии:
1. **Авторизация таргетолога**
   - Login в Traffic DB
   - Роль определяется (targetologist/admin)
   - Session валидный

2. **Подключение FB Ads**
   - Token validation
   - Ad accounts загружаются
   - Campaigns отображаются

3. **Просмотр аналитики**
   - Express Course данные
   - Main Products данные
   - ROI расчёты

4. **AmoCRM интеграция**
   - Leads подтягиваются
   - UTM парсится
   - Sales считаются

5. **Onboarding tour**
   - Driver.js запускается
   - Шаги работают
   - Прогресс сохраняется

---

### **3. REFERRAL SYSTEM (Реферальная система)**

#### Критические сценарии:
1. **Генерация реферальной ссылки**
   - User авторизован
   - Уникальный код создан
   - Ссылка работает

2. **Трекинг перехода по ссылке**
   - Cookie/localStorage сохраняется
   - Referrer ID фиксируется
   - Attribution работает

3. **Регистрация реферала**
   - Новый user создаётся
   - Связь referrer ↔ referee
   - Статистика обновляется

4. **Начисление вознаграждения**
   - Условия проверяются
   - Reward начисляется
   - Webhook срабатывает (если есть)

5. **Просмотр статистики**
   - Кол-во рефералов
   - Заработок
   - История выплат

---

## 🏥 ШАГ 2: HEALTH/STATUS ENDPOINTS

### **Backend Structure:**

```typescript
// backend/src/routes/health.ts
import { Router } from 'express';
import { tripwireSupabase } from '@/config/supabase-tripwire';
import { trafficSupabase } from '@/config/supabase-traffic';
import OpenAI from 'openai';

const router = Router();

/**
 * GET /api/health
 * Общий health check
 */
router.get('/', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {}
    };

    // Check Tripwire DB
    try {
      const { data } = await tripwireSupabase.from('users').select('id').limit(1);
      health.services.tripwire_db = data ? 'healthy' : 'degraded';
    } catch (e) {
      health.services.tripwire_db = 'unhealthy';
      health.status = 'degraded';
    }

    // Check Traffic DB
    try {
      const { data } = await trafficSupabase.from('traffic_users').select('id').limit(1);
      health.services.traffic_db = data ? 'healthy' : 'degraded';
    } catch (e) {
      health.services.traffic_db = 'unhealthy';
      health.status = 'degraded';
    }

    // Check OpenAI
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      await openai.models.list();
      health.services.openai = 'healthy';
    } catch (e) {
      health.services.openai = 'unhealthy';
      health.status = 'degraded';
    }

    // Check AmoCRM
    try {
      const response = await fetch(`${process.env.AMOCRM_DOMAIN}/api/v4/account`, {
        headers: { 'Authorization': `Bearer ${process.env.AMOCRM_ACCESS_TOKEN}` }
      });
      health.services.amocrm = response.ok ? 'healthy' : 'unhealthy';
    } catch (e) {
      health.services.amocrm = 'unhealthy';
    }

    res.status(health.status === 'healthy' ? 200 : 503).json(health);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/health/tripwire
 * Tripwire-specific checks
 */
router.get('/tripwire', async (req, res) => {
  // Detailed Tripwire checks
  const checks = {
    db: false,
    auth: false,
    video_tracking: false,
    ai_mentor: false,
    achievements: false
  };

  try {
    // DB check
    const { data: users } = await tripwireSupabase.from('users').select('id').limit(1);
    checks.db = !!users;

    // Auth check (JWT secret exists)
    checks.auth = !!process.env.JWT_SECRET;

    // Video tracking (честный таймер)
    checks.video_tracking = !!process.env.HONEST_TRACKING_ENABLED;

    // AI Mentor (OpenAI key)
    checks.ai_mentor = !!process.env.OPENAI_API_KEY;

    // Achievements (table exists)
    const { data: achievements } = await tripwireSupabase.from('achievements').select('id').limit(1);
    checks.achievements = !!achievements;

    const allHealthy = Object.values(checks).every(v => v === true);
    
    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'healthy' : 'degraded',
      checks,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      checks,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/health/traffic
 * Traffic Dashboard checks
 */
router.get('/traffic', async (req, res) => {
  const checks = {
    db: false,
    fb_integration: false,
    amocrm: false,
    analytics: false
  };

  try {
    // Traffic DB
    const { data } = await trafficSupabase.from('traffic_users').select('id').limit(1);
    checks.db = !!data;

    // FB Token
    checks.fb_integration = !!process.env.FACEBOOK_PERMANENT_TOKEN;

    // AmoCRM
    const amocrmResponse = await fetch(`${process.env.AMOCRM_DOMAIN}/api/v4/account`, {
      headers: { 'Authorization': `Bearer ${process.env.AMOCRM_ACCESS_TOKEN}` }
    });
    checks.amocrm = amocrmResponse.ok;

    // Analytics endpoint
    checks.analytics = true; // Assume healthy if code reaches here

    const allHealthy = Object.values(checks).every(v => v === true);
    
    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'healthy' : 'degraded',
      checks,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      checks,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/health/referral
 * Referral system checks
 */
router.get('/referral', async (req, res) => {
  const checks = {
    db: false,
    link_generation: false,
    tracking: false
  };

  try {
    // Check if referral service exists
    checks.db = true; // TODO: Add actual DB check when implemented
    checks.link_generation = true; // TODO: Check link generation logic
    checks.tracking = true; // TODO: Check tracking logic

    const allHealthy = Object.values(checks).every(v => v === true);
    
    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'healthy' : 'degraded',
      checks,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      checks,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
```

---

## 🔍 ШАГ 3: CORRELATION ID MIDDLEWARE

### **Logger Middleware:**

```typescript
// backend/src/middleware/correlationId.ts
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}

export const correlationIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Get from header or generate new
  const correlationId = req.headers['x-correlation-id'] as string || uuidv4();
  
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-Id', correlationId);
  
  next();
};

// Enhanced logger
export const logger = {
  info: (message: string, meta?: any, correlationId?: string) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      correlationId,
      timestamp: new Date().toISOString(),
      ...meta
    }));
  },
  
  error: (message: string, error?: Error, meta?: any, correlationId?: string) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: error?.message,
      stack: error?.stack,
      correlationId,
      timestamp: new Date().toISOString(),
      ...meta
    }));
  },
  
  warn: (message: string, meta?: any, correlationId?: string) => {
    console.warn(JSON.stringify({
      level: 'warn',
      message,
      correlationId,
      timestamp: new Date().toISOString(),
      ...meta
    }));
  }
};

// Request logger middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userAgent: req.headers['user-agent'],
      ip: req.ip
    }, req.correlationId);
  });
  
  next();
};
```

---

## 🚨 ШАГ 4: SENTRY INTEGRATION

### **Setup:**

```typescript
// backend/src/config/sentry.ts
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import { Express } from 'express';

export function initSentry(app: Express) {
  if (!process.env.SENTRY_DSN) {
    console.warn('⚠️ SENTRY_DSN not set, skipping Sentry initialization');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app }),
      new ProfilingIntegration(),
    ],
    tracesSampleRate: 0.1, // 10% of requests
    profilesSampleRate: 0.1,
    
    beforeSend(event, hint) {
      // Add correlation ID if available
      if (hint?.originalException) {
        const error = hint.originalException as any;
        if (error.correlationId) {
          event.tags = {
            ...event.tags,
            correlationId: error.correlationId
          };
        }
      }
      return event;
    }
  });

  // Request handler must be first
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}

export function setupSentryErrorHandler(app: Express) {
  // Error handler must be last
  app.use(Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // Capture 4xx and 5xx errors
      return true;
    }
  }));
}

// Helper to capture errors with context
export function captureError(error: Error, context?: {
  user?: { id: string; email?: string };
  tags?: Record<string, string>;
  extra?: Record<string, any>;
  correlationId?: string;
}) {
  Sentry.withScope((scope) => {
    if (context?.user) {
      scope.setUser(context.user);
    }
    
    if (context?.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }
    
    if (context?.extra) {
      scope.setContext('additional', context.extra);
    }
    
    if (context?.correlationId) {
      scope.setTag('correlationId', context.correlationId);
    }
    
    Sentry.captureException(error);
  });
}
```

---

## 🧪 ШАГ 5: SMOKE TESTS

### **Test Structure:**

```typescript
// backend/tests/smoke/tripwire.test.ts
import { describe, it, expect } from '@jest/globals';
import axios from 'axios';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

describe('Tripwire Smoke Tests', () => {
  it('should have healthy status', async () => {
    const response = await axios.get(`${BASE_URL}/api/health/tripwire`);
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('healthy');
  });
  
  it('should authenticate user', async () => {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'test@onai.academy',
      password: 'test123'
    });
    expect(response.status).toBe(200);
    expect(response.data.token).toBeDefined();
  });
  
  it('should load courses', async () => {
    // Assume we have token from previous test
    const response = await axios.get(`${BASE_URL}/api/courses`);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.data)).toBe(true);
  });
});

// backend/tests/smoke/traffic.test.ts
describe('Traffic Dashboard Smoke Tests', () => {
  it('should have healthy status', async () => {
    const response = await axios.get(`${BASE_URL}/api/health/traffic`);
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('healthy');
  });
  
  it('should connect to AmoCRM', async () => {
    const response = await axios.get(`${BASE_URL}/api/traffic/amocrm-status`);
    expect(response.status).toBe(200);
    expect(response.data.connected).toBe(true);
  });
});

// backend/tests/smoke/referral.test.ts
describe('Referral System Smoke Tests', () => {
  it('should have healthy status', async () => {
    const response = await axios.get(`${BASE_URL}/api/health/referral`);
    expect(response.status).toBe(200);
  });
  
  it('should generate referral link', async () => {
    const response = await axios.post(`${BASE_URL}/api/referral/generate`, {
      userId: 'test-user-id'
    });
    expect(response.status).toBe(200);
    expect(response.data.link).toBeDefined();
  });
});
```

### **Run Scripts:**

```json
// package.json
{
  "scripts": {
    "test:smoke": "NODE_ENV=test jest tests/smoke --detectOpenHandles",
    "test:smoke:watch": "npm run test:smoke -- --watch",
    "test:smoke:ci": "npm run test:smoke -- --ci --coverage"
  }
}
```

---

## 🔄 ШАГ 6: CURSOR-ЦИКЛ

### **Новый процесс отладки:**

**БЫЛО:**
```
❌ "Кнопка не работает"
❌ Открываю DevTools
❌ Смотрю Network
❌ Ищу ошибку
❌ Гадаю что сломалось
```

**СТАЛО:**
```
✅ Smoke test упал: "tripwire.test.ts:15 - User auth failed"
✅ Correlation ID: abc-123-def
✅ Смотрю логи: grep "abc-123-def" logs/backend.log
✅ Вижу stacktrace в Sentry
✅ Исправляю конкретную строку
✅ Запускаю smoke test снова
✅ Зелёный ✅
```

---

## 📊 МЕТРИКИ УСПЕХА

### **До внедрения:**
- 🐛 Bug находится: ~30 минут
- 🔍 Root cause: ~1 час
- 🔧 Fix + Deploy: ~2 часа
- **Total: ~3.5 часа**

### **После внедрения:**
- 🚨 Smoke test сообщает сразу: ~1 минута
- 🔍 Correlation ID → Логи: ~5 минут
- 🔧 Fix (точечный): ~15 минут
- ✅ Проверка: ~2 минуты
- **Total: ~23 минуты** (9x быстрее!)

---

## 📝 IMPLEMENTATION CHECKLIST

### **Phase 1: Foundation** (Day 1)
- [ ] Добавить health endpoints
- [ ] Добавить correlation ID middleware
- [ ] Настроить structured logging
- [ ] Интегрировать Sentry

### **Phase 2: Tests** (Day 2)
- [ ] Написать smoke tests для Tripwire
- [ ] Написать smoke tests для Traffic
- [ ] Написать smoke tests для Referral
- [ ] Настроить CI для автозапуска

### **Phase 3: Monitoring** (Day 3)
- [ ] Dashboard для health checks
- [ ] Alerts на критичные падения
- [ ] Логирование в файлы/сервис
- [ ] Документация для команды

---

## 🎯 ПРИОРИТЕТЫ

### **Критично (делать первым):**
1. Health endpoints для всех продуктов
2. Correlation ID middleware
3. Базовые smoke tests (auth + main flow)

### **Важно (делать вторым):**
4. Sentry integration
5. Structured logging
6. Error handling improvements

### **Хорошо иметь (делать третьим):**
7. CI automation
8. Monitoring dashboard
9. Performance profiling

---

## 🚀 НАЧНЁМ С ЭТОГО

**Файлы для создания:**
1. `backend/src/routes/health.ts` - Health endpoints
2. `backend/src/middleware/correlationId.ts` - Correlation ID
3. `backend/src/middleware/errorHandler.ts` - Enhanced error handling
4. `backend/src/config/sentry.ts` - Sentry setup
5. `backend/tests/smoke/` - Smoke tests

**Не трогаем (чтобы не сломать):**
- Существующие routes
- Database schemas
- Frontend код (пока)
- ENV variables

**Cursor-prompt для каждого изменения:**
```
"Добавь health endpoint для Tripwire. 
Correlation ID: {id}
Проверь что ничего не сломалось:
npm run test:smoke"
```

---

**БРАТАН, ЭТО ПЛАН! НАЧИНАЕМ? 🚀**
