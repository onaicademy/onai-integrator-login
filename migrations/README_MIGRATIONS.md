# 📋 MCP Database Migrations - Инструкция по применению

## 🎯 Цель

Миграции 011-015 исправляют критические проблемы Traffic Dashboard и импортируют исторические данные о лидах.

---

## ✅ Статус миграций

| Migration | Статус | База данных | Описание |
|-----------|--------|-------------|----------|
| **011** | ✅ Применена | Traffic DB | Динамические UTM источники и мульти-продукты |
| **012** | ✅ Применена | Traffic DB | Traffic Weekly Plans и Teams |
| **013** | ✅ Применена | Traffic DB | UTM Analytics Views |
| **014** | ✅ Применена | Traffic DB | Core Data Tables (leads, sales, ad_spend) |
| **015** | ⏳ В процессе | Landing DB → Traffic DB | Import Historical Leads |

---

## 📦 Migration 015: Import Historical Leads

### Проблема, которую решает

**До миграции:**
- ❌ Все метрики показывают 0
- ❌ Лиды не отслеживаются
- ❌ Исторические данные не используются

**После миграции:**
- ✅ Исторические лиды импортированы из Landing DB
- ✅ Лиды атрибутированы к таргетологам через UTM
- ✅ Метрики показывают реальные данные
- ✅ Возможна аналитика по датам и командам

---

## 🚀 Порядок применения Migration 015

### Вариант A: Пошаговый (рекомендуется)

#### **Шаг 1: Экспорт из Landing DB**

1. Открыть **Landing Supabase** (xikaiavwqinamgolmtcy)
2. Перейти в **SQL Editor**
3. Выполнить **PART A** из файла [`mcp_migration_015_adapted.sql`](mcp_migration_015_adapted.sql)
4. Скопировать результаты запроса:
   ```sql
   SELECT * FROM temp_leads_export_to_traffic;
   ```
5. Сохранить результаты в CSV или текстовый файл

#### **Шаг 2: Импорт в Traffic DB**

1. Открыть **Traffic Supabase** (oetodaexnjcunklkdlkv)
2. Перейти в **SQL Editor**
3. Выполнить **PART B** из файла [`mcp_migration_015_adapted.sql`](mcp_migration_015_adapted.sql)
4. В STEP B3 вставить данные из шага 1:
   ```sql
   INSERT INTO temp_leads_import_staging VALUES
   ('uuid-1', 'utm_source', ...),
   ('uuid-2', 'utm_source', ...);
   ```
5. Продолжить выполнение скрипта до конца

#### **Шаг 3: Верификация**

```sql
-- Проверить количество импортированных лидов
SELECT COUNT(*) FROM traffic_leads;

-- Проверить атрибуцию к таргетологам
SELECT * FROM v_leads_by_targetologist_daily
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date DESC;

-- Проверить ТОП UTM источников
SELECT * FROM v_top_utm_sources_by_leads
LIMIT 10;
```

---

### Вариант B: Автоматический (с Foreign Data Wrapper)

**Требования:**
- Доступ к настройке postgres_fdw
- Сетевой доступ между базами данных

**Инструкция:**

1. Открыть **Traffic Supabase** (oetodaexnjcunklkdlkv)
2. Выполнить файл [`015_import_historical_leads_PART3_fdw.sql`](../sql/migrations/015_import_historical_leads_PART3_fdw.sql)
3. Заменить в скрипте:
   - `YOUR_LANDING_DB_PASSWORD` → реальный пароль Landing DB
   - Проверить host и port
4. Выполнить весь скрипт
5. Данные импортируются автоматически

**Преимущества:**
- ✅ Нет ручного экспорта/импорта
- ✅ Возможность инкрементального обновления
- ✅ Функция `sync_leads_from_landing_db()` для регулярной синхронизации

**Использование:**
```sql
-- Синхронизировать новые лиды
SELECT sync_leads_from_landing_db();
```

---

## 📊 Структура данных после миграции

### Таблица `traffic_leads`

| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | UUID | ID лида (из Landing DB) |
| `utm_source` | VARCHAR | UTM источник (для атрибуции) |
| `utm_campaign` | VARCHAR | UTM кампания |
| `funnel_type` | TEXT | express / challenge3d / intensive1d |
| `status` | VARCHAR | new / contacted / qualified / converted / lost |
| `phone` | VARCHAR | Телефон клиента |
| `email` | VARCHAR | Email клиента |
| `name` | VARCHAR | Имя клиента |
| `source` | VARCHAR | facebook / tiktok / google / direct |
| `fb_lead_id` | VARCHAR | Facebook Lead ID |
| `amocrm_lead_id` | BIGINT | AmoCRM Lead ID |
| `created_at` | TIMESTAMPTZ | Дата создания лида |

### Views для аналитики

#### 1. `v_leads_by_targetologist_daily`
Лиды по таргетологам в разрезе дат

```sql
SELECT * FROM v_leads_by_targetologist_daily
WHERE date >= '2026-01-01'
ORDER BY date DESC, leads_count DESC;
```

**Колонки:**
- `date` - дата
- `targetologist` - имя таргетолога
- `team_name` - команда
- `utm_source` - UTM источник
- `funnel_type` - тип воронки
- `leads_count` - количество лидов

#### 2. `v_leads_by_team_daily`
Лиды по командам в разрезе дат

```sql
SELECT * FROM v_leads_by_team_daily
WHERE date >= '2026-01-01'
ORDER BY date DESC;
```

**Колонки:**
- `date` - дата
- `team_name` - команда
- `funnel_type` - тип воронки
- `source` - источник (facebook/tiktok/etc)
- `leads_count` - количество лидов

#### 3. `v_top_utm_sources_by_leads`
ТОП UTM источников по количеству лидов

```sql
SELECT * FROM v_top_utm_sources_by_leads
LIMIT 20;
```

**Колонки:**
- `utm_source` - UTM источник
- `funnel_type` - тип воронки
- `total_leads` - всего лидов
- `active_days` - дней активности
- `first_lead_date` - первый лид
- `last_lead_date` - последний лид
- `synced_to_amocrm` - синхронизировано в AmoCRM

---

## 🔗 Атрибуция лидов к таргетологам

### Как работает атрибуция?

1. Лид создается с UTM меткой (например, `utm_source=kenjifb`)
2. В таблице `traffic_user_utm_sources` есть связь: `kenjifb` → Kenji (targetologist)
3. При запросе view `v_leads_by_targetologist_daily` делает JOIN по UTM
4. Лид автоматически атрибутируется к таргетологу

### Пример атрибуции

```
landing_leads (Landing DB)
  ├─ id: 123
  ├─ metadata: {"utm_source": "kenjifb"}
  └─ created_at: 2026-01-04
        ↓ миграция 015
traffic_leads (Traffic DB)
  ├─ id: 123
  ├─ utm_source: "kenjifb"
  └─ created_at: 2026-01-04
        ↓ JOIN
traffic_user_utm_sources
  ├─ utm_source: "kenjifb"
  └─ user_id: [UUID Kenji]
        ↓ результат
v_leads_by_targetologist_daily
  ├─ targetologist: "Kenji"
  ├─ team_name: "Kenesary"
  └─ leads_count: 1
```

### Что делать, если лиды не атрибутируются?

**Шаг 1: Найти лиды без атрибуции**

```sql
SELECT
  tl.utm_source,
  tl.funnel_type,
  COUNT(*) as unattributed_leads
FROM traffic_leads tl
LEFT JOIN traffic_user_utm_sources uus ON LOWER(tl.utm_source) = LOWER(uus.utm_source)
WHERE tl.utm_source IS NOT NULL
  AND uus.id IS NULL
GROUP BY tl.utm_source, tl.funnel_type
ORDER BY unattributed_leads DESC;
```

**Шаг 2: Добавить недостающие UTM в traffic_user_utm_sources**

```sql
INSERT INTO traffic_user_utm_sources (user_id, utm_source, funnel_type, is_active)
VALUES
  ('[UUID таргетолога]', 'new_utm_source', 'express', TRUE);
```

**Шаг 3: Проверить атрибуцию**

```sql
SELECT * FROM v_leads_by_targetologist_daily
WHERE utm_source = 'new_utm_source'
ORDER BY date DESC;
```

---

## 🚨 Troubleshooting

### Проблема 1: "Table traffic_leads does not exist"

**Причина:** Migration 014 не применена

**Решение:**
```sql
-- Выполнить в Traffic DB
\i sql/migrations/014_core_data_tables.sql
```

### Проблема 2: "No data imported"

**Причина:** Данные не загружены в temp_leads_import_staging

**Решение:**
1. Проверить, что PART A выполнена в Landing DB
2. Убедиться, что данные скопированы из результатов
3. Вставить данные в STEP B3

### Проблема 3: "Connection failed" (для FDW)

**Причина:** Неверные credentials или нет доступа между базами

**Решение:**
1. Проверить host, port, password в STEP 2-3
2. Убедиться, что сетевой доступ разрешен
3. Использовать Вариант A (пошаговый) вместо FDW

### Проблема 4: "Leads not attributed to targetologists"

**Причина:** Нет записей в traffic_user_utm_sources для UTM источников

**Решение:**
1. Выполнить запрос из "Что делать, если лиды не атрибутируются?"
2. Добавить недостающие UTM источники
3. Проверить атрибуцию

---

## 📈 Следующие шаги после миграции

### 1. Настроить автоматическую синхронизацию

**Вариант A: Cron job (для FDW)**

```sql
-- Создать расписание в Supabase
SELECT cron.schedule(
  'sync-leads-from-landing',
  '0 */6 * * *',  -- Каждые 6 часов
  $$SELECT sync_leads_from_landing_db()$$
);
```

**Вариант B: Webhook**

Создать webhook endpoint в Landing DB, который при создании нового лида отправляет данные в Traffic DB через API.

### 2. Обновить дашборды

Проверить, что все метрики отображаются корректно:
- Количество лидов по таргетологам
- Динамика лидов по дням
- ТОП UTM источников

### 3. Добавить команды в traffic_teams

```sql
INSERT INTO traffic_teams (name, display_name, is_active, color)
VALUES
  ('Kenesary', 'Kenesary', TRUE, '#00FF88'),
  ('Alexander Team', 'Alexander Team', TRUE, '#FF6B35');
```

### 4. Привязать рекламные аккаунты

Использовать API endpoint:

```bash
POST /api/traffic-admin/ad-account-bindings
{
  "ad_account_id": "act_123456789",
  "team_name": "Kenesary",
  "ad_platform": "facebook",
  "notes": "Основной рекламный аккаунт"
}
```

---

## 📚 Дополнительные ресурсы

- [Migration 011: Dynamic UTM Sources](mcp_migration_011.sql)
- [Migration 012 & 013: Weekly Plans + Analytics](mcp_migration_012_013_final.sql)
- [Migration 014: Core Data Tables](mcp_migration_014_adapted.sql)
- [Migration 015: Import Leads - Part 1 Export](../sql/migrations/015_import_historical_leads_PART1_export.sql)
- [Migration 015: Import Leads - Part 2 Import](../sql/migrations/015_import_historical_leads_PART2_import.sql)
- [Migration 015: Import Leads - Part 3 FDW](../sql/migrations/015_import_historical_leads_PART3_fdw.sql)
- [Migration 015: Adapted (Combined)](mcp_migration_015_adapted.sql)

---

## ✅ Checklist после всех миграций

- [ ] Migration 011 применена
- [ ] Migration 012 применена
- [ ] Migration 013 применена
- [ ] Migration 014 применена
- [ ] Migration 015 применена (PART A + PART B)
- [ ] Лиды импортированы в traffic_leads
- [ ] Атрибуция к таргетологам работает
- [ ] Views созданы и работают
- [ ] Команды добавлены в traffic_teams
- [ ] Рекламные аккаунты привязаны
- [ ] Автоматическая синхронизация настроена
- [ ] Дашборды проверены и работают

---

**Статус:** ✅ Готово к применению

**Дата:** 2026-01-04

**Автор:** Claude Code (Sonnet 4.5)
