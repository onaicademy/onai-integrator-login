# 🧪 Traffic Dashboard - План тестирования

**Дата:** 22 декабря 2025  
**Статус:** ✅ ГОТОВ К ТЕСТИРОВАНИЮ  
**Версия:** 2.0

---

## ✅ ГОТОВНОСТЬ СИСТЕМЫ

### Backend Status: ✅ РАБОТАЕТ
```bash
✅ Process: Running (PID 9330)
✅ Health: OK
✅ Port: 3000
✅ Uptime: 9+ minutes
✅ New Groq keys: Active
```

### Database Status: ✅ ГОТОВА
```sql
✅ Таргетологи: 4 (Kenesary, Aidar, Sasha, Dias)
✅ Ad Accounts: 2 на каждого таргетолога
✅ Facebook: Connected
✅ Last Sync: 2025-12-22 10:36:52
```

### Frontend Status: ⏳ ПРОВЕРЯЕМ
```bash
Port: 8080
Status: Checking...
```

---

## 🎯 ТЕСТОВЫЕ УЧЕТНЫЕ ДАННЫЕ

### Логины для тестирования:

| Email | Password | Team | Role |
|-------|----------|------|------|
| kenesary@onai.academy | onai2024 | Kenesary | targetologist |
| aidar@onai.academy | onai2024 | Aidar | targetologist |
| sasha@onai.academy | onai2024 | Sasha | targetologist |
| dias@onai.academy | onai2024 | Dias | targetologist |

---

## 📋 ПЛАН ТЕСТИРОВАНИЯ (30 минут)

### 🔐 ЭТАП 1: АУТЕНТИФИКАЦИЯ (5 минут)

**URL:** http://localhost:8080/traffic/login

**Тест 1.1: Успешный логин**
```
1. Открой http://localhost:8080/traffic/login
2. Введи: kenesary@onai.academy / onai2024
3. Нажми "Войти"

✅ Ожидаем: Редирект на /traffic/dashboard
✅ Проверь: localStorage содержит traffic_token
✅ Проверь: localStorage содержит traffic_user
```

**Тест 1.2: Неправильный пароль**
```
1. Введи: kenesary@onai.academy / wrong_password
2. Нажми "Войти"

✅ Ожидаем: Ошибка "Invalid credentials"
✅ Проверь: Остался на странице логина
```

**Тест 1.3: Несуществующий email**
```
1. Введи: nonexistent@onai.academy / onai2024
2. Нажми "Войти"

✅ Ожидаем: Ошибка "User not found"
```

---

### ⚙️ ЭТАП 2: НАСТРОЙКИ (10 минут)

**URL:** http://localhost:8080/traffic/settings

**Тест 2.1: Загрузка существующих ad accounts**
```
1. После логина перейди в Settings
2. Подожди загрузки

✅ Ожидаем: Видим 2 ad accounts:
   - Test Ad Account 1 (act_test_123)
   - Test Ad Account 2 (act_test_456)
✅ Проверь: Оба checkbox уже выбраны (checked)
✅ Проверь: Статус "Facebook подключен"
```

**Тест 2.2: Выбор/отмена ad account**
```
1. Кликни на checkbox первого account
2. Checkbox должен сняться

✅ Ожидаем: Checkbox unchecked
✅ Проверь: Можешь снова выбрать
```

**Тест 2.3: Загрузка campaigns для account**
```
1. Если account выбран, кликни на него чтобы развернуть
2. Подожди загрузки campaigns

⚠️ ВАЖНО: Это может показать ошибку, т.к. test accounts
   не имеют реальных campaigns в Facebook API

✅ Ожидаем: 
   - Либо список campaigns
   - Либо ошибку "Failed to load campaigns"
```

**Тест 2.4: Сохранение настроек**
```
1. Выбери 1-2 ad accounts (checkbox)
2. Нажми "💾 Сохранить настройки"

✅ Ожидаем: Toast "Настройки сохранены!"
✅ Проверь: Button disabled во время сохранения
```

**Тест 2.5: Persistence после reload**
```
1. Нажми F5 (reload страницы)
2. Подожди загрузки

✅ Ожидаем: Checkbox остались выбранными
✅ Проверь: Те же ad accounts что были до reload
```

---

### 📊 ЭТАП 3: ДЕТАЛЬНАЯ АНАЛИТИКА (10 минут)

**URL:** http://localhost:8080/traffic/detailed-analytics

**Тест 3.1: Проверка настроек перед загрузкой**
```
1. Перейди в Detailed Analytics

Если campaigns НЕ настроены:
✅ Ожидаем: Предупреждение "Настройте рекламные кабинеты"
✅ Проверь: Кнопка "Перейти в настройки"

Если campaigns настроены:
✅ Ожидаем: Загрузка аналитики
✅ Проверь: Spinner показывается
```

**Тест 3.2: Отображение аналитики**
```
1. Подожди загрузки данных

✅ Ожидаем:
   - Видим выбранные ad accounts
   - Видим tracked campaigns
   - Видим статистику (если есть данные)
```

**Тест 3.3: Фильтры и сортировка**
```
1. Попробуй изменить date range (если есть UI)
2. Попробуй изменить status filter (если есть UI)

✅ Проверь: Данные обновляются
```

---

### 🎯 ЭТАП 4: ONBOARDING (5 минут)

**URL:** http://localhost:8080/traffic/dashboard

**Тест 4.1: Первый запуск onboarding**
```
1. Если это первый логин, должен показаться onboarding tour
2. Нажми "Next" несколько раз

✅ Ожидаем: 7 шагов onboarding
✅ Проверь: Подсветка элементов (spotlight)
✅ Проверь: Можно закрыть (X)
```

**Тест 4.2: Пропуск onboarding**
```
1. Нажми "Skip" или закрой (X)

✅ Ожидаем: Onboarding закрылся
✅ Проверь: Прогресс сохранен в БД
```

---

## 🐛 ИЗВЕСТНЫЕ ПРОБЛЕМЫ

### 1. Test Ad Accounts не имеют реальных campaigns
```
Симптом: "Failed to load campaigns" при клике на account
Причина: act_test_123 не существует в Facebook
Решение: Это нормально для test data
```

### 2. Supabase Schema Cache может быть еще не обновлен
```
Симптом: "Could not find table" errors
Причина: PostgREST schema cache (5-10 мин после migration)
Решение: Подожди 5 минут или manual refresh в Supabase Dashboard
```

### 3. Facebook API может вернуть 400/401
```
Симптом: "Failed to load ad accounts"
Причина: Test token или rate limit
Решение: Проверь FB_ACCESS_TOKEN в backend/env.env
```

---

## ✅ КРИТЕРИИ УСПЕШНОГО ТЕСТА

### Минимальные требования (MUST PASS):

- [ ] ✅ **Login работает** (с правильным паролем)
- [ ] ✅ **Settings показывает 2 test ad accounts**
- [ ] ✅ **Ad accounts pre-selected (checkbox checked)**
- [ ] ✅ **Можно сохранить настройки**
- [ ] ✅ **После reload настройки сохранены**
- [ ] ✅ **Detailed Analytics проверяет настройки**
- [ ] ✅ **No 500 errors в Network tab**

### Желательно (SHOULD PASS):

- [ ] ⚠️ Campaigns загружаются (может не работать с test accounts)
- [ ] ⚠️ Onboarding показывается при первом входе
- [ ] ⚠️ Analytics показывает данные (может быть пусто)

### Можно игнорировать (KNOWN ISSUES):

- [ ] ❌ "Failed to load campaigns" - test accounts не имеют campaigns
- [ ] ❌ Facebook API 400 errors - если token истек
- [ ] ❌ Schema cache errors - если еще не обновился

---

## 🔍 DEBUGGING TIPS

### Проверка токена
```bash
# В DevTools Console:
localStorage.getItem('traffic_token')
// Должен быть JWT токен (eyJhbGci...)

localStorage.getItem('traffic_user')
// Должен быть JSON с user data
```

### Проверка Network requests
```
1. Открой DevTools (F12)
2. Перейди в Network tab
3. Фильтр: XHR

✅ Ищи запросы:
   - POST /api/traffic-auth/login → 200
   - GET /api/traffic-settings/Kenesary → 200
   - GET /api/traffic-settings/facebook/ad-accounts → 200 или 400
   - PUT /api/traffic-settings/Kenesary → 200
```

### Проверка ошибок
```
1. Открой Console tab в DevTools
2. Ищи красные errors

❌ Не должно быть:
   - CORS errors
   - 500 Internal Server Error
   - Undefined is not a function
   - Cannot read property of undefined
```

### Проверка БД
```sql
-- Проверить что settings сохранились
SELECT user_id, fb_ad_accounts, tracked_campaigns 
FROM traffic_targetologist_settings 
WHERE user_id = 'Kenesary';
```

---

## 📊 TESTING CHECKLIST

Копируй и заполняй во время тестирования:

```
AUTHENTICATION:
[ ] Login successful (kenesary@onai.academy)
[ ] Login fails with wrong password
[ ] Login fails with wrong email
[ ] Token stored in localStorage
[ ] User data stored in localStorage

SETTINGS:
[ ] Page loads without errors
[ ] Shows 2 test ad accounts
[ ] Checkboxes pre-selected
[ ] Can check/uncheck accounts
[ ] Can expand account (show campaigns)
[ ] Save button works
[ ] Toast shows success message
[ ] Settings persist after reload

DETAILED ANALYTICS:
[ ] Page loads
[ ] Checks if settings configured
[ ] Shows warning if no campaigns
[ ] Shows "Go to Settings" button
[ ] Loads analytics data (if configured)

ONBOARDING:
[ ] Shows on first login
[ ] 7 steps displayed
[ ] Can navigate next/prev
[ ] Can skip/close
[ ] Progress saved

GENERAL:
[ ] No 500 errors
[ ] No console errors
[ ] All pages responsive
[ ] Loading states work
[ ] Toast notifications work
```

---

## 🚀 ЗАПУСК ТЕСТИРОВАНИЯ

### Подготовка (если еще не запущено):

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd /Users/miso/onai-integrator-login
npm run dev

# Проверка:
curl http://localhost:3000/health   # → {"status":"ok"}
curl http://localhost:8080           # → 200 OK
```

### Начало тестирования:

```
1. Открой браузер (Chrome/Firefox)
2. Открой http://localhost:8080/traffic/login
3. Открой DevTools (F12)
4. Следуй плану тестирования выше
5. Отмечай checkboxes в Testing Checklist
```

---

## 📝 ОТЧЕТ О ТЕСТИРОВАНИИ

После завершения создай отчет:

```markdown
# Traffic Dashboard - Test Report

Дата: 22 декабря 2025
Тестировщик: [Имя]
Браузер: Chrome 120
Environment: localhost

## Results:
✅ PASSED: [количество]
❌ FAILED: [количество]
⚠️ KNOWN ISSUES: [количество]

## Details:
[Список пройденных/провальных тестов]

## Bugs Found:
1. [Описание бага]
2. [Описание бага]

## Recommendations:
- [Что нужно исправить]
```

---

## ⏱️ РАСЧЕТНОЕ ВРЕМЯ

- **Подготовка:** 5 минут (проверка серверов)
- **Тестирование:** 30 минут (все этапы)
- **Отчет:** 10 минут (запись результатов)
- **ИТОГО:** ~45 минут

---

## 🎯 NEXT STEPS AFTER TESTING

### Если все тесты прошли ✅:
1. Create test report
2. Share with team
3. Deploy to staging
4. Production deployment (after Phase 1 security fixes)

### Если есть критические баги ❌:
1. Document bugs
2. Fix critical issues
3. Re-test
4. Then proceed to staging

---

**Готов к тестированию!** 🚀  
**Статус:** ✅ Backend + Database ready  
**Время:** ~30-45 минут полного тестирования
