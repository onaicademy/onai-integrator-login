# INTEGRATION LOGS - КРАТКИЙ ОБЗОР

**Дата**: 2025-12-30
**Статус**: ⚠️ ГОТОВО К ВЫПОЛНЕНИЮ

---

## ЧТО СОЗДАНО

### Основные файлы

1. **SQL миграция** (главный файл)
   ```
   /sql/migrations/004_create_integration_logs_table.sql
   ```
   - 14 колонок (id, service_name, action, status, payloads, timestamps)
   - 6 индексов (для быстрого поиска)
   - 2 view (hourly, daily статистика)
   - 1 функция (cleanup старых логов)
   - RLS политики (service_role + authenticated)

2. **Документация**
   ```
   /docs/PHASE2_INTEGRATION_LOGS_TABLE_REPORT.md - полная документация
   /sql/migrations/EXECUTE_MIGRATION_004.md - инструкция выполнения
   /sql/migrations/QUICK_START_004.md - быстрый старт
   ```

3. **Скрипты проверки**
   ```
   /backend/scripts/verify-integration-logs-table.ts - проверка таблицы
   /backend/scripts/execute-migration-004-simple.ts - проверка существования
   ```

---

## КАК ВЫПОЛНИТЬ

### Вариант 1: Через Supabase Dashboard (РЕКОМЕНДУЕТСЯ)

```
1. Откройте: https://supabase.com/dashboard/project/xikaiavwqinamgolmtcy/editor
2. Нажмите "New Query"
3. Скопируйте содержимое файла: sql/migrations/004_create_integration_logs_table.sql
4. Вставьте в редактор
5. Нажмите "Run" (Ctrl/Cmd + Enter)
6. Дождитесь ~1-2 секунды
7. Проверьте: SELECT COUNT(*) FROM integration_logs;
```

### Вариант 2: Через терминал (если настроен psql)

```bash
# Если есть прямой доступ к PostgreSQL
psql "postgresql://postgres:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" \
  -f sql/migrations/004_create_integration_logs_table.sql
```

---

## СТРУКТУРА ТАБЛИЦЫ

```sql
CREATE TABLE integration_logs (
  id UUID PRIMARY KEY,
  service_name TEXT NOT NULL,        -- 'amocrm', 'resend', 'telegram', 'mobizon', 'whapi'
  action TEXT NOT NULL,               -- 'sync_lead', 'send_email', 'send_sms'
  status TEXT NOT NULL,               -- 'success', 'failed', 'pending', 'retrying'
  related_entity_type TEXT,           -- 'lead', 'student', 'tripwire_user'
  related_entity_id UUID,
  request_payload JSONB,              -- Полный request
  response_payload JSONB,             -- Полный response
  error_message TEXT,
  error_code TEXT,
  duration_ms INTEGER,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ

### 1. Логирование успешного запроса

```typescript
await supabase.from('integration_logs').insert({
  service_name: 'amocrm',
  action: 'sync_lead',
  status: 'success',
  related_entity_type: 'lead',
  related_entity_id: leadId,
  request_payload: { /* full request */ },
  response_payload: { /* full response */ },
  duration_ms: 234
});
```

### 2. Логирование ошибки

```typescript
await supabase.from('integration_logs').insert({
  service_name: 'resend',
  action: 'send_email',
  status: 'failed',
  error_message: 'Invalid email',
  error_code: 'INVALID_EMAIL',
  duration_ms: 89
});
```

### 3. Получение статистики

```typescript
// Статистика за последние 24 часа
const { data } = await supabase
  .from('integration_stats_hourly')
  .select('*')
  .order('hour', { ascending: false });

// Все ошибки за последний час
const { data: errors } = await supabase
  .from('integration_logs')
  .select('*')
  .eq('status', 'failed')
  .gte('created_at', new Date(Date.now() - 60*60*1000).toISOString());
```

---

## ПРОВЕРКА ПОСЛЕ ВЫПОЛНЕНИЯ

```bash
cd backend
npx ts-node scripts/verify-integration-logs-table.ts
```

Ожидаемый результат:
```
✅ Все тесты пройдены успешно
✅ Таблица integration_logs полностью функциональна
```

---

## СЛЕДУЮЩИЕ ШАГИ

### Фаза 2.2: Добавление логирования в сервисы

1. Создать TypeScript интерфейсы
   ```typescript
   interface IntegrationLog {
     service_name: 'amocrm' | 'resend' | 'telegram' | 'mobizon' | 'whapi';
     action: string;
     status: 'success' | 'failed' | 'pending' | 'retrying';
     // ...
   }
   ```

2. Создать сервис логирования
   ```
   backend/src/services/integrationLogger.ts
   ```

3. Добавить логирование в существующие сервисы
   - AmoCRM: backend/src/services/amocrm.ts
   - Resend: backend/src/services/emailService.ts
   - Mobizon: backend/src/services/mobizon.ts
   - Telegram: backend/src/services/telegram.ts

4. Создать дашборд для мониторинга
   - График ошибок
   - Статистика по сервисам
   - Время ответа

---

## БАЗА ДАННЫХ

**Название**: Landing BD
**Project ID**: xikaiavwqinamgolmtcy
**URL**: https://xikaiavwqinamgolmtcy.supabase.co
**Region**: eu-central-1

**Dashboard**: https://supabase.com/dashboard/project/xikaiavwqinamgolmtcy
**SQL Editor**: https://supabase.com/dashboard/project/xikaiavwqinamgolmtcy/editor

---

## ФАЙЛЫ

### SQL
- `/sql/migrations/004_create_integration_logs_table.sql` - SQL миграция

### Документация
- `/docs/PHASE2_INTEGRATION_LOGS_TABLE_REPORT.md` - полный отчет
- `/sql/migrations/EXECUTE_MIGRATION_004.md` - инструкция
- `/sql/migrations/QUICK_START_004.md` - быстрый старт

### Скрипты
- `/backend/scripts/verify-integration-logs-table.ts` - проверка
- `/backend/scripts/execute-migration-004-simple.ts` - статус

---

## ВАЖНО

⚠️ **ТАБЛИЦА НЕ СОЗДАНА АВТОМАТИЧЕСКИ**

Supabase не поддерживает выполнение DDL через REST API.
Миграцию необходимо выполнить вручную через SQL Editor.

✅ Все файлы готовы
✅ SQL скрипт проверен
✅ Инструкции написаны

🚀 Готово к выполнению!

---

**Создано**: 2025-12-30
**Автор**: Claude Code
