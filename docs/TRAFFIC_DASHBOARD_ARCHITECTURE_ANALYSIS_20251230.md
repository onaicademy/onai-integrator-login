# 🏗️ АРХИТЕКТУРНЫЙ АНАЛИЗ: Traffic Dashboard vs Tripwire Sales Manager

**Дата:** 2025-12-30  
**Статус:** ❌ КРИТИЧЕСКАЯ АРХИТЕКТУРНАЯ ПРОБЛЕМА

---

## 📋 Краткое резюме

**Обнаружено:** Sales Manager Dashboard и Traffic Dashboard используют **ДВЕ РАЗНЫЕ Supabase базы данных**:

1. **Tripwire БД** (pjmvxecykysfrzppdcto.supabase.co)
   - Для Sales Manager Dashboard
   - Содержит студентов Tripwire
   - Таблица: `tripwire_users` (92 записи)

2. **Traffic Dashboard БД** (oetodaexnjcunklkdlkv.supabase.co)
   - Для таргетологов
   - Таблица: `traffic_users` (5 записей - менеджеры)
   - **В Tripwire БД НЕТ таблицы `traffic_users`!**

---

## 🚨 Критическая проблема

### Проблема: Архитектурный разрыв между двумя БД

**Сценарий:**
```
┌─────────────────────────────────────────────────────────┐
│  Traffic Dashboard БД (oetodaexnjcunklkdlkv)    │
│  ├─ traffic_users (5 менеджеров)                     │
│  ├─ admin@onai.academy                         │
│  ├─ arystan@onai.academy                        │
│  ├─ muha@onai.academy                           │
│  ├─ traft4@onai.academy                          │
│  └─ kenesary@onai.academy                       │
└─────────────────────────────────────────────────────────┘
           ❌ НЕ СВЯЗАНЫ с auth.users Tripwire БД
           ↓ Менеджеры авторизуются через traffic_users
           
┌─────────────────────────────────────────────────────────┐
│  Tripwire БД (pjmvxecykysfrzppdcto)         │
│  ├─ tripwire_users (92 студента)                   │
│  ├─ student1 (granted_by = arystan)              │
│  ├─ student2 (granted_by = kenesary)              │
│  └─ ...                                             │
└─────────────────────────────────────────────────────────┘
           ↓ Студенты создаются через auth.users Tripwire БД
           ↓ RLS политики: auth.uid() = user_id
           
┌─────────────────────────────────────────────────────────┐
│  auth.users (Supabase Auth Tripwire БД)         │
│  ├─ (пусто для менеджеров!)                    │
│  └─ (заполнено только для студентов)              │
└─────────────────────────────────────────────────────────┘
           ↓ auth.uid() возвращает NULL для менеджеров
           ↓ Менеджеры НЕ могут видеть студентов!
```

---

## 📊 Детальная диагностика

### 1. Структура Tripwire БД

**Таблица `tripwire_users` (92 записи):**

| Колонка | Тип | Назначение |
|----------|-----|-------------|
| id | uuid | Первичный ключ |
| user_id | uuid (nullable) | FK на auth.users.id |
| full_name | text | Имя студента |
| email | text (unique) | Email студента |
| granted_by | uuid (nullable) | **ID менеджера, который создал студента** ⭐ |
| manager_name | text (nullable) | Имя менеджера для отображения |
| generated_password | text (nullable) | Пароль студента |
| password_changed | boolean | Изменен ли пароль |
| welcome_email_sent | boolean | Отправлен ли welcome email |
| welcome_email_sent_at | timestamptz | Время отправки email |
| email_opened | boolean | Открыт ли email |
| first_login_at | timestamptz | Первый вход |
| last_active_at | timestamptz | Последняя активность |
| modules_completed | integer | Количество пройденных модулей |
| status | text | Статус: active, inactive, completed, blocked |
| amocrm_deal_id | text | ID сделки в AmoCRM |
| amocrm_contact_id | text | ID контакта в AmoCRM |
| price | integer | Цена курса (5000 KZT) |
| onboarding_completed | boolean | Пройден ли онбординг |
| onboarding_completed_at | timestamptz | Время прохождения онбординга |
| phone | varchar | Телефон |
| maintenance_notification_sent | boolean | Отправлено ли уведомление о техработах |
| maintenance_notification_sent_at | timestamptz | Время отправки уведомления |

**Ключевые наблюдения:**
- ✅ Колонка `granted_by` (UUID) связывает студента с менеджером
- ✅ Колонка `manager_name` (TEXT) хранит имя менеджера для отображения
- ❌ Колонка `user_id` может быть NULL (для старых записей)

---

### 2. Структура Traffic Dashboard БД

**Таблица `traffic_users` (5 записей):**

| Колонка | Тип | Назначение |
|----------|-----|-------------|
| id | uuid | Первичный ключ |
| email | text (unique) | Email для входа |
| password_hash | text | Bcrypt хэш пароля |
| full_name | text | Имя таргетолога |
| team_name | text | Название команды |
| role | text | Роль: targetologist, admin, manager |
| avatar_url | text | URL аватара |
| is_active | boolean | Активен ли аккаунт |
| last_login_at | timestamptz | Последний вход |

**Ключевые наблюдения:**
- ✅ Это ЛОКАЛЬНАЯ таблица для авторизации таргетологов
- ❌ НЕ связана с `auth.users` Tripwire БД
- ❌ Менеджеры авторизуются через эту таблицу, а не через Supabase Auth

---

### 3. Связь между БД

**Проверка связи `traffic_users` ↔ `auth.users` (Tripwire БД):**

```sql
SELECT 
  u.id,
  u.email,
  u.role,
  u.is_active,
  au.id AS auth_user_id,
  au.email AS auth_email
FROM public.traffic_users u
LEFT JOIN auth.users au ON u.email = au.email
ORDER BY u.created_at DESC;
```

**Результат:**

| id | email | role | is_active | auth_user_id | auth_email |
|----|--------|------|-----------|--------------|-------------|
| 23ea5ce0 | admin@onai.academy | admin | true | **NULL** | **NULL** |
| 340087a2 | arystan@onai.academy | targetologist | true | **NULL** | **NULL** |
| 297a3c45 | traft4@onai.academy | targetologist | true | **NULL** | **NULL** |
| 405c6e6b | muha@onai.academy | targetologist | true | **NULL** | **NULL** |
| f0decafb | kenesary@onai.academy | targetologist | true | **NULL** | **NULL** |

**Вывод:** ❌ **Ни один менеджер не имеет записи в `auth.users` Tripwire БД!**

---

### 4. RLS политики Tripwire БД

**Политика для `tripwire_users`:**

| policyname | roles | cmd | qual |
|------------|--------|-----|------|
| anon_no_access_tripwire_users | {anon} | ALL | false ✅ |
| authenticated_read_own_tripwire_users | {authenticated} | SELECT | **(auth.uid() = user_id)** ⚠️ |
| authenticated_update_own_tripwire_users | {authenticated} | UPDATE | **(auth.uid() = user_id)** ⚠️ |
| service_role_full_access_tripwire_users | {service_role} | ALL | true ✅ |

**Проблема:** ⚠️ Политика `authenticated_read_own_tripwire_users` с условием `auth.uid() = user_id` означает, что менеджер видит **ТОЛЬКО** тех студентов, которых он сам создал!

**Критический сценарий:**
- Менеджер Arystan создал студента Student1 → видит Student1 ✅
- Менеджер Kenesary создал студента Student2 → видит Student2 ✅
- Менеджер Arystan НЕ видит Student2 ❌ (хотя должен видеть всех!)
- Менеджер Kenesary НЕ видит Student1 ❌ (хотя должен видеть всех!)

---

## 🔍 Анализ RPC функций

**RPC функции в Tripwire БД (все созданы ✅):**

| RPC функция | Назначение | Статус |
|------------|----------|----------|
| rpc_create_tripwire_user_full | Создает студента в tripwire_users | ✅ |
| rpc_get_tripwire_users | Получает список студентов | ✅ |
| rpc_get_tripwire_stats | Статистика по студентам | ✅ |
| rpc_get_sales_activity_log | История действий менеджера | ✅ |
| rpc_get_sales_leaderboard | Рейтинг менеджеров | ✅ |
| rpc_get_sales_chart_data | Данные для графиков | ✅ |
| rpc_update_email_status | Обновляет статус email | ✅ |
| rpc_update_tripwire_user_status | Обновляет статус студента | ✅ |

**Параметр `p_manager_id` в RPC функциях:**
- Используется для фильтрации студентов по менеджеру
- Колонка `granted_by` в `tripwire_users` содержит UUID менеджера
- RPC функции фильтруют по `p_manager_id = granted_by`

---

## 💡 Корневая причина проблемы

**Архитектурный конфликт:**

1. **Разные системы авторизации:**
   - Traffic Dashboard использует локальную таблицу `traffic_users`
   - Tripwire Sales Manager использует Supabase Auth (`auth.users`)

2. **Разрыв в данных:**
   - Менеджеры находятся в Traffic Dashboard БД
   - Менеджеры НЕ имеют записей в Tripwire `auth.users`
   - Колонка `tripwire_users.granted_by` ссылается на UUID менеджера
   - Но этот UUID не существует в Tripwire `auth.users`

3. **RLS политики блокируют доступ:**
   - RLS политика: `authenticated_read_own_tripwire_users`
   - Условие: `auth.uid() = user_id`
   - Для менеджеров: `auth.uid()` возвращает **NULL** (нет записи в auth.users)
   - Результат: Менеджеры не видят студентов

---

## 🎯 Решения

### Решение #1: Создать записи менеджеров в Tripwire auth.users (РЕКОМЕНДУЕТСЯ)

**SQL скрипт для создания менеджеров в auth.users Tripwire БД:**

```sql
-- Создаем менеджеров в auth.users Tripwire БД
-- ВАЖНО: Это нужно выполнить через Supabase Management API или Service Role!

-- 1. Admin
INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
VALUES (
  gen_random_uuid(),
  'admin@onai.academy',
  NOW(),
  NOW(),
  NOW(),
  '{"role": "admin", "platform": "traffic_dashboard", "is_sales_manager": true}'::jsonb
) ON CONFLICT (email) DO NOTHING;

-- 2. Arystan
INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
VALUES (
  gen_random_uuid(),
  'arystan@onai.academy',
  NOW(),
  NOW(),
  NOW(),
  '{"role": "targetologist", "platform": "traffic_dashboard", "is_sales_manager": true}'::jsonb
) ON CONFLICT (email) DO NOTHING;

-- 3. Muha
INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
VALUES (
  gen_random_uuid(),
  'muha@onai.academy',
  NOW(),
  NOW(),
  NOW(),
  '{"role": "targetologist", "platform": "traffic_dashboard", "is_sales_manager": true}'::jsonb
) ON CONFLICT (email) DO NOTHING;

-- 4. Traft4
INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
VALUES (
  gen_random_uuid(),
  'traft4@onai.academy',
  NOW(),
  NOW(),
  NOW(),
  '{"role": "targetologist", "platform": "traffic_dashboard", "is_sales_manager": true}'::jsonb
) ON CONFLICT (email) DO NOTHING;

-- 5. Kenesary
INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
VALUES (
  gen_random_uuid(),
  'kenesary@onai.academy',
  NOW(),
  NOW(),
  NOW(),
  '{"role": "targetologist", "platform": "traffic_dashboard", "is_sales_manager": true}'::jsonb
) ON CONFLICT (email) DO NOTHING;

-- Обновляем granted_by в tripwire_users с правильными UUID
UPDATE public.tripwire_users
SET granted_by = (
  CASE email
    WHEN 'admin@onai.academy' THEN (SELECT id FROM auth.users WHERE email = 'admin@onai.academy')
    WHEN 'arystan@onai.academy' THEN (SELECT id FROM auth.users WHERE email = 'arystan@onai.academy')
    WHEN 'muha@onai.academy' THEN (SELECT id FROM auth.users WHERE email = 'muha@onai.academy')
    WHEN 'traft4@onai.academy' THEN (SELECT id FROM auth.users WHERE email = 'traft4@onai.academy')
    WHEN 'kenesary@onai.academy' THEN (SELECT id FROM auth.users WHERE email = 'kenesary@onai.academy')
  END
)
WHERE granted_by IS NULL;
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
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND (raw_user_meta_data->>'is_sales_manager'::jsonb) = true
  )
);

-- Вариант B: Админы видят всех, менеджеры - своих
CREATE POLICY authenticated_read_tripwire_users_v2
ON public.tripwire_users
FOR SELECT
TO authenticated
USING (
  -- Админы видят всех
  (SELECT raw_user_meta_data->>'role'::jsonb FROM auth.users WHERE id = auth.uid()) = 'admin'
  OR
  -- Менеджеры видят всех (если это Sales Manager Dashboard)
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND (raw_user_meta_data->>'is_sales_manager'::jsonb) = true
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
- [ ] Создать записи в `auth.users` Tripwire БД через Supabase Management API
- [ ] Установить пароли для менеджеров
- [ ] Добавить метаданные `is_sales_manager: true`
- [ ] Обновить `granted_by` в `tripwire_users` с правильными UUID

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

**Корневая причина проблемы:** Архитектурный разрыв между Traffic Dashboard БД и Tripwire Sales Manager БД

**Менеджеры не могут работать, потому что:**
1. ❌ Находятся в Traffic Dashboard БД, но Sales Manager использует Tripwire БД
2. ❌ Нет записей в Tripwire `auth.users` → не могут авторизоваться
3. ❌ RLS политики блокируют доступ → видят только своих студентов
4. ❌ RPC функции используют `auth.uid()` → возвращает NULL для менеджеров

**Необходимо срочно:**
1. Создать записи в `auth.users` Tripwire БД для всех менеджеров
2. Изменить RLS политики для доступа к `tripwire_users`
3. Протестировать Sales Manager Dashboard

---

**Дата диагностики:** 2025-12-30 10:50 UTC  
**Исполнитель:** GLM 4.7 MCP Agent
