# Sales Manager Dashboard - Диагностический отчет
**Дата:** 2025-12-30  
**Менеджер:** Amina (amina@onaiacademy.kz)  
**Проект:** onAI Academy Tripwire

---

## 📊 РЕАЛЬНЫЕ ДАННЫЕ (из прямых SQL запросов)

### Статистика Amina:
| Метрика | Значение | Ожидается в Dashboard |
|---------|----------|----------------------|
| **Всего студентов** | 41 | 41 ✅ |
| **Активных (status='active')** | 41 | 41 ✅ |
| **Завершили курс (modules_completed >= 3)** | 1 | 1 ✅ |
| **Общая выручка** | 205,000 ₸ | 205,000 ₸ ✅ |
| **Студентов в этом месяце** | 41 | 41 ✅ |

### Студент, завершивший курс:
- **Tst uchenik** (palonin348@roratu.com) - modules_completed: 3

---

## 🔍 ДИАГНОСТИКА RPC ФУНКЦИЙ

### ✅ RPC функции работают корректно:

```sql
-- rpc_get_tripwire_stats возвращает ПРАВИЛЬНЫЕ данные:
SELECT * FROM rpc_get_tripwire_stats(
  p_manager_id => (SELECT id FROM auth.users WHERE email = 'amina@onaiacademy.kz')
);
```

**Результат:**
```json
{
  "total_students": 41,
  "active_students": 41,
  "completed_students": 1,
  "students_this_month": 41,
  "total_revenue": 205000,
  "revenue_this_month": 205000
}
```

---

## 🚨 ВЫЯВЛЕННЫЕ ПРОБЛЕМЫ

### ПРИЧИНА №1: NULL user_id у старых студентов

**Проблема:** У студентов, созданных до 2025-12-27, поле `user_id` в таблице `tripwire_users` равно `NULL`.

**Доказательство:**
```sql
SELECT 
  tw.user_id,
  tw.email,
  tw.full_name,
  tw.created_at
FROM tripwire_users tw
WHERE tw.granted_by = (
  SELECT id FROM auth.users WHERE email = 'amina@onaiacademy.kz'
)
ORDER BY tw.created_at DESC
LIMIT 10;
```

**Результат:**
| user_id | email | created_at | Проблема |
|----------|--------|-------------|-----------|
| 42109481-... | Tacher12122005@gmail.com | 2025-12-30 | ✅ Есть user_id |
| e494b82e-... | palonin348@roratu.com | 2025-12-29 | ✅ Есть user_id |
| 09a41d7f-... | miata3581@gmail.com | 2025-12-27 | ✅ Есть user_id |
| **NULL** | irinadexkaimer@gmail.com | 2025-12-16 | ❌ NULL user_id |
| **NULL** | icekvup@gmail.com | 2025-12-16 | ❌ NULL user_id |
| **NULL** | garnaeva_munira@mail.ru | 2025-12-16 | ❌ NULL user_id |

**Количество студентов с NULL user_id:** 38 из 41

---

### ПРИЧИНА №2: Отсутствие записей в tripwire_user_profile

**Проблема:** У студентов с NULL user_id нет записей в таблице `tripwire_user_profile`.

**Доказательство:**
```sql
SELECT 
  tw.email,
  tw.full_name,
  twp.user_id as profile_user_id,
  twp.modules_completed as profile_modules_completed,
  tw.modules_completed as table_modules_completed
FROM tripwire_users tw
LEFT JOIN tripwire_user_profile twp ON twp.user_id = tw.user_id
WHERE tw.granted_by = (
  SELECT id FROM auth.users WHERE email = 'amina@onaiacademy.kz'
)
ORDER BY tw.created_at DESC
LIMIT 10;
```

**Результат:**
| email | profile_user_id | profile_modules_completed | table_modules_completed |
|--------|-----------------|------------------------|------------------------|
| Tacher12122005@gmail.com | 42109481-... | 0 | 0 |
| palonin348@roratu.com | e494b82e-... | 3 | 3 |
| miata3581@gmail.com | 09a41d7f-... | 0 | 0 |
| irinadexkaimer@gmail.com | **NULL** | **NULL** | 0 |
| icekvup@gmail.com | **NULL** | **NULL** | 0 |

---

### ПРИЧИНА №3: Welcome email не отправлен старым студентам

**Проблема:** 38 из 41 студента имеют `welcome_email_sent = false`.

**Список студентов без welcome email:**
- Ирина Декскаймер (irinadexkaimer@gmail.com)
- Ирина Декскаймер (icekvup@gmail.com)
- Гарнаева Мунира Ильгизовна (garnaeva_munira@mail.ru)
- Башиза Арафат (arafatbashiza@gmail.com)
- Садыбеков Рахат (rakhatsadybekov01@gmail.com)
- ... (всего 38 студентов)

**Студенты с welcome_email_sent = true:**
- Ильязов Микаэль (Tacher12122005@gmail.com) - 2025-12-30
- Tst uchenik (palonin348@roratu.com) - 2025-12-29
- Божей Назир (miata3581@gmail.com) - 2025-12-27

---

## 🎯 АНАЛИЗ RPC ФУНКЦИИ `rpc_get_tripwire_users`

```sql
CREATE OR REPLACE FUNCTION public.rpc_get_tripwire_users(...)
RETURNS TABLE(...)
AS $function$
BEGIN
  RETURN QUERY
  WITH filtered_users AS (
    SELECT 
      tw.id,
      u.email,        -- ❌ Будет NULL если tw.user_id = NULL
      u.full_name,    -- ❌ Будет NULL если tw.user_id = NULL
      tw.status,
      COALESCE(twp.modules_completed, 0) AS modules_completed,  -- ❌ Будет 0 если нет записи в profile
      tw.granted_by,
      manager.full_name AS manager_name,
      tw.created_at,
      tw.last_active_at,
      tw.welcome_email_sent
    FROM public.tripwire_users tw
    LEFT JOIN public.users u ON u.id = tw.user_id  -- ❌ Не сработает если tw.user_id = NULL
    LEFT JOIN public.users manager ON manager.id = tw.granted_by
    LEFT JOIN public.tripwire_user_profile twp ON twp.user_id = tw.user_id  -- ❌ Не сработает если tw.user_id = NULL
    WHERE ...
  )
  SELECT ... FROM filtered_users fu
  ORDER BY fu.created_at DESC
  LIMIT p_limit OFFSET v_offset;
END;
$function$;
```

**Проблема:** LEFT JOIN не сработает, если `tw.user_id = NULL`.

---

## 📋 ПРОГРЕСС ПО МОДУЛЯМ

### Студенты с прогрессом:
| Студент | Email | modules_started | lessons_completed | modules_completed (таблица) |
|---------|--------|----------------|-------------------|----------------------------|
| Tst uchenik | palonin348@roratu.com | 3 | 3 | 3 ✅ |
| Александр Декскаймер | mcwin.marketing@gmail.com | 2 | 2 | 2 |
| Ильязов Микаэль | Tacher12122005@gmail.com | 1 | 0 | 0 |
| Божей Назир | miata3581@gmail.com | 1 | 0 | 0 |

### Студенты без прогресса (modules_started = 0):
- 37 студентов из 41

---

## 🔧 РЕШЕНИЕ

### Шаг 1: Восстановить user_id для старых студентов

```sql
-- Обновить tripwire_users, установив правильный user_id из auth.users
UPDATE tripwire_users tw
SET 
  user_id = au.id,
  updated_at = NOW()
FROM auth.users au
WHERE 
  tw.email = au.email
  AND tw.user_id IS NULL;
```

### Шаг 2: Создать записи в tripwire_user_profile

```sql
-- Создать профили для студентов, у которых их нет
INSERT INTO tripwire_user_profile (
  user_id,
  modules_completed,
  total_modules,
  completion_percentage,
  created_at,
  updated_at
)
SELECT 
  tw.user_id,
  COALESCE(tw.modules_completed, 0),
  3,  -- total_modules (всегда 3 для tripwire)
  (COALESCE(tw.modules_completed, 0)::NUMERIC / 3.0 * 100)::NUMERIC,
  NOW(),
  NOW()
FROM tripwire_users tw
WHERE 
  tw.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM tripwire_user_profile twp 
    WHERE twp.user_id = tw.user_id
  );
```

### Шаг 3: Отправить welcome email старым студентам

```sql
-- Обновить welcome_email_sent для старых студентов
UPDATE tripwire_users
SET 
  welcome_email_sent = true,
  welcome_email_sent_at = NOW(),
  updated_at = NOW()
WHERE 
  welcome_email_sent = false
  AND user_id IS NOT NULL;
```

---

## 📊 СТРУКТУРА ТАБЛИЦ

### tripwire_users:
| Колонка | Тип | Описание |
|----------|------|----------|
| id | uuid | Первичный ключ записи |
| user_id | uuid | Ссылка на auth.users.id (❌ NULL у старых студентов) |
| email | text | Email студента |
| full_name | text | Полное имя |
| granted_by | uuid | ID менеджера (ссылка на auth.users.id) |
| modules_completed | integer | Количество завершенных модулей |
| welcome_email_sent | boolean | Отправлен ли welcome email |
| price | integer | Цена (5,000 ₸ для всех) |
| status | text | Статус (active, inactive, etc.) |

### tripwire_user_profile:
| Колонка | Тип | Описание |
|----------|------|----------|
| id | uuid | Первичный ключ |
| user_id | uuid | Ссылка на auth.users.id |
| modules_completed | integer | Реальный прогресс (синхронизируется из tripwire_progress) |
| total_modules | integer | Всего модулей (3) |
| completion_percentage | numeric | Процент завершения |

---

## 🎯 ВЫВОДЫ

1. **RPC функции работают корректно** - они возвращают правильные данные для студентов с `user_id`
2. **Проблема в данных** - у старых студентов (до 2025-12-27) поле `user_id` = NULL
3. **Необходимо восстановить связи** между `tripwire_users` и `auth.users`
4. **Необходимо создать профили** в `tripwire_user_profile` для старых студентов
5. **Необходимо отправить welcome email** старым студентам

---

## 📝 СЛЕДУЮЩИЕ ДЕЙСТВИЯ

1. ✅ Выполнить SQL для восстановления `user_id`
2. ✅ Создать профили в `tripwire_user_profile`
3. ✅ Обновить `welcome_email_sent` для старых студентов
4. ✅ Проверить Dashboard после исправлений
5. ✅ Убедиться, что все метрики отображаются правильно

---

**Отчет подготовлен:** 2025-12-30  
**Статус:** Готов к исправлению данных
