# 🚀 DEPLOY СЕЙЧАС - СКОПИРУЙ И ВЫПОЛНИ

**Дата:** 23 декабря 2025, 21:50 Almaty  
**Статус:** ✅ Код pushed на GitHub, готов к deploy

---

## 📋 КОМАНДЫ ДЛЯ КОПИРОВАНИЯ

Открой терминал и выполни эти команды одну за другой:

### 1. Подключись к серверу
```bash
ssh root@185.146.1.38
```

### 2. Перейди в папку проекта
```bash
cd /var/www/onai-integrator-login
```

### 3. Git pull (3 новых коммита)
```bash
git pull origin main
```

**Должно показать:**
```
remote: Counting objects: XX, done.
Updating beccb36..3de9743
Fast-forward
 backend/src/cron/facebook-ads-loader.ts      | +300
 backend/src/routes/facebook-ads-loader-api.ts | +100
 backend/src/server.ts                         | +5
 ПРАВИЛЬНАЯ_ВОРОНКА_ВНЕДРЕНА.md               | +500
 ...
```

### 4. Проверь .env (ВАЖНО!)
```bash
grep FACEBOOK_ADS_TOKEN /var/www/onai-integrator-login/backend/.env
```

**Если пусто (ничего не показывает) - добавь токен:**
```bash
nano /var/www/onai-integrator-login/backend/.env

# Найди строку FACEBOOK_ADS_TOKEN= и вставь свой токен после =
# Должно быть:
# FACEBOOK_ADS_TOKEN=EAAQiCZBWgZAvcBO...твой_длинный_токен...

# Сохрани: Ctrl+X → Y → Enter
```

### 5. Restart backend
```bash
pm2 restart backend
```

### 6. Проверь логи (20 секунд)
```bash
pm2 logs backend --lines 50
```

**Должно показать:**
```
✅ Facebook Ads loader cron started (every 6h)
✅ Facebook Ads sync cron started (hourly)
✅ [FB Token] Using cached long-lived token (expires in XX days)
✅ Funnel Service loaded
✅ Server is running on port 5000
```

---

## 🧪 ТЕСТИРОВАНИЕ

Выполни эти команды для проверки:

### Тест 1: Воронка (5 этапов вместо 4)
```bash
curl -s https://api.onai.academy/api/traffic-dashboard/funnel | jq '.stages | length'
```
**Ожидается:** `5` (было 4)

### Тест 2: 77 студентов
```bash
curl -s https://api.onai.academy/api/traffic-dashboard/funnel | jq '.stages[3].metrics.express_students'
```
**Ожидается:** `77` (было 177)

### Тест 3: Названия этапов
```bash
curl -s https://api.onai.academy/api/traffic-dashboard/funnel | jq '.stages[].id'
```
**Ожидается:**
```
"spend"
"proftest"
"direct"      ← НОВОЕ!
"express"
"main"
```

### Тест 4: Конверсия 43.5%
```bash
curl -s https://api.onai.academy/api/traffic-dashboard/funnel | jq '.stages[3].conversionRate'
```
**Ожидается:** `43.5` (было 38.99)

### Тест 5: Token Manager работает
```bash
pm2 logs backend | grep "FB Token" | tail -5
```
**Ожидается:**
```
✅ [FB Token] Using cached long-lived token (expires in XX days)
```

---

## 🔥 ЗАГРУЗИТЬ ДАННЫЕ ИЗ FACEBOOK ADS

После успешного deploy, загрузи данные из Facebook:

### Способ 1: Через Postman/Insomnia

```
POST https://api.onai.academy/api/facebook-ads-loader/load-yesterday

Headers:
Authorization: Bearer твой_JWT_токен

Response:
{
  "success": true,
  "message": "Loading Facebook Ads data for yesterday",
  "date": "2025-12-22"
}
```

### Способ 2: Через curl (нужен JWT токен)

Сначала получи токен:
```bash
curl -X POST https://api.onai.academy/api/traffic-auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "твой_username",
    "password": "твой_пароль"
  }' | jq -r '.token'
```

Сохрани токен и используй:
```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  https://api.onai.academy/api/facebook-ads-loader/load-yesterday
```

### Способ 3: Подожди 6 часов (автоматически)

Cron job запустится автоматически каждые 6 часов.

---

## 📊 ПРОВЕРИТЬ РЕЗУЛЬТАТЫ

### После загрузки данных (через 1-2 минуты):

```bash
curl -s https://api.onai.academy/api/traffic-dashboard/funnel | jq '.stages[0].metrics'
```

**Должно показать:**
```json
{
  "spend_usd": 123.45,       ← Реальные затраты! 🔥
  "spend_kzt": 58638.75,
  "impressions": 10000,
  "clicks": 250,
  "cpc": 0.49,
  "cpm": 12.35
}
```

### Открой в браузере:

1. **Traffic Dashboard:**  
   https://onai.academy/traffic/cabinet/kenesary
   - Должно показать 5 этапов (было 4)
   - "Напрямую с сайта" - 177
   - "Express Course (5,000₸)" - 77 студентов
   - Затраты > $0 (после загрузки данных)

2. **Admin Panel:**  
   https://onai.academy/integrator/admin
   - "Студенты" → должно показать 77 студентов

3. **Traffic Settings:**  
   https://onai.academy/traffic/settings
   - Выбранные Ad Accounts и Campaigns сохранены

---

## ✅ ЕСЛИ ВСЁ РАБОТАЕТ

**ПОЗДРАВЛЯЮ! DEPLOY УСПЕШЕН! 🎉**

Теперь у тебя:
- ✅ Воронка 5 этапов
- ✅ 77 реальных студентов
- ✅ Конверсия 43.5%
- ✅ Facebook Ads загружаются автоматически
- ✅ Token Manager работает без ошибок
- ✅ ROI считается правильно

---

## 🐛 ЕСЛИ ЧТО-ТО НЕ РАБОТАЕТ

### Проблема: Воронка показывает 4 этапа (не 5)

**Решение:**
```bash
# Очисти кэш Redis
redis-cli
> FLUSHALL
> exit

# Restart backend
pm2 restart backend
```

### Проблема: Express students = 0 (не 77)

**Решение:**
```bash
# Проверь Tripwire DB credentials
grep TRIPWIRE /var/www/onai-integrator-login/backend/.env

# Должны быть:
# TRIPWIRE_SUPABASE_URL=https://pjmvxecykysfrzppdcto.supabase.co
# TRIPWIRE_SUPABASE_SERVICE_KEY=eyJ...
```

### Проблема: Затраты = $0

**Решение:**
```bash
# 1. Проверь токен
grep FACEBOOK_ADS_TOKEN /var/www/onai-integrator-login/backend/.env

# 2. Проверь настройки таргетологов
# Открой: https://onai.academy/traffic/settings
# Выбери Ad Accounts + Campaigns
# Нажми "Сохранить"

# 3. Запусти загрузку данных
# POST /api/facebook-ads-loader/load-yesterday
```

### Проблема: "FACEBOOK_ADS_TOKEN is invalid"

**Решение:**
```bash
# Получи новый токен в Facebook Business Settings
# Обнови в .env:
nano /var/www/onai-integrator-login/backend/.env
# Найди FACEBOOK_ADS_TOKEN и замени
# Ctrl+X → Y → Enter

pm2 restart backend
```

---

## 🎯 БЫСТРАЯ ПРОВЕРКА ВСЕГО

Скопируй и выполни эту команду (все тесты сразу):

```bash
echo "========================================" && \
echo "🧪 TESTING DEPLOY..." && \
echo "========================================" && \
echo "" && \
echo "1. Funnel stages:" && \
curl -s https://api.onai.academy/api/traffic-dashboard/funnel | jq '.stages | length' && \
echo "" && \
echo "2. Express students:" && \
curl -s https://api.onai.academy/api/traffic-dashboard/funnel | jq '.stages[3].metrics.express_students' && \
echo "" && \
echo "3. Conversion rate:" && \
curl -s https://api.onai.academy/api/traffic-dashboard/funnel | jq '.stages[3].conversionRate' && \
echo "" && \
echo "4. Stage names:" && \
curl -s https://api.onai.academy/api/traffic-dashboard/funnel | jq '.stages[].id' && \
echo "" && \
echo "========================================" && \
echo "✅ TESTS COMPLETE" && \
echo "========================================"
```

**Ожидаемый результат:**
```
========================================
🧪 TESTING DEPLOY...
========================================

1. Funnel stages:
5

2. Express students:
77

3. Conversion rate:
43.5

4. Stage names:
"spend"
"proftest"
"direct"
"express"
"main"

========================================
✅ TESTS COMPLETE
========================================
```

---

**БРАТАН, СКОПИРУЙ ЭТИ КОМАНДЫ И ВЫПОЛНИ НА СЕРВЕРЕ!**  
**ВСЁ УЖЕ ГОТОВО, ПРОСТО DEPLOY! 🚀**
