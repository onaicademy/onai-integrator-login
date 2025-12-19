# 🎯 MCP SUPABASE - ТОЧНЫЕ КОМАНДЫ

**Проект:** `pjmvxecykysfrzppdcto` (Tripwire DB)

---

## 📋 ПРИМЕНЕНИЕ МИГРАЦИЙ (copy-paste ready)

### Миграция 1: traffic_teams

```
Прочитай файл: supabase/migrations/20251219_create_traffic_teams.sql

Выполни этот SQL в проекте pjmvxecykysfrzppdcto через MCP Supabase.

После выполнения проверь:
SELECT * FROM traffic_teams;
```

---

### Миграция 2: traffic_user_sessions

```
Прочитай файл: supabase/migrations/20251219_create_traffic_sessions.sql

Выполни этот SQL в проекте pjmvxecykysfrzppdcto через MCP Supabase.

После выполнения проверь:
SELECT COUNT(*) FROM traffic_user_sessions;
```

---

### Миграция 3: all_sales_tracking

```
Прочитай файл: supabase/migrations/20251219_create_all_sales_tracking.sql

Выполни этот SQL в проекте pjmvxecykysfrzppdcto через MCP Supabase.

После выполнения проверь:
SELECT * FROM top_utm_sources LIMIT 5;
```

---

### Миграция 4: onboarding_progress

```
Прочитай файл: supabase/migrations/20251219_create_onboarding_progress.sql

Выполни этот SQL в проекте pjmvxecykysfrzppdcto через MCP Supabase.

После выполнения проверь:
SELECT COUNT(*) FROM onboarding_progress;
```

---

### Миграция 5: targetologist_settings

```
Прочитай файл: supabase/migrations/20251219_create_targetologist_settings.sql

Выполни этот SQL в проекте pjmvxecykysfrzppdcto через MCP Supabase.

После выполнения проверь:
SELECT COUNT(*) FROM targetologist_settings;
```

---

## ✅ ФИНАЛЬНАЯ ПРОВЕРКА

```sql
-- Проверить что все таблицы созданы
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name LIKE 'traffic%' OR table_name = 'all_sales_tracking')
ORDER BY table_name;
```

**Ожидаемый результат:**
```
all_sales_tracking
onboarding_progress
targetologist_settings
traffic_teams
traffic_user_sessions
traffic_users
```

---

```sql
-- Проверить views
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public'
  AND (table_name LIKE 'traffic%' OR table_name LIKE '%utm%' OR table_name LIKE 'sales%')
ORDER BY table_name;
```

**Ожидаемый результат:**
```
sales_without_utm
targetologist_extended_stats
top_utm_campaigns
top_utm_sources
traffic_suspicious_activity
traffic_teams_with_users
```

---

```sql
-- Проверить initial data (должно быть 4 команды)
SELECT name, company, emoji FROM traffic_teams ORDER BY name;
```

**Ожидаемый результат:**
```
Arystan   | Arystan   | ⚡
Kenesary  | Nutcab    | 👑
Muha      | OnAI      | 🚀
Traf4     | ProfTest  | 🎯
```

---

## 🎉 ГОТОВО!

Если все проверки прошли успешно - миграции применены!

**Дальше:**

1. Запусти backend: `cd backend && npm run dev`
2. Запусти frontend: `cd .. && npm run dev`
3. Открой: `http://localhost:8080/traffic/admin/team-constructor`
4. Проверь что команды загружаются из БД

---

**Время выполнения:** 5-10 минут  
**Сложность:** Easy  
**Результат:** Полностью рабочий Traffic Dashboard

