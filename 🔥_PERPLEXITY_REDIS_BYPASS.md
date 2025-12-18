# 🔥 ЗАПРОС ДЛЯ PERPLEXITY: Redis блокирует Telegram бота

## 🎯 СИТУАЦИЯ

### ✅ ЧТО РАБОТАЕТ:
1. **AmoCRM интеграция** - использует BullMQ + Redis для очередей ✅
2. **Redis защищен** - ограничение 10 попыток подключения, работает стабильно ✅
3. **Backend API** - основной функционал работает ✅

### ❌ ЧТО НЕ РАБОТАЕТ:
**Telegram Leads Bot** - не отвечает на запросы, endpoints зависают

---

## 🔬 ДИАГНОСТИКА

### Симптомы:
```bash
# Redis пытается подключиться 10 раз и останавливается
Redis retry 1/10 in 100ms
Redis retry 2/10 in 200ms
...
Redis retry 10/10 in 1000ms
❌ Redis: Max connection attempts reached (10). Stopping retries.
⚠️ Server will continue without Redis.

# Сервер запускается
🚀 Backend API запущен на http://localhost:3000

# НО Telegram endpoints НЕ отвечают
GET /api/telegram-leads/health  ← запрос доходит
[timeout after 30 seconds]  ← ответа нет
```

### Текущая конфигурация Redis:

```typescript
// backend/src/config/redis.ts
export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,
  lazyConnect: true,
  retryStrategy: (times) => {
    if (times > 10) {
      logger.error('Max attempts reached (10). Stopping.');
      return null; // Останавливаем попытки
    }
    const delay = Math.min(times * 100, 2000);
    return delay;
  },
});

// Попытка подключения в фоне
redis.connect().then(() => {
  redisConnected = true;
}).catch((err) => {
  redisConnected = false;
  logger.warn('Redis not available, server will work without it');
});
```

### Проблема в server.ts:

```typescript
// backend/src/server.ts
const server = app.listen(PORT, async () => {
  console.log('🚀 Backend API запущен');
  
  // ⚠️ ВОТ ПРОБЛЕМА - await блокирует HTTP обработку!
  await recoverPendingNotifications();  // Делает запросы к Supabase
  
  startNotificationScheduler();
  startReminderScheduler();
  startAIMentorScheduler();
  startAIAnalyticsScheduler();
});
```

**Причина:** `await recoverPendingNotifications()` зависает, потому что внутри делает Supabase запросы, которые не возвращаются.

---

## ❓ ВОПРОСЫ ДЛЯ PERPLEXITY

### Главный вопрос:
**Как изолировать Telegram бота от Redis, чтобы Redis работал для AmoCRM (BullMQ), но НЕ влиял на Telegram бота?**

### Конкретные вопросы:

#### 1. **Разделение Redis подключений**
- Можно ли создать ДВА независимых Redis клиента?
  - Один для BullMQ (AmoCRM очереди)
  - Другой для Telegram бота (или вообще без Redis)
- Как сделать чтобы падение одного не влияло на другой?

#### 2. **Telegram бот БЕЗ Redis**
- Нужен ли Redis для `node-telegram-bot-api`?
- Можно ли Telegram бот работать полностью автономно?
- Какие зависимости бота от Redis (если есть)?

#### 3. **await в app.listen() callback**
- Почему `await recoverPendingNotifications()` в `app.listen()` блокирует HTTP?
- `app.listen()` callback выполняется ДО или ПОСЛЕ начала приема запросов?
- Правильный паттерн для background tasks в Express.js?

#### 4. **BullMQ optional Redis**
- Как сделать BullMQ полностью опциональным?
- Если Redis недоступен - как отключить BullMQ но оставить остальное?
- Fallback стратегия без Redis для AmoCRM sync?

#### 5. **Production-ready решение**
```typescript
// Желаемая архитектура:

// 1. Redis для AmoCRM (опционально)
const amocrmRedis = initRedisForAmoCRM();

// 2. Telegram бот (независимо от Redis)
const telegramBot = initTelegramBot();

// 3. Express сервер (запускается ВСЕГДА)
app.listen(PORT, () => {
  console.log('Server started');
  
  // Background tasks НЕ блокируют HTTP
  initBackgroundTasks();
});
```

Как правильно реализовать такую архитектуру?

---

## 📋 ТРЕБОВАНИЯ К РЕШЕНИЮ

### Must Have:
1. ✅ Redis работает для AmoCRM BullMQ очередей
2. ✅ Telegram бот работает НЕЗАВИСИМО от Redis
3. ✅ Если Redis недоступен - AmoCRM sync отключается, но бот работает
4. ✅ Express сервер отвечает на запросы сразу после запуска
5. ✅ Никаких блокировок event loop

### Nice to Have:
- Graceful degradation для всех сервисов
- Healthcheck показывает статус каждого компонента отдельно
- Логи показывают какой сервис упал, а какой работает

---

## 🗂️ СТРУКТУРА ПРОЕКТА

```
backend/
├── src/
│   ├── config/
│   │   └── redis.ts          # Общий Redis (сейчас блокирует)
│   ├── routes/
│   │   ├── telegram-leads.ts  # Telegram бот (не работает)
│   │   └── landing.ts         # AmoCRM sync (работает)
│   ├── queues/
│   │   └── amocrmSyncQueue.ts # BullMQ очередь (нужен Redis)
│   └── server.ts              # Express app (await блокирует)
```

### Зависимости:
- `ioredis` - для Redis
- `bullmq` - для очередей (требует Redis)
- `node-telegram-bot-api` - для Telegram бота
- `@supabase/supabase-js` - для БД

---

## 💡 ВОЗМОЖНЫЕ ПОДХОДЫ (нужна экспертиза)

### Вариант 1: Два Redis клиента
```typescript
// Для AmoCRM (критичный)
const amocrmRedis = new Redis({ /* строгие настройки */ });

// Для Telegram (некритичный, может быть null)
const telegramRedis = new Redis({ /* мягкие настройки */ }) || null;

// Telegram бот работает без Redis
const bot = new TelegramBot(TOKEN, { polling: true });
```

### Вариант 2: Telegram бот в отдельном процессе
```typescript
// Запустить Telegram бота как отдельный процесс
// Не зависит от основного сервера и Redis
```

### Вариант 3: setImmediate для background tasks
```typescript
app.listen(PORT, () => {
  console.log('Server started');
  
  // НЕ БЛОКИРУЕМ
  setImmediate(async () => {
    await recoverPendingNotifications();
    startSchedulers();
  });
});
```

**Какой подход правильный для production?**

---

## 🔍 ЧТО ИСКАТЬ

Поисковые запросы для Perplexity:

1. **"Express app.listen callback blocking HTTP requests"**
2. **"BullMQ optional Redis graceful degradation"**
3. **"node-telegram-bot-api without Redis"**
4. **"Multiple Redis clients for different services Node.js"**
5. **"Background tasks in Express.js non-blocking"**
6. **"Isolate Telegram bot from Redis connection"**

---

## 📊 КОНТЕКСТ

### Environment:
- Node.js v22.17.0
- TypeScript
- macOS (development)
- Redis НЕ установлен локально (для development)
- Production: Redis будет доступен

### Приоритет:
🔴 **КРИТИЧЕСКИЙ** - Telegram бот не работает, лиды не приходят

### Цель:
Получить working solution где:
- AmoCRM sync + BullMQ + Redis работают вместе ✅
- Telegram бот работает независимо ✅
- Сервер отвечает на запросы мгновенно ✅

---

## 🎯 ОЖИДАЕМЫЙ ОТВЕТ

### Формат ответа от Perplexity:

1. **Root Cause Analysis**
   - Почему именно Redis блокирует Telegram бота?
   - Где точно происходит блокировка?

2. **Production Solution**
   - Code examples с полной изоляцией
   - Паттерны из реальных production проектов
   - Best practices для multi-service Node.js apps

3. **Migration Steps**
   - Как перейти от текущего состояния к рабочему?
   - Какие файлы изменить?
   - Как протестировать?

4. **Monitoring**
   - Как мониторить каждый сервис отдельно?
   - Healthcheck для Redis + Telegram + AmoCRM

---

**ВАЖНО:** Решение должно быть production-ready и работать как с Redis (production), так и без него (development). ⚡






