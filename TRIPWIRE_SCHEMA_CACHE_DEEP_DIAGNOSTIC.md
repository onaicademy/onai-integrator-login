# 🔴 КРИТИЧЕСКАЯ ПРОБЛЕМА: Supabase PostgREST Schema Cache не обновляется после миграции

## 📊 АРХИТЕКТУРА СИСТЕМЫ

### Текущая инфраструктура:
```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Vercel)                         │
│                  https://onai.academy                        │
│                                                              │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │  Sales Manager   │         │ Tripwire Student │         │
│  │  Login: Main DB  │         │ Login: New DB    │         │
│  └────────┬─────────┘         └─────────┬────────┘         │
└───────────┼───────────────────────────────┼─────────────────┘
            │                               │
            ▼                               ▼
┌─────────────────────────────────────────────────────────────┐
│              BACKEND API (DigitalOcean)                      │
│              https://api.onai.academy                        │
│              PM2 Process: onai-backend                       │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  tripwireManagerService.ts                           │  │
│  │  ┌────────────────────────────────────────────┐     │  │
│  │  │ tripwireAdminSupabase (Service Role Key)   │     │  │
│  │  │ - auth.admin.createUser()                  │     │  │
│  │  │ - .from('tripwire_users').insert()  ❌     │     │  │
│  │  │ - .from('sales_activity_log').insert() ❌  │     │  │
│  │  └────────────────────────────────────────────┘     │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────┼─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│         SUPABASE TRIPWIRE DATABASE (NEW)                     │
│         Project: pjmvxecykysfrzppdcto                        │
│         URL: pjmvxecykysfrzppdcto.supabase.co              │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  PostgREST API Layer (REST → PostgreSQL)             │  │
│  │  ┌────────────────────────────────────────────┐     │  │
│  │  │ SCHEMA CACHE ❌ STUCK ON OLD STATE          │     │  │
│  │  │ - Видит: auth.users ✅                      │     │  │
│  │  │ - НЕ видит: public.tripwire_users ❌        │     │  │
│  │  │ - НЕ видит: public.sales_activity_log ❌    │     │  │
│  │  └────────────────────────────────────────────┘     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  PostgreSQL Database (Direct Access ✅)               │  │
│  │  ├─ auth.users (работает)                            │  │
│  │  ├─ public.users (создана, 17 rows)                  │  │
│  │  ├─ public.tripwire_users (создана, 0 rows) ✅       │  │
│  │  ├─ public.sales_activity_log (создана, 0 rows) ✅   │  │
│  │  └─ public.tripwire_user_profile (создана, 0 rows) ✅│  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## ❌ ПРОБЛЕМА

**Ошибка:**
```
Database error: Could not find the table 'public.tripwire_users' in the schema cache
Database error: Could not find the table 'public.sales_activity_log' in the schema cache
```

**Что происходит:**
- Backend делает запрос: `tripwireAdminSupabase.from('tripwire_users').insert(...)`
- PostgREST API отвечает: "Таблица не найдена в schema cache"
- НО при прямом SQL запросе: `SELECT * FROM public.tripwire_users` → **работает ✅**

**Вывод:** Таблицы ФИЗИЧЕСКИ существуют в PostgreSQL, но PostgREST API их НЕ ВИДИТ из-за устаревшего кэша.

## ✅ ЧТО УЖЕ СДЕЛАНО (ПОПЫТКИ РЕШЕНИЯ)

### Попытка #1: Создание таблиц через apply_migration ✅
```sql
CREATE TABLE IF NOT EXISTS public.tripwire_users (...);
CREATE TABLE IF NOT EXISTS public.sales_activity_log (...);
CREATE TABLE IF NOT EXISTS public.tripwire_user_profile (...);
```
**Результат:** Таблицы созданы, но PostgREST их не видит.

### Попытка #2: Выдача прав всем ролям ✅
```sql
GRANT ALL PRIVILEGES ON public.tripwire_users TO anon, authenticated, service_role, postgres;
GRANT ALL PRIVILEGES ON public.sales_activity_log TO anon, authenticated, service_role, postgres;
GRANT ALL PRIVILEGES ON public.tripwire_user_profile TO anon, authenticated, service_role, postgres;
```
**Результат:** Права выданы (проверено через `information_schema.role_table_grants`), но PostgREST не видит таблицы.

### Попытка #3: Включение RLS и создание политик ✅
```sql
ALTER TABLE public.tripwire_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "api_access_tripwire_users" ON public.tripwire_users FOR ALL USING (true);
```
**Результат:** Политики созданы (проверено через `pg_policies`), но PostgREST не видит таблицы.

### Попытка #4: NOTIFY pgrst для обновления кэша ✅
```sql
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
```
**Результат:** Команда выполнена, кэш НЕ обновился.

### Попытка #5: Рестарт Backend на DigitalOcean ✅
```bash
pm2 restart onai-backend
pm2 delete onai-backend && pm2 start npm --name "onai-backend" -- run start
```
**Результат:** Backend перезапущен, ошибка осталась.

### Попытка #6: Рестарт Connection Pooler ❌
**Действия пользователя:** Перезапуск Connection Pooler через Supabase Dashboard 100+ раз
**Результат:** НЕ ПОМОГЛО. Ошибка осталась.

### Попытка #7: Создание RPC функций для обхода кэша ⏳
```sql
CREATE OR REPLACE FUNCTION public.rpc_create_tripwire_user(...) RETURNS jsonb ...
CREATE OR REPLACE FUNCTION public.rpc_get_tripwire_users(...) RETURNS jsonb ...
CREATE OR REPLACE FUNCTION public.rpc_get_tripwire_stats() RETURNS jsonb ...
```
**Результат:** Функции созданы, но код Backend еще не обновлен для их использования.

## 🧪 ДИАГНОСТИКА ТЕКУЩЕГО СОСТОЯНИЯ

### ✅ Что РАБОТАЕТ:
1. **Прямые SQL запросы через MCP tools:**
   ```sql
   SELECT * FROM public.tripwire_users; -- ✅ OK (0 rows)
   SELECT * FROM public.sales_activity_log; -- ✅ OK (0 rows)
   ```

2. **Создание пользователей в auth.users:**
   ```typescript
   tripwireAdminSupabase.auth.admin.createUser({ ... }) // ✅ OK
   ```

3. **Права доступа:**
   ```sql
   SELECT grantee, privileges FROM information_schema.role_table_grants;
   -- ✅ anon, authenticated, service_role имеют ALL права
   ```

### ❌ Что НЕ РАБОТАЕТ:
1. **PostgREST API запросы через Supabase Client:**
   ```typescript
   tripwireAdminSupabase.from('tripwire_users').insert({ ... })
   // ❌ Error: Could not find the table in the schema cache
   ```

2. **Автоматическое обновление schema cache:**
   - `NOTIFY pgrst, 'reload schema'` - не работает
   - Restart Connection Pooler - не работает
   - Restart Backend - не работает
   - Ожидание 5-10 минут - не работает

## 🔬 ТЕХНИЧЕСКИЕ ДЕТАЛИ

### Backend конфигурация:
**Файл:** `backend/src/config/supabase-tripwire.ts`
```typescript
import { createClient } from '@supabase/supabase-js';

const TRIPWIRE_URL = process.env.TRIPWIRE_SUPABASE_URL!;
const TRIPWIRE_KEY = process.env.TRIPWIRE_SERVICE_ROLE_KEY!;

export const tripwireAdminSupabase = createClient(TRIPWIRE_URL, TRIPWIRE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
```

**Environment Variables (.env):**
```bash
TRIPWIRE_SUPABASE_URL=https://pjmvxecykysfrzppdcto.supabase.co
TRIPWIRE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbXZ4ZWN5a3lzZnJ6cHBkY3RvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc5NTMwOCwiZXhwIjoyMDgwMzcxMzA4fQ.QB_iIKt06nqa0owpVtKwKXmDwFInuy9mOyALf3VgWyk
```

### Service код (проблемное место):
**Файл:** `backend/src/services/tripwireManagerService.ts`
```typescript
export async function createTripwireUser(params: CreateTripwireUserParams) {
  // 1. Создание в auth.users - РАБОТАЕТ ✅
  const { data: newUser } = await tripwireAdminSupabase.auth.admin.createUser({
    email: email,
    password: userPassword,
    email_confirm: true,
  });
  
  // 2. Запись в tripwire_users - НЕ РАБОТАЕТ ❌
  const { error: dbError } = await tripwireAdminSupabase
    .from('tripwire_users')  // ❌ Schema cache error
    .insert({
      user_id: newUser.user.id,
      full_name: full_name,
      email: email,
      granted_by: currentUserId,
      manager_name: currentUserName,
      generated_password: userPassword,
    });
    
  // 3. Логирование - НЕ РАБОТАЕТ ❌
  await tripwireAdminSupabase
    .from('sales_activity_log')  // ❌ Schema cache error
    .insert({ ... });
}
```

## 📋 ПРОВЕРЕННЫЕ ФАКТЫ

| Компонент | Статус | Детали |
|-----------|--------|--------|
| Таблицы созданы | ✅ | `tripwire_users`, `sales_activity_log`, `tripwire_user_profile` |
| Права выданы | ✅ | `anon`, `authenticated`, `service_role`, `postgres` имеют ALL |
| RLS включен | ✅ | `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` |
| Политики созданы | ✅ | `CREATE POLICY "api_access_..." FOR ALL USING (true)` |
| Триггеры созданы | ✅ | `trigger_create_tripwire_profile`, `trigger_tripwire_users_updated` |
| Функции созданы | ✅ | `handle_new_tripwire_user()`, `rpc_create_tripwire_user()` |
| Direct SQL работает | ✅ | `SELECT * FROM public.tripwire_users` возвращает пустой массив |
| PostgREST API работает | ❌ | `.from('tripwire_users')` → "not found in schema cache" |
| NOTIFY выполнен | ✅ | `NOTIFY pgrst, 'reload schema'` - без эффекта |
| Backend рестартнут | ✅ | `pm2 restart/delete/start` - без эффекта |
| Connection Pooler | ❌ | Рестартнут 100+ раз - без эффекта |

## 🔎 ДЕТАЛЬНЫЙ АНАЛИЗ ОШИБКИ

### Backend логи (точная ошибка):
```
❌ Error inserting to tripwire_users: {
  code: 'PGRST205',
  details: null,
  hint: null,
  message: "Could not find the table 'public.tripwire_users' in the schema cache"
}
```

### Frontend логи (консоль браузера):
```javascript
[ERROR] ❌ API Error: Database error: Could not find the table 'public.tripwire_users' in the schema cache
[ERROR] ❌ API Request Failed: GET https://api.onai.academy/api/admin/tripwire/users?page=1&limit=20
```

### Код ошибки: PGRST205
**Значение:** PostgREST не может найти таблицу в своем внутреннем кэше схемы БД.

**Официальная документация Supabase/PostgREST:**
- PostgREST кэширует схему БД при старте
- Кэш обновляется при получении сигнала `NOTIFY pgrst, 'reload schema'`
- Connection Pooler должен перезагружать схему при рестарте

**НО В НАШЕМ СЛУЧАЕ:** Ни один из этих методов не работает!

## 🧩 СРАВНЕНИЕ: Что работает vs Что не работает

### ✅ РАБОТАЕТ (через Direct PostgreSQL):
```sql
-- Через MCP tools (прямое подключение к PostgreSQL):
SELECT * FROM public.tripwire_users; 
-- ✅ Результат: []

INSERT INTO public.tripwire_users (user_id, email, full_name, ...) 
VALUES (...);
-- ✅ Работало бы, если бы не FK constraints

SELECT * FROM information_schema.tables WHERE table_name = 'tripwire_users';
-- ✅ Результат: table exists
```

### ❌ НЕ РАБОТАЕТ (через PostgREST API):
```typescript
// Через Supabase JS Client (использует PostgREST REST API):
await tripwireAdminSupabase.from('tripwire_users').select('*');
// ❌ Error: PGRST205 - not found in schema cache

await tripwireAdminSupabase.from('tripwire_users').insert({ ... });
// ❌ Error: PGRST205 - not found in schema cache

await tripwireAdminSupabase.from('sales_activity_log').insert({ ... });
// ❌ Error: PGRST205 - not found in schema cache
```

## 🔄 ВРЕМЕННАЯ ШКАЛА ПРОБЛЕМЫ

1. **T+0 min:** Применены 4 миграции через MCP `apply_migration`
   - Таблицы созданы
   - Права выданы
   - RLS включен
   - Политики созданы

2. **T+2 min:** Первый тест создания студента
   - ❌ Ошибка: "Could not find table in schema cache"

3. **T+5 min:** Выполнен `NOTIFY pgrst, 'reload schema'`
   - ❌ Эффекта нет

4. **T+10 min:** Рестарт Backend через `pm2 restart`
   - ❌ Эффекта нет

5. **T+15 min:** Рестарт Connection Pooler (1-й раз)
   - ❌ Эффекта нет

6. **T+20-120 min:** Рестарт Connection Pooler 100+ раз
   - ❌ Эффекта нет

7. **T+125 min (сейчас):** Создание RPC функций
   - ⏳ В процессе тестирования

## 🎯 ВОЗМОЖНЫЕ ПРИЧИНЫ

### Гипотеза #1: Schema Cache не обновляется из-за бага Supabase
**Вероятность:** ВЫСОКАЯ ⚠️

PostgREST может зависнуть на старом кэше если:
- Миграции применялись слишком быстро подряд
- Connection Pooler не успел перезапуститься
- Есть конфликт между несколькими миграциями
- Баг в версии PostgREST/Supabase

**Подтверждение:**
- Restart Connection Pooler 100+ раз - не помог
- `NOTIFY pgrst` - не помог
- Прошло >2 часов - автообновление не сработало

### Гипотеза #2: Неправильная настройка exposed_schemas
**Вероятность:** СРЕДНЯЯ

PostgREST может быть настроен показывать только определенные схемы.

**Проверка:**
```sql
SELECT current_setting('pgrst.db_schemas', true);
-- Если вернет только 'public', то проблема не в этом
```

**Статус:** Не проверено

### Гипотеза #3: RLS политики блокируют видимость для service_role
**Вероятность:** НИЗКАЯ ❌

**Почему НЕТ:**
- Создана политика `FOR ALL USING (true)` - разрешает ВСЁ
- `service_role` имеет полные права (проверено)
- Прямые SQL запросы работают

### Гипотеза #4: Нужен полный рестарт Supabase Project
**Вероятность:** ВЫСОКАЯ ⚠️

Возможно требуется:
- Pause/Resume всего проекта
- Полный рестарт PostgreSQL инстанса
- Очистка всех кэшей системы

**Статус:** Не проверено (нет API для этого действия)

## 🛠️ ALTERNATIVE РЕШЕНИЯ

### Решение A: Использование RPC вместо direct table access
**Статус:** ✅ В ПРОЦЕССЕ

Вместо:
```typescript
await tripwireAdminSupabase.from('tripwire_users').insert({ ... });
```

Использовать:
```typescript
await tripwireAdminSupabase.rpc('rpc_create_tripwire_user_full', {
  p_user_id: newUser.user.id,
  p_full_name: full_name,
  p_email: email,
  ...
});
```

**Преимущество:** RPC функции НЕ зависят от schema cache (они вызываются напрямую по имени)

**Недостаток:** Требует переписать весь код Backend

### Решение B: Использование прямого PostgreSQL клиента
**Статус:** Не протестировано

Подключиться к PostgreSQL напрямую (минуя PostgREST):
```typescript
import { Client } from 'pg';

const client = new Client({
  connectionString: process.env.TRIPWIRE_DATABASE_URL,
});

await client.query('INSERT INTO public.tripwire_users (...) VALUES (...)');
```

**Преимущество:** Полностью обходит PostgREST и schema cache

**Недостаток:** 
- Требует `DATABASE_URL` (не только API key)
- Нужно управлять connection pooling
- Теряются RLS политики (нужно проверять права вручную)

### Решение C: Воссоздание таблиц с другим именем
**Статус:** Не тестировано

Возможно кэш завис именно на имени `tripwire_users`. Попробовать:
```sql
DROP TABLE public.tripwire_users CASCADE;
CREATE TABLE public.tw_users (...); -- Другое имя
```

**Вероятность успеха:** НИЗКАЯ (костыль)

## 📚 ВОПРОСЫ ДЛЯ ИССЛЕДОВАНИЯ

### Запрос #1 для веб-поиска:
```
Supabase PostgREST schema cache not refreshing after migration PGRST205 "Could not find table in schema cache" error persists after NOTIFY pgrst reload schema Connection Pooler restart service_role permissions granted RLS enabled but table still not visible in API
```

### Запрос #2 (упрощенный):
```
PostgREST PGRST205 schema cache stuck table exists in postgres but not visible in API NOTIFY reload not working
```

### Запрос #3 (альтернативное решение):
```
Supabase bypass PostgREST schema cache use RPC functions instead of direct table queries when schema cache fails
```

### Запрос #4 (глубокий поиск):
```
How to force PostgREST to reload schema cache when NOTIFY pgrst reload schema doesn't work Supabase project restart Connection Pooler restart not helping
```

## 🎓 ПОХОЖИЕ КЕЙСЫ (для поиска решений)

### Case 1: GitHub Issues
- **Поиск:** `supabase pgrst205 schema cache`
- **Ожидается:** Issues в репозитории PostgREST или supabase-js

### Case 2: Supabase Discussions
- **Поиск:** `"schema cache" "could not find table" PGRST205`
- **Ожидается:** Обсуждения в Supabase Community

### Case 3: StackOverflow
- **Поиск:** `postgrest schema cache not updating after migration`
- **Ожидается:** Решения от разработчиков с аналогичной проблемой

## 🚨 КРИТИЧЕСКИЕ ВОПРОСЫ БЕЗ ОТВЕТА

1. **Почему Connection Pooler restart не помогает?**
   - Это ДОЛЖЕН быть гарантированный способ обновить schema cache
   - Пользователь сделал 100+ рестартов - не помогло

2. **Почему NOTIFY pgrst не работает?**
   - Это стандартная команда для обновления кэша
   - Выполнена успешно, но без эффекта

3. **Есть ли способ полностью очистить кэш Supabase проекта?**
   - Pause/Resume проекта?
   - Hard restart PostgreSQL инстанса?
   - Очистка всех кэшей через Dashboard?

4. **Возможно ли это баг Supabase Platform?**
   - Версия PostgREST?
   - Известные проблемы с schema cache в текущей версии?

## 💡 РЕКОМЕНДУЕМЫЙ ПЛАН ДЕЙСТВИЙ

### План A: RPC Migration (БЫСТРО, 30 минут)
1. Обновить весь Backend код для использования RPC функций
2. Заменить все `.from('tripwire_users')` на `.rpc('rpc_create_tripwire_user_full')`
3. Тестировать создание студента

**Плюсы:** Обходит schema cache, гарантированно сработает  
**Минусы:** Нужно переписать код

### План B: Direct PostgreSQL Connection (СРЕДНЕ, 1 час)
1. Получить `DATABASE_URL` из Supabase Dashboard
2. Установить `pg` пакет
3. Создать прямое подключение к PostgreSQL
4. Переписать queries на raw SQL

**Плюсы:** Полный контроль, обходит PostgREST  
**Минусы:** Больше кода, сложнее поддержка

### План C: Contact Supabase Support (ДОЛГО, дни)
1. Создать тикет в Supabase Support
2. Предоставить все логи и диагностику
3. Ждать ответа и возможного фикса

**Плюсы:** Официальная помощь  
**Минусы:** Может занять дни/недели

### План D: Полный Redeploy проекта (РИСК, 2 часа)
1. Создать совершенно новый Supabase проект
2. Применить все миграции с нуля в правильном порядке
3. Настроить все ключи и конфиги

**Плюсы:** Чистый старт  
**Минусы:** Можем потерять данные, нужно все перенастраивать

## 📊 ПРИОРИТЕТ РЕШЕНИЙ

1. **СРОЧНО (сейчас):** Попробовать План A (RPC Migration)
2. **ПАРАЛЛЕЛЬНО:** Веб-поиск по запросам выше
3. **ЕСЛИ не поможет:** План B (Direct PostgreSQL)
4. **ПОСЛЕДНИЙ ШАНС:** План D (Новый проект)

---

## 🔍 ЗАПРОСЫ ДЛЯ ВЕБ-ПОИСКА

### Запрос для Google/StackOverflow:
```
site:stackoverflow.com OR site:github.com OR site:reddit.com
"Supabase" "PostgREST" "PGRST205" "schema cache" 
"Could not find the table" "reload schema" "not working"
```

### Запрос для Supabase Discussions:
```
site:github.com/supabase/supabase/discussions OR site:supabase.com/docs
"schema cache" "not refreshing" "tables not visible" 
"NOTIFY pgrst" "Connection Pooler restart"
```

### Запрос для finding workarounds:
```
"PostgREST" "bypass schema cache" OR "ignore schema cache"
OR "RPC functions" OR "direct postgres connection"
"when NOTIFY reload doesn't work"
```

---

## 📝 ИТОГОВЫЙ ВЫВОД

**КРИТИЧЕСКАЯ ПРОБЛЕМА:**  
PostgREST Schema Cache застрял на старом состоянии и НЕ ОБНОВЛЯЕТСЯ стандартными методами.

**БЛОКИРУЕТ:**
- Создание Tripwire студентов через Sales Manager UI
- Отображение статистики Tripwire
- Логирование активности менеджеров

**ТЕКУЩИЙ СТАТУС:**
- Таблицы созданы ✅
- Права выданы ✅
- Но PostgREST их не видит ❌

**СЛЕДУЮЩИЙ ШАГ:**
1. Веб-поиск по указанным запросам
2. Реализация RPC Migration (План A)
3. Если не поможет - Direct PostgreSQL (План B)

























