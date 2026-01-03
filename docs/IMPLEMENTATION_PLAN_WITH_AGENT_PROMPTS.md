# 🚀 ПЛАН ВНЕДРЕНИЯ ИСПРАВЛЕНИЙ ПЛАТФОРМЫ ONAI ACADEMY
# Поэтапный план с промптами для агентов

**Дата создания:** 30 декабря 2025
**Основано на:** DATABASE_AUDIT_REPORT_20251230.md
**Статус:** ГОТОВО К ВЫПОЛНЕНИЮ

---

## 📋 ОГЛАВЛЕНИЕ

1. [ФАЗА 0: Подготовка и анализ (1-2 дня)](#фаза-0)
2. [ФАЗА 1: Решение архитектурного разрыва (3-5 дней)](#фаза-1)
3. [ФАЗА 2: Система мониторинга интеграций (5-7 дней)](#фаза-2)
4. [ФАЗА 3: Индексация и оптимизация (2-3 дня)](#фаза-3)
5. [ФАЗА 4: Документация и улучшения (опционально)](#фаза-4)

---

<a name="фаза-0"></a>
## 🔍 ФАЗА 0: ПОДГОТОВКА И АНАЛИЗ

**Цель:** Собрать детальную информацию о текущем состоянии для принятия решения по архитектуре

**Длительность:** 1-2 дня
**Приоритет:** 🔴 КРИТИЧЕСКИЙ
**Агенты:** MCP Agent (database) + Browser MCP (verification)

---

### ЗАДАЧА 0.1: Анализ текущей архитектуры авторизации

**Агент:** MCP Agent (Database)

**Промпт для MCP агента:**

```markdown
ЗАДАЧА: Детальный анализ архитектуры авторизации Sales Manager

ЦЕЛЬ: Собрать полную информацию о том, как Sales Manager авторизуются и работают с Tripwire студентами

ДЕЙСТВИЯ:

1. ПРОВЕРКА TRAFFIC DATABASE (oetodaexnjcunklkdlkv)

Подключись к Traffic DB и выполни:

```sql
-- 1.1 Получить список всех Sales Manager
SELECT
  id,
  email,
  full_name,
  role,
  created_at
FROM traffic_users
WHERE role IN ('sales_manager', 'sales', 'admin')
ORDER BY email;

-- 1.2 Проверить схему таблицы traffic_users
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'traffic_users'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 1.3 Проверить связь с auth.users
SELECT
  tu.id as traffic_user_id,
  tu.email,
  au.id as auth_user_id,
  au.email as auth_email
FROM traffic_users tu
LEFT JOIN auth.users au ON au.id = tu.id
WHERE tu.role IN ('sales_manager', 'sales', 'admin')
LIMIT 10;
```

2. ПРОВЕРКА TRIPWIRE DATABASE (pjmvxecykysfrzppdcto)

Подключись к Tripwire DB и выполни:

```sql
-- 2.1 Проверить схему tripwire_users
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'tripwire_users'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2.2 Найти студентов с granted_by
SELECT
  id,
  email,
  full_name,
  granted_by,
  manager_name,
  created_at
FROM tripwire_users
WHERE granted_by IS NOT NULL
ORDER BY created_at DESC
LIMIT 20;

-- 2.3 Проверить существуют ли granted_by в auth.users
SELECT
  tu.email as student_email,
  tu.granted_by as manager_uuid,
  tu.manager_name,
  au.email as manager_auth_email,
  au.id as manager_auth_id
FROM tripwire_users tu
LEFT JOIN auth.users au ON au.id = tu.granted_by
WHERE tu.granted_by IS NOT NULL
LIMIT 20;

-- 2.4 Подсчитать студентов по менеджерам
SELECT
  granted_by,
  manager_name,
  COUNT(*) as students_count,
  COUNT(*) * 5000 as total_revenue_kzt
FROM tripwire_users
WHERE granted_by IS NOT NULL
GROUP BY granted_by, manager_name
ORDER BY students_count DESC;
```

3. ПРОВЕРКА RLS ПОЛИТИК

```sql
-- 3.1 Tripwire DB: RLS политики для tripwire_users
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
WHERE tablename = 'tripwire_users'
  AND schemaname = 'public';

-- 3.2 Проверить включен ли RLS
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'tripwire_users'
  AND schemaname = 'public';
```

4. ПРОВЕРКА MIDDLEWARE АВТОРИЗАЦИИ

Прочитай файлы:
- /backend/src/middleware/tripwire-auth.ts
- /backend/src/routes/tripwire-manager.ts

Найди:
- Как проверяется роль sales_manager
- Откуда берётся user_id для JWT
- Какая база данных используется для верификации

ИТОГОВЫЙ ОТЧЁТ:

Создай файл `/docs/PHASE0_AUTH_ARCHITECTURE_ANALYSIS.md` со следующей структурой:

## ТЕКУЩАЯ АРХИТЕКТУРА

### Traffic Database
- Количество Sales Manager: X
- Схема traffic_users (все поля)
- Связь с auth.users (есть/нет)

### Tripwire Database
- Количество студентов с granted_by: X
- Схема tripwire_users.granted_by
- Менеджеры существуют в auth.users? (да/нет)
- Список несуществующих UUID

### RLS Политики
- Tripwire DB RLS включен: да/нет
- Политики для tripwire_users (список)
- Блокируют ли доступ менеджеров: да/нет

### Middleware
- Файл аутентификации: путь
- База данных для проверки: какая
- Логика проверки роли: описание

## ПРОБЛЕМЫ

1. [Описание проблемы 1]
2. [Описание проблемы 2]
...

## РЕКОМЕНДАЦИЯ

[Вариант A / B / C] - обоснование выбора
```

**Результат:** Детальный отчёт о текущей архитектуре с рекомендацией решения

---

### ЗАДАЧА 0.2: Верификация доступа Sales Manager через UI

**Агент:** Browser MCP

**Промпт для Browser MCP:**

```markdown
ЗАДАЧА: Проверить реальный доступ Sales Manager к панели управления студентами

ЦЕЛЬ: Выяснить работает ли доступ к /admin/tripwire сейчас или есть проблемы

ДЕЙСТВИЯ:

1. Открой https://expresscourse.onai.academy/login

2. Авторизуйся как Sales Manager:
   Email: smmmcwin@gmail.com
   Password: Sales2025!

3. Проверь доступ к дашборду:
   - Перейди на /admin/tripwire
   - Сделай скриншот страницы
   - Проверь загружаются ли студенты в таблице

4. Проверь Stats Cards:
   - Видны ли данные о доходе (revenue)
   - Видно ли количество студентов
   - Сделай скриншот Stats Cards

5. Проверь создание студента:
   - Нажми кнопку "Создать студента"
   - Заполни форму:
     * Email: test-phase0-{timestamp}@test.com
     * Full Name: Test Phase 0 Student
     * Phone: +77001234567
   - Отправь форму
   - Проверь появился ли студент в таблице
   - Если ошибка - сделай скриншот консоли браузера

6. Проверь логи браузера:
   - Открой Console (F12)
   - Найди ошибки (красные сообщения)
   - Скопируй все ошибки

ИТОГОВЫЙ ОТЧЁТ:

Создай файл `/docs/PHASE0_UI_VERIFICATION_REPORT.md`:

## UI ДОСТУП

- Авторизация: успешно/ошибка
- Доступ к /admin/tripwire: да/нет
- Загрузка студентов: да/нет

## STATS CARDS

- Revenue отображается: да/нет (значение)
- Количество студентов: да/нет (значение)
- Скриншот: [путь]

## СОЗДАНИЕ СТУДЕНТА

- Форма открылась: да/нет
- Студент создан: да/нет
- Ошибки: [список]

## КОНСОЛЬ БРАУЗЕРА

- Ошибки авторизации: [список]
- Ошибки API: [список]
- Ошибки CORS: [список]

## ВЫВОД

[Работает полностью / Частично работает / Не работает] - обоснование
```

**Результат:** Отчёт о реальном состоянии UI с скриншотами

---

### ЗАДАЧА 0.3: Принятие решения по архитектуре

**Агент:** Ты (Claude) - анализ и рекомендация

**Действия:**
1. Прочитать отчёты из задач 0.1 и 0.2
2. Проанализировать 3 варианта решения (A/B/C)
3. Рекомендовать оптимальный вариант
4. Получить подтверждение от пользователя

**Промпт для пользователя:**

```
На основании отчётов PHASE0_AUTH_ARCHITECTURE_ANALYSIS.md и PHASE0_UI_VERIFICATION_REPORT.md
я рекомендую следующее решение:

[ВАРИАНТ A/B/C] - потому что:
1. [Причина 1]
2. [Причина 2]
3. [Причина 3]

Ты согласен с этим решением или хочешь выбрать другой вариант?
```

---

<a name="фаза-1"></a>
## 🔧 ФАЗА 1: РЕШЕНИЕ АРХИТЕКТУРНОГО РАЗРЫВА

**Цель:** Унифицировать систему авторизации Traffic ↔ Tripwire

**Длительность:** 3-5 дней
**Приоритет:** 🔴 КРИТИЧЕСКИЙ
**Агенты:** MCP Agent (migrations) + Codex (code changes) + Browser MCP (testing)

**ВАЖНО:** Эта фаза выполняется ПОСЛЕ принятия решения в Фазе 0

---

### ВАРИАНТ A: УНИФИЦИРОВАННАЯ АВТОРИЗАЦИЯ (РЕКОМЕНДУЕТСЯ)

#### ЗАДАЧА 1A.1: Создать миграцию для auth.users в Tripwire DB

**Агент:** MCP Agent (Database)

**Промпт для MCP агента:**

```markdown
ЗАДАЧА: Создать Sales Manager в auth.users Tripwire Database

КОНТЕКСТ:
- Sales Manager существуют в Traffic DB (traffic_users)
- Нужно создать их копии в Tripwire DB (auth.users)
- Сохранить те же UUID для совместимости

ДАННЫЕ ИЗ ФАЗЫ 0:
[Вставь сюда список менеджеров из отчёта PHASE0_AUTH_ARCHITECTURE_ANALYSIS.md]

ДЕЙСТВИЯ:

1. Подключись к Traffic DB (oetodaexnjcunklkdlkv)

Получи данные всех Sales Manager:

```sql
SELECT
  id,
  email,
  encrypted_password, -- если есть
  email_confirmed_at,
  created_at,
  updated_at
FROM auth.users
WHERE id IN (
  SELECT id FROM traffic_users
  WHERE role IN ('sales_manager', 'sales', 'admin')
);
```

2. Подключись к Tripwire DB (pjmvxecykysfrzppdcto)

Создай менеджеров в auth.users:

```sql
-- 2.1 Проверить не существуют ли уже
SELECT id, email FROM auth.users
WHERE email IN ([список email из шага 1]);

-- 2.2 Вставить менеджеров (ТОЛЬКО тех, кого нет!)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  role,
  aud
)
SELECT
  id,
  '00000000-0000-0000-0000-000000000000'::uuid as instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  'authenticated' as role,
  'authenticated' as aud
FROM (VALUES
  -- Заполни данными из шага 1
  ('UUID1', 'email1@example.com', '$2a$...', '2024-01-01', ...),
  ('UUID2', 'email2@example.com', '$2a$...', '2024-01-01', ...)
) AS managers(id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
ON CONFLICT (id) DO NOTHING;

-- 2.3 Проверить что создались
SELECT id, email, created_at
FROM auth.users
WHERE email IN ([список email]);
```

3. Создать таблицу sales_managers_metadata

```sql
CREATE TABLE IF NOT EXISTS sales_managers_metadata (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  manager_name TEXT NOT NULL,
  traffic_user_id UUID, -- ссылка на traffic_users.id
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Заполнить метаданными
INSERT INTO sales_managers_metadata (user_id, manager_name, traffic_user_id)
SELECT
  au.id,
  tu.full_name as manager_name,
  tu.id as traffic_user_id
FROM auth.users au
JOIN [данные из Traffic DB] tu ON tu.email = au.email
WHERE au.email IN ([список email менеджеров])
ON CONFLICT (user_id) DO UPDATE
SET manager_name = EXCLUDED.manager_name,
    traffic_user_id = EXCLUDED.traffic_user_id,
    updated_at = NOW();
```

4. Создать RLS политики для sales_managers_metadata

```sql
ALTER TABLE sales_managers_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sales managers can read own metadata"
ON sales_managers_metadata
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to sales_managers_metadata"
ON sales_managers_metadata
FOR ALL
USING (auth.role() = 'service_role');
```

ИТОГОВЫЙ ОТЧЁТ:

Создай файл `/docs/PHASE1A_AUTH_MIGRATION_REPORT.md`:

## МИГРАЦИЯ ВЫПОЛНЕНА

### Созданные менеджеры в auth.users
| UUID | Email | Создан |
|------|-------|--------|
| ... | ... | ... |

### Таблица sales_managers_metadata
- Создана: да/нет
- Записей: X
- RLS включен: да

### SQL миграция
Сохрани SQL скрипт в `/sql/migrations/001_create_sales_managers_in_tripwire_auth.sql`

### ПРОВЕРКА

```sql
-- Количество менеджеров в auth.users
SELECT COUNT(*) FROM auth.users
WHERE email IN ([список]);

-- Метаданные заполнены
SELECT * FROM sales_managers_metadata;
```

## СЛЕДУЮЩИЙ ШАГ
Задача 1A.2: Обновить tripwire_users.granted_by как Foreign Key
```

**Результат:** Sales Manager созданы в Tripwire auth.users + таблица метаданных

---

#### ЗАДАЧА 1A.2: Обновить Foreign Key tripwire_users.granted_by

**Агент:** MCP Agent (Database)

**Промпт для MCP агента:**

```markdown
ЗАДАЧА: Обновить tripwire_users.granted_by как Foreign Key на auth.users

КОНТЕКСТ:
- Сейчас granted_by просто UUID без FK
- Нужно сделать FK на auth.users(id)
- Проверить что все granted_by существуют в auth.users

ДЕЙСТВИЯ:

1. Подключись к Tripwire DB (pjmvxecykysfrzppdcto)

Проверь целостность данных:

```sql
-- 1.1 Найти студентов с granted_by которые НЕ существуют в auth.users
SELECT
  tu.id,
  tu.email,
  tu.granted_by,
  tu.manager_name
FROM tripwire_users tu
LEFT JOIN auth.users au ON au.id = tu.granted_by
WHERE tu.granted_by IS NOT NULL
  AND au.id IS NULL;
```

**ЕСЛИ НАШЛИСЬ НЕСУЩЕСТВУЮЩИЕ UUID:**
- Остановись и отчитайся
- Не добавляй FK пока не исправим данные

2. Добавить Foreign Key constraint

```sql
-- 2.1 Добавить FK (если данные целостные)
ALTER TABLE tripwire_users
ADD CONSTRAINT fk_tripwire_users_granted_by
FOREIGN KEY (granted_by)
REFERENCES auth.users(id)
ON DELETE SET NULL;

-- 2.2 Проверить constraint создался
SELECT
  conname as constraint_name,
  conrelid::regclass as table_name,
  confrelid::regclass as foreign_table
FROM pg_constraint
WHERE conname = 'fk_tripwire_users_granted_by';
```

3. Создать индекс на granted_by

```sql
CREATE INDEX IF NOT EXISTS idx_tripwire_users_granted_by
ON tripwire_users(granted_by)
WHERE granted_by IS NOT NULL;
```

ИТОГОВЫЙ ОТЧЁТ:

Создай файл `/docs/PHASE1A_FK_MIGRATION_REPORT.md`:

## FOREIGN KEY СОЗДАН

### Проверка целостности
- Несуществующих UUID: X (должно быть 0)
- Если > 0: [список проблемных студентов]

### Foreign Key Constraint
- Создан: да/нет
- Имя: fk_tripwire_users_granted_by
- Ссылается на: auth.users(id)
- ON DELETE: SET NULL

### Индекс
- Создан: idx_tripwire_users_granted_by
- Тип: B-tree
- Partial: WHERE granted_by IS NOT NULL

### SQL миграция
Сохрани в `/sql/migrations/002_add_fk_tripwire_users_granted_by.sql`

## СЛЕДУЮЩИЙ ШАГ
Задача 1A.3: Обновить RLS политики для доступа менеджеров
```

**Результат:** Foreign Key создан, данные целостные

---

#### ЗАДАЧА 1A.3: Обновить RLS политики для Sales Manager

**Агент:** MCP Agent (Database)

**Промпт для MCP агента:**

```markdown
ЗАДАЧА: Обновить RLS политики чтобы Sales Manager видели своих студентов

КОНТЕКСТ:
- Теперь granted_by → FK на auth.users(id)
- Менеджеры должны видеть студентов которых создали
- Admin должен видеть всех студентов

ДЕЙСТВИЯ:

1. Подключись к Tripwire DB (pjmvxecykysfrzppdcto)

Обнови RLS политики для tripwire_users:

```sql
-- 1.1 Удалить старые политики (если нужно)
DROP POLICY IF EXISTS "Sales managers can view their students"
ON tripwire_users;

DROP POLICY IF EXISTS "Admins can view all students"
ON tripwire_users;

-- 1.2 Создать новую политику для Sales Manager
CREATE POLICY "Sales managers can view their students"
ON tripwire_users
FOR SELECT
USING (
  -- Менеджер видит студентов которых он создал
  granted_by = auth.uid()
  OR
  -- ИЛИ это admin (проверка через metadata)
  EXISTS (
    SELECT 1 FROM sales_managers_metadata smm
    WHERE smm.user_id = auth.uid()
      AND smm.is_active = true
  )
);

-- 1.3 Создать политику для UPDATE (менеджеры обновляют своих студентов)
CREATE POLICY "Sales managers can update their students"
ON tripwire_users
FOR UPDATE
USING (granted_by = auth.uid())
WITH CHECK (granted_by = auth.uid());

-- 1.4 Создать политику для INSERT (менеджеры создают студентов)
CREATE POLICY "Sales managers can create students"
ON tripwire_users
FOR INSERT
WITH CHECK (
  -- granted_by должен быть auth.uid()
  granted_by = auth.uid()
  AND
  -- Проверить что это валидный менеджер
  EXISTS (
    SELECT 1 FROM sales_managers_metadata smm
    WHERE smm.user_id = auth.uid()
      AND smm.is_active = true
  )
);
```

2. Обнови политики для tripwire_user_profile

```sql
-- 2.1 Политика SELECT для профилей
CREATE POLICY "Sales managers can view profiles of their students"
ON tripwire_user_profile
FOR SELECT
USING (
  user_id IN (
    SELECT id FROM tripwire_users
    WHERE granted_by = auth.uid()
  )
);
```

3. Обнови политики для других таблиц

```sql
-- 3.1 tripwire_progress
CREATE POLICY "Sales managers can view progress of their students"
ON tripwire_progress
FOR SELECT
USING (
  tripwire_user_id IN (
    SELECT user_id FROM tripwire_users
    WHERE granted_by = auth.uid()
  )
);

-- 3.2 certificates
CREATE POLICY "Sales managers can view certificates of their students"
ON certificates
FOR SELECT
USING (
  user_id IN (
    SELECT user_id FROM tripwire_users
    WHERE granted_by = auth.uid()
  )
);
```

4. Проверить политики

```sql
-- 4.1 Список всех политик для tripwire_users
SELECT
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'tripwire_users'
  AND schemaname = 'public';
```

ИТОГОВЫЙ ОТЧЁТ:

Создай файл `/docs/PHASE1A_RLS_POLICIES_REPORT.md`:

## RLS ПОЛИТИКИ ОБНОВЛЕНЫ

### tripwire_users
| Политика | Команда | Условие |
|----------|---------|---------|
| Sales managers can view their students | SELECT | granted_by = auth.uid() |
| Sales managers can update their students | UPDATE | granted_by = auth.uid() |
| Sales managers can create students | INSERT | granted_by = auth.uid() + metadata check |

### tripwire_user_profile
| Политика | Команда | Условие |
|----------|---------|---------|
| ... | ... | ... |

### tripwire_progress
[аналогично]

### certificates
[аналогично]

### SQL миграция
Сохрани в `/sql/migrations/003_update_rls_policies_for_sales_managers.sql`

## ТЕСТ ПОЛИТИК

```sql
-- Тест: менеджер видит только своих студентов
SET LOCAL role TO authenticated;
SET LOCAL "request.jwt.claims" TO '{"sub":"UUID_МЕНЕДЖЕРА"}';

SELECT COUNT(*) FROM tripwire_users; -- должен видеть только своих

RESET role;
```

## СЛЕДУЮЩИЙ ШАГ
Задача 1A.4: Обновить backend код для новой схемы
```

**Результат:** RLS политики обновлены, доступ разграничен

---

#### ЗАДАЧА 1A.4: Обновить backend код

**Агент:** Codex (Code changes)

**Промпт для Codex агента:**

```markdown
ЗАДАЧА: Обновить backend код для работы с новой схемой авторизации

КОНТЕКСТ:
- Sales Manager теперь в auth.users Tripwire DB
- granted_by теперь FK на auth.users(id)
- Нужно обновить middleware и контроллеры

ИЗМЕНЕНИЯ В КОДЕ:

1. ФАЙЛ: /backend/src/middleware/tripwire-auth.ts

```typescript
// ДОБАВИТЬ новую функцию для проверки роли Sales Manager

export const requireTripwireSalesOrAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id; // из authenticateTripwireJWT

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Проверить что пользователь - Sales Manager
    const { data: metadata, error } = await tripwireAdminSupabase
      .from('sales_managers_metadata')
      .select('user_id, manager_name, is_active')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !metadata) {
      return res.status(403).json({
        error: 'Access denied. Sales Manager role required.'
      });
    }

    // Добавить metadata в request для использования в контроллерах
    req.salesManager = {
      userId: metadata.user_id,
      managerName: metadata.manager_name
    };

    next();
  } catch (error: any) {
    console.error('[Tripwire Auth] Error checking sales manager role:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
```

2. ФАЙЛ: /backend/src/controllers/tripwireManagerController.ts

Обнови функцию createTripwireUser:

```typescript
export async function createTripwireUser(req: Request, res: Response) {
  try {
    const { email, full_name, phone } = req.body;
    const salesManagerId = req.user?.id; // из authenticateTripwireJWT
    const managerName = req.salesManager?.managerName; // из requireTripwireSalesOrAdmin

    if (!salesManagerId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // ... existing code ...

    // При создании студента:
    const { data: newStudent, error: createError } = await tripwireAdminSupabase
      .from('tripwire_users')
      .insert({
        email,
        full_name,
        phone,
        granted_by: salesManagerId, // ✅ Теперь FK на auth.users(id)
        manager_name: managerName, // для отображения
        // ... other fields ...
      })
      .select()
      .single();

    // ... rest of the code ...
  } catch (error: any) {
    // ... error handling ...
  }
}
```

3. ФАЙЛ: /backend/src/services/tripwireManagerService.ts

Обнови функцию getTripwireUsers:

```typescript
export async function getTripwireUsers(managerId?: string) {
  try {
    let query = tripwireAdminSupabase
      .from('tripwire_users')
      .select(`
        *,
        sales_manager:sales_managers_metadata!granted_by(manager_name)
      `);

    // Если указан managerId - фильтровать
    if (managerId) {
      query = query.eq('granted_by', managerId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data;
  } catch (error: any) {
    console.error('Error fetching tripwire users:', error);
    throw error;
  }
}
```

4. СОЗДАТЬ НОВЫЙ ФАЙЛ: /backend/src/types/express.d.ts

```typescript
// Расширить Request type для salesManager
declare global {
  namespace Express {
    interface Request {
      salesManager?: {
        userId: string;
        managerName: string;
      };
    }
  }
}

export {};
```

ТЕСТЫ:

Создай файл /backend/tests/tripwire-auth.test.ts:

```typescript
import { describe, it, expect } from 'vitest';
import { tripwireAdminSupabase } from '../src/config/supabase-tripwire';

describe('Tripwire Auth - Sales Manager Access', () => {
  it('should have sales_managers_metadata table', async () => {
    const { data, error } = await tripwireAdminSupabase
      .from('sales_managers_metadata')
      .select('*')
      .limit(1);

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('should have FK constraint on tripwire_users.granted_by', async () => {
    const { data, error } = await tripwireAdminSupabase
      .rpc('check_fk_constraint', {
        table_name: 'tripwire_users',
        column_name: 'granted_by'
      });

    expect(error).toBeNull();
    expect(data).toBe(true);
  });
});
```

ИТОГОВЫЙ ОТЧЁТ:

Создай файл `/docs/PHASE1A_CODE_CHANGES_REPORT.md`:

## КОД ОБНОВЛЁН

### Изменённые файлы
- ✅ /backend/src/middleware/tripwire-auth.ts
- ✅ /backend/src/controllers/tripwireManagerController.ts
- ✅ /backend/src/services/tripwireManagerService.ts
- ✅ /backend/src/types/express.d.ts (новый)

### Новые функции
- requireTripwireSalesOrAdmin middleware
- Проверка sales_managers_metadata
- Обновлённый createTripwireUser

### Тесты
- ✅ tripwire-auth.test.ts создан
- Покрытие: metadata table, FK constraint

## СЛЕДУЮЩИЙ ШАГ
Задача 1A.5: Деплой и тестирование
```

**Результат:** Backend код обновлён под новую схему

---

#### ЗАДАЧА 1A.5: Деплой и E2E тестирование

**Агент 1:** Ты (Claude) - деплой
**Агент 2:** Browser MCP - E2E тестирование

**Промпт для деплоя (Claude):**

```markdown
ЗАДАЧА: Задеплоить изменения на production

ДЕЙСТВИЯ:

1. Собрать backend:
cd /Users/miso/onai-integrator-login/backend
npm run build

2. Задеплоить на сервер:
rsync -avz backend/dist/ root@207.154.231.30:/var/www/onai-integrator-login-main/backend/dist/

3. Перезапустить PM2:
ssh root@207.154.231.30 "pm2 restart backend"

4. Проверить логи:
ssh root@207.154.231.30 "pm2 logs backend --lines 50"

5. Проверить здоровье бэкенда:
curl https://onai.academy/api/health
```

**Промпт для Browser MCP (E2E тестирование):**

```markdown
ЗАДАЧА: End-to-End тестирование Sales Manager доступа

ЦЕЛЬ: Проверить что Sales Manager может создавать и видеть студентов

ДЕЙСТВИЯ:

1. Авторизация Sales Manager
   - Открой https://expresscourse.onai.academy/login
   - Введи: smmmcwin@gmail.com / Sales2025!
   - Проверь успешная ли авторизация

2. Проверка доступа к дашборду
   - Перейди на /admin/tripwire
   - Проверь загрузились ли студенты
   - Сделай скриншот таблицы студентов

3. Проверка Stats Cards
   - Проверь отображается ли revenue
   - Проверь количество студентов
   - Сделай скриншот stats cards

4. Создание нового студента
   - Нажми "Создать студента"
   - Заполни:
     * Email: test-phase1a-{timestamp}@test.com
     * Full Name: Test Phase 1A Student
     * Phone: +77001234567
   - Отправь форму
   - Проверь появился ли в таблице
   - Проверь что granted_by = UUID менеджера

5. Проверка RLS
   - В консоли браузера выполни:
   ```javascript
   // Получить данные текущего пользователя
   const { data: { user } } = await window.supabaseClient.auth.getUser();
   console.log('Current user:', user);

   // Попробовать получить студентов
   const { data, error } = await window.supabaseClient
     .from('tripwire_users')
     .select('*');
   console.log('Students:', data?.length, 'Error:', error);
   ```
   - Скопируй результат

6. Проверка логов
   - Открой Network tab (F12)
   - Отфильтруй по /api/admin/tripwire
   - Проверь статус ответов (должны быть 200)
   - Если ошибки - скриншот

ИТОГОВЫЙ ОТЧЁТ:

Создай файл `/docs/PHASE1A_E2E_TEST_REPORT.md`:

## E2E ТЕСТИРОВАНИЕ РЕЗУЛЬТАТЫ

### Авторизация
- Успешно: да/нет
- JWT token получен: да/нет

### Доступ к дашборду
- URL доступен: да/нет
- Студенты загрузились: X записей
- Скриншот: [путь]

### Stats Cards
- Revenue: [значение]
- Студенты: [количество]
- Скриншот: [путь]

### Создание студента
- Студент создан: да/нет
- granted_by корректный: да/нет
- Email студента: [email]

### RLS Проверка
- User ID: [UUID]
- Студентов видно: X
- Ошибки RLS: нет/[описание]

### Network Requests
- API статусы: все 200 / есть ошибки
- Ошибки: [список]

## ВЫВОД
✅ Фаза 1A завершена успешно
❌ Найдены проблемы: [список]
```

**Результат:** E2E тесты пройдены, система работает

---

### ФИНАЛЬНАЯ ВЕРИФИКАЦИЯ ФАЗЫ 1

**Чеклист для проверки:**

```markdown
ФАЗА 1A: ВЕРИФИКАЦИЯ

✅ Auth Migration
- [ ] Sales Manager созданы в auth.users Tripwire DB
- [ ] Таблица sales_managers_metadata создана
- [ ] Все UUID совпадают с Traffic DB

✅ Foreign Key
- [ ] FK constraint создан
- [ ] Нет несуществующих UUID
- [ ] Индекс на granted_by создан

✅ RLS Policies
- [ ] Политики созданы для tripwire_users
- [ ] Политики созданы для tripwire_user_profile
- [ ] Политики созданы для tripwire_progress
- [ ] Политики созданы для certificates
- [ ] Менеджеры видят только своих студентов

✅ Backend Code
- [ ] Middleware обновлён
- [ ] Контроллеры обновлены
- [ ] Сервисы обновлены
- [ ] Типы TypeScript созданы
- [ ] Тесты написаны

✅ Deployment
- [ ] Backend задеплоен
- [ ] PM2 перезапущен
- [ ] Логи чистые (нет ошибок)
- [ ] Health check успешен

✅ E2E Testing
- [ ] Авторизация работает
- [ ] Дашборд загружается
- [ ] Stats Cards показывают данные
- [ ] Создание студента работает
- [ ] RLS корректно разграничивает доступ
- [ ] Нет ошибок в консоли
- [ ] Нет ошибок в Network

ФИНАЛЬНЫЙ СТАТУС: ✅ ФАЗА 1A ЗАВЕРШЕНА
```

---

<a name="фаза-2"></a>
## 📊 ФАЗА 2: СИСТЕМА МОНИТОРИНГА ИНТЕГРАЦИЙ

**Цель:** Создать централизованную систему логирования и мониторинга всех интеграций

**Длительность:** 5-7 дней
**Приоритет:** 🟡 СРЕДНИЙ
**Агенты:** MCP Agent (database) + Codex (code) + Browser MCP (UI)

---

### ЗАДАЧА 2.1: Создать таблицу integration_logs

**Агент:** MCP Agent (Database)

**Промпт для MCP агента:**

```markdown
ЗАДАЧА: Создать таблицу для логирования всех интеграций

БАЗА ДАННЫХ: Landing BD (xikaiavwqinamgolmtcy)

ДЕЙСТВИЯ:

1. Подключись к Landing BD

2. Создай таблицу integration_logs

```sql
CREATE TABLE IF NOT EXISTS integration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL, -- 'amocrm', 'resend', 'telegram', 'mobizon', 'whapi'
  action TEXT NOT NULL, -- 'sync_lead', 'send_email', 'send_sms', 'send_telegram'
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending', 'retrying')),
  related_entity_type TEXT, -- 'lead', 'student', 'tripwire_user'
  related_entity_id UUID, -- ID сущности
  request_payload JSONB, -- Тело запроса
  response_payload JSONB, -- Ответ API
  error_message TEXT, -- Текст ошибки
  error_code TEXT, -- Код ошибки
  duration_ms INTEGER, -- Длительность в мс
  retry_count INTEGER DEFAULT 0, -- Количество повторов
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX idx_integration_logs_service_name
ON integration_logs(service_name);

CREATE INDEX idx_integration_logs_status
ON integration_logs(status);

CREATE INDEX idx_integration_logs_created_at
ON integration_logs(created_at DESC);

CREATE INDEX idx_integration_logs_related_entity
ON integration_logs(related_entity_type, related_entity_id);

-- Частичный индекс для failed
CREATE INDEX idx_integration_logs_failed
ON integration_logs(service_name, created_at DESC)
WHERE status = 'failed';

-- Комбинированный индекс для дашборда
CREATE INDEX idx_integration_logs_dashboard
ON integration_logs(service_name, status, created_at DESC);
```

3. Создать VIEW для статистики

```sql
CREATE OR REPLACE VIEW integration_stats_hourly AS
SELECT
  service_name,
  action,
  status,
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as count,
  AVG(duration_ms) as avg_duration_ms,
  MAX(duration_ms) as max_duration_ms,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count
FROM integration_logs
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY service_name, action, status, DATE_TRUNC('hour', created_at);

CREATE OR REPLACE VIEW integration_stats_daily AS
SELECT
  service_name,
  action,
  status,
  DATE_TRUNC('day', created_at) as day,
  COUNT(*) as count,
  AVG(duration_ms) as avg_duration_ms,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count
FROM integration_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY service_name, action, status, DATE_TRUNC('day', created_at);
```

4. Создать RLS политики

```sql
ALTER TABLE integration_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to integration_logs"
ON integration_logs
FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can view integration_logs"
ON integration_logs
FOR SELECT
USING (auth.role() = 'authenticated');
```

5. Создать функцию для автоматической очистки старых логов

```sql
CREATE OR REPLACE FUNCTION cleanup_old_integration_logs()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM integration_logs
  WHERE created_at < NOW() - INTERVAL '90 days'
    AND status = 'success'; -- Удаляем только успешные старше 90 дней

  DELETE FROM integration_logs
  WHERE created_at < NOW() - INTERVAL '180 days'; -- Все логи старше 180 дней
END;
$$;

-- Создать scheduled job (если Supabase поддерживает pg_cron)
-- SELECT cron.schedule('cleanup-integration-logs', '0 2 * * *', 'SELECT cleanup_old_integration_logs()');
```

ИТОГОВЫЙ ОТЧЁТ:

Создай файл `/docs/PHASE2_INTEGRATION_LOGS_TABLE_REPORT.md`:

## ТАБЛИЦА integration_logs СОЗДАНА

### Структура
- Колонок: 14
- Индексов: 6
- Views: 2
- Functions: 1
- RLS: включен

### Индексы
| Индекс | Поля | Тип |
|--------|------|-----|
| idx_integration_logs_service_name | service_name | B-tree |
| idx_integration_logs_status | status | B-tree |
| ... | ... | ... |

### Views для аналитики
- integration_stats_hourly (последние 24 часа)
- integration_stats_daily (последние 30 дней)

### SQL миграция
Сохрани в `/sql/migrations/004_create_integration_logs_table.sql`

## СЛЕДУЮЩИЙ ШАГ
Задача 2.2: Добавить логирование в AmoCRM сервис
```

**Результат:** Таблица integration_logs создана с индексами и views

---

### ЗАДАЧА 2.2: Добавить логирование в сервисы

**Агент:** Codex (Code changes)

**Промпт для Codex агента:**

```markdown
ЗАДАЧА: Добавить логирование во все сервисы интеграций

КОНТЕКСТ:
- Создана таблица integration_logs в Landing BD
- Нужно логировать каждый вызов внешних API
- Логировать: request, response, ошибки, время выполнения

ИЗМЕНЕНИЯ:

1. СОЗДАТЬ HELPER: /backend/src/services/integrationLogger.ts

```typescript
import { landingSupabase } from '../config/supabase-landing';

interface IntegrationLogData {
  serviceName: 'amocrm' | 'resend' | 'telegram' | 'mobizon' | 'whapi';
  action: string;
  status: 'success' | 'failed' | 'pending' | 'retrying';
  relatedEntityType?: 'lead' | 'student' | 'tripwire_user';
  relatedEntityId?: string;
  requestPayload?: any;
  responsePayload?: any;
  errorMessage?: string;
  errorCode?: string;
  durationMs?: number;
  retryCount?: number;
}

export class IntegrationLogger {
  /**
   * Создать лог интеграции
   */
  static async log(data: IntegrationLogData): Promise<void> {
    try {
      const { error } = await landingSupabase
        .from('integration_logs')
        .insert({
          service_name: data.serviceName,
          action: data.action,
          status: data.status,
          related_entity_type: data.relatedEntityType,
          related_entity_id: data.relatedEntityId,
          request_payload: data.requestPayload,
          response_payload: data.responsePayload,
          error_message: data.errorMessage,
          error_code: data.errorCode,
          duration_ms: data.durationMs,
          retry_count: data.retryCount || 0,
        });

      if (error) {
        console.error('[IntegrationLogger] Failed to log:', error);
        // НЕ бросаем ошибку - логирование не должно ломать основной флоу
      }
    } catch (err) {
      console.error('[IntegrationLogger] Exception:', err);
    }
  }

  /**
   * Обёртка для логирования асинхронной операции
   */
  static async track<T>(
    serviceName: IntegrationLogData['serviceName'],
    action: string,
    operation: () => Promise<T>,
    options?: {
      relatedEntityType?: string;
      relatedEntityId?: string;
    }
  ): Promise<T> {
    const startTime = Date.now();
    let requestPayload: any;
    let responsePayload: any;
    let status: IntegrationLogData['status'] = 'success';
    let errorMessage: string | undefined;
    let errorCode: string | undefined;

    try {
      const result = await operation();
      responsePayload = result;
      return result;
    } catch (error: any) {
      status = 'failed';
      errorMessage = error.message || 'Unknown error';
      errorCode = error.code || error.status?.toString();
      throw error; // Пробрасываем дальше
    } finally {
      const durationMs = Date.now() - startTime;

      await this.log({
        serviceName,
        action,
        status,
        relatedEntityType: options?.relatedEntityType as any,
        relatedEntityId: options?.relatedEntityId,
        requestPayload,
        responsePayload,
        errorMessage,
        errorCode,
        durationMs,
      });
    }
  }
}
```

2. ОБНОВИТЬ: /backend/src/services/amoCrmService.ts

Добавь логирование в критичные методы:

```typescript
import { IntegrationLogger } from './integrationLogger';

// В методе syncLead
export async function syncLead(leadData: any): Promise<void> {
  return IntegrationLogger.track(
    'amocrm',
    'sync_lead',
    async () => {
      // Существующая логика syncLead
      const response = await amoCrmClient.post('/api/v4/leads', leadData);
      return response.data;
    },
    {
      relatedEntityType: 'lead',
      relatedEntityId: leadData.id,
    }
  );
}

// В методе onTripwireStudentCreated
export async function onTripwireStudentCreated(
  studentEmail: string,
  studentName: string
): Promise<void> {
  return IntegrationLogger.track(
    'amocrm',
    'create_tripwire_deal',
    async () => {
      // Существующая логика
      const response = await amoCrmClient.post('/api/v4/leads', {
        name: `Tripwire - ${studentName}`,
        // ...
      });
      return response.data;
    },
    {
      relatedEntityType: 'tripwire_user',
    }
  );
}

// В методе onLessonCompleted
export async function onLessonCompleted(
  userEmail: string,
  lessonNumber: number
): Promise<void> {
  return IntegrationLogger.track(
    'amocrm',
    `lesson_${lessonNumber}_completed`,
    async () => {
      // Существующая логика обновления этапа
      const response = await amoCrmClient.patch(`/api/v4/leads/${leadId}`, {
        status_id: newStatusId,
      });
      return response.data;
    },
    {
      relatedEntityType: 'tripwire_user',
    }
  );
}
```

3. ОБНОВИТЬ: /backend/src/services/emailService.ts

```typescript
import { IntegrationLogger } from './integrationLogger';

// В методе sendTripwireWelcomeEmail
export async function sendTripwireWelcomeEmail(
  to: string,
  studentName: string,
  loginUrl: string
): Promise<void> {
  return IntegrationLogger.track(
    'resend',
    'send_tripwire_welcome_email',
    async () => {
      const response = await resend.emails.send({
        from: 'OnAI Academy <noreply@onai.academy>',
        to,
        subject: 'Добро пожаловать в Tripwire!',
        html: tripwireWelcomeTemplate({ studentName, loginUrl }),
      });
      return response;
    },
    {
      relatedEntityType: 'tripwire_user',
    }
  );
}

// В методе sendCertificateEmail
export async function sendCertificateEmail(
  to: string,
  studentName: string,
  certificateUrl: string
): Promise<void> {
  return IntegrationLogger.track(
    'resend',
    'send_certificate_email',
    async () => {
      const response = await resend.emails.send({
        from: 'OnAI Academy <noreply@onai.academy>',
        to,
        subject: 'Ваш сертификат Tripwire готов!',
        html: certificateTemplate({ studentName, certificateUrl }),
      });
      return response;
    },
    {
      relatedEntityType: 'tripwire_user',
    }
  );
}
```

4. ОБНОВИТЬ: /backend/src/services/telegramService.ts

```typescript
import { IntegrationLogger } from './integrationLogger';

// В методе sendLeadNotification
export async function sendLeadNotification(
  leadData: any,
  groupType: string
): Promise<void> {
  return IntegrationLogger.track(
    'telegram',
    'send_lead_notification',
    async () => {
      const message = formatLeadMessage(leadData);
      const response = await telegramBot.sendMessage(chatId, message, {
        parse_mode: 'HTML',
      });
      return response;
    },
    {
      relatedEntityType: 'lead',
      relatedEntityId: leadData.id,
    }
  );
}
```

5. ОБНОВИТЬ: /backend/src/services/mobizon.ts

```typescript
import { IntegrationLogger } from './integrationLogger';

// В методе sendSMS
export async function sendSMS(
  phone: string,
  message: string
): Promise<void> {
  return IntegrationLogger.track(
    'mobizon',
    'send_sms',
    async () => {
      const response = await mobizonClient.post('/service/message/sendsmsmessage', {
        recipient: phone,
        text: message,
      });
      return response.data;
    }
  );
}
```

ИТОГОВЫЙ ОТЧЁТ:

Создай файл `/docs/PHASE2_LOGGING_INTEGRATION_REPORT.md`:

## ЛОГИРОВАНИЕ ДОБАВЛЕНО ВО ВСЕ СЕРВИСЫ

### Созданные файлы
- ✅ /backend/src/services/integrationLogger.ts (новый)

### Обновлённые файлы
- ✅ /backend/src/services/amoCrmService.ts
- ✅ /backend/src/services/emailService.ts
- ✅ /backend/src/services/telegramService.ts
- ✅ /backend/src/services/mobizon.ts

### Логируемые операции

**AmoCRM:**
- sync_lead
- create_tripwire_deal
- lesson_X_completed

**Resend:**
- send_tripwire_welcome_email
- send_certificate_email

**Telegram:**
- send_lead_notification

**Mobizon:**
- send_sms

### Метрики логирования
- Request payload: да
- Response payload: да
- Duration: да (мс)
- Error handling: да

## СЛЕДУЮЩИЙ ШАГ
Задача 2.3: Создать API endpoint для мониторинга
```

**Результат:** Логирование добавлено во все сервисы

---

### ЗАДАЧА 2.3: Создать API для мониторинга

**Агент:** Codex (Code)

**Промпт:**

```markdown
ЗАДАЧА: Создать API endpoints для мониторинга интеграций

СОЗДАТЬ ФАЙЛ: /backend/src/routes/integration-monitoring.ts

```typescript
import express from 'express';
import { landingSupabase } from '../config/supabase-landing';
import { authenticateJWT } from '../middleware/auth';

const router = express.Router();

/**
 * GET /api/integration-monitoring/stats
 * Получить статистику по интеграциям за последние 24 часа
 */
router.get('/stats', authenticateJWT, async (req, res) => {
  try {
    const { data, error } = await landingSupabase
      .from('integration_stats_hourly')
      .select('*')
      .order('hour', { ascending: false });

    if (error) throw error;

    res.json({ stats: data });
  } catch (error: any) {
    console.error('[Monitoring] Error fetching stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/integration-monitoring/failures
 * Получить последние ошибки интеграций
 */
router.get('/failures', authenticateJWT, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;

    const { data, error } = await landingSupabase
      .from('integration_logs')
      .select('*')
      .eq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    res.json({ failures: data });
  } catch (error: any) {
    console.error('[Monitoring] Error fetching failures:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/integration-monitoring/service/:serviceName
 * Получить логи конкретного сервиса
 */
router.get('/service/:serviceName', authenticateJWT, async (req, res) => {
  try {
    const { serviceName } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;

    const { data, error } = await landingSupabase
      .from('integration_logs')
      .select('*')
      .eq('service_name', serviceName)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    res.json({ logs: data, serviceName });
  } catch (error: any) {
    console.error('[Monitoring] Error fetching service logs:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/integration-monitoring/retry/:logId
 * Повторить неудавшуюся операцию
 */
router.post('/retry/:logId', authenticateJWT, async (req, res) => {
  try {
    const { logId } = req.params;

    // Получить лог
    const { data: log, error: fetchError } = await landingSupabase
      .from('integration_logs')
      .select('*')
      .eq('id', logId)
      .single();

    if (fetchError || !log) {
      return res.status(404).json({ error: 'Log not found' });
    }

    // TODO: Реализовать retry логику для каждого сервиса
    // Пока просто обновляем статус на 'retrying'

    const { error: updateError } = await landingSupabase
      .from('integration_logs')
      .update({
        status: 'retrying',
        retry_count: (log.retry_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', logId);

    if (updateError) throw updateError;

    res.json({ message: 'Retry initiated', logId });
  } catch (error: any) {
    console.error('[Monitoring] Error retrying operation:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

ПОДКЛЮЧИТЬ В: /backend/src/server.ts

```typescript
import integrationMonitoringRoutes from './routes/integration-monitoring';

// ...

app.use('/api/integration-monitoring', integrationMonitoringRoutes);
```

ИТОГОВЫЙ ОТЧЁТ:

Создай файл `/docs/PHASE2_MONITORING_API_REPORT.md`:

## API МОНИТОРИНГА СОЗДАН

### Endpoints

| Method | Path | Описание |
|--------|------|----------|
| GET | /api/integration-monitoring/stats | Статистика за 24ч |
| GET | /api/integration-monitoring/failures | Последние ошибки |
| GET | /api/integration-monitoring/service/:name | Логи сервиса |
| POST | /api/integration-monitoring/retry/:logId | Retry операции |

### Авторизация
- Требуется JWT token
- Middleware: authenticateJWT

### Тесты
```bash
# Тест статистики
curl -H "Authorization: Bearer <token>" \
  https://onai.academy/api/integration-monitoring/stats

# Тест failures
curl -H "Authorization: Bearer <token>" \
  https://onai.academy/api/integration-monitoring/failures?limit=10
```

## СЛЕДУЮЩИЙ ШАГ
Задача 2.4: Создать UI дашборд для мониторинга
```

**Результат:** API endpoints созданы

---

[Продолжение ФАЗЫ 2, ФАЗЫ 3, ФАЗЫ 4 в следующей части документа...]

---

<a name="фаза-3"></a>
## ⚡ ФАЗА 3: ИНДЕКСАЦИЯ И ОПТИМИЗАЦИЯ

[Содержимое Фазы 3 - добавление индексов в БД]

---

<a name="фаза-4"></a>
## 📚 ФАЗА 4: ДОКУМЕНТАЦИЯ И УЛУЧШЕНИЯ

[Опциональные задачи - создание документации, архитектурных диаграмм]

---

## 📊 ТРЕКИНГ ПРОГРЕССА

Используй этот чеклист для отслеживания:

### ФАЗА 0: Подготовка ✅
- [ ] Задача 0.1: Анализ архитектуры
- [ ] Задача 0.2: UI верификация
- [ ] Задача 0.3: Принятие решения

### ФАЗА 1: Архитектурный разрыв 🔴
- [ ] Задача 1A.1: Auth migration
- [ ] Задача 1A.2: Foreign Key
- [ ] Задача 1A.3: RLS policies
- [ ] Задача 1A.4: Backend code
- [ ] Задача 1A.5: Deploy & E2E

### ФАЗА 2: Мониторинг 🟡
- [ ] Задача 2.1: Таблица integration_logs
- [ ] Задача 2.2: Логирование в сервисы
- [ ] Задача 2.3: API мониторинга
- [ ] Задача 2.4: UI дашборд

### ФАЗА 3: Индексация 🟡
- [ ] Задача 3.1: Tripwire индексы
- [ ] Задача 3.2: Landing индексы
- [ ] Задача 3.3: Performance тесты

---

**Конец документа**
**Версия:** 1.0
**Дата:** 30 декабря 2025
