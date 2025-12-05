# 🔴 КРИТИЧЕСКАЯ ПРОБЛЕМА: PostgREST не видит RPC функции в Supabase

## 📌 КРАТКОЕ ОПИСАНИЕ ПРОБЛЕМЫ

Мы создали 5 RPC функций в PostgreSQL через Supabase, но PostgREST **НЕ МОЖЕТ ИХ НАЙТИ** в schema cache, несмотря на то что функции **СУЩЕСТВУЮТ В БАЗЕ ДАННЫХ**.

**Ошибка:**
```
RPC error: Could not find the function public.rpc_get_sales_activity_log(p_end_date, p_limit, p_manager_id, p_start_date) in the schema cache
```

---

## 🏗️ КОНТЕКСТ ПРОЕКТА

- **Backend**: Node.js + TypeScript + Express
- **Database**: Supabase (PostgreSQL 15)
- **ORM/Client**: @supabase/supabase-js (v2)
- **Проблема**: PostgREST schema cache не обновляется

---

## 🔍 ЧТО МЫ УЖЕ СДЕЛАЛИ

### 1️⃣ Проверили что функции существуют в БД

```sql
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'rpc_get_sales_activity_log'
LIMIT 1;
```

**Результат: ✅ Функция ЕСТЬ в базе:**
```
function_name: rpc_get_sales_activity_log
arguments: p_end_date TIMESTAMPTZ DEFAULT NULL, p_limit INTEGER DEFAULT 20, p_manager_id UUID DEFAULT NULL, p_start_date TIMESTAMPTZ DEFAULT NULL
```

---

### 2️⃣ Попытка #1: Использовали `NOTIFY pgrst, 'reload schema';`

```sql
-- В конце SQL миграции
NOTIFY pgrst, 'reload schema';
```

**Результат: ❌ НЕ ПОМОГЛО**

---

### 3️⃣ Попытка #2: Пересоздали функции с параметрами в АЛФАВИТНОМ ПОРЯДКЕ

**Причина:** PostgREST сортирует параметры алфавитно при поиске функции.

**БЫЛО (неправильный порядок):**
```sql
CREATE OR REPLACE FUNCTION public.rpc_get_sales_activity_log(
  p_manager_id UUID DEFAULT NULL,     -- M
  p_limit INTEGER DEFAULT 20,         -- L
  p_start_date TIMESTAMPTZ DEFAULT NULL, -- S
  p_end_date TIMESTAMPTZ DEFAULT NULL    -- E
)
```

**СТАЛО (алфавитный порядок E, L, M, S):**
```sql
CREATE OR REPLACE FUNCTION public.rpc_get_sales_activity_log(
  p_end_date TIMESTAMPTZ DEFAULT NULL,    -- E
  p_limit INTEGER DEFAULT 20,              -- L
  p_manager_id UUID DEFAULT NULL,          -- M
  p_start_date TIMESTAMPTZ DEFAULT NULL    -- S
)
RETURNS TABLE (...)
AS $$
BEGIN
  RETURN QUERY
  SELECT ...
  FROM public.sales_activity_log sal
  WHERE 
    (p_manager_id IS NULL OR sal.manager_id = p_manager_id)
    AND (p_start_date IS NULL OR sal.created_at >= p_start_date)
    AND (p_end_date IS NULL OR sal.created_at <= p_end_date)
  ORDER BY sal.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.rpc_get_sales_activity_log(TIMESTAMPTZ, INTEGER, UUID, TIMESTAMPTZ) TO authenticated, anon, service_role;

NOTIFY pgrst, 'reload schema';
```

**Результат: ❌ ВСЁ ЕЩЁ НЕ РАБОТАЕТ**

---

### 4️⃣ Попытка #3: Перезапустили Backend сервер

```bash
pkill -f "npm run dev"
npm run dev
```

**Результат: ❌ НЕ ПОМОГЛО**

---

### 5️⃣ Попытка #4: Hard reload браузера с очисткой кэша

```javascript
location.reload(true);
```

**Результат: ❌ НЕ ПОМОГЛО**

---

## 📝 КОД ВЫЗОВА RPC НА BACKEND

```typescript
// backend/src/services/tripwireManagerService.ts
import { tripwireAdminSupabase } from '../config/supabase-tripwire';

export async function getSalesActivityLog(
  managerId: string, 
  limit = 50, 
  startDate?: string, 
  endDate?: string
) {
  try {
    const { data, error } = await tripwireAdminSupabase.rpc('rpc_get_sales_activity_log', {
      p_manager_id: managerId,
      p_limit: limit,
      p_start_date: startDate || null,
      p_end_date: endDate || null,
    });

    if (error) {
      throw new Error(`RPC error: ${error.message}`);
    }

    return data;
  } catch (error: any) {
    console.error('❌ Error in getSalesActivityLog:', error);
    throw error;
  }
}
```

---

## 🔧 КОНФИГУРАЦИЯ SUPABASE CLIENT

```typescript
// backend/src/config/supabase-tripwire.ts
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.TRIPWIRE_SUPABASE_URL;
const supabaseKey = process.env.TRIPWIRE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing TRIPWIRE_SUPABASE_URL or TRIPWIRE_SERVICE_ROLE_KEY');
}

export const tripwireAdminSupabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
```

---

## ❌ ТЕКУЩАЯ ОШИБКА

**В логах Backend:**
```
RPC error: Could not find the function public.rpc_get_sales_activity_log(p_end_date, p_limit, p_manager_id, p_start_date) in the schema cache
```

**В логах Frontend (browser console):**
```
❌ API Error: RPC error: Could not find the function public.rpc_get_sales_activity_log(p_end_date, p_limit, p_manager_id, p_start_date) in the schema cache
```

---

## 📊 СПИСОК ВСЕХ ПРОБЛЕМНЫХ RPC ФУНКЦИЙ

1. `rpc_get_sales_leaderboard()` - БЕЗ параметров
2. `rpc_get_sales_activity_log(p_end_date, p_limit, p_manager_id, p_start_date)`
3. `rpc_get_sales_chart_data(p_end_date, p_manager_id, p_start_date)`
4. `rpc_get_tripwire_stats(p_end_date, p_manager_id, p_start_date)`
5. `rpc_get_tripwire_users(p_end_date, p_limit, p_manager_id, p_page, p_start_date, p_status)`

**ВСЕ 5 функций имеют одну и ту же проблему!**

---

## 🤔 ВОЗМОЖНЫЕ ПРИЧИНЫ (наши гипотезы)

1. **PostgREST cache не обновляется автоматически**
   - `NOTIFY pgrst, 'reload schema';` не работает
   - Нужен другой способ очистки кэша?

2. **Проблема с типами данных параметров**
   - Может PostgREST не понимает типы `TIMESTAMPTZ`, `UUID`?

3. **Проблема с DEFAULT значениями**
   - Может PostgREST не работает с параметрами у которых есть DEFAULT?

4. **Проблема с правами доступа**
   - Хотя мы сделали `GRANT EXECUTE ... TO authenticated, anon, service_role`

5. **Версия PostgREST устарела?**
   - Может в Supabase используется старая версия PostgREST?

---

## ❓ НАШИ ВОПРОСЫ К PERPLEXITY

1. **Как правильно обновить PostgREST schema cache в Supabase?**
   - Работает ли `NOTIFY pgrst, 'reload schema';` в Supabase?
   - Есть ли другие способы?

2. **Есть ли особые требования PostgREST к RPC функциям?**
   - Должны ли параметры быть СТРОГО в алфавитном порядке?
   - Какие типы данных поддерживаются?
   - Есть ли проблемы с DEFAULT значениями?

3. **Как правильно вызывать RPC функции через Supabase JS Client v2?**
   - Правильно ли мы передаем параметры?
   - Нужно ли указывать типы явно?

4. **Есть ли известные баги PostgREST/Supabase с RPC функциями?**
   - Может это известная проблема?
   - Есть ли workarounds?

5. **Можно ли вообще использовать RPC с параметрами в алфавитном порядке через Supabase JS Client?**
   - Или нужно использовать другой подход?

---

## 🎯 ЧТО МЫ ХОТИМ ПОЛУЧИТЬ

1. **Четкое объяснение** почему PostgREST не видит наши функции
2. **Пошаговую инструкцию** как исправить проблему
3. **Working example** правильного создания и вызова RPC функции в Supabase
4. **Best practices** для работы с RPC в Supabase

---

## 📎 ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ

- **Supabase Project**: Production instance (не self-hosted)
- **PostgreSQL Version**: 15.x
- **@supabase/supabase-js**: ^2.x
- **Node.js**: v18+
- **TypeScript**: 5.x

---

## 🆘 СРОЧНОСТЬ

**КРИТИЧЕСКАЯ!** Весь Sales Dashboard не работает без этих RPC функций. Блокирует production deployment.

