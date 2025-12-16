# 🔍 ЗАПРОС ДЛЯ PERPLEXITY: Tripwire PostgreSQL Connection Pool Fix

## 📋 КОНТЕКСТ ПРОБЛЕМЫ

### Текущая Архитектура
- **Platform**: Node.js/Express backend с TypeScript
- **Database**: Supabase PostgreSQL (отдельный проект для Tripwire)
- **Connection Methods**: 
  1. Supabase JS Client (`@supabase/supabase-js`) - работает ✅
  2. Direct PostgreSQL Pool (`pg` library) - НЕ работает ❌

### Проблема
Sales Manager Dashboard не загружается, все API endpoints висят. В логах:

```
✅ Tripwire Pool initialized
   Max connections: 20
   SSL: enabled
❌ Failed to connect to Tripwire database: Tenant or user not found
```

### Текущая Конфигурация

**Connection String в env.env:**
```
TRIPWIRE_DATABASE_URL=postgresql://postgres.pjmvxecykysfrzppdcto:RM8O6L2XN9XG7HI9@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

**Pool Configuration (tripwire-pool.ts):**
```typescript
import { Pool } from 'pg';

const connectionString = process.env.TRIPWIRE_DATABASE_URL!;

export const tripwirePool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false, // Supabase требует SSL
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection on startup
tripwirePool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Failed to connect to Tripwire database:', err.message);
    return;
  }
  console.log('✅ Tripwire database connection successful');
  release();
});
```

**Error Details:**
- Error message: "Tenant or user not found"
- Происходит при `tripwirePool.connect()` во время startup
- Supabase JS Client с теми же credentials работает нормально
- Project ID: `pjmvxecykysfrzppdcto`
- Region: `aws-0-eu-central-1`

### Что Работает
✅ Supabase JS Client подключается успешно:
```typescript
import { createClient } from '@supabase/supabase-js';

export const tripwireAdminSupabase = createClient(
  process.env.TRIPWIRE_SUPABASE_URL!, // https://pjmvxecykysfrzppdcto.supabase.co
  process.env.TRIPWIRE_SERVICE_ROLE_KEY! // eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
);
```

### Что НЕ Работает
❌ Direct PostgreSQL Pool не может подключиться с ошибкой "Tenant or user not found"

### Критичные Функции (используют Pool)
1. `createTripwireUser()` - создание студентов (ACID транзакции)
2. `getTripwireUsers()` - список студентов с пагинацией
3. `getTripwireStats()` - статистика для менеджера
4. `getSalesLeaderboard()` - рейтинг менеджеров
5. `getSalesChartData()` - данные для графиков
6. `deleteTripwireUser()` - удаление студента

**Все эти функции используют:**
```typescript
const client = await tripwirePool.connect();
try {
  await client.query('BEGIN');
  // ... SQL queries with ACID guarantees
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

## ❓ ВОПРОСЫ ДЛЯ PERPLEXITY

### 1. Диагностика Connection String
**Вопрос:** Как правильно получить актуальный PostgreSQL connection string для Supabase в 2025 году?

**Детали:**
- У нас есть Project ID: `pjmvxecykysfrzppdcto`
- Region: `aws-0-eu-central-1`
- Используем pooler на порту `6543`
- Ошибка "Tenant or user not found" указывает на что?

**Что нужно:**
- Правильный формат connection string для Supabase Pooler
- Где найти актуальный пароль в Supabase Dashboard (Settings > Database > ?)
- Нужен ли Transaction Mode или Session Mode для pooler?

### 2. Best Practice для Supabase + Node.js
**Вопрос:** Какой лучший подход для работы с Supabase PostgreSQL в Node.js/Express приложении в 2025?

**Наши требования:**
- ✅ ACID транзакции (для создания пользователей)
- ✅ Быстрая загрузка списков студентов (пагинация 20 записей)
- ✅ Статистика в real-time для Sales Dashboard
- ✅ Connection pooling (20 concurrent connections)
- ✅ Low latency (<100ms для простых запросов)

**Варианты:**
1. **Supabase JS Client** - текущий работает, но как делать транзакции?
2. **pg.Pool** - не подключается, как пофиксить?
3. **Prisma** - стоит ли мигрировать?
4. **PostgREST RPC** - достаточно ли быстро для dashboard?

**Конкретно нужно:**
- Best practice для ACID транзакций через Supabase JS Client
- Как избежать PostgREST/Kong cache для real-time данных?
- Нужен ли прямой Postgres Pool вообще, или Supabase RPC достаточно?

### 3. Migration Strategy
**Вопрос:** Как быстро мигрировать с broken pg.Pool на рабочее решение?

**Текущая ситуация:**
- 5 критичных функций используют `tripwirePool.connect()`
- Продакшн запускается через пару часов
- Нужно протестировать локально СЕЙЧАС

**Варианты миграции:**
A. **Быстрый фикс**: Заменить все `tripwirePool` на `tripwireAdminSupabase.rpc()`
B. **Средний фикс**: Пофиксить connection string и оставить Pool
C. **Долгий фикс**: Мигрировать на Prisma + правильный pooling

**Что нужно:**
- Пошаговый план для варианта A (чтобы работало СЕЙЧАС)
- Код примеры замены Pool transactions на Supabase RPC
- Какие RPC функции нужны для замены прямых SQL queries?

### 4. Supabase RPC для ACID Transactions
**Вопрос:** Как реализовать ACID транзакции через Supabase RPC вместо прямого Postgres Pool?

**Пример текущей функции:**
```typescript
export async function createTripwireUser(params) {
  const client = await tripwirePool.connect();
  try {
    await client.query('BEGIN');
    
    // INSERT в 5 таблиц:
    await client.query('INSERT INTO public.users ...');
    await client.query('INSERT INTO public.tripwire_users ...');
    await client.query('INSERT INTO public.tripwire_user_profile ...');
    await client.query('INSERT INTO public.user_achievements ...');
    await client.query('INSERT INTO public.module_unlocks ...');
    
    await client.query('COMMIT');
    return { success: true };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

**Вопросы:**
- Как создать PostgreSQL RPC функцию для этой транзакции?
- Пример CREATE FUNCTION для multi-table INSERT с ACID
- Как вызывать эту RPC через `tripwireAdminSupabase.rpc()`?
- Performance implications: RPC vs Direct Pool?

### 5. Connection Pooling Best Practices
**Вопрос:** Правильная конфигурация connection pool для Supabase в production?

**Наши параметры:**
```typescript
{
  max: 20,                      // ❓ Правильное значение?
  idleTimeoutMillis: 30000,     // ❓ Оптимально?
  connectionTimeoutMillis: 2000, // ❓ Не слишком мало?
}
```

**Детали:**
- Expected concurrent users: ~50 sales managers
- Expected API requests: ~100 req/min during peak hours
- Database operations: 80% reads, 20% writes
- Region: Backend на Digital Ocean (Frankfurt), Supabase на AWS eu-central-1

**Нужно:**
- Оптимальные значения для Pool config
- Нужен ли PgBouncer/Pooler mode (Transaction vs Session)?
- Как проверить что pooler работает правильно?

## 🎯 КОНКРЕТНЫЕ ВЫХОДНЫЕ ДАННЫЕ

Нужны:
1. ✅ **Рабочий connection string** для Supabase PostgreSQL pooler
2. ✅ **Код примеры** замены Pool на Supabase RPC для всех 5 функций
3. ✅ **PostgreSQL RPC функции** (CREATE FUNCTION) для ACID транзакций
4. ✅ **Пошаговая инструкция** как получить правильный пароль из Supabase Dashboard
5. ✅ **Best practices** для Supabase + Node.js в 2025 году

## 📊 ДОПОЛНИТЕЛЬНЫЙ КОНТЕКСТ

### Текущий Stack
- **Frontend**: React + Vite (localhost:8080)
- **Backend**: Node.js 20 + Express + TypeScript (localhost:3000)
- **Database**: Supabase PostgreSQL (pjmvxecykysfrzppdcto)
- **Deployment**: Digital Ocean Droplet (Frankfurt region)
- **Libraries**: `pg` v8.x, `@supabase/supabase-js` v2.x

### Environment Variables
```bash
# Supabase Tripwire (работает ✅)
TRIPWIRE_SUPABASE_URL=https://pjmvxecykysfrzppdcto.supabase.co
TRIPWIRE_SERVICE_ROLE_KEY=eyJhbGci...Lf3VgWyk
TRIPWIRE_JWT_SECRET=pjmvxecykysfrzppdcto-jwt-secret-key-2024-production

# PostgreSQL Direct (не работает ❌)
TRIPWIRE_DATABASE_URL=postgresql://postgres.pjmvxecykysfrzppdcto:RM8O6L2XN9XG7HI9@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

### Supabase Project Info
- **Project Name**: "Tripwire"
- **Project ID**: `pjmvxecykysfrzppdcto`
- **Region**: `eu-central-1` (Frankfurt)
- **Organization**: onAI Academy
- **Pricing Plan**: Pro Plan (для production-ready pooling)

## 🚀 СРОЧНОСТЬ

**Дедлайн**: Продакшн запуск через 2-3 часа!

**Приоритеты:**
1. 🔥 **CRITICAL**: Получить рабочее решение СЕЙЧАС (временный фикс OK)
2. ⚡ **HIGH**: Best practices для production deploy
3. 📚 **MEDIUM**: Long-term архитектурные рекомендации

---

## 💡 ЗАПРОС ДЛЯ КОПИРОВАНИЯ В PERPLEXITY

```
I need urgent help with Supabase PostgreSQL connection pool in Node.js. 

ERROR: "Tenant or user not found" when using pg.Pool with this connection string:
postgresql://postgres.pjmvxecykysfrzppdcto:RM8O6L2XN9XG7HI9@aws-0-eu-central-1.pooler.supabase.com:6543/postgres

Supabase JS Client works fine with same credentials. Project ID: pjmvxecykysfrzppdcto, Region: eu-central-1.

Questions:
1. How to get correct PostgreSQL connection string for Supabase in 2025? (Settings > Database > ?)
2. Best practice: pg.Pool vs Supabase JS Client vs PostgREST RPC for ACID transactions?
3. How to implement ACID multi-table INSERT via Supabase RPC instead of direct Pool?
4. Example code: migrating from tripwirePool.connect() to tripwireAdminSupabase.rpc()
5. Optimal Pool config for 50 concurrent users, 100 req/min, 80% reads?

Need working solution NOW (production launch in 2-3 hours). Temporary fix acceptable.

Current stack: Node.js 20, Express, TypeScript, pg v8, @supabase/supabase-js v2, Supabase Pro Plan.

Requirements: ACID transactions, low latency (<100ms), connection pooling (20 connections), real-time dashboard data.
```

---

## 📝 ЗАМЕТКИ

- Supabase JWT токен работает ✅
- Supabase RLS policies настроены ✅
- Service role key валидный ✅
- Только прямое Postgres Pool подключение не работает ❌

**Гипотезы:**
1. ❓ Пароль в `TRIPWIRE_DATABASE_URL` устарел (где взять актуальный?)
2. ❓ Неправильный формат username для pooler (нужен префикс?)
3. ❓ Pooler mode неправильный (Transaction vs Session)?
4. ❓ SSL config неправильный (rejectUnauthorized: false недостаточно?)
5. ❓ Port 6543 требует другой authentication method?
