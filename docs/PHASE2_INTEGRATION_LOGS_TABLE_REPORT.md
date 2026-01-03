# PHASE 2: ТАБЛИЦА integration_logs - ИТОГОВЫЙ ОТЧЕТ

**Дата**: 2025-12-30
**База данных**: Landing BD (xikaiavwqinamgolmtcy)
**URL**: https://xikaiavwqinamgolmtcy.supabase.co
**Статус**: ⚠️ ТРЕБУЕТСЯ РУЧНОЕ ВЫПОЛНЕНИЕ МИГРАЦИИ

---

## ТЕКУЩИЙ СТАТУС

### Что сделано
- ✅ Создан SQL скрипт миграции `/sql/migrations/004_create_integration_logs_table.sql`
- ✅ Создана инструкция по выполнению `/sql/migrations/EXECUTE_MIGRATION_004.md`
- ✅ Созданы вспомогательные скрипты для выполнения и проверки
- ✅ Проверено подключение к Landing BD

### Что требуется
- ⚠️ **НЕОБХОДИМО**: Выполнить миграцию вручную через Supabase SQL Editor
- ⚠️ Таблица `integration_logs` не отображается в REST API schema
- ⚠️ Supabase не поддерживает выполнение DDL через REST API или RPC

---

## ИНСТРУКЦИЯ: КАК ВЫПОЛНИТЬ МИГРАЦИЮ

### Шаг 1: Откройте SQL Editor в Supabase

Перейдите по ссылке:
```
https://supabase.com/dashboard/project/xikaiavwqinamgolmtcy/editor
```

### Шаг 2: Создайте новый запрос

1. В SQL Editor нажмите кнопку **"New Query"**
2. Дайте запросу название: `004_create_integration_logs_table`

### Шаг 3: Скопируйте SQL скрипт

Откройте файл:
```
/Users/miso/onai-integrator-login/sql/migrations/004_create_integration_logs_table.sql
```

Скопируйте ВСЁ содержимое файла (включая комментарии).

### Шаг 4: Выполните миграцию

1. Вставьте SQL в редактор
2. Нажмите **"Run"** (или Ctrl/Cmd + Enter)
3. Дождитесь успешного выполнения (~1-2 секунды)
4. Убедитесь, что нет ошибок в консоли

### Шаг 5: Проверьте результат

Выполните проверочные запросы:

```sql
-- Проверка таблицы
SELECT COUNT(*) FROM integration_logs;
-- Ожидается: 0

-- Проверка индексов
SELECT indexname FROM pg_indexes
WHERE tablename = 'integration_logs';
-- Ожидается: 6 индексов

-- Проверка views
SELECT * FROM integration_stats_hourly LIMIT 5;
SELECT * FROM integration_stats_daily LIMIT 5;
-- Ожидается: пустые результаты (таблица пустая)

-- Тестовая вставка
INSERT INTO integration_logs (
  service_name,
  action,
  status,
  duration_ms
) VALUES (
  'test',
  'migration_verification',
  'success',
  1
) RETURNING *;

-- Удалить тестовую запись
DELETE FROM integration_logs WHERE action = 'migration_verification';
```

---

## СТРУКТУРА ТАБЛИЦЫ integration_logs

### Колонки (14 полей)

| Колонка | Тип | Обязательное | Описание |
|---------|-----|--------------|----------|
| `id` | UUID | ✅ | Primary key, auto-generated |
| `service_name` | TEXT | ✅ | Название сервиса: 'amocrm', 'resend', 'telegram', 'mobizon', 'whapi' |
| `action` | TEXT | ✅ | Действие: 'sync_lead', 'send_email', 'send_sms', 'send_telegram' |
| `status` | TEXT | ✅ | Статус: 'success', 'failed', 'pending', 'retrying' (CHECK constraint) |
| `related_entity_type` | TEXT | ❌ | Тип сущности: 'lead', 'student', 'tripwire_user' |
| `related_entity_id` | UUID | ❌ | ID связанной сущности |
| `request_payload` | JSONB | ❌ | Тело запроса к API (полный JSON) |
| `response_payload` | JSONB | ❌ | Ответ от API (полный JSON) |
| `error_message` | TEXT | ❌ | Текст ошибки (если status = 'failed') |
| `error_code` | TEXT | ❌ | Код ошибки (если status = 'failed') |
| `duration_ms` | INTEGER | ❌ | Длительность запроса в миллисекундах |
| `retry_count` | INTEGER | ❌ | Количество повторных попыток (default: 0) |
| `created_at` | TIMESTAMPTZ | Auto | Дата создания записи (default: NOW()) |
| `updated_at` | TIMESTAMPTZ | Auto | Дата обновления записи (default: NOW()) |

### Индексы (6 штук)

| Индекс | Поля | Тип | Назначение |
|--------|------|-----|------------|
| `idx_integration_logs_service_name` | service_name | B-tree | Быстрый поиск по сервису |
| `idx_integration_logs_status` | status | B-tree | Быстрый поиск по статусу |
| `idx_integration_logs_created_at` | created_at DESC | B-tree | Сортировка по дате |
| `idx_integration_logs_related_entity` | related_entity_type, related_entity_id | B-tree Composite | Поиск логов для конкретной сущности |
| `idx_integration_logs_failed` | service_name, created_at DESC WHERE status='failed' | B-tree Partial | Быстрый поиск ошибок |
| `idx_integration_logs_dashboard` | service_name, status, created_at DESC | B-tree Composite | Оптимизация дашборда |

### Views (2 представления)

#### 1. integration_stats_hourly
Статистика по часам (последние 24 часа)

```sql
SELECT * FROM integration_stats_hourly;
```

Поля:
- `service_name` - название сервиса
- `action` - действие
- `status` - статус
- `hour` - час (округлен до начала часа)
- `count` - количество запросов
- `avg_duration_ms` - средняя длительность
- `max_duration_ms` - максимальная длительность
- `failed_count` - количество ошибок

#### 2. integration_stats_daily
Статистика по дням (последние 30 дней)

```sql
SELECT * FROM integration_stats_daily;
```

Поля:
- `service_name` - название сервиса
- `action` - действие
- `status` - статус
- `day` - день (округлен до начала дня)
- `count` - количество запросов
- `avg_duration_ms` - средняя длительность
- `failed_count` - количество ошибок

### Functions (1 функция)

#### cleanup_old_integration_logs()
Автоматическая очистка старых логов

```sql
SELECT cleanup_old_integration_logs();
```

Логика:
1. Удаляет успешные логи старше 90 дней
2. Удаляет все логи старше 180 дней

**Примечание**: Функцию можно запускать вручную или настроить через pg_cron

### Row Level Security (RLS)

- ✅ **RLS включен** на таблице
- ✅ **Service role**: полный доступ (SELECT, INSERT, UPDATE, DELETE)
- ✅ **Authenticated users**: только чтение (SELECT)

Политики:
1. `Service role full access to integration_logs` - полный доступ для service_role
2. `Authenticated users can view integration_logs` - чтение для авторизованных пользователей

---

## ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ

### 1. Логирование успешного запроса к AmoCRM

```typescript
await supabase.from('integration_logs').insert({
  service_name: 'amocrm',
  action: 'sync_lead',
  status: 'success',
  related_entity_type: 'lead',
  related_entity_id: leadId,
  request_payload: {
    lead: { name: 'Иван Иванов', phone: '+77001234567' }
  },
  response_payload: {
    id: 12345678,
    _links: { self: { href: 'https://...' } }
  },
  duration_ms: 234
});
```

### 2. Логирование ошибки отправки email

```typescript
await supabase.from('integration_logs').insert({
  service_name: 'resend',
  action: 'send_email',
  status: 'failed',
  related_entity_type: 'lead',
  related_entity_id: leadId,
  request_payload: {
    to: 'user@example.com',
    subject: 'Welcome',
    html: '<p>Welcome!</p>'
  },
  response_payload: null,
  error_message: 'Invalid email address',
  error_code: 'INVALID_EMAIL',
  duration_ms: 89
});
```

### 3. Логирование повторной попытки SMS

```typescript
await supabase.from('integration_logs').insert({
  service_name: 'mobizon',
  action: 'send_sms',
  status: 'retrying',
  related_entity_type: 'lead',
  related_entity_id: leadId,
  request_payload: {
    recipient: '+77001234567',
    text: 'Ваш код: 1234'
  },
  retry_count: 2,
  duration_ms: 3456
});
```

### 4. Получение статистики по ошибкам

```typescript
// Ошибки за последние 24 часа
const { data: errors } = await supabase
  .from('integration_logs')
  .select('*')
  .eq('status', 'failed')
  .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
  .order('created_at', { ascending: false });

// Статистика по сервисам
const { data: stats } = await supabase
  .from('integration_stats_hourly')
  .select('*')
  .order('hour', { ascending: false });
```

### 5. Поиск логов для конкретного лида

```typescript
const { data: logs } = await supabase
  .from('integration_logs')
  .select('*')
  .eq('related_entity_type', 'lead')
  .eq('related_entity_id', leadId)
  .order('created_at', { ascending: false });
```

---

## ФАЙЛЫ МИГРАЦИИ

### Основные файлы
- ✅ `/sql/migrations/004_create_integration_logs_table.sql` - SQL скрипт миграции
- ✅ `/sql/migrations/EXECUTE_MIGRATION_004.md` - инструкция по выполнению
- ✅ `/backend/scripts/verify-integration-logs-table.ts` - скрипт проверки

### Вспомогательные файлы
- `/backend/scripts/execute-migration-004-simple.ts` - проверка существования таблицы
- `/backend/scripts/run-integration-logs-migration.ts` - альтернативный скрипт выполнения
- `/sql/migrations/execute-migration-004.sh` - bash скрипт

---

## ПРОВЕРКА ПОСЛЕ ВЫПОЛНЕНИЯ

После выполнения миграции запустите скрипт проверки:

```bash
cd /Users/miso/onai-integrator-login/backend
npx ts-node scripts/verify-integration-logs-table.ts
```

Ожидаемый результат:
```
✅ Все тесты пройдены успешно
✅ Таблица integration_logs полностью функциональна
✅ Все CRUD операции работают
✅ Фильтрация и сортировка работают
✅ JSONB поля работают корректно
```

---

## СЛЕДУЮЩИЕ ШАГИ

### Задача 2.2: Добавление логирования в сервисы

После создания таблицы необходимо:

1. **Создать TypeScript интерфейсы**
   - Типы для IntegrationLog
   - Enum для service_name, action, status

2. **Создать сервис логирования**
   - `backend/src/services/integrationLogger.ts`
   - Методы: `logSuccess()`, `logError()`, `logRetry()`

3. **Добавить логирование в существующие сервисы**
   - AmoCRM (backend/src/services/amocrm.ts)
   - Resend (backend/src/services/emailService.ts)
   - Mobizon (backend/src/services/mobizon.ts)
   - Telegram (backend/src/services/telegram.ts)

4. **Создать дашборд для мониторинга**
   - Страница статистики логов
   - Фильтры по сервисам, статусам, датам
   - Графики ошибок и времени ответа

5. **Настроить алерты** (опционально)
   - Telegram уведомления при критических ошибках
   - Email digest с ежедневной статистикой

---

## ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ

### Размер таблицы

Приблизительный размер одной записи: **~2-5 KB** (в зависимости от payload)

Примерное количество записей в день:
- AmoCRM: ~500-1000 запросов
- Resend: ~200-500 email
- Mobizon: ~100-300 SMS
- Telegram: ~50-100 сообщений

**Итого**: ~1000-2000 записей в день = ~30-60К записей в месяц

С учетом cleanup функции (90 дней успешные, 180 дней все):
- Размер таблицы: ~100-200 MB
- Требуется периодическая очистка или архивация

### Мониторинг производительности

Для мониторинга производительности используйте:

```sql
-- Проверка размера таблицы
SELECT pg_size_pretty(pg_total_relation_size('integration_logs'));

-- Статистика использования индексов
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename = 'integration_logs';

-- Самые медленные запросы
SELECT
  service_name,
  action,
  AVG(duration_ms) as avg_duration,
  MAX(duration_ms) as max_duration,
  COUNT(*) as total_requests
FROM integration_logs
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY service_name, action
ORDER BY avg_duration DESC;
```

---

## КОНТАКТЫ И ПОДДЕРЖКА

**База данных**: Landing BD
**Project ID**: xikaiavwqinamgolmtcy
**Region**: eu-central-1
**Dashboard**: https://supabase.com/dashboard/project/xikaiavwqinamgolmtcy

**Документация Supabase**:
- SQL Editor: https://supabase.com/docs/guides/database/overview
- RLS: https://supabase.com/docs/guides/auth/row-level-security
- PostgREST: https://postgrest.org/

---

**Отчет создан**: 2025-12-30
**Автор**: Claude Code
**Версия миграции**: 004
