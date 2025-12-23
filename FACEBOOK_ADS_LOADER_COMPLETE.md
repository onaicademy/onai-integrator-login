# 🎯 FACEBOOK ADS LOADER - ПОЛНАЯ РЕАЛИЗАЦИЯ

**Дата:** 23 декабря 2025, 21:10 Almaty  
**Статус:** ✅ **КОД ГОТОВ К DEPLOY**

---

## 🔥 ЧТО БЫЛО СОЗДАНО

### 1. **Facebook Ads Data Loader** (`facebook-ads-loader.ts`)

**Функционал:**
- ✅ Читает настройки из `traffic_targetologist_settings` для каждого таргетолога
- ✅ Для каждого таргетолога загружает данные из Facebook Marketing API:
  - Выбранные Ad Accounts (рекламные кабинеты)
  - Выбранные Campaigns (кампании) с `enabled=true`
- ✅ Загружает insights: `spend`, `impressions`, `clicks`
- ✅ Вычисляет: CTR, CPC
- ✅ Сохраняет результаты в `traffic_stats` (Traffic DB)
- ✅ Использует Permanent Token из `.env`
- ✅ Cron job: запускается каждые 6 часов
- ✅ Rate limiting: 1 запрос/сек между кампаниями, 2 сек между таргетологами

**Файл:** `/backend/src/cron/facebook-ads-loader.ts`

### 2. **API Endpoints** (`facebook-ads-loader-api.ts`)

**3 endpoint'а:**

#### 1️⃣ `POST /api/facebook-ads-loader/load`
**Описание:** Ручной запуск загрузки с custom date range

**Request body:**
```json
{
  "dateStart": "2025-12-01",
  "dateEnd": "2025-12-23"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Facebook Ads data load started",
  "dateRange": {
    "start": "2025-12-01",
    "end": "2025-12-23"
  },
  "note": "Check server logs for progress..."
}
```

#### 2️⃣ `POST /api/facebook-ads-loader/load-yesterday`
**Описание:** Быстрая загрузка данных за вчера

**Response:**
```json
{
  "success": true,
  "message": "Loading Facebook Ads data for yesterday",
  "date": "2025-12-22"
}
```

#### 3️⃣ `GET /api/facebook-ads-loader/status`
**Описание:** Проверка статуса загрузчика

**Response:**
```json
{
  "success": true,
  "configured": true,
  "tokenPresent": true,
  "message": "Facebook Ads loader is configured and ready"
}
```

**Файл:** `/backend/src/routes/facebook-ads-loader-api.ts`

### 3. **Интеграция в server.ts**

**Изменения:**
- ✅ Добавлен import `facebookAdsLoaderRouter`
- ✅ Зарегистрирован роут `/api/facebook-ads-loader`
- ✅ Добавлен cron job в production mode (каждые 6 часов)

**Код:**
```typescript
// Import (строка 135)
import facebookAdsLoaderRouter from './routes/facebook-ads-loader-api.js';

// Route registration (строка 512)
app.use('/api/facebook-ads-loader', facebookAdsLoaderRouter);

// Cron job (строка ~645)
if (process.env.NODE_ENV === 'production') {
  const { facebookAdsLoaderJob } = await import('./cron/facebook-ads-loader.js');
  facebookAdsLoaderJob.start();
  console.log('✅ Facebook Ads loader cron started (every 6h)');
}
```

---

## 📊 КАК ЭТО РАБОТАЕТ

### Пошаговый процесс:

```
1️⃣ Cron job запускается (каждые 6 часов)
    ↓
2️⃣ Читает traffic_targetologist_settings
    - user_id
    - fb_ad_accounts (какие кабинеты)
    - tracked_campaigns (какие кампании, enabled=true)
    - utm_sources.facebook (utm метка)
    ↓
3️⃣ Для каждого таргетолога:
    ↓
4️⃣ Для каждой enabled кампании:
    - GET /{campaign_id}/insights?time_range={...}
    - fields: spend, impressions, clicks
    - access_token: FACEBOOK_PERMANENT_TOKEN
    ↓
5️⃣ Агрегирует данные:
    - Total spend (USD)
    - Total impressions
    - Total clicks
    - CTR = (clicks / impressions) * 100
    - CPC = spend / clicks
    ↓
6️⃣ Сохраняет в traffic_stats (Traffic DB):
    - team = utm метка таргетолога
    - date = dateStop
    - spend_usd, impressions, clicks, ctr, cpc
    - campaign_ids = [...]
    ↓
7️⃣ Синхронизация (hourly):
    - Существующий facebook-ads-sync.ts
    - Копирует traffic_stats → landing_stats
    ↓
8️⃣ Воронка показывает данные!
    - GET /api/traffic-dashboard/funnel
    - Stage 1: "Затраты" - теперь с реальными $$$! 💰
```

---

## ⚙️ КОНФИГУРАЦИЯ

### Environment Variables (.env)

```bash
# Facebook Permanent Token (обязательно!)
FACEBOOK_PERMANENT_TOKEN=EAAQiCZBWgZAvcBO...длинный_токен...

# Или (альтернативное название)
FACEBOOK_ACCESS_TOKEN=EAAQiCZBWgZAvcBO...

# Business Manager ID (опционально, для будущего)
FACEBOOK_BUSINESS_ID=123456789
```

### Настройки таргетологов (Traffic DB)

**Таблица:** `traffic_targetologist_settings`

**Пример записи:**
```json
{
  "user_id": "97524c98-c193-4d0d-b9ce-8a8011366a63",
  "fb_ad_accounts": [
    {
      "id": "964264512447589",
      "name": "Nutrients.kz",
      "enabled": true,
      "currency": "USD"
    }
  ],
  "tracked_campaigns": [
    {
      "id": "120237748929120477",
      "name": "nutcab_tripwire_17.12",
      "status": "ACTIVE",
      "enabled": true,
      "ad_account_id": "964264512447589"
    },
    {
      "id": "120237537369950477",
      "name": "nutcab_tripwire_13.12",
      "status": "ACTIVE",
      "enabled": true,
      "ad_account_id": "964264512447589"
    }
  ],
  "utm_sources": {
    "facebook": "fb_kenesary_test",
    "youtube": "yt_kenesary",
    "tiktok": "",
    "google": ""
  }
}
```

**Как настроить:**
1. Открыть `/traffic/settings` (UI уже есть!)
2. Выбрать Ad Accounts (галочки)
3. Выбрать Campaigns (галочки)
4. Указать UTM метку (например: `fb_kenesary`)
5. Нажать "Сохранить" → сохраняется checkpoint ✅

---

## 🧪 ТЕСТИРОВАНИЕ

### 1. Проверка статуса загрузчика

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://api.onai.academy/api/facebook-ads-loader/status
```

**Ожидаемый результат:**
```json
{
  "success": true,
  "configured": true,
  "tokenPresent": true,
  "message": "Facebook Ads loader is configured and ready"
}
```

### 2. Ручная загрузка за вчера

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://api.onai.academy/api/facebook-ads-loader/load-yesterday
```

### 3. Загрузка за диапазон дат

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dateStart": "2025-12-01",
    "dateEnd": "2025-12-23"
  }' \
  https://api.onai.academy/api/facebook-ads-loader/load
```

### 4. Проверка результатов в воронке

```bash
# Должен появиться spend > 0
curl https://api.onai.academy/api/traffic-dashboard/funnel | \
  jq '.stages[0].metrics.spend_usd'
```

---

## 🐛 TROUBLESHOOTING

### Проблема 1: "No Facebook access token configured"

**Причина:** `FACEBOOK_PERMANENT_TOKEN` не найден в `.env`

**Решение:**
```bash
# На сервере:
echo "FACEBOOK_PERMANENT_TOKEN=EAAQiCZBWgZAvcBO..." >> /var/www/onai-integrator-login/backend/.env
pm2 restart backend
```

### Проблема 2: "No targetologists with configured Facebook Ads found"

**Причина:** Нет настроек в `traffic_targetologist_settings`

**Решение:**
1. Открыть https://onai.academy/traffic/settings
2. Подключить Facebook (если еще не подключен)
3. Выбрать Ad Accounts и Campaigns
4. Нажать "Сохранить"

### Проблема 3: Все еще $0 в воронке

**Возможные причины:**
1. Токен истек → обновить `FACEBOOK_PERMANENT_TOKEN`
2. Нет доступа к кампаниям → проверить права Business Manager
3. Кампании не enabled → открыть Settings, включить галочки
4. Данных еще нет → подождать 6 часов (cron) или запустить вручную

**Проверка логов:**
```bash
pm2 logs backend | grep "FB Loader"
```

---

## 📈 СЛЕДУЮЩИЕ ШАГИ

### Сейчас (после deploy):

1. ✅ **Deploy на production**
   ```bash
   ssh root@185.146.1.38
   cd /var/www/onai-integrator-login
   git pull origin main
   pm2 restart backend
   ```

2. ✅ **Добавить Permanent Token в .env**
   ```bash
   nano /var/www/onai-integrator-login/backend/.env
   # Добавить: FACEBOOK_PERMANENT_TOKEN=EAA...
   pm2 restart backend
   ```

3. ✅ **Запустить ручную загрузку** (через Postman или curl)
   ```
   POST /api/facebook-ads-loader/load-yesterday
   ```

4. ✅ **Проверить воронку**
   - Открыть https://onai.academy/traffic/cabinet/kenesary
   - Stage 1 "Затраты" должен показывать реальные $$$! 💰

### В будущем (опционально):

- [ ] Date range picker в дашборде (кнопка "Загрузить за период")
- [ ] Email уведомления после загрузки
- [ ] Детальная статистика по AdSets/Ads
- [ ] Графики затрат по дням
- [ ] Сравнение команд (spend per team)

---

## ✅ ГОТОВО К PRODUCTION!

**Изменённые файлы:**
- ✅ `backend/src/cron/facebook-ads-loader.ts` (NEW)
- ✅ `backend/src/routes/facebook-ads-loader-api.ts` (NEW)
- ✅ `backend/src/server.ts` (MODIFIED)

**Что будет работать после deploy:**
- ✅ Автоматическая загрузка каждые 6 часов
- ✅ Ручная загрузка через API
- ✅ Реальные затраты в воронке ($$$)
- ✅ ROI расчет (выручка / затраты)
- ✅ Фильтрация по командам (utm_source)

**БРАТАН, ТЕПЕРЬ НА ПРОДАКШЕНЕ БУДЕШЬ ВИДЕТЬ РЕАЛЬНЫЕ ЗАТРАТЫ ИЗ FACEBOOK! 🔥**

---

**Готово:** AI Assistant  
**Дата:** 23 декабря 2025  
**Commit:** (следующий)
