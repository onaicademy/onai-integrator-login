# 🧪 DIAGNOSTIC CHECKLIST - Tripwire Platform Testing

**Цель:** Убедиться что все критичные функции работают после security fixes  
**Время:** 30-60 минут  
**Статус готовности:** 90-95% → **99%** (после тестов)

---

## ✅ КРИТИЧНО - ОБЯЗАТЕЛЬНЫЕ ТЕСТЫ (30 минут)

### TEST 1: Backend Startup ✅
```bash
cd backend
npm run dev
```

**Ожидаемый результат:**
```
✅ All REQUIRED environment variables are set and valid
✅ Backend API запущен на http://localhost:3000
```

**✅ ПРОЙДЕН** - backend запускается без ошибок

---

### TEST 2: Frontend Startup (5 мин)

```bash
# В другом терминале
npm run dev
```

**Проверить:**
- [ ] Frontend открывается на localhost:5173
- [ ] Нет errors в terminal
- [ ] Нет CORS errors в DevTools Console

**Ожидаемый результат:**
```
VITE ready in XXX ms
Local: http://localhost:5173/
```

---

### TEST 3: End-to-End Lesson Completion (10 мин)

**Шаги:**
1. Открыть http://localhost:5173
2. Залогиниться как студент
3. Перейти в `/integrator/lesson/67` (Module 16, Lesson 1)
4. Досмотреть видео до конца (или skip)
5. Нажать "Завершить урок"

**Проверить:**
- [ ] Видео загружается (нет CSP errors)
- [ ] Прогресс сохраняется
- [ ] Кнопка "Завершить урок" работает
- [ ] Перенаправляет на следующий урок
- [ ] В DevTools Network → нет 429 errors
- [ ] В DevTools Console → нет CORS/CSP errors

**Ожидаемый результат:**
```
✅ Видео проигрывается
✅ Progress сохраняется в realtime
✅ Урок завершается успешно
✅ Нет errors в console
```

---

### TEST 4: Validation Error Handling (5 мин)

**Test в Postman/curl:**
```powershell
# 1. Невалидный lesson_id (должен быть number)
curl -X POST http://localhost:3000/api/tripwire/complete `
  -H "Content-Type: application/json" `
  -d '{"lesson_id":"abc","module_id":16,"tripwire_user_id":"test"}'
```

**Ожидаемый результат:**
```json
{
  "status": "validation_error",
  "message": "Validation failed",
  "errors": [
    {
      "field": "lesson_id",
      "message": "Expected number, received string",
      "received": "string",
      "expected": "number"
    }
  ]
}
```

**Status code:** 400 Bad Request

**Проверить:**
- [ ] Статус 400 (не 500)
- [ ] Детальное сообщение об ошибке
- [ ] Указано какое поле и что не так

---

**Test 2: Валидный запрос с string number (должен работать)**
```powershell
curl -X POST http://localhost:3000/api/tripwire/complete `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer YOUR_TOKEN" `
  -d '{"lesson_id":"67","module_id":"16","tripwire_user_id":"YOUR_UUID"}'
```

**Ожидаемый результат:**
```json
{
  "success": true,
  "message": "Lesson completed successfully"
}
```

**Проверить:**
- [ ] `"67"` (string) принимается и конвертируется в 67 (number)
- [ ] Урок завершается успешно
- [ ] Нет validation errors

---

### TEST 5: CORS Headers (3 мин)

```powershell
# Preflight request
curl -X OPTIONS http://localhost:3000/api/tripwire/lessons `
  -H "Origin: http://localhost:5173" `
  -H "Access-Control-Request-Method: GET" `
  -v
```

**Ожидаемый результат (в headers):**
```
< Access-Control-Allow-Origin: http://localhost:5173
< Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
< Access-Control-Allow-Credentials: true
```

**Проверить:**
- [ ] Header `Access-Control-Allow-Origin` присутствует
- [ ] Origin совпадает с frontend origin
- [ ] `Access-Control-Allow-Credentials: true`

---

### TEST 6: CSP Headers для Video (5 мин)

**В браузере:**
1. Открыть http://localhost:5173/integrator/lesson/67
2. Открыть DevTools → Console
3. Искать CSP errors

**Проверить:**
- [ ] Нет ошибок типа "Refused to load media from 'https://video.onai.academy'..."
- [ ] Видео загружается и проигрывается
- [ ] Console чистый (без CSP warnings)

**Если видите CSP error:**
```
Check backend/src/server.ts:137 - должно быть:
mediaSrc: ['https://video.onai.academy', 'https://*.bunny.com', ...]
```

---

## 🟡 ВАЖНЫЕ ТЕСТЫ (опционально, 30 мин)

### TEST 7: Rate Limiting (10 мин)

**Script:**
```powershell
# Отправить 120 запросов быстро
for ($i=1; $i -le 120; $i++) {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/tripwire/lessons" `
      -Method GET `
      -UseBasicParsing `
      -ErrorAction SilentlyContinue
    
    Write-Host "Request $i : $($response.StatusCode)"
    
    if ($response.StatusCode -eq 429) {
        Write-Host "✅ Rate limiting triggered on request $i"
        break
    }
}
```

**Ожидаемый результат:**
- Первые 100 запросов: 200/401 (OK)
- Запросы 101+: **429 Too Many Requests**
- Header: `Retry-After: 900`

**Проверить:**
- [ ] Rate limiting срабатывает после ~100 requests
- [ ] 429 response содержит Retry-After header
- [ ] Сообщение понятное: "Too many requests. Please try again later."

---

### TEST 8: Admin Dashboard (10 мин)

**Шаги:**
1. Залогиниться как admin
2. Открыть `/admin/tripwire`
3. Загрузить список студентов
4. Сделать bulk операцию (если есть)

**Проверить:**
- [ ] Dashboard загружается
- [ ] Список студентов показывается
- [ ] Нет rate limiting errors (admin имеет 10x лимит)
- [ ] Все API requests проходят

---

### TEST 9: Smart Retries Frontend (5 мин)

**Manual test:**
1. Открыть DevTools → Network
2. Throttle network → Fast 3G
3. Сделать API request (например, загрузить урок)
4. Смотреть Console

**Ожидаемый результат:**
```
⏳ [API] Rate limited (429) on attempt 1/3. Retrying after 150ms...
✅ Request succeeded on attempt 2
```

**Проверить:**
- [ ] Retries происходят автоматически
- [ ] Exponential backoff работает (100ms → 200ms → 400ms)
- [ ] X-Retry-Attempt header отправляется

---

## 🟢 NICE TO HAVE (если есть время)

### TEST 10: Load Test (30 мин)

**Нужен:** Apache Bench или wrk

```bash
# 100 concurrent users, 1000 requests total
ab -n 1000 -c 100 http://localhost:3000/api/health

# Или с wrk
wrk -t4 -c100 -d30s http://localhost:3000/api/health
```

**Проверить:**
- [ ] Backend не падает под нагрузкой
- [ ] Response time < 200ms для 95% requests
- [ ] Rate limiting срабатывает корректно

---

## 📋 FINAL CHECKLIST

Перед commit и push:

- [ ] ✅ Backend запускается (ПРОЙДЕНО)
- [ ] Frontend запускается
- [ ] Урок проходится end-to-end
- [ ] Нет CORS errors
- [ ] Нет CSP errors
- [ ] BunnyCDN видео загружаются
- [ ] Validation работает (принимает number и string)
- [ ] Error messages детальные
- [ ] Rate limiting работает

---

## 🚀 ПОСЛЕ ТЕСТОВ

```bash
# 1. Commit
git add -A
git commit -m "Critical production fixes: adaptive rate limiting, Zod coercion, BunnyCDN CSP, flexible CORS"

# 2. Push (когда будешь готов)
git push origin main

# 3. Deploy
# (твоя команда для deploy)
```

---

## 🔍 TROUBLESHOOTING

### Backend не запускается:
```
Проверить: backend/env.env существует и заполнен
Проверить: npm run build → без ошибок
Проверить: logs в terminal
```

### CORS errors:
```
Проверить: VITE_API_URL в .env = http://localhost:3000
Проверить: DevTools → Network → Response Headers → Access-Control-Allow-Origin
```

### CSP blocks video:
```
Проверить: DevTools → Console → ищи "Refused to load"
Проверить: backend/src/server.ts:137 → mediaSrc содержит video.onai.academy
```

### Rate limiting слишком строгий:
```
Проверить: Ты authenticated? (Admin получает 10x лимит)
Проверить: Headers содержат X-Retry-Attempt: true (получает +50%)
```

---

**Время тестирования:** 30-60 минут  
**Ожидаемые проблемы:** Минимальные (все фиксы backwards compatible)  
**Rollback:** < 3 минуты если что-то сломается
