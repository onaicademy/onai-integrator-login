# ИНСТРУКЦИЯ: Выполнение миграции 004

## База данных
**Landing BD**: xikaiavwqinamgolmtcy
**URL**: https://xikaiavwqinamgolmtcy.supabase.co

## Шаги выполнения

### Вариант 1: Через Supabase Dashboard (РЕКОМЕНДУЕТСЯ)

1. Откройте SQL Editor в Supabase:
   https://supabase.com/dashboard/project/xikaiavwqinamgolmtcy/editor

2. Создайте новый запрос (New Query)

3. Скопируйте весь SQL из файла:
   `/sql/migrations/004_create_integration_logs_table.sql`

4. Вставьте в редактор и нажмите **Run** (Ctrl/Cmd + Enter)

5. Дождитесь выполнения (должно быть ~1-2 секунды)

6. Проверьте успешность:
   ```sql
   -- Проверка таблицы
   SELECT COUNT(*) FROM integration_logs;

   -- Проверка views
   SELECT * FROM integration_stats_hourly LIMIT 1;
   SELECT * FROM integration_stats_daily LIMIT 1;

   -- Проверка индексов
   SELECT indexname FROM pg_indexes
   WHERE tablename = 'integration_logs';
   ```

### Вариант 2: Через psql (если есть прямой доступ к БД)

```bash
# Получите connection string из Supabase Dashboard
# Settings > Database > Connection string

psql "postgresql://postgres:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" \
  -f sql/migrations/004_create_integration_logs_table.sql
```

### Вариант 3: Через Supabase CLI

```bash
# Установите CLI (если не установлен)
npm install -g supabase

# Авторизуйтесь
npx supabase login

# Свяжите с проектом
npx supabase link --project-ref xikaiavwqinamgolmtcy

# Выполните миграцию
npx supabase db push
```

## Проверка после выполнения

Выполните следующие запросы в SQL Editor:

```sql
-- 1. Проверка структуры таблицы
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'integration_logs'
ORDER BY ordinal_position;

-- 2. Проверка индексов
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'integration_logs';

-- 3. Проверка views
SELECT
  table_name,
  view_definition
FROM information_schema.views
WHERE table_name LIKE 'integration_stats%';

-- 4. Проверка RLS
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'integration_logs';

-- 5. Проверка policies
SELECT
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'integration_logs';

-- 6. Проверка функции cleanup
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name = 'cleanup_old_integration_logs';
```

## Ожидаемые результаты

### Таблица integration_logs
- ✅ 14 колонок
- ✅ 6 индексов
- ✅ RLS включен
- ✅ 2 политики доступа

### Views
- ✅ integration_stats_hourly
- ✅ integration_stats_daily

### Functions
- ✅ cleanup_old_integration_logs()

## Тестовая вставка

После создания таблицы выполните тест:

```sql
-- Вставка тестового лога
INSERT INTO integration_logs (
  service_name,
  action,
  status,
  duration_ms
) VALUES (
  'test',
  'migration_test',
  'success',
  1
) RETURNING *;

-- Проверка
SELECT * FROM integration_logs WHERE action = 'migration_test';

-- Удаление тестового лога
DELETE FROM integration_logs WHERE action = 'migration_test';
```

## В случае ошибок

### Ошибка: "relation already exists"
Таблица уже создана. Проверьте текущую структуру:
```sql
\d integration_logs
```

### Ошибка: "permission denied"
Используйте service role key или выполните через Supabase Dashboard.

### Ошибка: "syntax error"
Убедитесь, что скопировали весь SQL файл полностью.

## Откат миграции (если нужно)

```sql
-- ВНИМАНИЕ: Удалит все данные!
DROP TABLE IF EXISTS integration_logs CASCADE;
DROP VIEW IF EXISTS integration_stats_hourly;
DROP VIEW IF EXISTS integration_stats_daily;
DROP FUNCTION IF EXISTS cleanup_old_integration_logs();
```

## Следующие шаги

После успешного выполнения миграции:

1. ✅ Создайте отчет `/docs/PHASE2_INTEGRATION_LOGS_TABLE_REPORT.md`
2. 🔄 Переходите к задаче 2.2: Добавление логирования в сервисы
3. 📊 Настройте дашборд для мониторинга логов
