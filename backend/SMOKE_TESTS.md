# 🧪 SMOKE TESTS - Launch Verification

**Цель:** Проверить что все security fixes работают корректно перед deploy на production

**Время:** ~10 минут

---

## Prerequisites

```bash
# 1. Backend должен быть собран
cd backend
npm run build

# 2. Проверить что env.env файл заполнен
ls env.env

# 3. Запустить backend
npm run dev
```

---

## ✅ TEST 1: Server Startup & Environment Validation

**Что проверяем:** Сервер запускается и env переменные валидируются

**Команда:**
```bash
npm run dev
```

**Ожидаемый результат:**
```
🔍 ===== ENVIRONMENT VARIABLES VALIDATION =====

✅ All REQUIRED environment variables are set

📋 Configured services:
  ✅ Supabase Main: YES
  ✅ Supabase Tripwire: YES
  ✅ OpenAI: YES
  ...

✅ Environment validation complete!

🚀 Server running on port 3000
```

**❌ Fail если:** "Missing REQUIRED environment variables" или сервер не запустился

---

## ✅ TEST 2: Rate Limiting

**Что проверяем:** Rate limiter блокирует после лимита запросов

**Команда** (в другом терминале, пока backend запущен):
```powershell
# Отправить 12 запросов быстро (лимит 10 req/min для AI endpoints)
for ($i=1; $i -le 12; $i++) {
    Write-Host "Request $i"
    curl -X POST http://localhost:3000/api/ai-mentor `
      -H "Content-Type: application/json" `
      -d '{}'
}
```

**Ожидаемый результат:**
- Первые 10 запросов: 200/401 (auth error это OK)
- Запросы 11-12: **429 Too Many Requests**
- Response body: `{"error":"Too many AI requests. Please try again in 1 minute."}`

**Headers должны содержать:**
```
RateLimit-Limit: 10
RateLimit-Remaining: 0
RateLimit-Reset: <timestamp>
```

**❌ Fail если:** Все 12 запросов прошли (rate limiting не работает)

---

## ✅ TEST 3: Input Validation (Zod)

**Что проверяем:** Endpoint отклоняет невалидные данные

**Команда:**
```powershell
# 1. Невалидный email
curl -X POST http://localhost:3000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"notanemail","password":"short"}'
```

**Ожидаемый результат:**
```json
{
  "error": "Validation failed",
  "details": [
    {"field": "email", "message": "Invalid email format"},
    {"field": "password", "message": "Password must be at least 6 characters"}
  ]
}
```

**Status code:** 400 Bad Request

**❌ Fail если:** Получили 500 Internal Server Error или запрос прошёл

---

**Команда 2:**
```powershell
# 2. Невалидный lesson_id (не число)
curl -X POST http://localhost:3000/api/tripwire/complete `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer fake-token" `
  -d '{"lesson_id":"abc","module_id":"xyz","tripwire_user_id":"invalid"}'
```

**Ожидаемый результат:**
```json
{
  "error": "Validation failed",
  "details": [...]
}
```

**Status code:** 400 Bad Request

---

## ✅ TEST 4: CORS Headers

**Что проверяем:** CORS headers разрешают tripwire.onai.academy

**Команда:**
```powershell
curl -X OPTIONS http://localhost:3000/api/tripwire/lessons `
  -H "Origin: https://tripwire.onai.academy" `
  -H "Access-Control-Request-Method: GET" `
  -v
```

**Ожидаемый результат (в headers):**
```
< Access-Control-Allow-Origin: https://tripwire.onai.academy
< Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
< Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept
< Access-Control-Allow-Credentials: true
```

**❌ Fail если:** Header "Access-Control-Allow-Origin" отсутствует или содержит "*"

---

## ✅ TEST 5: Security Headers (Helmet)

**Что проверяем:** Все security headers присутствуют

**Команда:**
```powershell
curl -X GET http://localhost:3000/api/health -v
```

**Ожидаемый результат (в headers):**
```
< X-Content-Type-Options: nosniff
< X-Frame-Options: DENY
< X-XSS-Protection: 1; mode=block
< Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
< Referrer-Policy: strict-origin-when-cross-origin
```

**НЕ должно быть:**
```
< X-Powered-By: Express  ❌ (должно быть скрыто!)
```

**❌ Fail если:** Какой-то из critical headers отсутствует или X-Powered-By присутствует

---

## ✅ TEST 6: Health Check

**Что проверяем:** Basic health endpoint работает

**Команда:**
```powershell
curl http://localhost:3000/api/health
```

**Ожидаемый результат:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-12T..."
}
```

**Status code:** 200 OK

---

## ✅ TEST 7: Build без ошибок

**Что проверяем:** TypeScript компилируется чисто

**Команда:**
```bash
npm run build
```

**Ожидаемый результат:**
```
> backend@1.0.0 build
> tsc

(no errors)
```

**❌ Fail если:** Любые TypeScript errors

---

## 📊 SUMMARY CHECKLIST

Перед deploy на production, все тесты должны быть ✅:

- [ ] ✅ TEST 1: Server Startup - OK
- [ ] ✅ TEST 2: Rate Limiting - 429 на 11+ запрос
- [ ] ✅ TEST 3: Input Validation - 400 на невалидные данные
- [ ] ✅ TEST 4: CORS Headers - tripwire.onai.academy разрешен
- [ ] ✅ TEST 5: Security Headers - все headers присутствуют
- [ ] ✅ TEST 6: Health Check - 200 OK
- [ ] ✅ TEST 7: Build - без ошибок

---

## 🚀 NEXT STEP: Deploy на Staging

Если все тесты ✅:

```bash
# Commit changes
git add .
git commit -m "🔒 Security hardening: rate limiting, validation, CORS, indexes"
git push origin main

# Deploy на staging
npm run deploy:staging
# (или ваша команда для staging)

# Повторить ВСЕ smoke tests на staging URL!
```

---

## 🔄 ROLLBACK (если что-то сломалось)

```bash
# Откатить последний commit
git revert HEAD
git push origin main

# Перезапустить сервер
pm2 restart tripwire-api

# Проверить что всё вернулось к норме
curl https://api.tripwire.onai.academy/api/health
```

**Время отката:** < 5 минут

---

**Создано:** 12.12.2025  
**Автор:** Claude AI











