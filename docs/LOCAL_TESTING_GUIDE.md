# 🧪 Руководство по локальному тестированию Traffic Dashboard

## 📋 Обзор

Это руководство описывает, как протестировать все улучшения Traffic Dashboard локально перед деплоем на продакшн.

## 🎯 Что тестируется

1. **Валидация входных данных** - Проверка корректности данных в webhook
2. **Circuit Breaker & Retry Logic** - Защита от каскадных сбоев и автоматический повтор запросов
3. **Дедупликация webhook** - Предотвращение дублирования при ретраях
4. **Маппинг таргетологов** - Определение таргетолога из UTM тегов
5. **Интеграции** - AmoCRM webhooks и Facebook Ads API
6. **Диагностика интеграций** - Проверка состояния всех интеграций

## 🚀 Подготовка к тестированию

### 1. Запуск Redis (опционально)

Если Redis не запущен, backend будет выдавать ошибки `ECONNREFUSED 127.0.0.1:6379`.

**Запуск Redis:**
```bash
redis-server
```

**Или отключить Redis в `.env`:**
```env
REDIS_HOST=
REDIS_PORT=
```

### 2. Запуск Backend сервера

```bash
cd backend
npx tsx src/server.ts
```

Backend должен запуститься на порту 3001.

### 3. Получение Admin Token

Admin token нужен для тестирования защищенных эндпоинтов.

**Вариант 1: Из localStorage (если frontend запущен)**
```javascript
// В консоли браузера на http://localhost:5173/traffic
localStorage.getItem('auth_token')
```

**Вариант 2: Из базы данных**
```sql
-- В Supabase Traffic DB (oetodaexnjcunklkdlkv)
SELECT token FROM admin_tokens WHERE is_active = true LIMIT 1;
```

**Вариант 3: Создать новый токен**
```sql
INSERT INTO admin_tokens (token, created_at, expires_at, is_active)
VALUES ('test-admin-token', NOW(), NOW() + INTERVAL '1 day', true);
```

### 4. Настройка скрипта тестирования

Откройте [`scripts/test-local-backend.ts`](../scripts/test-local-backend.ts) и обновите конфигурацию:

```typescript
const API_BASE_URL = 'http://localhost:3001';
const ADMIN_TOKEN = 'your-admin-token-here'; // ← Вставьте ваш токен
```

## 🧪 Запуск тестов

### Запуск всех тестов

```bash
cd /Users/miso/onai-integrator-login
npx tsx scripts/test-local-backend.ts
```

### Запуск конкретного теста

Отредактируйте [`scripts/test-local-backend.ts`](../scripts/test-local-backend.ts) и закомментируйте ненужные тесты:

```typescript
// Закомментируйте ненужные тесты:
// await runTest('Server Health', testServerHealth);
await runTest('Webhook Validation (Invalid)', testWebhookValidationInvalid);
// ... и так далее
```

## 📊 Результаты тестов

### Успешный результат

```
📋 🚀 Starting Local Backend Tests
ℹ️  API Base URL: http://localhost:3001
ℹ️  Admin Token: Set

============================================================

✅ Server Health (45ms)
✅ Webhook Validation (Invalid) (120ms)
✅ Facebook Circuit Breaker (2850ms)
✅ Targetologist Mapping (1200ms)
✅ Integrations Diagnostics (3200ms)
✅ Sales Webhook (Valid) (150ms)
✅ Express Course Webhook (130ms)
✅ Main Product Webhook (140ms)

============================================================

📊 Test Results Summary

Total: 8
✅ Passed: 8
❌ Failed: 0
⚠️  Skipped: 0

Success Rate: 100.0%

============================================================

💡 Recommendations

✅ All tests passed! Backend is ready for production deployment.

🎯 Backend Status: READY
```

### Неудачный результат

```
📊 Test Results Summary

Total: 8
✅ Passed: 5
❌ Failed: 3
⚠️  Skipped: 0

Success Rate: 62.5%

❌ Failed Tests:
  ❌ Server Health
     ECONNREFUSED: Connection refused
  ❌ Facebook Circuit Breaker
     Invalid Facebook API credentials
  ❌ Integrations Diagnostics
     Unauthorized: Invalid admin token

============================================================

💡 Recommendations

⚠️  Some tests failed. Please fix issues before deploying to production.
ℹ️  Common issues:
  ℹ️   - Backend server not running (start with: npm run dev)
  ℹ️   - Redis not running (start with: redis-server)
  ℹ️   - Admin token not set (check localStorage)
  ℹ️   - Facebook API credentials invalid (check .env)

🎯 Backend Status: NOT READY
```

## 🔧 Решение проблем

### Проблема: ECONNREFUSED 127.0.0.1:6379

**Причина:** Redis не запущен.

**Решение:**
```bash
# Запустить Redis
redis-server

# Или отключить Redis в backend/.env
REDIS_HOST=
REDIS_PORT=
```

### Проблема: Connection refused на localhost:3001

**Причина:** Backend сервер не запущен.

**Решение:**
```bash
cd backend
npx tsx src/server.ts
```

### Проблема: Unauthorized: Invalid admin token

**Причина:** Admin токен неверный или истек.

**Решение:**
1. Получите актуальный токен из localStorage или базы данных
2. Обновите `ADMIN_TOKEN` в [`scripts/test-local-backend.ts`](../scripts/test-local-backend.ts)
3. Или создайте новый токен в базе данных

### Проблема: Invalid Facebook API credentials

**Причина:** Facebook API ключи неверные или истекли.

**Решение:**
1. Проверьте `FB_ACCESS_TOKEN` в `backend/.env`
2. Обновите токен через Facebook Ads Manager
3. Или используйте тестовый токен

### Проблема: Webhook validation failed

**Причина:** Данные webhook не соответствуют схеме.

**Решение:**
1. Проверьте структуру данных в тесте
2. Сравните с реальными данными из AmoCRM
3. Обновите схему валидации в [`backend/src/middleware/validation.ts`](../backend/src/middleware/validation.ts)

## 📝 Дополнительные проверки

### 1. Проверка логов backend

```bash
# Логи backend
tail -f logs/backend.log

# Или если запущено через pm2
pm2 logs onai-backend
```

### 2. Проверка базы данных

```sql
-- Проверка sales таблицы
SELECT * FROM traffic_sales ORDER BY created_at DESC LIMIT 10;

-- Проверка funnel_stats таблицы
SELECT * FROM funnel_stats ORDER BY date DESC LIMIT 10;

-- Проверка admin_tokens
SELECT * FROM admin_tokens WHERE is_active = true;
```

### 3. Проверка вебхуков через curl

```bash
# Тест Sales Webhook
curl -X POST http://localhost:3001/api/amocrm/sales-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "leads": {
      "status": [{
        "lead_id": 123456,
        "pipeline_id": 10418746,
        "status_id": 142,
        "price": 490000
      }]
    }
  }'

# Тест Express Course Webhook
curl -X POST http://localhost:3001/api/amocrm/funnel-sale \
  -H "Content-Type: application/json" \
  -d '{
    "leads": {
      "status": [{
        "lead_id": 123457,
        "pipeline_id": 10350882,
        "status_id": 142,
        "price": 5000
      }]
    }
  }'
```

### 4. Проверка диагностики интеграций

```bash
curl -X POST http://localhost:3001/api/admin/integrations/diagnostics \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

## ✅ Критерии готовности к деплою

Backend готов к деплою на продакшн, если:

- ✅ Все тесты прошли успешно (100% Success Rate)
- ✅ Нет ошибок в логах backend
- ✅ Redis работает (или отключен)
- ✅ Facebook API работает корректно
- ✅ AmoCRM webhooks обрабатываются
- ✅ Диагностика интеграций показывает статус "OK"
- ✅ Данные корректно сохраняются в базу данных

## 🚀 Следующие шаги после успешного тестирования

1. **Создать бэкап продакшн базы данных**
2. **Задеплоить на продакшн**
3. **Запустить тесты на продакшн**
4. **Проверить все эндпоинты через MCP Chrome DevTools**
5. **Мониторить логи в течение 24 часов**

## 📚 Дополнительная документация

- [`plans/100_PERCENT_PRODUCTION_READINESS_PLAN.md`](../plans/100_PERCENT_PRODUCTION_READINESS_PLAN.md) - План доведения до 100% продакшена
- [`plans/IMPROVEMENTS_IMPLEMENTED.md`](../plans/IMPROVEMENTS_IMPLEMENTED.md) - Реализованные улучшения
- [`plans/LEADS_SYNC_DIAGNOSIS_PLAN.md`](../plans/LEADS_SYNC_DIAGNOSIS_PLAN.md) - План синхронизации лидов
- [`backend/src/middleware/validation.ts`](../backend/src/middleware/validation.ts) - Валидация входных данных
- [`backend/src/services/circuit-breaker.ts`](../backend/src/services/circuit-breaker.ts) - Circuit Breaker & Retry Logic
