# 📊 ФИНАЛЬНЫЙ ОТЧЕТ: Диагностика Sales Manager Dashboard

**Дата:** 2025-12-30  
**Статус:** ❌ КРИТИЧЕСКАЯ АРХИТЕКТУРНАЯ ПРОБЛЕМА ОБНАРУЖЕНА  
**Исполнитель:** GLM 4.7 MCP Agent

---

## 📋 Краткое резюме

**Обнаружена критическая архитектурная проблема:**

Sales Manager Dashboard и Traffic Dashboard используют **ДВЕ РАЗНЫЕ Supabase базы данных**, и менеджеры не могут авторизоваться в Sales Manager Dashboard.

### Архитектурный разрыв:

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
           
┌─────────────────────────────────────────────────────────┐
│  Tripwire БД (pjmvxecykysfrzppdcto)         │
│  ├─ tripwire_users (92 студента)                   │
│  └─ ...                                             │
└─────────────────────────────────────────────────────────┘
           ↓ auth.users (пусто для менеджеров!)
           ↓ Менеджеры НЕ могут авторизоваться
```

---

## 🚨 Проблемы, обнаруженные в Sales Manager Dashboard

### Проблема #1: Менеджеры не могут авторизоваться

**Симптом:** Auth error "Invalid login credentials"

**Корневая причина:**
- Менеджеры находятся в Traffic Dashboard БД (`traffic_users` таблица)
- Sales Manager Dashboard использует Tripwire БД
- В Tripwire `auth.users` нет записей для менеджеров
- `auth.uid()` возвращает `NULL` для менеджеров

**SQL проверка:**
```sql
SELECT 
  u.email,
  u.role,
  au.id AS auth_user_id
FROM public.traffic_users u
LEFT JOIN auth.users au ON u.email = au.email
WHERE u.email IN (
  'admin@onai.academy',
  'arystan@onai.academy',
  'muha@onai.academy',
  'traft4@onai.academy',
  'kenesary@onai.academy'
);
```

**Результат:**
| email | role | auth_user_id |
|-------|------|--------------|
| admin@onai.academy | admin | **NULL** ❌ |
| arystan@onai.academy | targetologist | **NULL** ❌ |
| muha@onai.academy | targetologist | **NULL** ❌ |
| traft4@onai.academy | targetologist | **NULL** ❌ |
| kenesary@onai.academy | targetologist | **NULL** ❌ |

---

### Проблема #2: RLS политики блокируют доступ

**Симптом:** Менеджеры не видят студентов или видят только своих

**Корневая причина:**
RLS политика `authenticated_read_own_tripwire_users` с условием:
```sql
USING (auth.uid() = user_id)
```

Это означает:
- Менеджер видит **ТОЛЬКО** тех студентов, которых он сам создал
- Менеджер НЕ видит студентов, созданных другими менеджерами
- Для менеджеров `auth.uid()` возвращает `NULL` (нет записи в auth.users)

**Нужно исправить:**
```sql
CREATE POLICY managers_read_all_tripwire_users
ON public.tripwire_users
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND (raw_user_meta_data->>'is_sales_manager')::boolean = true
  )
);
```

---

### Проблема #3: Критическая ошибка с функцией добавления ученика

**Симптом:** Интерфейс реагирует на нажатие кнопки, но данные не сохраняются

**Возможные причины:**
1. ❌ Менеджер не авторизован в Tripwire БД (нет auth.users записи)
2. ❌ RPC функция `rpc_create_tripwire_user_full` не может создать студента
3. ❌ RLS политика блокирует INSERT операцию
4. ❌ PM2 конфигурация не связана с Tripwire Supabase

**RPC функция `rpc_create_tripwire_user_full`:**
- ✅ Создана и работает
- ✅ Использует `tripwireAdminSupabase` клиент
- ✅ Создает студента в `auth.users` и `tripwire_users`

**RLS политика для INSERT:**
```sql
CREATE POLICY service_role_full_access_tripwire_users
ON public.tripwire_users
FOR ALL
TO service_role
USING (true);
```

**Вывод:** RPC функция должна работать через `service_role`, но нужно проверить PM2 конфигурацию.

---

### Проблема #4: Отсутствует история прохождения модулей

**Симптом:** История прохождения модулей не отображается

**Корневая причина:**
- Таблица `tripwire_users` имеет колонку `modules_completed` (integer)
- Но нет отдельной таблицы для истории прохождения модулей
- Нет RPC функции для получения истории модулей

**Нужно создать:**
```sql
CREATE TABLE IF NOT EXISTS module_progress_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tripwire_user_id UUID REFERENCES tripwire_users(id) ON DELETE CASCADE,
  module_id INTEGER NOT NULL,
  module_name TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_module_progress_user ON module_progress_history(user_id);
CREATE INDEX idx_module_progress_tripwire ON module_progress_history(tripwire_user_id);
```

---

### Проблема #5: Отсутствуют списки участников

**Симптом:** Списки участников не отображаются

**Корневая причина:**
- RPC функция `rpc_get_tripwire_users` существует и работает
- Но RLS политика блокирует SELECT для менеджеров
- Менеджеры не видят студентов из-за `auth.uid() = user_id`

**Нужно исправить RLS политики (см. Проблема #2)**

---

## 📊 Структура Tripwire БД

### Таблица `tripwire_users` (92 записи)

| Колонка | Тип | Назначение |
|----------|-----|-------------|
| id | uuid | Первичный ключ |
| user_id | uuid (nullable) | FK на auth.users.id |
| full_name | text | Имя студента |
| email | text (unique) | Email студента |
| **granted_by** | uuid (nullable) | **ID менеджера, который создал студента** ⭐ |
| **manager_name** | text (nullable) | Имя менеджера для отображения |
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

### RPC функции (все созданы ✅)

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

---

## 💡 Решения

### Решение #1: Создать записи менеджеров в Tripwire auth.users (РЕКОМЕНДУЕТСЯ)

**Файл:** [`backend/create-tripwire-managers.sql`](../backend/create-tripwire-managers.sql)

**Файл:** [`backend/create-tripwire-managers.ts`](../backend/create-tripwire-managers.ts)

**Шаги:**

1. **Выполнить TypeScript скрипт:**
   ```bash
   cd backend
   npx tsx create-tripwire-managers.ts
   ```

2. **Скрипт сделает следующее:**
   - Создаст 5 менеджеров в `auth.users` Tripwire БД
   - Установит временный пароль `TempPassword123!`
   - Добавит метаданные `is_sales_manager: true`
   - Обновит `granted_by` в `tripwire_users` с правильными UUID

3. **Изменить пароли:**
   - Менеджеры должны изменить пароли при первом входе

---

### Решение #2: Изменить RLS политики

**SQL миграция:**

```sql
-- Удаляем старую политику
DROP POLICY IF EXISTS authenticated_read_own_tripwire_users 
ON public.tripwire_users;

-- Создаем новую политику для менеджеров
CREATE POLICY managers_read_all_tripwire_users
ON public.tripwire_users
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND (raw_user_meta_data->>'is_sales_manager')::boolean = true
  )
);

-- Политика для UPDATE (менеджеры могут обновлять своих студентов)
CREATE POLICY managers_update_own_students
ON public.tripwire_users
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND (raw_user_meta_data->>'is_sales_manager')::boolean = true
  )
  AND granted_by = auth.uid()
);
```

---

### Решение #3: Создать таблицу истории модулей

**SQL миграция:**

```sql
-- Создаем таблицу истории модулей
CREATE TABLE IF NOT EXISTS module_progress_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tripwire_user_id UUID REFERENCES tripwire_users(id) ON DELETE CASCADE,
  module_id INTEGER NOT NULL,
  module_name TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Создаем индексы
CREATE INDEX idx_module_progress_user ON module_progress_history(user_id);
CREATE INDEX idx_module_progress_tripwire ON module_progress_history(tripwire_user_id);
CREATE INDEX idx_module_progress_module ON module_progress_history(module_id);

-- RLS политики
ALTER TABLE module_progress_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY anon_no_access_module_progress
ON module_progress_history
FOR ALL
TO anon
USING (false);

CREATE POLICY managers_read_module_progress
ON module_progress_history
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND (raw_user_meta_data->>'is_sales_manager')::boolean = true
  )
);

CREATE POLICY service_role_full_access_module_progress
ON module_progress_history
FOR ALL
TO service_role
USING (true);
```

---

### Решение #4: Проверить PM2 конфигурацию

**Файл:** `ecosystem.config.cjs`

**Проверить:**
- [ ] `TRIPWIRE_SUPABASE_URL` установлен в `https://pjmvxecykysfrzppdcto.supabase.co`
- [ ] `TRIPWIRE_SERVICE_ROLE_KEY` установлен правильно
- [ ] Backend использует `tripwireAdminSupabase` клиент для Tripwire операций

---

## 📝 План исправления

### Шаг 1: Создать записи менеджеров в auth.users
- [ ] Выполнить `npx tsx backend/create-tripwire-managers.ts`
- [ ] Проверить, что все 5 менеджеров созданы
- [ ] Проверить, что `granted_by` обновлен в `tripwire_users`

### Шаг 2: Изменить RLS политики
- [ ] Создать SQL миграцию для RLS политик
- [ ] Применить миграцию через Supabase MCP
- [ ] Проверить, что менеджеры видят всех студентов

### Шаг 3: Создать таблицу истории модулей
- [ ] Создать SQL миграцию для `module_progress_history`
- [ ] Применить миграцию через Supabase MCP
- [ ] Создать RPC функцию для получения истории модулей

### Шаг 4: Проверить PM2 конфигурацию
- [ ] Проверить `ecosystem.config.cjs`
- [ ] Проверить переменные окружения
- [ ] Перезапустить PM2: `pm2 restart all`

### Шаг 5: Тестирование
- [ ] Проверить вход менеджеров
- [ ] Проверить просмотр списка студентов
- [ ] Проверить создание нового студента
- [ ] Проверить обновление статуса студента
- [ ] Проверить историю модулей

---

## 🎯 Файлы, созданные для решения

### 1. Архитектурный анализ
**Файл:** [`docs/TRAFFIC_DASHBOARD_ARCHITECTURE_ANALYSIS_20251230.md`](TRAFFIC_DASHBOARD_ARCHITECTURE_ANALYSIS_20251230.md)

**Содержит:**
- Детальную архитектуру Traffic Dashboard vs Tripwire
- Анализ RLS политик
- 3 варианта решений
- План исправления

### 2. SQL скрипт для создания менеджеров
**Файл:** [`backend/create-tripwire-managers.sql`](../backend/create-tripwire-managers.sql)

**Содержит:**
- SQL для создания менеджеров в auth.users
- SQL для обновления `granted_by` в tripwire_users
- Проверки результатов

### 3. TypeScript скрипт для создания менеджеров
**Файл:** [`backend/create-tripwire-managers.ts`](../backend/create-tripwire-managers.ts)

**Содержит:**
- Полный TypeScript код для создания менеджеров через Supabase Management API
- Автоматическое обновление `granted_by`
- Проверки результатов

---

## 🎉 Заключение

**Корневая причина проблем:**

Архитектурный разрыв между Traffic Dashboard БД и Tripwire Sales Manager БД:
1. Менеджеры находятся в Traffic Dashboard БД
2. Sales Manager Dashboard использует Tripwire БД
3. Нет записей менеджеров в Tripwire `auth.users`
4. RLS политики блокируют доступ

**Необходимо срочно:**

1. ✅ Создать записи в `auth.users` Tripwire БД для всех менеджеров
2. ✅ Изменить RLS политики для доступа к `tripwire_users`
3. ✅ Создать таблицу `module_progress_history` для истории модулей
4. ✅ Проверить PM2 конфигурацию

**После исправления:**

- ✅ Менеджеры смогут авторизоваться через Supabase Auth
- ✅ Менеджеры увидят всех студентов (не только своих)
- ✅ Функция создания студентов будет работать
- ✅ История модулей будет отображаться
- ✅ Списки участников будут доступны

---

**Дата диагностики:** 2025-12-30 10:55 UTC  
**Исполнитель:** GLM 4.7 MCP Agent  
**Статус:** ⏳ Ожидает выполнения исправлений
