# 🔥 КРИТИЧЕСКАЯ ПРОБЛЕМА: Database Trigger НЕ СРАБАТЫВАЕТ на auth.users в Supabase

## 📊 КОНТЕКСТ

**Платформа:** Supabase (PostgreSQL 15.1)  
**База данных:** Tripwire DB (pjmvxecykysfrzppdcto.supabase.co)  
**Проблема:** Database trigger `on_auth_user_created_tripwire` НЕ СРАБАТЫВАЕТ при создании пользователя через Supabase Admin API

---

## 🎯 ЧТО МЫ ПЫТАЕМСЯ СДЕЛАТЬ

Автоматически инициализировать все связанные таблицы (`tripwire_users`, `tripwire_user_profile`, `module_unlocks`, `student_progress`, `user_achievements`, `user_statistics`) когда создаётся новый пользователь в `auth.users` через:

```typescript
const { data, error } = await supabaseAdmin.auth.admin.createUser({
  email: 'test@example.com',
  password: 'Password123',
  email_confirm: true,
  user_metadata: {
    full_name: 'Test User',
    platform: 'tripwire',
    granted_by: 'manager-uuid',
    manager_name: 'Sales Manager'
  }
});
```

---

## ✅ ЧТО МЫ УЖЕ СДЕЛАЛИ (на основе предыдущего Perplexity research)

### 1. TRIGGER FUNCTION с `SECURITY DEFINER` + `RAISE LOG`

```sql
CREATE OR REPLACE FUNCTION public.handle_new_tripwire_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER  -- ✅ Используем!
SET search_path = ''  -- ✅ Используем!
AS $$
DECLARE
  v_manager_id UUID;
  v_manager_name TEXT;
  v_full_name TEXT;
  v_platform TEXT;
  v_lesson RECORD;
BEGIN
  -- ✅ DEBUGGING: Log trigger fired!
  RAISE LOG 'Tripwire trigger fired for email: %', NEW.email;  -- ✅ Добавили!
  
  -- Extract metadata with FALLBACK defaults
  v_platform := COALESCE(NEW.raw_user_meta_data->>'platform', 'manual');
  v_manager_id := (NEW.raw_user_meta_data->>'granted_by')::UUID;
  v_manager_name := COALESCE(NEW.raw_user_meta_data->>'manager_name', 'Manual Entry');
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  
  RAISE LOG 'Extracted metadata - platform: %, manager: %, name: %', v_platform, v_manager_name, v_full_name;
  
  -- Skip admin/sales users
  IF (NEW.raw_app_meta_data->>'role' IN ('admin', 'sales', 'sales_manager')) THEN
    RAISE LOG 'Skipping initialization for admin/sales user: %', NEW.email;
    RETURN NEW;
  END IF;
  
  RAISE LOG 'Starting initialization for student: %', NEW.email;
  
  -- ✅ Idempotent insertions with ON CONFLICT DO NOTHING
  -- Step 1: public.users
  INSERT INTO public.users (id, email, full_name, role, created_at, updated_at)
  VALUES (NEW.id, NEW.email, v_full_name, 'student', NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, updated_at = NOW();
  
  RAISE LOG 'Created public.users record';
  
  -- Step 2: tripwire_users
  INSERT INTO public.tripwire_users (
    id, user_id, email, full_name, granted_by, manager_name,
    status, modules_completed, price, created_at
  )
  VALUES (
    gen_random_uuid(), NEW.id, NEW.email, v_full_name, v_manager_id, v_manager_name,
    'active', 0, 5000, NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RAISE LOG 'Created tripwire_users record';
  
  -- [... еще 6 таблиц с аналогичными INSERT + RAISE LOG ...]
  
  RAISE LOG '✅ Tripwire user fully initialized: %', NEW.email;
  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '❌ Tripwire initialization FAILED for %: % (SQLSTATE: %)', 
      NEW.email, SQLERRM, SQLSTATE;
    RETURN NEW;  -- ✅ НЕ блокируем signup!
END;
$$;
```

### 2. GRANTED ALL PERMISSIONS (включая для `supabase_auth_admin`)

```sql
-- ✅ Function permissions
GRANT EXECUTE ON FUNCTION public.handle_new_tripwire_user TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_tripwire_user TO supabase_auth_admin;  -- ✅ Добавили!
GRANT EXECUTE ON FUNCTION public.handle_new_tripwire_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_tripwire_user TO anon;

-- ✅ CRITICAL: Table permissions для supabase_auth_admin!
GRANT SELECT, INSERT, UPDATE ON public.users TO supabase_auth_admin;
GRANT SELECT, INSERT, UPDATE ON public.tripwire_users TO supabase_auth_admin;
GRANT SELECT, INSERT, UPDATE ON public.tripwire_user_profile TO supabase_auth_admin;
GRANT SELECT, INSERT, UPDATE ON public.module_unlocks TO supabase_auth_admin;
GRANT SELECT, INSERT, UPDATE ON public.student_progress TO supabase_auth_admin;
GRANT SELECT, INSERT, UPDATE ON public.user_achievements TO supabase_auth_admin;
GRANT SELECT, INSERT, UPDATE ON public.user_statistics TO supabase_auth_admin;
GRANT SELECT, INSERT, UPDATE ON public.sales_activity_log TO supabase_auth_admin;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO supabase_auth_admin;
```

### 3. RE-CREATED TRIGGER

```sql
DROP TRIGGER IF EXISTS on_auth_user_created_tripwire ON auth.users;

CREATE TRIGGER on_auth_user_created_tripwire
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_tripwire_user();
```

### 4. VERIFIED TRIGGER IS ENABLED

```sql
SELECT tgname, tgenabled, tgisinternal
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created_tripwire';

-- Результат:
-- trigger_name: on_auth_user_created_tripwire
-- enabled: O  ← "Origin/Always" = ENABLED!
-- is_internal: false
```

---

## ❌ ПРОБЛЕМА: TRIGGER **НЕ СРАБАТЫВАЕТ**!

### Тестовый сценарий:

1. **Frontend отправляет POST запрос:**
   - URL: `http://localhost:3000/api/admin/tripwire/users`
   - Body: `{ full_name: "Test Final User", email: "testfinal@tripwire.test", password: "@qxHRqBJgWnB" }`
   - ✅ **Network logs ПОДТВЕРЖДАЮТ: `[POST] http://localhost:3000/api/admin/tripwire/users`**

2. **Backend controller вызывает:**
   ```typescript
   // backend/src/services/tripwireManagerService.ts
   const { data: newUser, error: createError } = await tripwireAdminSupabase.auth.admin.createUser({
     email: email,
     password: password,
     email_confirm: true,
     user_metadata: {
       full_name: full_name,
       platform: 'tripwire',
       granted_by: currentUserId,
       manager_name: currentUserName || currentUserEmail,
     },
     app_metadata: {
       role: 'student',
     },
   });
   ```

3. **Frontend показывает:**
   - ✅ "АККАУНТ СОЗДАН!"
   - ✅ Email: testfinal@tripwire.test
   - ✅ Password: @qxHRqBJgWnB

4. **НО при проверке БД:**
   ```sql
   SELECT * FROM auth.users WHERE email = 'testfinal@tripwire.test';
   -- Результат: [] (ПУСТО!)
   
   SELECT * FROM public.tripwire_users WHERE email = 'testfinal@tripwire.test';
   -- Результат: [] (ПУСТО!)
   ```

5. **PostgreSQL logs (Dashboard > Logs > Postgres):**
   - ❌ **НЕТ НИ ОДНОГО `RAISE LOG 'Tripwire trigger fired'`**!
   - ❌ НЕТ `RAISE WARNING` об ошибках!
   - ✅ Есть только логи CREATE TRIGGER и GRANT statements (от нас)

---

## 🔍 КРИТИЧЕСКИЕ ВОПРОСЫ ДЛЯ RESEARCH

### 1. **Работает ли ВООБЩЕ trigger на `auth.users` при создании через Admin API?**

**Гипотеза:** Supabase Admin API (`supabaseAdmin.auth.admin.createUser()`) **НЕ ТРИГГЕРИТ** triggers на `auth.users` из-за особенностей GoTrue (auth сервис Supabase).

**Ищем:**
- GitHub issues про triggers на `auth.users` НЕ срабатывающие при `admin.createUser()`
- Reddit/StackOverflow кейсы с рабочими triggers на `auth.users`
- Официальная Supabase документация о triggers на `auth` schema
- Альтернативы: Database Webhooks, RPC functions, Edge Functions

### 2. **Если trigger НЕ СРАБАТЫВАЕТ, какая PRODUCTION-READY альтернатива?**

**Варианты:**
- **Database Webhooks** (Supabase Database Webhooks feature)
- **Edge Functions** вызываемые после `createUser`
- **RPC function** вызываемая после `createUser` (но это не автоматично)
- **Trigger на UPDATE** вместо INSERT (если GoTrue обновляет после создания)

### 3. **Почему в PostgreSQL logs НЕТ НИКАКИХ traces?**

**Даже `RAISE WARNING` НЕТ!** Это означает что trigger:
- Либо НЕ СРАБАТЫВАЕТ вообще
- Либо срабатывает в ДРУГОМ контексте (другой DB instance, другой schema)

### 4. **Почему пользователь НЕ ОСТАЁТСЯ в `auth.users`?**

Frontend показал success, но пользователя НЕТ в БД! Возможно:
- Транзакция откатилась (rollback)?
- Пользователь создался и УДАЛИЛСЯ автоматически?
- Создание произошло в ДРУГОЙ БД (Main vs Tripwire confusion)?

---

## 📚 ИСТОЧНИКИ ДЛЯ RESEARCH

### Must-read GitHub Issues:
1. https://github.com/supabase/supabase/issues/17186 (SECURITY DEFINER solution)
2. https://github.com/supabase/cli/issues/3795 (CLI не включает auth triggers)
3. https://github.com/orgs/supabase/discussions/7317 (Production user creation)
4. https://github.com/orgs/supabase/discussions/20714 (Trigger timing на auth.users)

### Reddit/StackOverflow:
- https://www.reddit.com/r/Supabase/comments/1if4ugx/what_is_the_best_way_to_debug_your_trigger/
- https://stackoverflow.com/questions/77600776/trigger-function-permissions-issue-in-supabase
- https://www.reddit.com/r/Supabase/comments/16uiokd/why_cant_i_create_a_trigger_on_authusers_table/

### Ключевые запросы для Perplexity:
- "supabase trigger on auth.users not firing admin.createUser"
- "supabase database webhook vs trigger auth.users"
- "supabase GoTrue triggers after insert auth schema"
- "supabase trigger not working on auth.users production"
- "alternative to trigger on auth.users supabase"

---

## 🎯 ЧТО МЫ ИЩЕМ

### ИДЕАЛЬНОЕ РЕШЕНИЕ должно включать:

1. ✅ **Working code examples** с GitHub/StackOverflow (НЕ теория!)
2. ✅ **Production-tested** (кто-то использует в реальном проекте)
3. ✅ **Automatic** (не требует ручного вызова RPC после каждого signup)
4. ✅ **Reliable** (100% гарантия срабатывания)
5. ✅ **Idempotent** (можно запустить несколько раз без дублей)

### ВАРИАНТЫ РЕШЕНИЯ (в порядке предпочтения):

**Вариант A: FIX TRIGGER**
- Почему trigger не срабатывает?
- Нужно ли что-то ещё кроме `SECURITY DEFINER` и permissions?
- Работает ли `AFTER UPDATE` вместо `AFTER INSERT`?

**Вариант B: DATABASE WEBHOOKS**
- Supabase Database Webhooks на `auth.users` INSERT
- Вызов Edge Function или External API
- Примеры кода

**Вариант C: EDGE FUNCTION**
- Auth Hooks (preview feature)
- Custom endpoint после signup
- Примеры интеграции

**Вариант D: HYBRID APPROACH**
- Trigger + Backfill RPC + Manual init RPC (уже есть)
- НО trigger должен работать!

---

## 💡 ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ

### Наша архитектура:

```
Frontend (React)
    ↓ POST /api/admin/tripwire/users
Backend (Express + TypeScript)
    ↓ tripwireAdminSupabase.auth.admin.createUser()
Supabase Admin API (GoTrue)
    ↓ INSERT INTO auth.users
    ↓ ❌ Trigger НЕ СРАБАТЫВАЕТ!
PostgreSQL (auth.users table)
```

### Environment:
- **Node.js Backend:** Express + @supabase/supabase-js v2
- **Supabase Client:** Service Role Key (admin access)
- **Database:** PostgreSQL 15.1 (Supabase-hosted)
- **Auth:** Supabase Auth (GoTrue)

---

## 🚨 КРИТИЧЕСКАЯ ВАЖНОСТЬ

Без работающего trigger мы **НЕ МОЖЕМ**:
1. ❌ Автоматически инициализировать студентов
2. ❌ Гарантировать консистентность данных
3. ❌ Запускать продукт в production (студенты будут без доступа к контенту)

**ЭТО БЛОКЕР ДЛЯ ЗАПУСКА!** 🔥

---

## 📝 ЗАПРОС К PERPLEXITY

**Пожалуйста, сделай ГЛУБОКИЙ research по этой проблеме:**

1. **Найди РЕАЛЬНЫЕ working solutions** из GitHub, Reddit, StackOverflow
2. **Объясни ПОЧЕМУ** trigger не срабатывает на `auth.users` при `admin.createUser()`
3. **Предложи ЛУЧШУЮ альтернативу** если trigger невозможен
4. **Покажи PRODUCTION-READY код** который 100% работает
5. **Укажи источники** для каждого утверждения

**Фокус на:**
- Supabase Production best practices
- Auth triggers vs webhooks vs edge functions
- Real-world examples (не теория!)
- Step-by-step implementation

**Спасибо!** 🙏

