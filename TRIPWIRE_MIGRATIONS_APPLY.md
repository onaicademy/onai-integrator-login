# 📋 TRIPWIRE SUPABASE - МИГРАЦИИ ДЛЯ ПРИМЕНЕНИЯ

**Проект:** `pjmvxecykysfrzppdcto` (Tripwire DB)  
**Дата:** 19 декабря 2025

---

## ⚡ ПОРЯДОК ВЫПОЛНЕНИЯ

Применить миграции **СТРОГО ПО ПОРЯДКУ** через MCP Supabase:

### 1️⃣ traffic_teams

**Файл:** `supabase/migrations/20251219_create_traffic_teams.sql`

**Что создаёт:**
- Таблица `traffic_teams` - команды таргетологов
- View `traffic_teams_with_users` - команды с количеством пользователей
- Initial data: Kenesary, Arystan, Muha, Traf4

**Зависимости:** Требует существование таблицы `traffic_users`

---

### 2️⃣ traffic_user_sessions

**Файл:** `supabase/migrations/20251219_create_traffic_sessions.sql`

**Что создаёт:**
- Таблица `traffic_user_sessions` - логи всех входов
- View `traffic_suspicious_activity` - подозрительные логины
- Indexes для быстрого поиска

**Зависимости:** Требует `traffic_users`

---

### 3️⃣ all_sales_tracking

**Файл:** `supabase/migrations/20251219_create_all_sales_tracking.sql`

**Что создаёт:**
- Таблица `all_sales_tracking` - трекинг продаж с UTM
- Views:
  - `top_utm_sources` - топ источников
  - `top_utm_campaigns` - топ кампаний
  - `targetologist_extended_stats` - статистика таргетологов
  - `sales_without_utm` - продажи без UTM
  - `daily_utm_stats` - дневная статистика
- Function `update_targetologist_from_utm()` - автоопределение таргетолога

**Зависимости:** Нет

---

### 4️⃣ onboarding_progress

**Файл:** `supabase/migrations/20251219_create_onboarding_progress.sql`

**Что создаёт:**
- Таблица `onboarding_progress` - прогресс онбординга пользователей

**Зависимости:** Требует `traffic_users`

---

### 5️⃣ targetologist_settings

**Файл:** `supabase/migrations/20251219_create_targetologist_settings.sql`

**Что создаёт:**
- Таблица `targetologist_settings` - настройки таргетологов
- Поле `utm_templates` (JSONB) - UTM источники

**Зависимости:** Требует `traffic_users`

---

## ✅ ПРОВЕРКА ПОСЛЕ ПРИМЕНЕНИЯ

### SQL Query для проверки таблиц

```sql
-- Проверить что все таблицы созданы
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'traffic%'
  OR table_name = 'all_sales_tracking'
ORDER BY table_name;

-- Ожидаемый результат:
-- all_sales_tracking
-- onboarding_progress
-- targetologist_settings
-- traffic_teams
-- traffic_user_sessions
-- traffic_users (уже должна существовать)
```

### Проверить Views

```sql
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public'
  AND (
    table_name LIKE 'traffic%' OR 
    table_name LIKE 'top_utm%' OR
    table_name LIKE 'sales_%' OR
    table_name LIKE 'targetologist%'
  )
ORDER BY table_name;

-- Ожидаемый результат:
-- sales_without_utm
-- targetologist_extended_stats
-- top_utm_campaigns
-- top_utm_sources
-- traffic_suspicious_activity
-- traffic_teams_with_users
```

### Проверить Initial Data

```sql
-- Должны быть 4 команды
SELECT name, company, direction, emoji 
FROM traffic_teams 
ORDER BY name;

-- Ожидаемый результат:
-- Arystan | Arystan | arystan | ⚡
-- Kenesary | Nutcab | nutcab_tripwire | 👑
-- Muha | OnAI | onai_zapusk | 🚀
-- Traf4 | ProfTest | proftest | 🎯
```

---

## 🔧 КОМАНДЫ ДЛЯ MCP SUPABASE

### Применение миграции (пример)

```bash
# Через MCP Supabase:
# 1. Read file
read_file("supabase/migrations/20251219_create_traffic_teams.sql")

# 2. Execute SQL
execute_sql(project_ref="pjmvxecykysfrzppdcto", sql=[content])

# 3. Verify
execute_sql(project_ref="pjmvxecykysfrzppdcto", sql="SELECT * FROM traffic_teams;")
```

---

## ⚠️ ВОЗМОЖНЫЕ ОШИБКИ

### Error: "relation traffic_users does not exist"

**Причина:** Таблица `traffic_users` не создана

**Решение:**
```sql
-- Проверить существование
SELECT * FROM information_schema.tables WHERE table_name = 'traffic_users';

-- Если нет - создать сначала её
-- (файл миграции должен быть в проекте)
```

### Error: "duplicate key value violates unique constraint"

**Причина:** Пытаемся применить миграцию повторно

**Решение:**
- Пропустить эту миграцию (уже применена)
- Или использовать `ON CONFLICT DO NOTHING`

### Error: "syntax error at or near..."

**Причина:** Ошибка в SQL синтаксисе

**Решение:**
- Проверить версию PostgreSQL
- Проверить что копируется весь файл целиком
- Проверить кодировку файла (должна быть UTF-8)

---

## 📊 СХЕМА ЗАВИСИМОСТЕЙ

```
traffic_users (должна существовать)
    │
    ├─→ traffic_teams (1️⃣)
    │       └─→ traffic_teams_with_users (view)
    │
    ├─→ traffic_user_sessions (2️⃣)
    │       └─→ traffic_suspicious_activity (view)
    │
    ├─→ onboarding_progress (4️⃣)
    │
    └─→ targetologist_settings (5️⃣)

all_sales_tracking (3️⃣) - независимая
    ├─→ top_utm_sources (view)
    ├─→ top_utm_campaigns (view)
    ├─→ targetologist_extended_stats (view)
    ├─→ sales_without_utm (view)
    └─→ daily_utm_stats (view)
```

---

## 🎯 ПОСЛЕ ПРИМЕНЕНИЯ ВСЕХ МИГРАЦИЙ

### 1. Проверить Backend

```bash
# Запустить backend
cd /Users/miso/onai-integrator-login/backend
npm run dev

# Проверить API
curl http://localhost:3000/api/traffic-constructor/teams | jq
# Должно вернуть 4 команды: Kenesary, Arystan, Muha, Traf4
```

### 2. Проверить Frontend

```bash
# Запустить frontend
cd /Users/miso/onai-integrator-login
npm run dev

# Открыть в браузере
http://localhost:8080/traffic/admin/team-constructor

# Проверить что:
# ✓ Команды загружаются из БД
# ✓ Можно создать пользователя
# ✓ Email отправляется (если Resend настроен)
```

### 3. Проверить Security Panel

```bash
# Открыть в браузере
http://localhost:8080/traffic/security

# Проверить что:
# ✓ Показывается таблица логов (пока пустая - норм)
# ✓ Нет 500 ошибки
```

### 4. Проверить Settings

```bash
# Открыть в браузере
http://localhost:8080/traffic/settings

# Проверить что:
# ✓ Можно добавить UTM source (Facebook, Google, etc)
# ✓ Сохранение работает без ошибок
# ✓ Данные загружаются после перезагрузки страницы
```

---

## 🚀 DEPLOYMENT CHECKLIST

После успешного применения миграций:

- [ ] Все 5 таблиц созданы
- [ ] Все views созданы
- [ ] Initial data в `traffic_teams` (4 команды)
- [ ] Backend API работает без ошибок
- [ ] Frontend загружает данные из БД
- [ ] Email sending работает
- [ ] RLS policies активны
- [ ] Indexes созданы

**Если всё ✅ - готово к production deploy!**

---

## 📝 NOTES

### RLS Policies

Все таблицы используют простую RLS policy:

```sql
ALTER TABLE [table_name] ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for service_role" 
ON [table_name] 
FOR ALL 
USING (true);
```

Это значит что доступ есть только через `service_role_key` (backend).

### Indexes

Созданы indexes для всех частых запросов:
- `email` - поиск по email
- `team_name` - фильтрация по командам
- `login_at` - сортировка логов
- `sale_date` - статистика продаж
- `utm_source`, `utm_campaign` - аналитика UTM

### JSONB Fields

- `targetologist_settings.utm_templates` - хранит UTM источники
- `all_sales_tracking.raw_webhook_data` - хранит полные данные от AmoCRM

---

## 🆘 SUPPORT

Если что-то пошло не так:

1. Проверь логи backend терминала
2. Проверь Chrome DevTools → Console
3. Проверь Chrome DevTools → Network → failed requests
4. Проверь Supabase dashboard → SQL Editor → execute queries manually

**В случае критических ошибок:**
- Можно откатить миграцию через `DROP TABLE [table_name] CASCADE;`
- Можно переприменить миграцию (используются `IF NOT EXISTS`)

---

**Готово!** 🎉

После применения всех миграций Traffic Dashboard полностью функционален.

---

**Last Updated:** 2025-12-19  
**Version:** 1.0  
**Status:** Ready to Apply

