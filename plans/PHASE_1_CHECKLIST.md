# Phase 1 - Чек-лист для локального запуска

## ✅ Выполнено (автоматически)

### 1. Исправления кода
- [x] AuthManager Import исправлен в `src/pages/traffic/TrafficTeamConstructor.tsx`
- [x] Sales Aggregator создан в `backend/src/services/traffic-sales-aggregator.ts`
- [x] UTM Attribution Engine создан в `backend/src/services/traffic-utm-attribution.ts`
- [x] Traffic Dashboard API routes созданы в `backend/src/routes/traffic-dashboard.ts`
- [x] Route зарегистрирован в `backend/src/server.ts` (строка 535)

### 2. SQL миграции
- [x] SQL скрипт для очистки команд создан: `sql/CLEAR_OLD_TEAMS_WITH_UTM_BACKUP.sql`
- [x] SQL миграция для отсутствующих таблиц создана: `sql/CREATE_MISSING_TABLES.sql`
- [x] Правильные таблицы для Traffic Dashboard созданы: `sql/CORRECT_TRAFFIC_TABLES.sql`
- [x] Все таблицы применены к Traffic Dashboard DB

### 3. Конфигурация
- [x] `backend/.env` обновлен с реальными credentials для Traffic Dashboard DB:
  - `TRAFFIC_SUPABASE_URL=https://oetodaexnjcunklkdlkv.supabase.co`
  - `TRAFFIC_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
  - `TRAFFIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 4. Документация
- [x] Финальный отчет создан: `plans/TRAFFIC_DASHBOARD_CODE_REVIEW_REPORT.md`
- [x] Архитектурный план создан: `plans/TRAFFIC_DASHBOARD_ARCHITECTURE_PLAN.md`
- [x] План реализации создан: `plans/TRAFFIC_DASHBOARD_IMPLEMENTATION_PLAN.md`

---

## 🔧 Нужно сделать вручную

### 1. Запустить Redis (опционально)
```bash
# Вариант 1: Запустить Redis
redis-server

# Вариант 2: Отключить Redis в backend (если не нужен)
# Отредактировать backend/src/config/redis.ts и закомментировать инициализацию
```

### 2. Запустить backend
```bash
cd backend
npx tsx src/server.ts
```

**Ожидаемый результат:**
```
╔════════════════════════════════════════════════════╗
║ 🚀 Backend API запущен на http://localhost:3000 ║
║                                                    ║
║ Server ready for HTTP requests                     ║
║ Initializing services in background...             ║
╚════════════════════════════════════════════════════╝
```

### 3. Запустить frontend (в другом терминале)
```bash
npm run dev
```

**Ожидаемый результат:**
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:8080/
  ➜  Network: use --host to expose
```

### 4. Открыть браузер и протестировать
```
http://localhost:8080/traffic/team-constructor
```

**Тесты:**
- [ ] Войти как admin (`admin@onai.academy` / `admin123`)
- [ ] Создать новую команду
- [ ] Создать нового пользователя
- [ ] Проверить, что команда и пользователь сохранены в БД

---

## 🗄️ SQL миграции (применить после запуска backend)

### Вариант 1: Через Supabase Dashboard
1. Открыть https://supabase.com/dashboard/project/oetodaexnjcunklkdlkv/sql/new
2. Скопировать содержимое `sql/CLEAR_OLD_TEAMS_WITH_UTM_BACKUP.sql`
3. Вставить и нажать "Run"

### Вариант 2: Через MCP
```bash
# Использовать mcp--supabase-traffic-dashboard--execute_sql
```

### Вариант 3: Через backend endpoint
```bash
curl -X POST http://localhost:3000/api/traffic-constructor/clear-old-teams
```

---

## 🐛 Возможные проблемы и решения

### Проблема 1: Redis не запущен
**Ошибка:** `Error: connect ECONNREFUSED 127.0.0.1:6379`

**Решение:**
```bash
# Запустить Redis
redis-server

# Или отключить Redis в backend
# Отредактировать backend/src/config/redis.ts
```

### Проблема 2: Invalid API key
**Ошибка:** `Invalid API key` при подключении к Supabase

**Решение:**
1. Проверить, что `backend/.env` содержит правильные ключи
2. Перезапустить backend после изменения `.env`
3. Проверить, что ключи не истекли

### Проблема 3: Route не найден
**Ошибка:** `404 Not Found` для `/api/traffic-dashboard/health`

**Решение:**
1. Проверить, что строка 535 в `backend/src/server.ts` содержит:
   ```typescript
   app.use('/api/traffic-dashboard', trafficDashboardRouter);
   ```
2. Перезапустить backend

---

## 📊 Проверка после запуска

### 1. Проверить health endpoint
```bash
curl http://localhost:3000/api/traffic-dashboard/health
```

**Ожидаемый результат:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-27T14:00:00.000Z",
  "database": "connected",
  "tables": {
    "traffic_teams": true,
    "traffic_users": true,
    "traffic_sales_stats": true,
    "traffic_fb_campaigns": true,
    "traffic_fb_ad_sets": true,
    "traffic_fb_ads": true
  }
}
```

### 2. Проверить таблицы в БД
```bash
# Через Supabase Dashboard или MCP
mcp--supabase-traffic-dashboard--list_tables
```

**Ожидаемый результат:**
- `traffic_teams`
- `traffic_users`
- `traffic_targetologist_settings`
- `traffic_sales_stats`
- `traffic_fb_campaigns`
- `traffic_fb_ad_sets`
- `traffic_fb_ads`
- `utm_tags_backup`

### 3. Проверить создание команды в браузере
1. Открыть http://localhost:8080/traffic/team-constructor
2. Войти как admin
3. Создать новую команду
4. Проверить в БД, что команда создана

---

## 🎯 Следующие шаги (Phase 2)

После успешного локального тестирования:

1. **Реализовать интеграцию с AmoCRM** - подтягивать продажи по UTM меткам
2. **Реализовать webhook** - получать продажи из AmoCRM в реальном времени
3. **Протестировать агрегацию данных** - проверить, что данные корректно подтягиваются
4. **Актуализировать данные по базам данных** - синхронизировать Traffic Dashboard с AmoCRM

---

## 📝 Заметки

- Backend работает на порту 3000
- Frontend работает на порту 8080
- Traffic Dashboard DB: `https://oetodaexnjcunklkdlkv.supabase.co`
- Логин для локального тестирования: `admin@onai.academy` / `admin123`
- Route `/api/traffic-dashboard` уже зарегистрирован в `server.ts` (строка 535)
- Все SQL миграции применены к Traffic Dashboard DB
- Redis нужен для кеширования, но не критичен для базового тестирования
