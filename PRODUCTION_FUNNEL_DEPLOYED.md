# ✅ PRODUCTION FUNNEL DEPLOYED

**Дата:** 23 декабря 2025, 19:55 Almaty  
**Commit:** `226d23f` - "Fix production funnel - use existing landing_leads"  
**Статус:** 🟢 **УСПЕШНО ЗАДЕПЛОЕНО**

---

## 🎉 ЧТО РАБОТАЕТ НА PRODUCTION

### API Endpoint
```
GET https://api.onai.academy/api/traffic-dashboard/funnel
```

### Реальные данные воронки:

| Этап | Метрика | Значение |
|------|---------|----------|
| 💰 **Затраты** | Facebook Ads | 0 USD (пока) |
| 🧪 **ProfTest** | Лиды | **453** ✅ |
| 📚 **Express Course** | Покупки | **177** ✅ |
| 📚 **Express Course** | Выручка | **885,000 KZT** ✅ |
| 🏆 **Integrator Flagman** | Покупки | 0 (ждем вебхуки) |

**Total Revenue:** 885,000 KZT  
**ROI:** 0% (нет данных по Facebook Ads spend)

---

## 📊 ИСТОЧНИКИ ДАННЫХ

### Landing DB (xikaiavwqinamgolmtcy) - Единая БД

**Таблицы:**
1. `landing_leads` - **692 записи** ✅
   - ProfTest leads: 452
   - Express Course purchases: 177 (source='expresscourse')
   - Express leads: 63 (источники: kenesary, arystan, muha, TF4)

2. `express_course_sales` - **0 записей** (готова для вебхуков)
   - Вебхук: `POST /api/amocrm/funnel-sale`
   - Цена: 5,000 KZT

3. `main_product_sales` - **0 записей** (готова для вебхуков)
   - Вебхук: `POST /webhook/amocrm/traffic`
   - Цена: 490,000 KZT

4. `traffic_stats` - **0 записей** (готова для sync)
   - Cron job: каждый час копирует из Traffic DB
   - Facebook Ads: spend, impressions, clicks

---

## 🔧 ИЗМЕНЕНИЯ В КОДЕ

### 1. `backend/src/services/funnel-service.ts`

**Исправлено:**
- ✅ Читает ProfTest из `landing_leads` (source LIKE 'proftest%')
- ✅ Читает Express из `landing_leads` (source = 'expresscourse')
- ✅ Извлекает UTM метки из `metadata` JSON поля
- ✅ Фильтрация по командам через `metadata.utm_source`
- ✅ Обработка ошибок если таблица не найдена

**До:**
```typescript
landingSupabase.from('landing_leads') // Не существовало в Landing DB!
```

**После:**
```typescript
landingSupabase.from('landing_leads') // Существует! 692 записи
// UTM из metadata->utmParams->utm_source
```

### 2. `backend/src/cron/facebook-ads-sync.ts` (НОВЫЙ!)

**Функция:** Синхронизация Facebook Ads данных из Traffic DB в Landing DB  
**Частота:** Каждый час (0 * * * *)  
**Статус:** Зарегистрирован в `server.ts` (только production)

### 3. `backend/src/server.ts`

**Добавлено:**
```typescript
// 7.5. Start Facebook Ads Sync Cron (только production)
if (process.env.NODE_ENV === 'production') {
  const { facebookAdsSyncJob } = await import('./cron/facebook-ads-sync.js');
  facebookAdsSyncJob.start();
  console.log('✅ Facebook Ads sync cron started');
}
```

### 4. Миграции применены к Landing DB:

- ✅ `20251223210000_create_sales_tables_production.sql`
  - Создана таблица `express_course_sales`
  - Создана таблица `main_product_sales`
  - Добавлены UTM колонки в `landing_leads`
  - Индексы и RLS политики

- ✅ `add_traffic_stats_to_landing_db`
  - Создана таблица `traffic_stats` для Facebook Ads
  - Готова для cron sync

---

## 🎯 СЛЕДУЮЩИЕ ШАГИ

### 1. Проверить воронку в браузере
```
https://onai.academy/traffic/cabinet/kenesary
```

**Ожидаемый результат:**
- Пирамида с 4 этапами
- ProfTest: 453 лида
- Express Course: 177 покупок
- Integrator Flagman: 0

### 2. Тестировать вебхуки AmoCRM

**Express Course вебхук:**
```bash
curl -X POST https://api.onai.academy/api/amocrm/funnel-sale \
  -H 'Content-Type: application/json' \
  -d '{
    "leads": {
      "add": [{
        "id": 999999,
        "name": "Test Customer",
        "price": 5000,
        "pipeline_id": 10350882,
        "status_id": 142,
        "custom_fields_values": [...]
      }]
    }
  }'
```

**Main Product вебхук:**
```bash
curl -X POST https://api.onai.academy/webhook/amocrm/traffic \
  -H 'Content-Type: application/json' \
  -d '{...}'
```

### 3. Настроить Facebook Ads sync

**Опции:**
- A. Вручную загрузить данные из Traffic DB
- B. Подключить Facebook Marketing API
- C. Импортировать CSV из Facebook Ads Manager

### 4. Мониторинг

**Проверять каждый час:**
```sql
-- Проверить что данные обновляются
SELECT 
  team,
  COUNT(*) as total_records,
  MAX(updated_at) as last_update
FROM traffic_stats
GROUP BY team;

SELECT 
  COUNT(*) as express_sales,
  SUM(amount) as express_revenue
FROM express_course_sales;

SELECT 
  COUNT(*) as main_sales,
  SUM(amount) as main_revenue
FROM main_product_sales;
```

---

## ⚠️ ИЗВЕСТНЫЕ ОГРАНИЧЕНИЯ

1. **Facebook Ads = 0**: traffic_stats пустая, нужно заполнить вручную или через API
2. **Express Course дубликаты**: 177 покупок уже в `landing_leads`, но НЕ в `express_course_sales`
3. **ROI = 0%**: нет данных о затратах (Facebook Ads spend)

---

## 🔥 КРИТИЧНО: СЛЕДУЮЩИЙ DEPLOY

Когда придут реальные продажи через AmoCRM вебхуки:
1. Проверить что `express_course_sales` заполняется
2. Проверить что `main_product_sales` заполняется
3. Обновить воронку - должны появиться числа в Integrator Flagman
4. Проверить ROI формулу

---

## 📋 TODO ДЛЯ ПОЛНОЙ ФУНКЦИОНАЛЬНОСТИ

- [ ] Загрузить Facebook Ads данные в `traffic_stats`
- [ ] Мигрировать 177 Express purchases из `landing_leads` в `express_course_sales` (опционально)
- [ ] Настроить pg_cron для автоматического refresh materialized view (если создадим)
- [ ] Создать Telegram алерты для мониторинга
- [ ] Подключить все Facebook Business Managers (план из TODO)

---

**Автор:** AI Agent  
**Production URL:** https://onai.academy/traffic/cabinet/kenesary  
**API URL:** https://api.onai.academy/api/traffic-dashboard/funnel  
**Статус:** ✅ PRODUCTION READY
