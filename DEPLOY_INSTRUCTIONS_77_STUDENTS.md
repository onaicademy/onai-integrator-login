# 🚀 DEPLOY ИНСТРУКЦИИ - 77 СТУДЕНТОВ

**Дата:** 23 декабря 2025, 20:40 Almaty  
**Commit:** `beccb36` - "fix: update funnel to show 5 stages with real 77 students from Tripwire DB"

---

## ✅ ЧТО УЖЕ СДЕЛАНО

1. ✅ **Код обновлен:**
   - Добавлен этап "Напрямую с сайта" (177 лидов без UTM)
   - Добавлен этап "Express Course 5K" (77 реальных студентов из Tripwire DB)
   - Исправлены конверсии: 38.99% → 43.50%
   - Добавлена статистика: 15 завершили, 62 активных

2. ✅ **Commit создан и pushed:**
   ```
   Commit: beccb36
   Branch: main
   Status: ✅ Pushed to GitHub
   ```

3. ✅ **TypeScript ошибки исправлены:**
   - Обновлен интерфейс `FunnelMetrics`
   - Добавлены поля: `direct_leads`, `express_students`, `active_students`, `completed_students`

---

## 🎯 ЧТО НУЖНО СДЕЛАТЬ СЕЙЧАС

### Вариант 1: Автоматический deploy (через SSH)

```bash
# 1. Подключиться к серверу
ssh root@185.146.1.38

# 2. Перейти в папку проекта
cd /var/www/onai-integrator-login

# 3. Сделать git pull
git pull origin main

# 4. Перезапустить backend
pm2 restart backend

# 5. Проверить логи
pm2 logs backend --lines 50

# 6. Проверить API
curl https://api.onai.academy/api/traffic-dashboard/funnel | jq '.stages | length'
# Должно вернуть: 5

curl https://api.onai.academy/api/traffic-dashboard/funnel | jq '.stages[3].metrics.express_students'
# Должно вернуть: 77
```

### Вариант 2: Через Portainer (веб-интерфейс)

1. Открыть https://portainer.onai.academy
2. Перейти в контейнер `backend`
3. Нажать "Console" → "Connect"
4. Выполнить:
   ```bash
   cd /var/www/onai-integrator-login
   git pull origin main
   pm2 restart backend
   ```

---

## 📊 КАК ПРОВЕРИТЬ ЧТО ВСЁ РАБОТАЕТ

### 1. Проверить количество этапов (должно быть 5)
```bash
curl -s https://api.onai.academy/api/traffic-dashboard/funnel | jq '.stages | length'
```
**Ожидаемый результат:** `5`

### 2. Проверить названия этапов
```bash
curl -s https://api.onai.academy/api/traffic-dashboard/funnel | jq '.stages[].title'
```
**Ожидаемый результат:**
```
"Затраты"
"ProfTest"
"Напрямую с сайта"          ← НОВОЕ!
"Express Course (5,000₸)"
"Integrator Flagman (490,000₸)"
```

### 3. Проверить 77 студентов
```bash
curl -s https://api.onai.academy/api/traffic-dashboard/funnel | jq '.stages[3]'
```
**Ожидаемый результат:**
```json
{
  "id": "express",
  "title": "Express Course (5,000₸)",
  "emoji": "📚",
  "description": "Реальные студенты Tripwire",
  "metrics": {
    "express_students": 77,              ← НОВОЕ!
    "express_revenue": 385000,
    "active_students": 62,               ← НОВОЕ!
    "completed_students": 15,            ← НОВОЕ!
    "express_purchases": 77
  },
  "conversionRate": 43.50,               ← ОБНОВЛЕНО!
  "status": "success"
}
```

### 4. Проверить конверсии
```bash
curl -s https://api.onai.academy/api/traffic-dashboard/funnel | \
  jq '.stages | map({id, conv: .conversionRate})'
```
**Ожидаемый результат:**
```json
[
  { "id": "spend", "conv": 100 },
  { "id": "proftest", "conv": 0 },        // нужны данные FB Ads
  { "id": "direct", "conv": 38.99 },      ← НОВОЕ!
  { "id": "express", "conv": 43.50 },     ← ОБНОВЛЕНО!
  { "id": "main", "conv": 0 }
]
```

### 5. Проверить выручку
```bash
curl -s https://api.onai.academy/api/traffic-dashboard/funnel | jq '.totalRevenue'
```
**Ожидаемый результат:** `385000` (77 студентов × 5,000 KZT)

---

## 🐛 ЕСЛИ ЧТО-ТО НЕ РАБОТАЕТ

### Проблема 1: Ошибка "tripwire_user_profile does not exist"

**Причина:** Tripwire DB не подключена или неправильный URL.

**Решение:**
```bash
# Проверить .env на сервере
cat /var/www/onai-integrator-login/backend/.env | grep TRIPWIRE

# Должно быть:
TRIPWIRE_SUPABASE_URL=https://pjmvxecykysfrzppdcto.supabase.co
TRIPWIRE_SUPABASE_SERVICE_KEY=eyJhbGciOiJ...
```

### Проблема 2: Показывает 80 студентов вместо 77

**Причина:** Не исключены admin/sales пользователи.

**Решение:**
```bash
# Проверить EXCLUDED_EMAILS в коде
grep -A 6 "EXCLUDED_EMAILS" backend/src/services/funnel-service.ts

# Должны быть исключены:
# - smmmcwin@gmail.com
# - rakhat@onaiacademy.kz
# - amina@onaiacademy.kz
```

### Проблема 3: TypeScript ошибки при запуске

**Причина:** Не все файлы обновились после git pull.

**Решение:**
```bash
# Очистить кэш и перезапустить
pm2 delete backend
npm run build
pm2 start ecosystem.config.js --only backend
```

---

## 📈 ОЖИДАЕМЫЕ РЕЗУЛЬТАТЫ

### Production API Response:
```json
{
  "success": true,
  "stages": [
    {
      "id": "spend",
      "title": "Затраты",
      "metrics": {
        "spend_usd": 0,
        "spend_kzt": 0
      },
      "conversionRate": 100
    },
    {
      "id": "proftest",
      "title": "ProfTest",
      "metrics": {
        "proftest_leads": 454
      },
      "conversionRate": 0
    },
    {
      "id": "direct",
      "title": "Напрямую с сайта",
      "metrics": {
        "direct_leads": 177
      },
      "conversionRate": 38.99
    },
    {
      "id": "express",
      "title": "Express Course (5,000₸)",
      "metrics": {
        "express_students": 77,
        "express_revenue": 385000,
        "active_students": 62,
        "completed_students": 15
      },
      "conversionRate": 43.50
    },
    {
      "id": "main",
      "title": "Integrator Flagman (490,000₸)",
      "metrics": {
        "main_purchases": 0,
        "main_revenue": 0
      },
      "conversionRate": 0
    }
  ],
  "totalRevenue": 385000,
  "roi": 0
}
```

---

## 🎉 ПОЗДРАВЛЯЮ!

После успешного deploy:

✅ **Воронка показывает 5 этапов** (было 4)  
✅ **77 реальных студентов** учитываются (было 177 неправильных)  
✅ **Конверсия 43.5%** (Direct → Express) - отличный показатель!  
✅ **Выручка 385,000 KZT** корректно считается  
✅ **15 студентов завершили курс** (19.5%) видно в метриках  

**Следующий шаг:** Настроить Facebook Ads синхронизацию с Permanent Token для заполнения этапа "Затраты".
