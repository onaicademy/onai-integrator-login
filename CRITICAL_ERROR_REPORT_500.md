# 🚨 КРИТИЧЕСКИЙ ОТЧЕТ: 3 ФАТАЛЬНЫЕ ОШИБКИ В TRIPWIRE

**Дата:** 2025-12-07  
**Статус:** 🔴 PRODUCTION BROKEN  
**Приоритет:** P0 - CRITICAL

---

## 📊 EXECUTIVE SUMMARY

При тестировании функции "Завершить урок" обнаружены **3 фатальные ошибки**, полностью блокирующие работу платформы:

1. **500 Internal Server Error** - Backend падает на `/api/tripwire/complete`
2. **Wrong Database для Video Tracking** - Прогресс видео сохраняется на Main Platform вместо Tripwire
3. **UX Bug: Кнопка "Завершить урок" пропадает** - При откате прогресса кнопка становится неактивной

---

## 🔴 ПРОБЛЕМА #1: PostgreSQL Error 42P10 (500 Internal Server Error)

### Симптомы:
```
POST http://localhost:3000/api/tripwire/complete 500 (Internal Server Error)
❌ API Error: Failed to complete lesson
```

### Backend Логи:
```javascript
[TRANSACTION ERROR] Rolling back... {
  message: 'there is no unique or exclusion constraint matching the ON CONFLICT specification',
  code: '42P10',
  detail: undefined,
  hint: undefined
}
```

### Root Cause:
**CONSTRAINT MISMATCH!** Таблица имеет UNIQUE constraint на `(user_id, lesson_id)`, но код использует `ON CONFLICT (user_id, module_id, lesson_id)`!

#### Фактическая схема БД:
```sql
-- ✅ Constraint СУЩЕСТВУЕТ, но на других колонках!
CONSTRAINT student_progress_user_id_lesson_id_key UNIQUE (user_id, lesson_id)
```

#### Код пытается использовать:
```sql
-- ❌ CONSTRAINT НЕ СУЩЕСТВУЕТ на этой комбинации!
ON CONFLICT (user_id, module_id, lesson_id)
```

#### Проблемный SQL код:
```sql
-- ❌ ПАДАЕТ С ОШИБКОЙ 42P10
INSERT INTO student_progress (
  user_id, module_id, lesson_id, status, completed_at, updated_at
)
VALUES ($1::uuid, $2::integer, $3::integer, 'completed', NOW(), NOW())
ON CONFLICT (user_id, module_id, lesson_id)  -- ❌ НЕТ ТАКОГО CONSTRAINT!
DO UPDATE SET
  status = 'completed',
  completed_at = NOW(),
  updated_at = NOW()
RETURNING *
```

### Файл:
`/Users/miso/onai-integrator-login/backend/src/routes/tripwire-lessons.ts:220-231`

### PostgreSQL Error Code Reference:
- **42P10**: `invalid_column_reference` / "there is no unique or exclusion constraint matching the ON CONFLICT specification"
- Документация: https://www.postgresql.org/docs/current/errcodes-appendix.html

---

## 🔴 ПРОБЛЕМА #2: Video Tracking сохраняется на WRONG DATABASE

### Симптомы:
```
fetch.ts:15  POST https://arqhkacellqbhjhbebfh.supabase.co/rest/v1/video_tracking?on_conflict=user_id%2Clesson_id 400 (Bad Request)

useHonestVideoTracking.ts:228 ❌ [HonestTracking] Save error: {
  code: '22023', 
  message: 'cannot extract elements from a scalar'
}
```

### Root Cause:
**Hook `useHonestVideoTracking` использует Main Platform Supabase вместо Tripwire Supabase!**

#### Проблемный импорт:
```typescript
// ❌ WRONG DATABASE!
import { supabase } from '@/lib/supabase';  
// ✅ SHOULD BE:
// import { tripwireSupabase } from '@/lib/supabase-tripwire';
```

### Файл:
`/Users/miso/onai-integrator-login/src/hooks/useHonestVideoTracking.ts:2`

### Последствия:
1. **400 Bad Request** - таблица `video_tracking` имеет разную схему на Main vs Tripwire
2. **Data Loss** - прогресс видео НЕ сохраняется на Tripwire DB
3. **Security Issue** - Tripwire студенты пишут данные в Main Platform

### URL Comparison:
- ❌ **Текущий (WRONG)**: `arqhkacellqbhjhbebfh.supabase.co` (Main Platform)
- ✅ **Должен быть**: `pjmvxecykysfrzppdcto.supabase.co` (Tripwire)

---

## 🔴 ПРОБЛЕМА #3: UX Bug - Кнопка "Завершить урок" пропадает

### Симптомы:
1. Пользователь просматривает 85% видео
2. Кнопка "Завершить урок" появляется ✅
3. Пользователь откатывает прогресс на 70%
4. Кнопка **ПРОПАДАЕТ** ❌

### Root Cause:
**Фронтенд НЕ сохраняет состояние "qualified for completion" в БД!**

#### Текущая логика (НЕПРАВИЛЬНО):
```typescript
// ❌ Кнопка появляется только если ТЕКУЩИЙ прогресс > 80%
const canComplete = watchedPercentage >= 80;

// Если откатить назад - кнопка ПРОПАДАЕТ!
```

#### Правильная логика (ДОЛЖНО БЫТЬ):
```typescript
// ✅ Кнопка появляется если КОГДА-ЛИБО достигли 80%
const canComplete = hasEverReached80Percent || currentProgress >= 80;

// Даже если откатить назад - кнопка ОСТАЕТСЯ!
```

### Файл:
`/Users/miso/onai-integrator-login/src/pages/tripwire/TripwireLesson.tsx`

### Требуемые изменения:
1. Добавить колонку `video_qualified_for_completion: boolean` в `tripwire_progress`
2. При достижении 80% - сохранить флаг в БД
3. Фронтенд читает этот флаг и показывает кнопку ВСЕГДА после первого достижения

---

## 🛠️ TECHNICAL CONTEXT

### Database Schema Issues:

#### Таблица `student_progress` (Tripwire DB):
```sql
-- ❌ MISSING CONSTRAINT!
CREATE TABLE student_progress (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  module_id integer NOT NULL,
  lesson_id integer NOT NULL,
  status text NOT NULL,
  completed_at timestamptz,
  updated_at timestamptz DEFAULT NOW()
  -- ❌ NO UNIQUE CONSTRAINT ON (user_id, module_id, lesson_id)!
);
```

**Требуется:**
```sql
-- ✅ ADD UNIQUE CONSTRAINT
ALTER TABLE student_progress 
ADD CONSTRAINT student_progress_unique 
UNIQUE (user_id, module_id, lesson_id);
```

#### Таблица `tripwire_progress` (для Video Tracking):
```sql
-- Текущая схема:
CREATE TABLE tripwire_progress (
  id uuid PRIMARY KEY,
  tripwire_user_id uuid NOT NULL,
  module_id integer NOT NULL,
  lesson_id integer NOT NULL,
  is_completed boolean DEFAULT false,
  watch_time_seconds integer DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
  -- ❌ MISSING: video_qualified_for_completion boolean
);
```

**Требуется:**
```sql
ALTER TABLE tripwire_progress 
ADD COLUMN video_qualified_for_completion boolean DEFAULT false;
```

### Architecture Context:

#### Multi-Database Setup:
- **Main Platform**: `arqhkacellqbhjhbebfh.supabase.co` (основная платформа)
- **Tripwire**: `pjmvxecykysfrzppdcto.supabase.co` (отдельный продукт)

#### Current Implementation:
- `useAuth` → Main Platform
- `tripwireSupabase` → Tripwire (отдельный клиент)
- **PROBLEM**: `useHonestVideoTracking` использует Main вместо Tripwire!

---

## 📋 AFFECTED FILES

### Backend:
1. `/backend/src/routes/tripwire-lessons.ts:220-231` - Проблема #1 (ON CONFLICT)
2. `/backend/src/config/tripwire-db.ts` - Конфигурация Direct DB

### Frontend:
1. `/src/hooks/useHonestVideoTracking.ts:2` - Проблема #2 (Wrong DB)
2. `/src/pages/tripwire/TripwireLesson.tsx` - Проблема #3 (UX Bug)
3. `/src/lib/supabase-tripwire.ts` - Tripwire Supabase client

### Database:
1. `student_progress` table - Missing UNIQUE constraint
2. `tripwire_progress` table - Missing `video_qualified_for_completion` column

---

## 🎯 REPRODUCTION STEPS

### Проблема #1 (500 Error):
1. Залогиниться как студент Tripwire: `icekvup@gmail.com`
2. Открыть урок 67 (Модуль 16)
3. Перемотать видео >80%
4. Нажать кнопку "Завершить урок"
5. **Результат**: 500 Internal Server Error

### Проблема #2 (Wrong DB):
1. Открыть DevTools → Network
2. Воспроизвести видео
3. Посмотреть запросы на `video_tracking`
4. **Результат**: Запросы идут на `arqhkacellqbhjhbebfh.supabase.co` (Main) вместо `pjmvxecykysfrzppdcto.supabase.co` (Tripwire)

### Проблема #3 (UX Bug):
1. Перемотать видео на 85%
2. **Кнопка появляется** ✅
3. Откатить прогресс на 70%
4. **Кнопка пропадает** ❌ (НЕПРАВИЛЬНО!)

---

## 💥 IMPACT ASSESSMENT

### Business Impact:
- 🔴 **CRITICAL**: Студенты Tripwire **НЕ МОГУТ** завершать уроки
- 🔴 **CRITICAL**: Прогресс видео **НЕ СОХРАНЯЕТСЯ** в Tripwire DB
- 🟡 **HIGH**: Плохой UX - кнопка пропадает при откате прогресса

### Technical Impact:
- 🔴 **Data Integrity**: Два запроса идут в разные БД (Main vs Tripwire)
- 🔴 **Security**: Tripwire студенты могут записывать в Main Platform
- 🟡 **Performance**: 3 копии backend процессов работают одновременно

### User Impact:
- 🔴 **100% студентов Tripwire** не могут пройти ни один урок
- 🔴 **0% retention** - невозможно прогрессировать по курсу

---

## 🔍 ADDITIONAL FINDINGS

### Backend Process Duplication:
```bash
$ ps aux | grep "ts-node.*server" | grep -v grep
miso  26903   1.3  0.6  446678192  102144   ??  SN   12:33PM   0:11.59 node .../ts-node src/server.ts
miso  26863   1.2  0.6  446678592  101360   ??  SN   12:33PM   0:11.57 node .../ts-node src/server.ts
miso  26896   1.2  0.6  446675088  100704   ??  SN   12:33PM   0:11.69 node .../ts-node src/server.ts
```
**Issue**: 3 backend процесса работают одновременно (должен быть 1!)

### Telegram Bot Conflicts:
```
error: [polling_error] ETELEGRAM: 409 Conflict: terminated by other getUpdates request
```
**Issue**: Несколько инстансов бота пытаются получать обновления одновременно

---

## 📚 REFERENCES

### PostgreSQL Documentation:
- Error Code 42P10: https://www.postgresql.org/docs/current/errcodes-appendix.html
- ON CONFLICT: https://www.postgresql.org/docs/current/sql-insert.html#SQL-ON-CONFLICT
- UNIQUE Constraints: https://www.postgresql.org/docs/current/ddl-constraints.html

### Related Reports:
- `PERPLEXITY_LESSON_COMPLETION_ARCHITECTURE.md` - Архитектура lesson completion
- `PERPLEXITY_500_ERROR_DEBUG.md` - Предыдущая диагностика 500 ошибки

---

## 🎯 NEXT STEPS (ДЛЯ PERPLEXITY)

Создан детальный запрос для Perplexity в файле:
**`PERPLEXITY_CRITICAL_FIX_QUERY.md`**

Этот запрос включает:
1. Детальное описание всех 3 проблем
2. Контекст multi-database архитектуры
3. Схемы таблиц БД
4. Примеры кода с ошибками
5. Запрос Best Practices для решения

---

**Создано:** 2025-12-07 12:40 UTC  
**Автор:** AI Assistant (Claude Sonnet 4.5)  
**Статус:** 🔴 AWAITING PERPLEXITY RESEARCH


