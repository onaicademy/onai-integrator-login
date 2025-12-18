# 🔴 SENTRY CRASH REPORT - ПОЛНЫЙ АНАЛИЗ И РЕШЕНИЕ

**Дата инцидента:** 16 декабря 2024  
**Критичность:** 🔥 CRITICAL (Backend полностью недоступен)  
**Продолжительность простоя:** ~30 минут  
**Затронутые системы:** Backend API, все студенты Tripwire

---

## 📋 СОДЕРЖАНИЕ

1. [Симптомы проблемы](#симптомы-проблемы)
2. [Корневая причина](#корневая-причина)
3. [Архитектура Sentry](#архитектура-sentry)
4. [Наши ошибки](#наши-ошибки)
5. [Правильная установка](#правильная-установка)
6. [Рекомендации](#рекомендации)
7. [План действий](#план-действий)

---

## 🚨 СИМПТОМЫ ПРОБЛЕМЫ

### Что произошло:

```bash
# PM2 Status
┌────┬──────────────┬─────────┬──────────┬────────┬──────┬───────────┐
│ id │ name         │ mode    │ pid      │ uptime │ ↺    │ status    │
├────┼──────────────┼─────────┼──────────┼────────┼──────┼───────────┤
│ 0  │ onai-backend │ cluster │ 0        │ 0      │ 18   │ waiting … │
└────┴──────────────┴─────────┴──────────┴────────┴──────┴───────────┘
```

**Ключевые индикаторы:**
- ✅ PM2 перезапустился **18 раз подряд**
- ✅ `pid: 0` - процесс не запускается
- ✅ `uptime: 0` - backend мгновенно падает
- ✅ Nginx возвращает **502 Bad Gateway**
- ✅ Frontend выдает **CORS errors** (backend не отвечает)

### Логи ошибки:

```javascript
{"level":60,"time":1765902041864,"pid":119324,"hostname":"oAPBackand","msg":"🔥 UNCAUGHT EXCEPTION:"}

TypeError: Cannot read properties of undefined (reading 'Http')
    at initSentry (/var/www/onai-integrator-login-main/backend/src/config/sentry.ts:35:31)
    at shortLinksRouter (/var/www/onai-integrator-login-main/backend/src/server.ts:136:1)
    at Object.<anonymous> (/var/www/onai-integrator-login-main/backend/src/server.ts:548:16)
```

**Критическая строка:** `sentry.ts:35` → `new Sentry.Integrations.Http({ tracing: true })`

---

## 🔍 КОРНЕВАЯ ПРИЧИНА

### Проблема #1: Устаревший API Sentry

**Наш код (НЕПРАВИЛЬНО):**

```typescript
// ❌ Sentry v8+ НЕ ПОДДЕРЖИВАЕТ этот синтаксис!
integrations: [
  new Sentry.Integrations.Http({ tracing: true }),      // ❌ Sentry.Integrations = undefined
  new Sentry.Integrations.Express({ app }),             // ❌ Крашит backend!
  new ProfilingIntegration(),
],
```

**Почему это произошло:**

1. **Sentry v8.0.0 (май 2024)** - Breaking change в API
2. **Sentry v10.30.0 (наша версия)** - `Integrations` namespace удалён полностью
3. **Старая документация** - мы использовали код из v7.x

**Что изменилось:**

| Версия | API | Статус |
|--------|-----|--------|
| Sentry v7.x | `new Sentry.Integrations.Http()` | ✅ Работало |
| Sentry v8.x | `Sentry.httpIntegration()` | ✅ Новый API |
| Sentry v10.x | `Sentry.httpIntegration()` | ✅ Только новый API |

### Проблема #2: Порядок инициализации

**Crash на старте приложения:**

```typescript
// server.ts
import { initSentry } from './config/sentry';

const app = express();

// ❌ Sentry инициализируется ДО импорта роутов
initSentry(app);  // 👈 ЗДЕСЬ КРАШИТСЯ, потому что Sentry.Integrations = undefined

// Роуты никогда не загружаются
import './routes/tripwire-lessons';  // 👈 НИКОГДА НЕ ВЫПОЛНИТСЯ
```

**Результат:**
- Backend падает на строке `initSentry(app)`
- PM2 пытается перезапустить
- Процесс повторяется → 18 рестартов
- Система недоступна

---

## 🏗️ АРХИТЕКТУРА SENTRY

### Что такое Sentry?

**Sentry** - это платформа для мониторинга ошибок и производительности приложений в реальном времени.

### Компоненты Sentry:

```
┌─────────────────────────────────────────────────────────────┐
│                    YOUR APPLICATION                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  @sentry/node  (SDK)                                 │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │  1. Sentry.init() - Инициализация             │  │   │
│  │  │  2. Integrations - Автоматический сбор данных  │  │   │
│  │  │  3. Handlers - Middleware для Express          │  │   │
│  │  │  4. Breadcrumbs - Логи событий                 │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              SENTRY CLOUD (sentry.io)                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  - Error aggregation                                 │   │
│  │  - Performance monitoring                            │   │
│  │  - Alerts & notifications                            │   │
│  │  - Dashboard & analytics                             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Integrations - что это?

**Integrations** - это плагины, которые автоматически собирают данные из разных источников:

| Integration | Что отслеживает | Как работает |
|-------------|-----------------|--------------|
| `httpIntegration()` | HTTP запросы | Перехватывает `http.request()` |
| `expressIntegration()` | Express middleware | Обёртка вокруг `app.use()` |
| `nodeProfilingIntegration()` | CPU/Memory | Сэмплирование профиля |
| `postgresIntegration()` | SQL queries | Перехватывает pg-pool |
| `redisIntegration()` | Redis commands | Перехватывает ioredis |

### Порядок инициализации (КРИТИЧНО!):

```typescript
// ✅ ПРАВИЛЬНЫЙ ПОРЯДОК:

// 1. Import Sentry FIRST
import * as Sentry from '@sentry/node';

// 2. Initialize BEFORE anything else
Sentry.init({
  dsn: '...',
  integrations: [...],
});

// 3. Import Express AFTER Sentry
import express from 'express';
const app = express();

// 4. Add Sentry middleware FIRST
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// 5. Your routes
app.use('/api', routes);

// 6. Error handler LAST
app.use(Sentry.Handlers.errorHandler());
```

---

## ❌ НАШИ ОШИБКИ

### Ошибка #1: Использовали устаревший API

**Где косячили:**

```typescript
// src/config/sentry.ts:39
new Sentry.Integrations.Http({ tracing: true })  // ❌ НЕ СУЩЕСТВУЕТ в v10.x!
```

**Правильно:**

```typescript
Sentry.httpIntegration()  // ✅ Новый API
```

### Ошибка #2: Не проверили совместимость версий

**package.json:**

```json
{
  "@sentry/node": "^10.30.0",           // ✅ Установлена новая версия
  "@sentry/profiling-node": "^10.30.0"  // ✅ Но код для v7.x!
}
```

**Проблема:** Мы обновили пакет, но **не обновили код!**

### Ошибка #3: Не тестировали на production

**Последовательность событий:**

1. ✅ Написали код для Sentry (с устаревшим API)
2. ✅ Добавили в `.env`: `SENTRY_DSN=placeholder` (пустой)
3. ✅ На localhost **НЕ инициализировался** (нет DSN)
4. ❌ На production **ЕСТЬ DSN** → Sentry инициализируется → **КРАШ!**

**Урок:** Код работал локально, потому что **Sentry был отключен!**

### Ошибка #4: Отсутствие error handling

```typescript
// ❌ НЕТ try-catch!
export const initSentry = (app: Express) => {
  Sentry.init({
    integrations: [
      new Sentry.Integrations.Http()  // 💥 КРАШИТ ВЕСЬ BACKEND!
    ]
  });
};
```

**Правильно:**

```typescript
// ✅ С защитой от падения
export const initSentry = (app: Express) => {
  try {
    Sentry.init({
      integrations: [
        Sentry.httpIntegration()  // ✅ Правильный API
      ]
    });
  } catch (error) {
    console.error('❌ Sentry initialization failed:', error);
    // Backend продолжает работать!
  }
};
```

---

## ✅ ПРАВИЛЬНАЯ УСТАНОВКА SENTRY

### Шаг 1: Установка пакетов

```bash
# Удаляем старые версии
npm uninstall @sentry/node @sentry/profiling-node

# Устанавливаем последние версии
npm install @sentry/node@latest @sentry/profiling-node@latest
```

### Шаг 2: Правильная конфигурация

**`backend/src/config/sentry.ts`:**

```typescript
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import type { Express, Request, Response, NextFunction } from 'express';

/**
 * 🛡️ SENTRY CONFIGURATION - Backend Monitoring (v10.x)
 */
export const initSentry = (app: Express) => {
  const sentryDsn = process.env.SENTRY_DSN;

  // ✅ Если DSN не настроен - просто выходим
  if (!sentryDsn || sentryDsn === 'placeholder') {
    console.warn('⚠️ SENTRY_DSN not configured - monitoring disabled');
    return;
  }

  try {
    // ✅ Инициализация с НОВЫМ API (v10.x)
    Sentry.init({
      dsn: sentryDsn,

      // 🏷️ Environment & Release
      environment: process.env.NODE_ENV || 'development',
      release: `backend@${process.env.npm_package_version || '1.0.0'}`,

      // 🎯 Integrations (НОВЫЙ СИНТАКСИС!)
      integrations: [
        // ✅ HTTP requests tracking
        Sentry.httpIntegration(),

        // ✅ Express middleware tracking
        Sentry.expressIntegration({ app }),

        // ✅ Node.js built-ins (fs, crypto, etc.)
        Sentry.nativeNodeFetchIntegration(),

        // ✅ Console logs tracking
        Sentry.consoleIntegration(),

        // ✅ CPU/Memory profiling
        nodeProfilingIntegration(),
      ],

      // 📊 Performance Monitoring
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

      // 📊 Profiling
      profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

      // 🔍 Debug mode (только dev)
      debug: process.env.NODE_ENV !== 'production',

      // 🎯 Фильтрация чувствительных данных
      beforeSend(event, hint) {
        // Удаляем токены и пароли
        if (event.request?.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
        }

        // Удаляем query params с токенами
        if (event.request?.query_string) {
          event.request.query_string = event.request.query_string
            .replace(/token=[^&]*/g, 'token=REDACTED')
            .replace(/password=[^&]*/g, 'password=REDACTED');
        }

        return event;
      },

      // 🎯 Игнорируем ожидаемые ошибки
      ignoreErrors: [
        'ECONNRESET',
        'EPIPE',
        'ETIMEDOUT',
        'Socket closed',
        'AbortError',
      ],
    });

    // ✅ Request handler - ПЕРВЫМ middleware
    app.use(Sentry.Handlers.requestHandler());

    // ✅ Tracing handler - для performance
    app.use(Sentry.Handlers.tracingHandler());

    console.log('✅ Sentry initialized successfully');
    console.log(`   Environment: ${process.env.NODE_ENV}`);
    console.log(`   DSN: ${sentryDsn.substring(0, 30)}...`);
  } catch (error) {
    // ✅ Если Sentry падает - backend продолжает работать!
    console.error('❌ Failed to initialize Sentry:', error);
    console.warn('⚠️ Continuing without error monitoring');
  }
};

/**
 * 🚨 Error handler - ПОСЛЕДНИМ middleware
 */
export const sentryErrorHandler = () => {
  const sentryDsn = process.env.SENTRY_DSN;

  // Если Sentry не настроен - возвращаем простой error handler
  if (!sentryDsn || sentryDsn === 'placeholder') {
    return (err: Error, _req: Request, _res: Response, next: NextFunction) => {
      console.error('❌ Error (Sentry disabled):', err);
      next(err);
    };
  }

  // ✅ Возвращаем Sentry error handler с защитой
  try {
    return Sentry.Handlers.errorHandler({
      shouldHandleError(error) {
        // Отправляем все ошибки в Sentry
        return true;
      },
    });
  } catch (e) {
    console.warn('⚠️ Sentry errorHandler not available, using fallback');
    return (err: Error, _req: Request, _res: Response, next: NextFunction) => {
      console.error('❌ Error (fallback):', err);
      next(err);
    };
  }
};

// Export Sentry для прямого использования
export { Sentry };
```

### Шаг 3: Использование в server.ts

**`backend/src/server.ts`:**

```typescript
import express from 'express';
import { initSentry, sentryErrorHandler } from './config/sentry';

const app = express();

// ✅ 1. Sentry ПЕРВЫМ (до всех middleware)
initSentry(app);

// 2. Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. CORS
app.use(cors());

// 4. Ваши роуты
app.use('/api/tripwire', tripwireRoutes);
app.use('/api/videos', videosRoutes);

// ✅ 5. Sentry error handler ПОСЛЕДНИМ
app.use(sentryErrorHandler());

// 6. Fallback error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
```

### Шаг 4: Environment Variables

**`.env`:**

```bash
# Sentry DSN (получить на sentry.io)
SENTRY_DSN=https://your-dsn@sentry.io/project-id

# ИЛИ оставить пустым для отключения
SENTRY_DSN=placeholder
```

---

## 📊 РЕКОМЕНДАЦИИ

### 1. Мониторинг производительности

**Что отслеживать:**

```typescript
// Медленные API endpoints
if (duration > 3000) {
  Sentry.captureMessage(`Slow endpoint: ${req.path}`, {
    level: 'warning',
    tags: { endpoint: req.path, duration: `${duration}ms` },
  });
}

// Медленные SQL запросы
if (queryDuration > 2000) {
  Sentry.captureMessage('Slow database query', {
    level: 'warning',
    extra: { query, duration: queryDuration },
  });
}

// Высокое потребление памяти
const memoryUsage = process.memoryUsage();
if (memoryUsage.heapUsed > 500 * 1024 * 1024) { // > 500MB
  Sentry.captureMessage('High memory usage', {
    level: 'warning',
    extra: { heapUsed: memoryUsage.heapUsed },
  });
}
```

### 2. Breadcrumbs для debugging

**Добавляйте контекст к ошибкам:**

```typescript
// Перед критической операцией
Sentry.addBreadcrumb({
  category: 'auth',
  message: 'User login attempt',
  level: 'info',
  data: { email: user.email },
});

// Перед SQL запросом
Sentry.addBreadcrumb({
  category: 'database',
  message: 'Executing query',
  level: 'info',
  data: { table: 'tripwire_users', action: 'INSERT' },
});
```

### 3. Alerts & Notifications

**Настройте в Sentry Dashboard:**

- 🚨 **Critical:** Backend недоступен (> 5 ошибок за 1 мин)
- ⚠️ **Warning:** Медленные запросы (> 3s)
- 📊 **Info:** Memory usage > 80%

### 4. Release Tracking

**При каждом deploy:**

```bash
# Создаём release в Sentry
curl https://sentry.io/api/0/organizations/YOUR_ORG/releases/ \
  -X POST \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "version": "backend@1.2.3",
    "projects": ["backend"]
  }'
```

---

## 🎯 ПЛАН ДЕЙСТВИЙ

### Немедленно (сегодня):

- [x] ✅ Временно отключили Sentry (система работает)
- [ ] 📝 Создали детальный отчёт (этот файл)

### Краткосрочно (эта неделя):

- [ ] 🔄 Обновить код Sentry на новый API (v10.x)
- [ ] ✅ Добавить try-catch защиту
- [ ] 🧪 Протестировать на staging/localhost с включенным Sentry
- [ ] 📋 Добавить в CI/CD проверку Sentry DSN

### Среднесрочно (следующая неделя):

- [ ] 🔐 Получить настоящий Sentry DSN (создать проект на sentry.io)
- [ ] 📊 Настроить alerts и уведомления
- [ ] 📈 Добавить custom tracking для критичных операций
- [ ] 📚 Обновить документацию

### Долгосрочно (месяц):

- [ ] 🎯 Интеграция с Slack для уведомлений
- [ ] 📊 Dashboard для мониторинга
- [ ] 🔄 Автоматический rollback при критичных ошибках
- [ ] 📈 Performance budget (автоматические alerts)

---

## 🔒 SECURITY CONSIDERATIONS

### Что НЕ отправлять в Sentry:

❌ **Чувствительные данные:**
- Пароли
- JWT токены
- API ключи
- Credit card data
- Персональные данные (PII)

✅ **Безопасная фильтрация:**

```typescript
beforeSend(event) {
  // Удаляем headers
  if (event.request?.headers) {
    delete event.request.headers['authorization'];
    delete event.request.headers['cookie'];
  }

  // Маскируем email
  if (event.user?.email) {
    event.user.email = event.user.email.replace(/@.*/, '@***');
  }

  // Удаляем query params
  if (event.request?.query_string) {
    event.request.query_string = 'REDACTED';
  }

  return event;
}
```

---

## 📚 ПОЛЕЗНЫЕ ССЫЛКИ

- [Sentry Node.js SDK v10 Docs](https://docs.sentry.io/platforms/node/)
- [Migration Guide v7 → v8](https://docs.sentry.io/platforms/javascript/migration/v7-to-v8/)
- [Express Integration](https://docs.sentry.io/platforms/node/guides/express/)
- [Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Best Practices](https://docs.sentry.io/platforms/node/best-practices/)

---

## 💡 LESSONS LEARNED

### 1. Всегда проверяйте breaking changes при обновлении

**До обновления:**
```bash
# Читаем changelog
npm view @sentry/node versions --json
npm view @sentry/node@10.30.0 --json | grep -A 20 "breaking"
```

### 2. Тестируйте critical dependencies на staging

**Checklist перед production:**
- [ ] Локальное тестирование с включенным feature
- [ ] Staging deploy с monitoring
- [ ] Canary deploy (10% traffic)
- [ ] Full deploy только после подтверждения

### 3. Graceful degradation для monitoring tools

**Правило:** Система мониторинга НЕ должна ломать приложение!

```typescript
// ✅ ПРАВИЛЬНО: try-catch вокруг Sentry
try {
  Sentry.init({ ... });
} catch (e) {
  console.error('Monitoring failed, but app continues');
}

// ❌ НЕПРАВИЛЬНО: без защиты
Sentry.init({ ... });  // 💥 Крашит весь backend!
```

### 4. Feature flags для critical changes

```typescript
const ENABLE_SENTRY = process.env.ENABLE_SENTRY === 'true';

if (ENABLE_SENTRY && process.env.SENTRY_DSN) {
  initSentry(app);
}
```

---

## ✅ CHECKLIST ДЛЯ СЛЕДУЮЩЕГО DEPLOY

Перед каждым production deploy проверяй:

- [ ] Все dependencies обновлены и протестированы?
- [ ] Breaking changes из changelog учтены?
- [ ] Есть rollback plan?
- [ ] Monitoring настроен?
- [ ] Error handling добавлен?
- [ ] Staging deploy успешен?
- [ ] Load testing пройден?
- [ ] Team уведомлена о deploy?
- [ ] Backup создан?
- [ ] Health checks работают?

---

**Автор:** AI Assistant + Engineering Team  
**Дата:** 16 декабря 2024  
**Версия:** 1.0  
**Статус:** ✅ Проблема решена, система работает

---

## 🎓 ВЫВОД

**Sentry - мощный инструмент, НО:**

1. ⚠️ Требует правильной настройки
2. ⚠️ Может сломать приложение при ошибке
3. ⚠️ Нужно следить за breaking changes
4. ⚠️ Критично тестировать на staging

**Golden Rule:**  
> "Инструменты мониторинга должны быть незаметными.  
> Если Sentry крашит backend - это провал архитектуры."

**Наш случай:**  
✅ Быстро диагностировали  
✅ Временно отключили (система работает)  
✅ Создали детальный план  
✅ Извлекли уроки

**Next Steps:**  
🔄 Обновим код на новый API  
🧪 Протестируем на staging  
🚀 Включим с monitoring  
📊 Настроим alerts










