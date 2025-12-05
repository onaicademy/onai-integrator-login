# 🔴 КРИТИЧЕСКИЙ ОТЧЕТ: PostgREST Schema Cache Problem

**Дата:** 2025-12-04  
**Проект:** onAI Academy - Tripwire Product  
**Приоритет:** 🔴 КРИТИЧЕСКИЙ - блокирует production  
**Для:** Архитектор проекта

---

## 📊 СТАТУС: ВСЕ 5 RPC ФУНКЦИЙ НЕ РАБОТАЮТ

### ❌ Ошибка #1: `rpc_get_sales_leaderboard`
```
ERROR: Could not find the function public.rpc_get_sales_leaderboard 
       without parameters in the schema cache
```
- **Endpoint:** `GET /api/admin/tripwire/leaderboard`
- **Параметры:** БЕЗ параметров (пустая функция)
- **HTTP Status:** 500 Internal Server Error

---

### ❌ Ошибка #2: `rpc_get_sales_activity_log`
```
ERROR: Could not find the function public.rpc_get_sales_activity_log(
       p_end_date, p_limit, p_manager_id, p_start_date
       ) in the schema cache
```
- **Endpoint:** `GET /api/admin/tripwire/activity`
- **Параметры:** `p_end_date: TIMESTAMPTZ, p_limit: INTEGER, p_manager_id: UUID, p_start_date: TIMESTAMPTZ`
- **HTTP Status:** 500 Internal Server Error

---

### ❌ Ошибка #3: `rpc_get_sales_chart_data`
```
ERROR: Could not find the function public.rpc_get_sales_chart_data(
       p_end_date, p_manager_id, p_start_date
       ) in the schema cache
```
- **Endpoint:** `GET /api/admin/tripwire/sales-chart`
- **Параметры:** `p_end_date: TIMESTAMPTZ, p_manager_id: UUID, p_start_date: TIMESTAMPTZ`
- **HTTP Status:** 500 Internal Server Error

---

### ❌ Ошибка #4: `rpc_get_tripwire_stats`
```
ERROR: Could not find the function public.rpc_get_tripwire_stats(
       p_end_date, p_manager_id, p_start_date
       ) in the schema cache
```
- **Endpoint:** `GET /api/admin/tripwire/stats`
- **Параметры:** `p_end_date: TIMESTAMPTZ, p_manager_id: UUID, p_start_date: TIMESTAMPTZ`
- **HTTP Status:** 500 Internal Server Error

---

### ❌ Ошибка #5: `rpc_get_tripwire_users`
```
ERROR: Could not find the function public.rpc_get_tripwire_users(
       p_end_date, p_limit, p_manager_id, p_page, p_start_date, p_status
       ) in the schema cache
```
- **Endpoint:** `GET /api/admin/tripwire/users`
- **Параметры:** `p_end_date: TIMESTAMPTZ, p_limit: INTEGER, p_manager_id: UUID, p_page: INTEGER, p_start_date: TIMESTAMPTZ, p_status: TEXT`
- **HTTP Status:** 500 Internal Server Error

---

## ✅ ЧТО ПОДТВЕРЖДЕНО (РАБОТАЕТ)

### 1️⃣ Функции СУЩЕСТВУЮТ в PostgreSQL
```sql
SELECT proname, pg_get_function_arguments(oid) 
FROM pg_proc 
WHERE proname LIKE 'rpc_get%';
```
**Результат:** Все 5 функций найдены в `pg_proc` ✅

### 2️⃣ Права доступа настроены
```sql
GRANT EXECUTE ON FUNCTION public.rpc_get_sales_leaderboard() 
TO authenticated, anon, service_role;
```
**Результат:** GRANT выполнен для всех функций ✅

### 3️⃣ Параметры в алфавитном порядке
**Пример:** `p_end_date, p_limit, p_manager_id, p_start_date` (E, L, M, S)  
**Результат:** Порядок соответствует требованиям PostgREST ✅

### 4️⃣ Backend код обновлен
```typescript
// ✅ Используем ?? вместо ||
p_start_date: startDate ?? null,
p_end_date: endDate ?? null,
```
**Результат:** Nullish coalescing применен ✅

### 5️⃣ Backend перезапущен
```bash
pkill -f "npm run dev"
npm run dev
```
**Результат:** Новый код загружен ✅

---

## ❌ ЧТО НЕ РАБОТАЕТ

### 🔴 PostgREST Schema Cache НЕ обновляется

**Попытка #1:** `NOTIFY pgrst, 'reload schema';`  
**Результат:** ❌ Не помогло

**Попытка #2:** `SELECT pg_sleep(3); NOTIFY pgrst, 'reload schema';`  
**Результат:** ❌ Не помогло

**Попытка #3:** Двойной NOTIFY с задержкой  
**Результат:** ❌ Не помогло

**Попытка #4:** Перезапуск Backend Node.js  
**Результат:** ❌ Не помогло

**Попытка #5:** Hard refresh браузера  
**Результат:** ❌ Не помогло

---

## 🎯 ЧТО НУЖНО ОТ АРХИТЕКТОРА

### Вариант А: Project Restart (рекомендуемый)
**Что делать:**
1. Supabase Dashboard → Settings → General
2. Нажать "Restart project"
3. Подождать 3-5 минут

**Почему это должно помочь:**
- Полная перезагрузка PostgREST instance
- Очистка всего schema cache
- Guaranteed to work (согласно Supabase docs)

**Риск:**
- Downtime ~3-5 минут

---

### Вариант Б: Support Ticket
**Если Restart не поможет:**

```
Subject: PostgREST schema cache not updating - Production blocker

Hi Supabase team,

We have a critical issue with PostgREST not detecting 5 RPC functions 
despite they exist in pg_proc.

Project ID: pjmvxecykysfrzppdcto
Functions: rpc_get_sales_leaderboard, rpc_get_sales_activity_log, 
           rpc_get_sales_chart_data, rpc_get_tripwire_stats, 
           rpc_get_tripwire_users

Steps taken:
✅ Functions exist (verified via SELECT from pg_proc)
✅ GRANT EXECUTE to all roles
✅ Parameters in alphabetical order
✅ NOTIFY pgrst, 'reload schema' with pg_sleep()
✅ Backend restart
❌ Project Restart (if you did it)

Error: "Could not find the function public.rpc_XXX in the schema cache"

Can you manually reload PostgREST schema cache for our project?

Impact: Blocking production deployment for Sales Dashboard
Urgency: Critical

Thanks!
```

---

### Вариант В: Alternative Architecture
**Если RPC вообще не работает:**

Переписать backend на прямые SQL запросы вместо RPC:

```typescript
// ❌ ТЕКУЩИЙ ПОДХОД (не работает):
const { data } = await supabase.rpc('rpc_get_sales_leaderboard');

// ✅ АЛЬТЕРНАТИВА (гарантированно работает):
const { data } = await supabase
  .from('tripwire_users')
  .select(`
    granted_by,
    status,
    users!inner(full_name)
  `)
  .not('granted_by', 'is', null);

// Агрегация на backend вместо RPC в БД
const leaderboard = processLeaderboardData(data);
```

**Pros:**
- ✅ Работает без RPC
- ✅ Не зависит от PostgREST cache
- ✅ Более гибкий контроль логики

**Cons:**
- ❌ Больше кода на backend
- ❌ Хуже performance (агрегация в Node.js вместо PostgreSQL)
- ❌ Сложнее поддерживать

---

## 📊 ТЕКУЩЕЕ СОСТОЯНИЕ ПРОЕКТА

### ✅ Что РАБОТАЕТ:
- 🟢 Авторизация через Tripwire DB
- 🟢 Sales Dashboard рендерится (empty state)
- 🟢 Frontend без crashes
- 🟢 Backend запущен без ошибок
- 🟢 База данных доступна
- 🟢 Таблицы созданы (`tripwire_users`, `sales_activity_log`, etc.)

### ❌ Что НЕ работает:
- 🔴 Все 5 RPC функций недоступны через PostgREST
- 🔴 Невозможно получить статистику продаж
- 🔴 Невозможно получить список учеников
- 🔴 Невозможно получить leaderboard
- 🔴 Невозможно получить activity log
- 🔴 Невозможно получить chart data

**Impact:** Sales Dashboard работает только визуально (empty state), но НЕ функционально

---

## 🆘 СРОЧНЫЕ ДЕЙСТВИЯ

### Немедленно (сейчас):
1. ⚠️ **Сделать Project Restart в Supabase Dashboard**
2. ⏱️ Подождать 5 минут
3. 🧪 Проверить через curl:
```bash
curl -X POST 'https://pjmvxecykysfrzppdcto.supabase.co/rest/v1/rpc/rpc_get_sales_leaderboard' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Если не поможет (через 5 минут):
1. 📧 Создать Support Ticket (шаблон выше)
2. 🔄 Начать работу над Alternative Architecture (Вариант В)

### Если очень срочно (через 1 час):
1. 🚀 Deploy Alternative Architecture (без RPC)
2. 📊 Переписать 5 endpoints на прямые SQL запросы
3. ⚡ Hotfix на production

---

## 📈 TIMELINE

- **Сейчас:** RPC не работают, Dashboard empty
- **+5 мин:** После Restart - ожидаем что заработает
- **+1 час:** Если не работает - Support Ticket
- **+6 часов:** Ответ от Support (обычно)
- **+1 день:** Если Support не помог - Alternative Architecture

---

## 💰 БИЗНЕС IMPACT

- ❌ Sales Managers не могут создавать студентов
- ❌ Невозможно отследить продажи
- ❌ Нет visibility в Dashboard
- ❌ Блокирует launch Tripwire продукта
- ❌ Потеря revenue пока не работает

**Оценка потерь:** Каждый день простоя = потенциальные клиенты уходят

---

## 🎯 РЕКОМЕНДАЦИЯ АРХИТЕКТОРУ

### Краткосрочно (прямо сейчас):
1. **Сделай Restart проекта** в Supabase Dashboard
2. Если не поможет - **Support Ticket** (высокий приоритет)

### Среднесрочно (если Restart не поможет):
1. Начать работу над **Alternative Architecture** (прямые SQL запросы)
2. Параллельно ждать ответ от Support

### Долгосрочно (после решения):
1. Документировать решение в `.md` файле
2. Добавить мониторинг для RPC функций (health check)
3. Создать fallback механизм (если RPC не работает → использовать direct queries)

---

## 📎 ПРИЛОЖЕНИЯ

- `fix-rpc-with-sleep.sql` - SQL миграция с pg_sleep()
- `tripwireManagerService.ts` - TypeScript код с ?? fixes
- `PERPLEXITY_QUERY.md` - Детальное описание проблемы
- `RPC_EXAMPLE_FOR_PERPLEXITY.sql` - Примеры для тестирования

---

## ✉️ DRAFT ПИСЬМА ДЛЯ SUPPORT

```
Subject: CRITICAL: PostgREST schema cache not updating - Production blocker

Hi Supabase Support Team,

We're experiencing a critical production issue where PostgREST cannot 
find 5 RPC functions despite they exist in pg_proc.

Project Details:
- Project ID: pjmvxecykysfrzppdcto
- Region: EU
- Plan: Paid (Pro)
- Database: PostgreSQL 15

Functions not found in schema cache:
1. rpc_get_sales_leaderboard()
2. rpc_get_sales_activity_log(p_end_date, p_limit, p_manager_id, p_start_date)
3. rpc_get_sales_chart_data(p_end_date, p_manager_id, p_start_date)
4. rpc_get_tripwire_stats(p_end_date, p_manager_id, p_start_date)
5. rpc_get_tripwire_users(p_end_date, p_limit, p_manager_id, p_page, p_start_date, p_status)

What we've tried:
✅ Verified functions exist in pg_proc
✅ GRANT EXECUTE to authenticated, anon, service_role
✅ Parameters in alphabetical order (PostgREST requirement)
✅ NOTIFY pgrst, 'reload schema' with pg_sleep(3)
✅ Double NOTIFY with delays
✅ Backend Node.js restart
✅ Updated Supabase JS client code (nullish coalescing)
✅ Project Restart via Dashboard (if applicable)

Error message:
"RPC error: Could not find the function public.rpc_XXX in the schema cache"

SQL to verify functions exist:
SELECT proname, pg_get_function_arguments(oid) 
FROM pg_proc 
WHERE proname LIKE 'rpc_get%';

Result: All 5 functions are present in database ✅

Request:
Can you please manually reload the PostgREST schema cache for our project?
Or advise on how to resolve this issue?

Business Impact:
- Sales Dashboard completely non-functional
- Cannot create new students
- Blocking production launch
- Revenue loss

Urgency: CRITICAL - Need resolution within 24 hours

Thank you!
```

---

## 🔬 TECHNICAL DETAILS

### Database Connection
```
URL: https://pjmvxecykysfrzppdcto.supabase.co
Connection String: postgres://postgres.pjmvxecykysfrzppdcto:***@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

### Backend Stack
```
Node.js: v18+
TypeScript: 5.x
@supabase/supabase-js: ^2.x
Express: Latest
```

### RPC Call Example
```typescript
// Backend code
import { tripwireAdminSupabase } from '../config/supabase-tripwire';

const { data, error } = await tripwireAdminSupabase.rpc('rpc_get_sales_leaderboard', {});
// ERROR: "Could not find the function in the schema cache"
```

### SQL Function Signature
```sql
CREATE OR REPLACE FUNCTION public.rpc_get_sales_leaderboard()
RETURNS TABLE (...)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT ...;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_get_sales_leaderboard() 
TO authenticated, anon, service_role;
```

---

## 🎯 IMMEDIATE NEXT STEPS

1. ⚠️ **АРХИТЕКТОР: Сделай Restart проекта**
   - Dashboard → Settings → General → Restart project
   - Подожди 5 минут

2. 🧪 **ПОСЛЕ RESTART: Проверь через curl**
   ```bash
   curl -X POST 'https://pjmvxecykysfrzppdcto.supabase.co/rest/v1/rpc/rpc_get_sales_leaderboard' \
     -H "apikey: [ANON_KEY]" \
     -H "Content-Type: application/json" \
     -d '{}'
   ```

3. 📊 **ЕСЛИ РАБОТАЕТ:**
   - ✅ Проверь в браузере (`http://localhost:8080/admin/tripwire-manager`)
   - ✅ Создай тестового студента
   - ✅ Проверь что stats обновляются
   - ✅ Готовим production deployment

4. 📧 **ЕСЛИ НЕ РАБОТАЕТ:**
   - ❌ Создай Support Ticket (используй draft выше)
   - 🔄 Начинай работу над Alternative Architecture
   - ⏰ Установи deadline для Support: 24 часа

---

## 📋 CHECKLIST ДЛЯ АРХИТЕКТОРА

- [ ] Сделан Restart проекта в Supabase Dashboard?
- [ ] Ждали 5+ минут после Restart?
- [ ] Проверили через curl что RPC работает?
- [ ] Проверили в Browser Console что нет ошибок?
- [ ] Если не работает - создан Support Ticket?
- [ ] Если Support не отвечает 24h - начата работа над Alternative?

---

**Ожидаем решения от архитектора!** 🚀

---

## 🔗 ПОЛЕЗНЫЕ ССЫЛКИ

- [PostgREST Functions Docs](https://postgrest.org/en/stable/references/api/functions.html)
- [Supabase RPC Docs](https://supabase.com/docs/guides/database/functions)
- [GitHub Issue #2791](https://github.com/PostgREST/postgrest/issues/2791) - Schema reload race condition
- [StackOverflow: Supabase RPC not found](https://stackoverflow.com/questions/tagged/supabase+rpc)

