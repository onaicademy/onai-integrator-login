# 🗄️ ИНСТРУКЦИЯ: ПРИМЕНЕНИЕ МИГРАЦИИ TRIPWIRE DIRECT DB v2

## ✅ Файл миграции готов

**Файл:** `supabase/migrations/20251205000000_tripwire_direct_db_v2.sql`

---

## 📝 ШАГ 1: ОТКРОЙ SUPABASE DASHBOARD

1. Перейди на **https://supabase.com/dashboard**
2. Выбери проект **Tripwire** (ID: `pjmvxecykysfrzppdcto`)
3. В левом меню выбери **SQL Editor**
4. Нажми **New query**

---

## 📂 ШАГ 2: СКОПИРУЙ SQL КОД

### Вариант А: Через файл (рекомендуется)

```bash
# В терминале:
cat /Users/miso/onai-integrator-login/supabase/migrations/20251205000000_tripwire_direct_db_v2.sql
```

**Скопируй весь вывод и вставь в SQL Editor**

### Вариант Б: Открыть файл напрямую

1. Открой файл `supabase/migrations/20251205000000_tripwire_direct_db_v2.sql` в редакторе
2. Выдели всё (Cmd+A)
3. Скопируй (Cmd+C)
4. Вставь в SQL Editor (Cmd+V)

---

## ▶️ ШАГ 3: ВЫПОЛНИ МИГРАЦИЮ

1. В SQL Editor нажми **Run** (или Cmd+Enter)
2. Подожди **30-60 секунд** (миграция большая!)
3. Если всё успешно → увидишь "Success" ✅

**Ожидаемый результат:**
```
✅ Tables created/updated
✅ Indexes created
✅ Triggers created
✅ Event trigger created
✅ RPC functions created
✅ Grants applied
✅ Schema reloaded
```

---

## 🔍 ШАГ 4: ПРОВЕРКА СТРУКТУРЫ БД

### 4.1. Проверяем таблицы

В SQL Editor выполни:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'users',
    'tripwire_users',
    'tripwire_user_profile',
    'module_unlocks',
    'student_progress',
    'video_tracking',
    'user_achievements',
    'user_statistics',
    'sales_activity_log'
  )
ORDER BY table_name;
```

**Ожидаемый результат: 9 таблиц** ✅

---

### 4.2. Проверяем индексы

```sql
SELECT 
  tablename,
  indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename LIKE '%tripwire%'
ORDER BY tablename, indexname;
```

**Ожидаемый результат: 20+ индексов** ✅

---

### 4.3. Проверяем RPC функции

```sql
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc 
WHERE proname LIKE 'rpc_%'
  AND pronamespace = 'public'::regnamespace
ORDER BY proname;
```

**Ожидаемые функции:**
- ✅ `rpc_get_sales_leaderboard(limit_count integer)`
- ✅ `rpc_get_sales_chart_data(manager_id_param uuid, days_back integer)`
- ✅ `rpc_get_manager_stats(manager_id_param uuid)`
- ✅ `rpc_get_manager_activity(manager_id_param uuid, limit_count integer)`
- ✅ `rpc_check_video_qualification(user_id_param uuid, lesson_id_param integer)`

---

### 4.4. Проверяем Triggers

```sql
SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE '%updated_at%'
ORDER BY event_object_table;
```

**Ожидаемые triggers:**
- ✅ `update_users_updated_at`
- ✅ `update_tripwire_users_updated_at`
- ✅ `update_tripwire_profile_updated_at`
- ✅ `update_student_progress_updated_at`
- ✅ `update_video_tracking_updated_at`
- ✅ `update_user_statistics_updated_at`

---

### 4.5. Проверяем Event Trigger (Schema Cache Auto-Reload)

```sql
SELECT 
  evtname as event_trigger_name,
  evtevent as event,
  evtfoid::regproc as function_name
FROM pg_event_trigger
WHERE evtname = 'pgrst_watch';
```

**Ожидаемый результат:**
```
event_trigger_name | event           | function_name
pgrst_watch        | ddl_command_end | pgrst_watch
```

✅ **Это решает проблему Schema Cache раз и навсегда!**

---

## 🎉 ПРОВЕРКА ЗАВЕРШЕНА!

Если все 5 проверок прошли успешно:

- ✅ **9 таблиц** созданы
- ✅ **20+ индексов** применены
- ✅ **5 RPC функций** доступны
- ✅ **6 triggers** для auto-update `updated_at`
- ✅ **1 event trigger** для auto schema reload

**Миграция прошла успешно! 🎊**

---

## 🚨 ЧТО ДЕЛАТЬ ЕСЛИ ОШИБКА?

### Ошибка: "relation already exists"

**Решение:** Это нормально! Миграция использует `CREATE TABLE IF NOT EXISTS`, так что это просто warning.

---

### Ошибка: "function already exists"

**Решение:** Миграция использует `CREATE OR REPLACE FUNCTION`, так что старая версия будет заменена.

---

### Ошибка: "permission denied"

**Решение:** Убедись что ты залогинен как owner проекта в Supabase Dashboard.

---

### Ошибка: "syntax error"

**Решение:** 
1. Проверь что скопировал **ВЕСЬ** SQL код
2. Убедись что нет лишних символов в начале/конце
3. Попробуй применить по частям (сначала PART 1-2, потом PART 3-6)

---

## ⏭️ СЛЕДУЮЩИЙ ШАГ

После успешной миграции переходи к **Phase 3: Backend Implementation**

**Что будем делать:**
1. Создать `backend/src/config/tripwire-pool.ts` (pg.Pool)
2. Создать `backend/src/utils/transaction.ts` (helper)
3. Реализовать `backend/src/services/tripwireService.ts` (v2)

**Готов продолжать?** 🚀
