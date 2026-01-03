# МИГРАЦИЯ 004: БЫСТРЫЙ СТАРТ

## 1. ОТКРЫТЬ SQL EDITOR
```
https://supabase.com/dashboard/project/xikaiavwqinamgolmtcy/sql/new
```

## 2. СКОПИРОВАТЬ SQL В БУФЕР (macOS)
```bash
cat /Users/miso/onai-integrator-login/MIGRATION_004_READY_TO_PASTE.sql | pbcopy
```

## 3. ВСТАВИТЬ И ВЫПОЛНИТЬ
- Cmd+V в SQL Editor
- Нажать кнопку RUN

## 4. ПРОВЕРКА
```sql
-- Должно быть 14 столбцов
SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'integration_logs';

-- Должно быть 6 индексов
SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'integration_logs';

-- Должно быть 2 views
SELECT COUNT(*) FROM information_schema.views WHERE table_name LIKE 'integration_stats%';
```

## 5. ТЕСТ
```sql
INSERT INTO integration_logs (service_name, action, status) VALUES ('test', 'test', 'success') RETURNING id;
DELETE FROM integration_logs WHERE service_name = 'test';
```

## ГОТОВО!

Полная инструкция:
- /Users/miso/onai-integrator-login/docs/PHASE2_MIGRATION_004_EXECUTE_NOW.md

Шаблон отчета:
- /Users/miso/onai-integrator-login/docs/PHASE2_MIGRATION_EXECUTED_TEMPLATE.md
