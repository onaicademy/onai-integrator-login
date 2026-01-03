# МИГРАЦИЯ 004: integration_logs

## СТАТУС: ТРЕБУЕТСЯ РУЧНОЕ ВЫПОЛНЕНИЕ

### Причина
- PostgreSQL pooler credentials устарели или были изменены
- REST API не поддерживает прямое выполнение SQL
- Необходимо использовать Supabase Dashboard SQL Editor

---

## ИНСТРУКЦИЯ ПО ВЫПОЛНЕНИЮ

### Шаг 1: Открой SQL Editor
```
https://supabase.com/dashboard/project/xikaiavwqinamgolmtcy/sql/new
```

### Шаг 2: Скопируй SQL
Файл находится в:
```
/Users/miso/onai-integrator-login/sql/migrations/004_create_integration_logs_table.sql
```

### Шаг 3: Вставь и выполни
1. Открой файл миграции
2. Скопируй весь SQL (строки 10-145)
3. Вставь в SQL Editor
4. Нажми кнопку RUN

---

## ЧТО СОЗДАЕТСЯ

### 1. Таблица `integration_logs`
- **Столбцов**: 14
- **Назначение**: Централизованное логирование всех внешних интеграций
- **Сервисы**: AmoCRM, Resend, Telegram, Mobizon, Whapi

### 2. Индексы (6 штук)
- `idx_integration_logs_service_name` - поиск по сервису
- `idx_integration_logs_status` - поиск по статусу
- `idx_integration_logs_created_at` - сортировка по времени
- `idx_integration_logs_related_entity` - связь с сущностями
- `idx_integration_logs_failed` - быстрый поиск ошибок
- `idx_integration_logs_dashboard` - для дашборда

### 3. Views (2 штуки)
- `integration_stats_hourly` - статистика по часам (24h)
- `integration_stats_daily` - статистика по дням (30d)

### 4. RLS Policies (2 штуки)
- Service role - полный доступ
- Authenticated users - только чтение

### 5. Функции (1 штука)
- `cleanup_old_integration_logs()` - очистка старых логов

---

## ПРОВЕРКА ПОСЛЕ ВЫПОЛНЕНИЯ

Выполни эти запросы в SQL Editor для проверки:

### Проверить таблицу
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'integration_logs'
ORDER BY ordinal_position;
```
**Ожидаемый результат**: 14 строк (столбцов)

### Проверить индексы
```sql
SELECT indexname
FROM pg_indexes
WHERE tablename = 'integration_logs';
```
**Ожидаемый результат**: 6 индексов

### Проверить views
```sql
SELECT table_name
FROM information_schema.views
WHERE table_name LIKE 'integration_stats%';
```
**Ожидаемый результат**: 2 view

### Проверить функцию
```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'cleanup_old_integration_logs';
```
**Ожидаемый результат**: 1 функция

### Проверить RLS
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'integration_logs';
```
**Ожидаемый результат**: rowsecurity = true

### Проверить политики
```sql
SELECT policyname
FROM pg_policies
WHERE tablename = 'integration_logs';
```
**Ожидаемый результат**: 2 политики

---

## ТЕСТОВАЯ ВСТАВКА

После успешного создания, протестируй работу:

```sql
-- Вставить тестовую запись
INSERT INTO integration_logs (service_name, action, status, duration_ms)
VALUES ('test', 'test_action', 'success', 100)
RETURNING id, service_name, action, status, created_at;

-- Проверить что запись создалась
SELECT * FROM integration_logs WHERE service_name = 'test';

-- Удалить тестовую запись
DELETE FROM integration_logs WHERE service_name = 'test';

-- Проверить что удалилась
SELECT COUNT(*) FROM integration_logs WHERE service_name = 'test';
-- Должно быть: 0
```

---

## ПОСЛЕ УСПЕШНОГО ВЫПОЛНЕНИЯ

Создай отчет:
```bash
# Создай файл /docs/PHASE2_MIGRATION_EXECUTED.md
```

С содержимым:
```markdown
## МИГРАЦИЯ 004 ВЫПОЛНЕНА

### Дата
2025-12-30

### Результат
- ✅ Таблица integration_logs создана
- ✅ Индексов создано: 6
- ✅ Views создано: 2
- ✅ Функций создано: 1
- ✅ RLS политик создано: 2

### Тест
- ✅ Вставка работает
- ✅ Удаление работает

## ГОТОВО К ИСПОЛЬЗОВАНИЮ
```

---

## TROUBLESHOOTING

### Ошибка: "relation already exists"
```sql
-- Проверь что таблица уже создана
SELECT COUNT(*) FROM integration_logs;
```

### Ошибка: "policy already exists"
```sql
-- Удали существующие политики
DROP POLICY IF EXISTS "Service role full access to integration_logs" ON integration_logs;
DROP POLICY IF EXISTS "Authenticated users can view integration_logs" ON integration_logs;

-- Потом создай заново
```

### Ошибка: "permission denied"
- Убедись что используешь service_role key
- Проверь что залогинен в правильный проект Supabase

---

## ССЫЛКИ

- **Dashboard**: https://supabase.com/dashboard/project/xikaiavwqinamgolmtcy
- **SQL Editor**: https://supabase.com/dashboard/project/xikaiavwqinamgolmtcy/sql/new
- **Table Editor**: https://supabase.com/dashboard/project/xikaiavwqinamgolmtcy/editor
- **Миграция**: /Users/miso/onai-integrator-login/sql/migrations/004_create_integration_logs_table.sql
