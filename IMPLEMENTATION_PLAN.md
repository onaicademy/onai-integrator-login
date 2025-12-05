# 🚀 ПЛАН ВНЕДРЕНИЯ: TRIPWIRE DIRECT DB ARCHITECTURE

**Дата начала:** 2025-12-05  
**Ожидаемое время:** 5-8 часов  
**Риск:** 🟡 СРЕДНИЙ (есть rollback план)

---

## 📋 PRE-FLIGHT CHECKLIST

### ✅ Подготовка

- [ ] 📖 Прочитан ответ Perplexity (`PERPLEXITY_SOLUTION_DIRECT_DB.md`)
- [ ] 💾 Создан backup текущей БД Tripwire
- [ ] 📁 Сохранен текущий код в `_RPC_VERSION.ts` файлы
- [ ] 🔑 Проверены env переменные:
  - `TRIPWIRE_SUPABASE_URL`
  - `TRIPWIRE_SERVICE_ROLE_KEY`
  - `TRIPWIRE_DATABASE_URL` (для pg.Pool)
- [ ] 🧪 Создана тестовая среда (optional, но рекомендуется)

---

## PHASE 1: BACKUP & PREPARATION (30 минут)

### 1.1. Создать backup текущей базы данных

```bash
# Через Supabase Dashboard:
# Database → Backups → Create backup
# Или через CLI (если есть доступ)
```

**Checklist:**
- [ ] Backup создан
- [ ] Backup размер > 0 MB
- [ ] Записан ID backup для restore

---

### 1.2. Сохранить текущий код (rollback plan)

```bash
# В директории backend/src/services/
cp tripwireManagerService.ts tripwireManagerService_RPC_VERSION_BACKUP_2025_12_05.ts

# В директории backend/src/controllers/
cp tripwireManagerController.ts tripwireManagerController_RPC_VERSION_BACKUP_2025_12_05.ts
```

**Checklist:**
- [ ] Backup файлы созданы
- [ ] Можно откатиться если что-то пойдет не так

---

### 1.3. Создать новую ветку в Git

```bash
git checkout -b feature/tripwire-direct-db-architecture
git add -A
git commit -m "chore: backup before migrating to Direct DB architecture"
```

**Checklist:**
- [ ] Ветка создана
- [ ] Текущий код закоммичен

---

## PHASE 2: DATABASE MIGRATION (1 час)

### 2.1. Создать SQL миграцию

**Файл:** `supabase/migrations/20251205_tripwire_direct_db_v2.sql`

```sql
-- ============================================
-- TRIPWIRE DIRECT DB ARCHITECTURE v2.0
-- Date: 2025-12-05
-- Based on: Perplexity Research
-- ============================================

-- Скопировать полный SQL из PERPLEXITY_SOLUTION_DIRECT_DB.md
-- Секции:
-- 1. CREATE TABLES (с индексами и constraints)
-- 2. CREATE INDEXES (GIN, Composite, Partial)
-- 3. CREATE TRIGGERS (для updated_at)
-- 4. CREATE EVENT TRIGGER (для auto schema reload)
-- 5. CREATE RPC FUNCTIONS (для статистики)
```

**Checklist:**
- [ ] SQL файл создан
- [ ] Все таблицы включены
- [ ] Все индексы включены
- [ ] RPC функции включены

---

### 2.2. Применить миграцию

**Через Supabase Dashboard:**
1. SQL Editor → New query
2. Вставить содержимое SQL файла
3. Run (может занять 1-2 минуты)

**Или через Supabase CLI (если есть):**
```bash
supabase db push
```

**Checklist:**
- [ ] Миграция выполнена без ошибок
- [ ] Все таблицы созданы (проверить в Table Editor)
- [ ] Индексы созданы (проверить в Database → Indexes)
- [ ] RPC функции доступны (проверить в Database → Functions)

---

### 2.3. Проверить структуру БД

```sql
-- Проверяем таблицы
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%tripwire%'
ORDER BY table_name;

-- Проверяем индексы
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename LIKE '%tripwire%'
ORDER BY tablename, indexname;

-- Проверяем RPC функции
SELECT proname 
FROM pg_proc 
WHERE proname LIKE 'rpc_%'
ORDER BY proname;
```

**Ожидаемые таблицы:**
- ✅ `users`
- ✅ `tripwire_users`
- ✅ `tripwire_user_profile`
- ✅ `module_unlocks`
- ✅ `student_progress`
- ✅ `video_tracking`
- ✅ `user_achievements`
- ✅ `user_statistics`
- ✅ `sales_activity_log`

**Ожидаемые RPC:**
- ✅ `rpc_get_sales_leaderboard`
- ✅ `rpc_get_sales_chart_data`
- ✅ `rpc_get_manager_stats`
- ✅ `rpc_get_manager_activity`
- ✅ `rpc_check_video_qualification`

**Checklist:**
- [ ] Все таблицы созданы
- [ ] Индексы применены
- [ ] RPC функции доступны

---

## PHASE 3: BACKEND IMPLEMENTATION (3-4 часа)

### 3.1. Создать pg.Pool конфигурацию

**Файл:** `backend/src/config/tripwire-pool.ts`

```typescript
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.TRIPWIRE_DATABASE_URL!;

if (!connectionString) {
  throw new Error('Missing TRIPWIRE_DATABASE_URL environment variable');
}

export const tripwirePool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

console.log('✅ Tripwire Pool initialized');

// Graceful shutdown
process.on('SIGTERM', async () => {
  await tripwirePool.end();
});
```

**Добавить в `.env`:**
```env
TRIPWIRE_DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

**Checklist:**
- [ ] Файл создан
- [ ] Env переменная добавлена
- [ ] Pool подключается (тест при запуске backend)

---

### 3.2. Создать transaction wrapper helper

**Файл:** `backend/src/utils/transaction.ts`

```typescript
import { Pool, PoolClient } from 'pg';

export async function withTransaction<T>(
  pool: Pool,
  callback: (client: PoolClient) => Promise<T>,
  isolationLevel: 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE' = 'READ COMMITTED',
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const client = await pool.connect();

    try {
      await client.query(`BEGIN ISOLATION LEVEL ${isolationLevel}`);
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error: any) {
      await client.query('ROLLBACK');
      lastError = error;

      // Retry on serialization failure (PostgreSQL error code 40001)
      if (error.code === '40001' && attempt < maxRetries) {
        console.log(`⚠️ Serialization failure, retrying (${attempt}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 100 * attempt)); // Exponential backoff
        continue;
      }

      throw error;
    } finally {
      client.release();
    }
  }

  throw lastError || new Error('Transaction failed after retries');
}
```

**Checklist:**
- [ ] Helper создан
- [ ] Поддерживает retry logic
- [ ] Автоматический ROLLBACK при ошибке

---

### 3.3. Реализовать TripwireService v2

**Файл:** `backend/src/services/tripwireService.ts`

**Основные функции (скопировать из Perplexity ответа):**
1. ✅ `createTripwireUser()` - с ACID транзакцией
2. ✅ `completeLesson()` - с автооткрытием модулей
3. ✅ `updateVideoTracking()` - честный трекинг
4. ✅ `unlockNextModuleInternal()` - helper
5. ✅ `issueCertificateInternal()` - helper
6. ✅ `mergeSegments()` - helper для видео
7. ✅ `calculateTotalWatched()` - helper для видео

**RPC обертки для статистики:**
8. ✅ `getSalesStats()`
9. ✅ `getSalesLeaderboard()`
10. ✅ `getSalesChartData()`
11. ✅ `getManagerActivity()`

**Checklist:**
- [ ] Все функции реализованы
- [ ] Transaction wrapper используется
- [ ] Error handling добавлен
- [ ] TypeScript компилируется без ошибок

---

### 3.4. Обновить Controller

**Файл:** `backend/src/controllers/tripwireController.ts`

```typescript
import { Request, Response } from 'express';
import * as TripwireService from '../services/tripwireService';

// POST /api/tripwire/users - создать студента
export async function createUser(req: Request, res: Response) {
  try {
    const { email, full_name, password, granted_by, manager_name } = req.body;

    const result = await TripwireService.createTripwireUser({
      email,
      full_name,
      password,
      granted_by,
      manager_name
    });

    res.status(201).json(result);
  } catch (error: any) {
    console.error('❌ Create user error:', error);
    res.status(500).json({ error: error.message });
  }
}

// POST /api/tripwire/lessons/:lessonId/complete - завершить урок
export async function completeLesson(req: Request, res: Response) {
  try {
    const { lessonId } = req.params;
    const { user_id, module_id } = req.body;

    const result = await TripwireService.completeLesson({
      user_id,
      lesson_id: parseInt(lessonId),
      module_id
    });

    res.json(result);
  } catch (error: any) {
    console.error('❌ Complete lesson error:', error);
    res.status(500).json({ error: error.message });
  }
}

// ... остальные endpoints
```

**Checklist:**
- [ ] Все endpoints обновлены
- [ ] Error handling добавлен
- [ ] Валидация входных данных

---

### 3.5. Обновить Routes

**Файл:** `backend/src/routes/tripwire.ts`

```typescript
import express from 'express';
import * as TripwireController from '../controllers/tripwireController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// User management
router.post('/users', authenticateToken, TripwireController.createUser);
router.get('/users', authenticateToken, TripwireController.getUsers);

// Lesson completion
router.post('/lessons/:lessonId/complete', authenticateToken, TripwireController.completeLesson);

// Video tracking
router.post('/lessons/:lessonId/video-tracking', authenticateToken, TripwireController.updateVideoTracking);

// Sales stats (используют RPC)
router.get('/sales/stats', authenticateToken, TripwireController.getSalesStats);
router.get('/sales/leaderboard', authenticateToken, TripwireController.getLeaderboard);
router.get('/sales/chart', authenticateToken, TripwireController.getChartData);
router.get('/sales/activity', authenticateToken, TripwireController.getActivity);

export default router;
```

**Checklist:**
- [ ] Routes обновлены
- [ ] Middleware применен
- [ ] Зарегистрированы в `server.ts`

---

## PHASE 4: TESTING (2-3 часа)

### 4.1. Unit Tests

**Файл:** `backend/tests/tripwire.test.ts`

```typescript
import { createTripwireUser, completeLesson } from '../src/services/tripwireService';

describe('Tripwire Service', () => {
  describe('createTripwireUser', () => {
    it('should create user with all related records', async () => {
      // Test implementation
    });

    it('should rollback on database error', async () => {
      // Test implementation
    });
  });

  describe('completeLesson', () => {
    it('should complete lesson and unlock next module', async () => {
      // Test implementation
    });

    it('should issue certificate after Module 18', async () => {
      // Test implementation
    });

    it('should reject if video not watched 80%', async () => {
      // Test implementation
    });
  });
});
```

**Запуск:**
```bash
npm test
```

**Checklist:**
- [ ] Все тесты проходят
- [ ] Coverage > 80%

---

### 4.2. Integration Test (Manual)

**Сценарий 1: Создание студента**
```bash
curl -X POST http://localhost:8080/api/tripwire/users \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-student@example.com",
    "full_name": "Test Student",
    "password": "securepass123",
    "granted_by": "MANAGER_UUID",
    "manager_name": "Test Manager"
  }'
```

**Проверка в БД:**
```sql
-- Должны быть записи в 9 таблицах
SELECT * FROM public.users WHERE email = 'test-student@example.com';
SELECT * FROM public.tripwire_users WHERE email = 'test-student@example.com';
SELECT * FROM public.tripwire_user_profile WHERE user_id = 'USER_ID';
SELECT * FROM public.module_unlocks WHERE user_id = 'USER_ID';
SELECT * FROM public.student_progress WHERE user_id = 'USER_ID';
SELECT * FROM public.video_tracking WHERE user_id = 'USER_ID';
SELECT * FROM public.user_achievements WHERE user_id = 'USER_ID';
SELECT * FROM public.user_statistics WHERE user_id = 'USER_ID';
SELECT * FROM public.sales_activity_log WHERE target_user_id = 'USER_ID';
```

**Ожидаемый результат:**
- ✅ 1 запись в `users`
- ✅ 1 запись в `tripwire_users` (modules_completed: 0)
- ✅ 1 запись в `tripwire_user_profile`
- ✅ 1 запись в `module_unlocks` (module_id: 16)
- ✅ 1 запись в `student_progress` (lesson_id: 67, status: 'not_started')
- ✅ 1 запись в `video_tracking` (lesson_id: 67, watch_percentage: 0)
- ✅ 4 записи в `user_achievements`
- ✅ 1 запись в `user_statistics`
- ✅ 1 запись в `sales_activity_log` (action_type: 'user_created')

---

**Сценарий 2: Завершение Lesson 67 (Module 16)**

1. Обновить video_tracking до 80%+:
```sql
UPDATE public.video_tracking
SET watch_percentage = 85,
    total_watched_seconds = 510,
    video_duration_seconds = 600,
    is_qualified_for_completion = true
WHERE user_id = 'USER_ID' AND lesson_id = 67;
```

2. Завершить урок через API:
```bash
curl -X POST http://localhost:8080/api/tripwire/lessons/67/complete \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "USER_ID",
    "module_id": 16
  }'
```

3. Проверка в БД:
```sql
-- student_progress должен быть 'completed'
SELECT * FROM public.student_progress WHERE user_id = 'USER_ID' AND lesson_id = 67;
-- Ожидаем: status = 'completed', completed_at IS NOT NULL

-- tripwire_users.modules_completed должен быть 1
SELECT modules_completed FROM public.tripwire_users WHERE user_id = 'USER_ID';
-- Ожидаем: modules_completed = 1

-- Module 17 должен быть открыт
SELECT * FROM public.module_unlocks WHERE user_id = 'USER_ID' AND module_id = 17;
-- Ожидаем: 1 запись

-- student_progress для Lesson 68 должен быть создан
SELECT * FROM public.student_progress WHERE user_id = 'USER_ID' AND lesson_id = 68;
-- Ожидаем: status = 'not_started'

-- Achievement 'first_module_complete' должен быть завершен
SELECT * FROM public.user_achievements WHERE user_id = 'USER_ID' AND achievement_id = 'first_module_complete';
-- Ожидаем: is_completed = true
```

---

**Сценарий 3: Полный flow до сертификата**

Повторить Сценарий 2 для:
- Lesson 68 (Module 17) → откроется Module 18
- Lesson 69 (Module 18) → выдастся сертификат

**Финальная проверка:**
```sql
-- tripwire_user_profile
SELECT * FROM public.tripwire_user_profile WHERE user_id = 'USER_ID';
-- Ожидаем:
-- - modules_completed = 3
-- - completion_percentage = 100
-- - certificate_issued = true
-- - certificate_url IS NOT NULL

-- tripwire_users
SELECT * FROM public.tripwire_users WHERE user_id = 'USER_ID';
-- Ожидаем:
-- - status = 'completed'
-- - modules_completed = 3

-- Achievement 'tripwire_graduate'
SELECT * FROM public.user_achievements WHERE user_id = 'USER_ID' AND achievement_id = 'tripwire_graduate';
-- Ожидаем:
-- - is_completed = true
-- - current_value = 3
```

**Checklist:**
- [ ] Сценарий 1 проходит
- [ ] Сценарий 2 проходит
- [ ] Сценарий 3 проходит
- [ ] Все проверки в БД корректны

---

### 4.3. Sales Dashboard Test

**Сценарий 4: Статистика Sales Manager**

```bash
# Leaderboard
curl http://localhost:8080/api/tripwire/sales/leaderboard \
  -H "Authorization: Bearer YOUR_TOKEN"

# Stats для конкретного менеджера
curl http://localhost:8080/api/tripwire/sales/stats?managerId=MANAGER_UUID \
  -H "Authorization: Bearer YOUR_TOKEN"

# Chart data
curl http://localhost:8080/api/tripwire/sales/chart?managerId=MANAGER_UUID&days=30 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Activity log
curl http://localhost:8080/api/tripwire/sales/activity?managerId=MANAGER_UUID&limit=50 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Ожидаемый результат:**
- ✅ Leaderboard возвращает топ менеджеров
- ✅ Stats показывает корректные цифры
- ✅ Chart data группирован по датам
- ✅ Activity log показывает последние действия

**Checklist:**
- [ ] Все RPC endpoints работают
- [ ] Нет ошибок "function not found in schema cache"
- [ ] Данные корректные

---

## PHASE 5: PRODUCTION DEPLOYMENT (1 час)

### 5.1. Pre-deployment checklist

- [ ] Все тесты проходят
- [ ] Backend компилируется без ошибок
- [ ] Нет TypeScript warnings
- [ ] `.env` переменные проверены
- [ ] Git commit создан

---

### 5.2. Deploy backend

```bash
# Build
npm run build

# Deploy на DigitalOcean / Vercel / Railway
pm2 restart backend

# Или через PM2 ecosystem
pm2 reload ecosystem.config.js --env production
```

**Checklist:**
- [ ] Backend запущен без ошибок
- [ ] Logs чистые (нет критичных ошибок)
- [ ] Database connection установлена

---

### 5.3. Smoke Test на Production

**Создать тестового студента:**
```bash
curl -X POST https://api.onai.academy/api/tripwire/users \
  -H "Authorization: Bearer PROD_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "smoke-test@onai.academy",
    "full_name": "Smoke Test User",
    "password": "test123456",
    "granted_by": "PROD_MANAGER_UUID",
    "manager_name": "Production Manager"
  }'
```

**Проверка:**
- [ ] Студент создан
- [ ] Email получен (welcome email)
- [ ] Можно залогиниться
- [ ] Module 16 открыт
- [ ] Dashboard показывает прогресс

---

### 5.4. Monitoring

**Проверить логи:**
```bash
pm2 logs backend --lines 100
```

**Проверить метрики:**
- Response time < 500ms для большинства запросов
- Error rate < 1%
- Database connections < 15 (из 20 max)

**Checklist:**
- [ ] Нет критичных ошибок в логах
- [ ] Response time нормальный
- [ ] Database не перегружена

---

## 🎉 DEPLOYMENT COMPLETE!

### ✅ Финальная проверка

- [ ] Создание студентов работает
- [ ] Завершение уроков работает
- [ ] Открытие модулей автоматическое
- [ ] Трекинг видео корректный
- [ ] Сертификат выдается
- [ ] Sales Dashboard показывает статистику
- [ ] Нет RPC "schema cache" ошибок
- [ ] Нет silent failures

---

## 🔄 ROLLBACK PLAN (если что-то пошло не так)

### Option 1: Откат кода (если БД не трогали)

```bash
git checkout main
git branch -D feature/tripwire-direct-db-architecture
pm2 restart backend
```

### Option 2: Откат БД (если применили миграцию)

1. Restore backup в Supabase Dashboard
2. Откатить код на предыдущую версию
3. Restart backend

---

## 📊 POST-DEPLOYMENT MONITORING (первые 24 часа)

### Метрики для отслеживания:

1. **Error Rate:**
   - Target: < 1%
   - Alert if: > 5%

2. **Response Time:**
   - Target: < 500ms (p95)
   - Alert if: > 2000ms

3. **Database Connections:**
   - Target: < 15
   - Alert if: > 18 (близко к max: 20)

4. **Success Rate:**
   - Create User: > 99%
   - Complete Lesson: > 99%
   - Video Tracking: > 95%

---

## 🎯 SUCCESS CRITERIA

Внедрение считается успешным если:

1. ✅ **Все тесты проходят** (unit + integration)
2. ✅ **Нет RPC Schema Cache ошибок**
3. ✅ **Студенты создаются без silent failures**
4. ✅ **Модули открываются автоматически**
5. ✅ **Сертификаты выдаются после Module 18**
6. ✅ **Sales Dashboard работает корректно**
7. ✅ **Performance не хуже чем было** (или лучше)
8. ✅ **Нет критичных багов в первые 24 часа**

---

**ГОТОВ НАЧАТЬ? ПОЕХАЛИ!** 🚀

---

## 📞 SUPPORT

Если возникнут проблемы:
1. Проверь логи: `pm2 logs backend`
2. Проверь БД: SQL queries из тестов
3. Проверь Perplexity решение: `PERPLEXITY_SOLUTION_DIRECT_DB.md`
4. Откатись на backup если критично

**Удачи!** 💪
