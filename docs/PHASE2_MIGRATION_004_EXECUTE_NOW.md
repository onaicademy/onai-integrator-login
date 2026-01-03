# ВЫПОЛНИТЬ МИГРАЦИЮ 004 СЕЙЧАС

## ПРИЧИНА РУЧНОГО ВЫПОЛНЕНИЯ

Автоматическое выполнение через PostgreSQL pooler не работает:
- Ошибка: "Tenant or user not found"
- PostgreSQL credentials устарели или изменились
- Supabase REST API не поддерживает прямое SQL

## РЕШЕНИЕ: Использовать Supabase Dashboard

---

## ШАГ 1: Открыть SQL Editor

Кликни по ссылке:
```
https://supabase.com/dashboard/project/xikaiavwqinamgolmtcy/sql/new
```

Должен открыться SQL Editor в проекте **Landing BD** (xikaiavwqinamgolmtcy)

---

## ШАГ 2: Скопировать готовый SQL

Файл уже подготовлен и готов к копированию:
```bash
/Users/miso/onai-integrator-login/MIGRATION_004_READY_TO_PASTE.sql
```

### Как скопировать:
```bash
# Вариант 1: Открыть в редакторе
code /Users/miso/onai-integrator-login/MIGRATION_004_READY_TO_PASTE.sql

# Вариант 2: Скопировать в буфер (macOS)
cat /Users/miso/onai-integrator-login/MIGRATION_004_READY_TO_PASTE.sql | pbcopy

# Вариант 3: Вывести в терминал
cat /Users/miso/onai-integrator-login/MIGRATION_004_READY_TO_PASTE.sql
```

---

## ШАГ 3: Вставить и выполнить

1. В SQL Editor нажми `Cmd+A` (выделить все)
2. Нажми `Cmd+V` (вставить SQL)
3. Нажми кнопку **RUN** (справа вверху)
4. Дождись выполнения (~5-10 секунд)

### Ожидаемый результат:
```
Success. No rows returned.
```

Или можешь увидеть несколько сообщений:
```
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE VIEW
CREATE VIEW
ALTER TABLE
CREATE POLICY
CREATE POLICY
CREATE FUNCTION
COMMENT
...
```

---

## ШАГ 4: Проверить результат

Скопируй эти запросы в **новую вкладку** SQL Editor и выполни по очереди:

### 4.1 Проверить таблицу
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'integration_logs'
ORDER BY ordinal_position;
```
**Ожидается**: 14 строк (столбцов)

### 4.2 Проверить индексы
```sql
SELECT indexname
FROM pg_indexes
WHERE tablename = 'integration_logs';
```
**Ожидается**: 6 индексов

### 4.3 Проверить views
```sql
SELECT table_name
FROM information_schema.views
WHERE table_name LIKE 'integration_stats%';
```
**Ожидается**: 2 views

### 4.4 Проверить функцию
```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'cleanup_old_integration_logs';
```
**Ожидается**: 1 функция

### 4.5 Проверить RLS
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'integration_logs';
```
**Ожидается**: rowsecurity = `true`

### 4.6 Проверить политики
```sql
SELECT policyname
FROM pg_policies
WHERE tablename = 'integration_logs';
```
**Ожидается**: 2 политики

---

## ШАГ 5: Тестовая вставка

Выполни этот SQL для теста:

```sql
-- Вставить тестовую запись
INSERT INTO integration_logs (service_name, action, status, duration_ms)
VALUES ('test', 'test_action', 'success', 100)
RETURNING id, service_name, action, status, created_at;
```

**Ожидается**: Одна строка с данными о созданной записи

```sql
-- Проверить что запись создалась
SELECT * FROM integration_logs WHERE service_name = 'test';
```

**Ожидается**: Одна строка

```sql
-- Удалить тестовую запись
DELETE FROM integration_logs WHERE service_name = 'test';
```

**Ожидается**: `DELETE 1`

```sql
-- Финальная проверка
SELECT COUNT(*) as should_be_zero
FROM integration_logs
WHERE service_name = 'test';
```

**Ожидается**: 0

---

## ШАГ 6: Создать отчет

Если все проверки прошли успешно, создай файл отчета:

```bash
/Users/miso/onai-integrator-login/docs/PHASE2_MIGRATION_EXECUTED.md
```

С содержимым:

```markdown
# МИГРАЦИЯ 004 ВЫПОЛНЕНА

## ДАТА ВЫПОЛНЕНИЯ
2025-12-30

## БАЗА ДАННЫХ
Landing BD (xikaiavwqinamgolmtcy)

## РЕЗУЛЬТАТЫ

### Созданные объекты
- ✅ Таблица: `integration_logs` (14 столбцов)
- ✅ Индексов: 6
- ✅ Views: 2
- ✅ Функций: 1
- ✅ RLS политик: 2

### Проверки
- ✅ Таблица создана: 14 столбцов
- ✅ Индексы созданы: 6 штук
- ✅ Views созданы: 2 штуки
- ✅ Функция создана: cleanup_old_integration_logs
- ✅ RLS включен: true
- ✅ Политики созданы: 2 штуки

### Тест
- ✅ Вставка работает
- ✅ Чтение работает
- ✅ Удаление работает

## СТАТУС
**ГОТОВО К ИСПОЛЬЗОВАНИЮ**

Таблица `integration_logs` готова для логирования всех внешних интеграций:
- AmoCRM
- Resend
- Telegram
- Mobizon
- Whapi

## СЛЕДУЮЩИЕ ШАГИ
1. Интегрировать логирование в сервисы
2. Создать dashboard для просмотра логов
3. Настроить автоматическую очистку старых логов
```

---

## TROUBLESHOOTING

### Ошибка: "relation already exists"
Таблица уже создана. Проверь:
```sql
SELECT COUNT(*) FROM integration_logs;
```

Если работает - миграция уже выполнена.

### Ошибка: "policy already exists"
Политики уже созданы. Удали и создай заново:
```sql
DROP POLICY IF EXISTS "Service role full access to integration_logs" ON integration_logs;
DROP POLICY IF EXISTS "Authenticated users can view integration_logs" ON integration_logs;
```

Затем выполни создание политик из SQL файла заново.

### Ошибка: "permission denied"
Убедись что:
1. Залогинен в правильный проект (xikaiavwqinamgolmtcy)
2. Используешь service_role (должен быть по умолчанию в Dashboard)
3. Проверь что у тебя права admin в проекте

---

## ССЫЛКИ

- **Dashboard**: https://supabase.com/dashboard/project/xikaiavwqinamgolmtcy
- **SQL Editor**: https://supabase.com/dashboard/project/xikaiavwqinamgolmtcy/sql/new
- **Table Editor**: https://supabase.com/dashboard/project/xikaiavwqinamgolmtcy/editor
- **Готовый SQL**: /Users/miso/onai-integrator-login/MIGRATION_004_READY_TO_PASTE.sql
- **Оригинал**: /Users/miso/onai-integrator-login/sql/migrations/004_create_integration_logs_table.sql
