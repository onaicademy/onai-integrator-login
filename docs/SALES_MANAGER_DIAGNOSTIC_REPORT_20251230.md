# 🚨 КРИТИЧЕСКАЯ ДИАГНОСТИКА: Sales Manager Dashboard

**Дата:** 2025-12-30  
**База данных:** Tripwire Supabase (pjmvxecykysfrzppdcto.supabase.co)  
**Статус:** ❌ КРИТИЧЕСКИЕ ПРОБЛЕМЫ НАЙДЕНЫ

---

## 📋 Краткое резюме

**Sales Manager Dashboard не работает по следующим причинам:**

1. ❌ **Менеджеры не могут авторизоваться** - нет записей в `auth.users`
2. ❌ **RLS политики блокируют доступ** - менеджеры видят только свои записи
3. ❌ **Отсутствует интеграция между таблицами** - `traffic_users` не связана с `auth.users`

---

## 🔍 Детальная диагностика

### Проблема #1: Менеджеры не авторизуются

**Запрос:** Проверка связи между `traffic_users` и `auth.users`

```sql
SELECT 
  u.id,
  u.email,
  u.role,
  u.is_active,
  au.id AS auth_user_id,
  au.email AS auth_email,
  au.email_confirmed_at
FROM public.traffic_users u
LEFT JOIN auth.users au ON u.email = au.email
ORDER BY u.created_at DESC;
```

**Результат:**

| id | email | role | is_active | auth_user_id | auth_email | email_confirmed_at |
|-----|--------|------|-----------|--------------|-------------|-------------------|
| 23ea5ce0-fad1-4de1-8fe4-3bff64d44294 | admin@onai.academy | admin | true | **NULL** | **NULL** | **NULL** |
| 340087a2-c68d-43b2-af17-1a644a32a8e8 | arystan@onai.academy | targetologist | true | **NULL** | **NULL** | **NULL** |
| 297a3c45-355b-4cd3-acee-57d9491a6b43 | traft4@onai.academy | targetologist | true | **NULL** | **NULL** | **NULL** |
| 405c6e6b-12b8-4ff7-9f17-808551d81754 | muha@onai.academy | targetologist | true | **NULL** | **NULL** | **NULL** |
| f0decafb-8598-4671-9b02-bb097ae44452 | kenesary@onai.academy | targetologist | true | **NULL** | **NULL** | **NULL** |

**Вывод:** ❌ **Ни один менеджер не имеет записи в `auth.users`!**

---

### Проблема #2: RLS политики блокируют доступ

**Запрос:** Проверка RLS политик для Tripwire таблиц

```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('tripwire_users', 'sales_activity_log')
ORDER BY tablename, policyname;
```

**Критическая политика для `tripwire_users`:**

| policyname | roles | cmd | qual |
|------------|--------|-----|------|
| anon_no_access_tripwire_users | {anon} | ALL | false |
| authenticated_read_own_tripwire_users | {authenticated} | SELECT | **(auth.uid() = user_id)** ⚠️ |
| authenticated_update_own_tripwire_users | {authenticated} | UPDATE | **(auth.uid() = user_id)** ⚠️ |
| service_role_full_access_tripwire_users | {service_role} | ALL | true |

**Проблема:** ⚠️ Политика `authenticated_read_own_tripwire_users` с условием `auth.uid() = user_id` означает, что менеджер видит **ТОЛЬКО** тех студентов, которых он сам создал!

**Критический сценарий:**
- Менеджер Arystan создал студента Student1 → видит Student1 ✅
- Менеджер Kenesary создал студента Student2 → видит Student2 ✅
- Менеджер Arystan НЕ видит Student2 ❌ (хотя должен видеть всех!)
- Менеджер Kenesary НЕ видит Student1 ❌ (хотя должен видеть всех!)

---

### Проблема #3: Архитектурный конфликт

**Текущая архитектура:**

```
┌─────────────────────────────────────────────────────────────┐
│  traffic_users (менеджеры)                          │
│  ├─ admin@onai.academy (нет в auth.users!)         │
│  ├─ arystan@onai.academy (нет в auth.users!)        │
│  ├─ muha@onai.academy (нет в auth.users!)            │
│  ├─ traft4@onai.academy (нет в auth.users!)          │
│  └─ kenesary@onai.academy (нет в auth.users!)         │
└─────────────────────────────────────────────────────────────┘
                         ❌ НЕ СВЯЗАНЫ С auth.users
                         
┌─────────────────────────────────────────────────────────────┐
│  auth.users (Supabase Auth)                         │
│  ├─ (пусто для менеджеров!)                        │
│  └─ (заполнено только для студентов)                 │
└─────────────────────────────────────────────────────────────┘
                    ↓ auth.uid() возвращает NULL для менеджеров
                         
┌─────────────────────────────────────────────────────────────┐
│  tripwire_users (студенты)                          │
│  ├─ student1 (granted_by = arystan)               │
│  ├─ student2 (granted_by = kenesary)               │
│  └─ ...                                             │
└─────────────────────────────────────────────────────────────┘
         ↓ RLS политика: auth.uid() = user_id
         ↓ Менеджер видит только СВОИХ студентов!
```

---

## 🎯 RPC функции (созданы ✅)

| RPC функция | Статус | Назначение |
|------------|----------|-------------|
| rpc_create_tripwire_user_full | ✅ Создана | Создает студента в tripwire_users |
| rpc_get_tripwire_users | ✅ Создана | Получает список студентов |
| rpc_get_tripwire_stats | ✅ Создана | Статистика по студентам |
| rpc_get_sales_activity_log | ✅ Создана | История действий менеджера |
| rpc_get_sales_leaderboard | ✅ Создана | Рейтинг менеджеров |
| rpc_get_sales_chart_data | ✅ Создана | Данные для графиков |
| rpc_update_email_status | ✅ Создана | Обновляет статус email |
| rpc_update_tripwire_user_status | ✅ Создана | Обновляет статус студента |

---

## 📊 Статистика базы данных

### tripwire_users (студенты)
- **Всего записей:** 92
- **RLS включен:** ✅ true
- **RLS политик:** 4
- **FK constraints:** 1 (user_id → auth.users.id)

### sales_activity_log (логи)
- **Всего записей:** 27
- **RLS включен:** ✅ true
- **RLS политик:** 1 (api_access_sales_log с qual="true") ✅

### traffic_users (менеджеры)
- **Всего записей:** 5
- **RLS включен:** ✅ true
- **FK constraints:** 1 (user_id → auth.users.id) ⚠️ НО НЕ СВЯЗАНЫ!

---

## 🚨 Критические ошибки в логах

**Ошибка из браузера:**
```
❌ Supabase auth error: AuthApiError: Invalid login credentials
pjmvxecykysfrzppdcto.supabase.co/auth/v1/token?grant_type=password:1
```

**Причина:** Менеджеры пытаются войти через `signInWithPassword()`, но у них нет записей в `auth.users`!

---

## 💡 Решения

### Решение #1: Создать записи в auth.users для менеджеров (РЕКОМЕНДУЕТСЯ)

**SQL скрипт для создания менеджеров в auth.users:**

```sql
-- Создаем менеджеров в auth.users
-- ВАЖНО: Это нужно выполнить через Supabase Management API или Service Role!

-- 1. Admin
INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
VALUES (
  gen_random_uuid(),
  'admin@onai.academy',
  NOW(),
  NOW(),
  NOW(),
  '{"role": "admin", "platform": "traffic_dashboard"}'::jsonb
) ON CONFLICT (email) DO NOTHING;

-- 2. Arystan
INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
VALUES (
  gen_random_uuid(),
  'arystan@onai.academy',
  NOW(),
  NOW(),
  NOW(),
  '{"role": "targetologist", "platform": "traffic_dashboard"}'::jsonb
) ON CONFLICT (email) DO NOTHING;

-- 3. Muha
INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
VALUES (
  gen_random_uuid(),
  'muha@onai.academy',
  NOW(),
  NOW(),
  NOW(),
  '{"role": "targetologist", "platform": "traffic_dashboard"}'::jsonb
) ON CONFLICT (email) DO NOTHING;

-- 4. Traft4
INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
VALUES (
  gen_random_uuid(),
  'traft4@onai.academy',
  NOW(),
  NOW(),
  NOW(),
  '{"role": "targetologist", "platform": "traffic_dashboard"}'::jsonb
) ON CONFLICT (email) DO NOTHING;

-- 5. Kenesary
INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
VALUES (
  gen_random_uuid(),
  'kenesary@onai.academy',
  NOW(),
  NOW(),
  NOW(),
  '{"role": "targetologist", "platform": "traffic_dashboard"}'::jsonb
) ON CONFLICT (email) DO NOTHING;
```

**Примечание:** Пароли для менеджеров нужно создать отдельно через Supabase Management API.

---

### Решение #2: Изменить RLS политики для менеджеров

**Текущая политика (проблемная):**
```sql
CREATE POLICY authenticated_read_own_tripwire_users
ON public.tripwire_users
FOR SELECT
TO authenticated
USING (auth.uid() = user_id); -- ⚠️ Только свои записи!
```

**Исправленная политика:**
```sql
-- Вариант A: Менеджеры видят всех студентов
CREATE POLICY managers_read_all_tripwire_users
ON public.tripwire_users
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM traffic_users
    WHERE traffic_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Вариант B: Админы видят всех, менеджеры - своих
CREATE POLICY authenticated_read_tripwire_users_v2
ON public.tripwire_users
FOR SELECT
TO authenticated
USING (
  -- Админы видят всех
  (SELECT role FROM auth.users WHERE id = auth.uid()) = 'admin'
  OR
  -- Менеджеры видят всех (если это Sales Manager Dashboard)
  EXISTS (
    SELECT 1 FROM traffic_users
    WHERE traffic_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);
```

---

### Решение #3: Использовать Service Role для менеджеров

**Backend код:** Использовать `service_role` вместо `authenticated` для операций менеджеров:

```typescript
// В tripwireManagerService.ts
const { data, error } = await tripwireAdminSupabase
  .from('tripwire_users')
  .select('*')
  .eq('granted_by', managerId); // Фильтр по granted_by вместо RLS
```

**RLS политика для service_role:**
```sql
CREATE POLICY service_role_full_access_tripwire_users
ON public.tripwire_users
FOR ALL
TO service_role
USING (true); -- service_role видит всё
```

---

## 📝 План исправления

### Шаг 1: Создать записи в auth.users для менеджеров
- [ ] Создать UUID для каждого менеджера
- [ ] Создать записи в `auth.users` через Supabase Management API
- [ ] Установить пароли для менеджеров
- [ ] Проверить, что менеджеры могут войти

### Шаг 2: Обновить RLS политики
- [ ] Изменить политику `authenticated_read_own_tripwire_users`
- [ ] Добавить политику `managers_read_all_tripwire_users`
- [ ] Проверить, что менеджеры видят всех студентов

### Шаг 3: Тестирование
- [ ] Проверить вход менеджеров
- [ ] Проверить просмотр списка студентов
- [ ] Проверить создание нового студента
- [ ] Проверить обновление статуса студента

---

## 🎉 Заключение

**Корневая причина проблемы:** Архитектурный конфликт между `traffic_users` и `auth.users`

**Менеджеры не могут работать, потому что:**
1. ❌ Нет записей в `auth.users` → не могут авторизоваться
2. ❌ RLS политики блокируют доступ → видят только своих студентов
3. ❌ RPC функции используют `auth.uid()` → возвращает NULL для менеджеров

**Необходимо срочно:**
1. Создать записи в `auth.users` для всех менеджеров
2. Изменить RLS политики для доступа к `tripwire_users`
3. Протестировать Sales Manager Dashboard

---

**Дата диагностики:** 2025-12-30 10:15 UTC  
**Исполнитель:** GLM 4.7 MCP Agent
