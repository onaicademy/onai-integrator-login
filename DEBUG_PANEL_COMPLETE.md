# 🚔 Debug Panel - Operation Logging System

## ✅ Полностью реализовано и задеплоено!

### 📋 Что было создано:

#### 1. 🚔 "The Policeman" - Operation Logger (Backend Middleware)
**File:** `backend/src/middleware/operationLogger.ts`

**Функционал:**
- **Трекает ВСЕ API запросы** автоматически
- Логирует:
  - Request: method, path, body, user
  - Response: status, time, error
  - System: success/failure rate

**Как работает:**
- Middleware перехватывает **каждый** запрос к API
- Записывает в `system_health_logs` таблицу
- Автоматическая чистка: 7 дней retention

---

#### 2. 📊 Debug Service (Backend)
**File:** `backend/src/services/debugService.ts`

**Функционал:**
- Агрегация статистики:
  - Всего операций
  - Успешных/ошибочных
  - Error rate (%)
  - Среднее время ответа
- Анализ ошибок по типам:
  - Duplicate Entry
  - Not Found
  - Unauthorized
  - Timeout
  - Connection Error
  - Validation Error
  - Database Error
  - Queue Error
- Топ-10 самых медленных endpoints
- Фильтрация логов по периоду и типу

---

#### 3. 🔗 Debug API (Backend Routes)
**File:** `backend/src/routes/debug.ts`

**Endpoints:**
```
GET  /api/admin/debug/stats      - Statistics (total, success, failed, error rate)
GET  /api/admin/debug/errors     - Last N error logs
GET  /api/admin/debug/logs       - All logs (with filters)
POST /api/admin/debug/cleanup    - Manual cleanup (7+ days)
```

**Security:** Admin only (JWT + role check)

---

#### 4. 🖥️ Debug Panel UI (Frontend)
**File:** `src/pages/admin/DebugPanel.tsx`

**Features:**
- **Период фильтры:** 24h, 7d, 30d
- **Главная статистика:**
  - Всего операций
  - Успешно (с %)
  - Ошибки (с %)
  - Avg время ответа
- **Ошибки по типам** (красная секция)
- **Самые медленные endpoints** (желтая секция)
- **Последние 20 ошибок** (с деталями)
- **Все логи (100+)** с фильтрами:
  - ALL / ERROR / WARNING / INFO
- **Auto-refresh:** каждые 10 секунд
- **Детали ошибок:** Click to expand metadata

---

#### 5. 🔗 Integration

**Backend:** `backend/src/server.ts`
```typescript
import operationLogger from './middleware/operationLogger';
import debugRouter from './routes/debug';

// Middleware (tracks ALL operations)
app.use(operationLogger);

// Routes
app.use('/api/admin/debug', debugRouter);
```

**Frontend:** `src/App.tsx`
```typescript
const DebugPanel = lazy(() => import("./pages/admin/DebugPanel"));

<Route path="/admin/debug" element={<AdminGuard><DebugPanel /></AdminGuard>} />
```

**Admin Dashboard:** Карточка добавлена
```
Карточка 8: Debug Panel
Icon: 🚔
Stats: Операций/день, Ошибок, Error rate
```

---

## 🎯 Как использовать:

### Для админа:

1. **Зайти в Debug панель:**
   - URL: https://onai.academy/admin/debug
   - Или через Admin Dashboard → карточка "Debug Panel"

2. **Выбрать период:**
   - 24h (последние сутки)
   - 7d (последняя неделя)
   - 30d (последний месяц)

3. **Анализировать:**
   - **Error rate** - процент ошибок
   - **Ошибки по типам** - какие ошибки чаще всего
   - **Медленные endpoints** - что тормозит
   - **Последние ошибки** - детальная информация

4. **Передать разработчику:**
   - Скриншот статистики
   - Раскрыть детали ошибки (click на ошибку)
   - Скопировать JSON metadata

---

## 📊 Примеры данных:

### Статистика:
```
Всего операций: 1,245
Успешно: 1,198 (96.2%)
Ошибки: 47 (3.8%)
Avg время: 125ms
```

### Ошибки по типам:
```
Duplicate Entry: 15
Not Found: 12
Timeout: 8
Validation Error: 7
Connection Error: 5
```

### Медленные endpoints:
```
POST /api/admin/tripwire/users → 2,456ms (32 req)
GET /api/admin/tripwire/leaderboard → 1,234ms (67 req)
GET /api/tripwire/analytics → 987ms (45 req)
```

### Лог ошибки:
```json
{
  "event_type": "ERROR",
  "message": "POST /api/admin/tripwire/users → 409",
  "metadata": {
    "operation_type": "API_REQUEST",
    "method": "POST",
    "path": "/api/admin/tripwire/users",
    "user_id": "uuid...",
    "user_email": "admin@onai.academy",
    "request_body": { "email": "test@example.com" },
    "response_status": 409,
    "response_time_ms": 234,
    "error_message": "User already exists",
    "response_data": { "error": "User with email test@example.com already exists" }
  },
  "created_at": "2025-12-21T13:45:23.456Z"
}
```

---

## 🔧 Maintenance:

### Auto-cleanup:
- Логи старше 7 дней автоматически удаляются
- Можно вызвать вручную через кнопку "Очистить старые логи"

### Database:
- Таблица: `system_health_logs`
- Retention: 7 дней
- Auto-indexed: `created_at DESC`

---

## ✅ Production Status:

**Deployed:**
- ✅ Backend: https://api.onai.academy (PM2 restarted)
- ✅ Frontend: https://onai.academy (Nginx reloaded)
- ✅ Database: `system_health_logs` table ready

**Access:**
- URL: https://onai.academy/admin/debug
- Auth: Admin только
- Status: 🟢 LIVE

---

## 🎯 Результат:

Теперь в админ панели Tripwire есть раздел **Debug панель**, где можно:

1. **Видеть количество багов** за период
2. **Процент багов** (error rate) от общего количества операций
3. **Детально видеть какие ошибки** были (тип, message, metadata)
4. **Передавать разработчику** полную информацию для фикса

**"Полицейский" следит за всеми операциями 24/7!** 🚔

---

**Deployed:** December 21, 2025, 13:47 UTC+5  
**Status:** ✅ PRODUCTION READY (all features active)
