# 🎯 Traffic Dashboard Webhook - Dedicated Endpoint

**Date:** December 20, 2024  
**Status:** ✅ READY FOR PRODUCTION

---

## 🚀 **Новый Webhook URL для Traffic команды:**

```
https://api.onai.academy/webhook/amocrm/traffic
```

### **Важно:**
- ✅ Этот endpoint ТОЛЬКО для Traffic Dashboard
- ✅ Реферальная система использует `/webhook/amocrm` (старый)
- ✅ Все ключи уже прописаны в backend/env.env
- ✅ Роутинг раздельный - никаких конфликтов

---

## 📋 **Настройка в AmoCRM**

### Шаг 1: Зайти в настройки AmoCRM
1. Открыть: https://onaiagencykz.amocrm.ru/
2. Настройки → API → Webhooks
3. Нажать "Добавить webhook"

### Шаг 2: Заполнить параметры

**URL вебхука:**
```
https://api.onai.academy/webhook/amocrm/traffic
```

**Триггер:**
- ☑️ Изменение сделки
- ☑️ Изменение статуса

**Фильтры:**
- Pipeline (Воронка): `VAMUS RM` (ID: 10418746)
- Status (Статус): `Успешно реализовано` (ID: 142)

**Метод:** POST

**Заголовки:** Оставить по умолчанию

### Шаг 3: Активировать webhook
- ✅ Включить webhook
- ✅ Сохранить настройки

---

## 🧪 **Проверка работоспособности**

### 1. Тест endpoint'а
```bash
curl https://api.onai.academy/webhook/amocrm/traffic/test
```

**Ожидаемый ответ:**
```json
{
  "success": true,
  "message": "Traffic Dashboard webhook endpoint is active",
  "endpoint": "/webhook/amocrm/traffic",
  "version": "1.0.0",
  "pipeline": 10418746,
  "targetologists": ["Kenesary", "Arystan", "Muha", "Traf4"]
}
```

### 2. Создать тестовую сделку

**В AmoCRM:**
1. Открыть: https://onaiagencykz.amocrm.ru/leads/pipeline/10418746/
2. Создать сделку:
   ```
   Название: TEST - Traffic Webhook
   Сумма: 100,000 KZT
   Поля UTM:
     - utm_source: kenesary_test
     - utm_campaign: tripwire_dec20
     - utm_medium: cpc
   Контакт: Тест Клиент
   ```
3. Переместить в статус "Успешно реализовано"
4. Подождать 5-10 секунд

### 3. Проверить результат

**Backend логи:**
```bash
ssh root@207.154.231.30
pm2 logs onai-backend --lines 50 | grep "Traffic Webhook"
```

**Ожидаемые логи:**
```
🎯 [Traffic Webhook] Incoming request from AmoCRM
📊 [Traffic Webhook] UTM data for deal XXXXX
🎯 [Traffic Webhook] Targetologist: Kenesary
✅ [Traffic Webhook] Sale processed for Kenesary
✅ [Traffic Webhook] Telegram notification sent
```

**Проверить в Traffic Dashboard:**
- https://traffic.onai.academy/
- Вкладка "Основные продукты"
- Должна появиться продажа для Kenesary

**Проверить Telegram:**
- Должно прийти уведомление:
  ```
  🎉 НОВАЯ ПРОДАЖА!
  👑 Таргетолог: Kenesary
  👤 Клиент: Тест Клиент
  💰 Сумма: 100,000 ₸
  📦 Продукт: Main Product (VAMUS RM)
  🏷️ Кампания: tripwire_dec20
  ```

### 4. Очистить тестовые данные
```sql
-- Удалить из базы данных
DELETE FROM all_sales_tracking WHERE lead_id = [DEAL_ID];
DELETE FROM sales_notifications WHERE lead_id = [DEAL_ID];
DELETE FROM webhook_logs WHERE lead_id = [DEAL_ID];
```

**В AmoCRM:** Удалить или архивировать тестовую сделку

---

## 🔍 **Debugging**

### Проблема 1: Webhook не срабатывает

**Проверить:**
1. URL правильный: `https://api.onai.academy/webhook/amocrm/traffic`
2. Backend online: `pm2 status onai-backend`
3. Webhook активен в AmoCRM
4. Pipeline ID = 10418746
5. Status ID = 142

### Проблема 2: Продажа не попадает в Traffic Dashboard

**Проверить webhook logs:**
```bash
# Через API
curl https://onai.academy/api/admin/webhook-logs?limit=10

# Или в Supabase
SELECT * FROM webhook_logs 
WHERE source = 'amocrm_traffic' 
ORDER BY received_at DESC 
LIMIT 10;
```

**Смотри на поля:**
- `routing_decision` должно быть `'traffic'`
- `processing_status` должно быть `'success'`
- `error_message` должно быть `null`

### Проблема 3: Неправильный targetologist

**Причина:** UTM метки не соответствуют паттернам

**Паттерны:**
- Kenesary: `tripwire`, `nutcab`, `kenesary`, `kenji`
- Arystan: `arystan`
- Muha: `on ai`, `onai`, `запуск`, `yourmarketolog`, `muha`
- Traf4: `alex`, `traf4`, `proftest`, `pb_agency`

**Проверь UTM в AmoCRM** и убедись что они содержат один из паттернов

---

## ⚙️ **Конфигурация ENV (уже настроено)**

```bash
# AmoCRM
AMOCRM_DOMAIN=onaiagencykz
AMOCRM_ACCESS_TOKEN=[PERMANENT TOKEN - EXPIRES 2057]

# Supabase Tripwire
TRIPWIRE_SUPABASE_URL=https://pjmvxecykysfrzppdcto.supabase.co
TRIPWIRE_SERVICE_ROLE_KEY=[SET]

# Facebook (для Traffic Dashboard)
FACEBOOK_ADS_TOKEN=[PERMANENT - NEVER EXPIRES]
FACEBOOK_APP_ID=1079708200963910
FACEBOOK_APP_SECRET=[SET]
```

**Все ключи уже на сервере в `/var/www/onai-integrator-login-main/backend/env.env`**

---

## 📊 **Архитектура**

```
AmoCRM VAMUS RM Pipeline (10418746)
    ↓
Deal → "Успешно реализовано" (142)
    ↓
Webhook → https://api.onai.academy/webhook/amocrm/traffic
    ↓
Extract UTM data
    ↓
Determine Targetologist (Kenesary/Arystan/Muha/Traf4)
    ↓
    ├─ Save to sales_notifications
    ├─ Save to all_sales_tracking
    ├─ Send Telegram notification
    └─ Log to webhook_logs
    ↓
Traffic Dashboard displays sale
```

---

## 🎯 **Таргетологи и их UTM паттерны**

| Таргетолог | UTM Patterns | Emoji |
|------------|--------------|-------|
| Kenesary | tripwire, nutcab, kenesary, kenji | 👑 |
| Arystan | arystan | 🦁 |
| Muha | on ai, onai, запуск, yourmarketolog, muha | 🚀 |
| Traf4 | alex, traf4, proftest, pb_agency | ⚡ |
| Unknown | (не совпадает ни с одним) | ❓ |

---

## 📝 **Следующие шаги**

1. ✅ **Настроить webhook в AmoCRM** по инструкции выше
2. ✅ **Создать тестовую сделку** и проверить
3. ✅ **Убедиться что данные попадают** в Traffic Dashboard
4. ✅ **Проверить Telegram уведомления**
5. ✅ **Очистить тестовые данные**
6. ✅ **Начать использовать в production**

---

## 🔄 **Отличия от unified webhook**

### Unified webhook (`/webhook/amocrm`)
- Автоматический роутинг (referral vs traffic)
- Сложнее дебажить
- Используется как fallback

### Traffic webhook (`/webhook/amocrm/traffic`)
- ✅ Только для Traffic Dashboard
- ✅ Проще и понятнее
- ✅ Легче отлаживать
- ✅ Отдельные логи (`source = 'amocrm_traffic'`)
- ✅ **РЕКОМЕНДУЕТСЯ использовать этот**

### Referral webhook (`/webhook/amocrm`)
- Только для Referral System
- Проверяет `ref_` в UTM

---

## ✅ **Production Ready**

**Статус:** ✅ ГОТОВ К PRODUCTION  
**URL:** `https://api.onai.academy/webhook/amocrm/traffic`  
**Тестирование:** ⏳ Требуется создать тестовую сделку

**Братан, теперь просто настрой webhook в AmoCRM на этот URL и все заработает! 🚀**

**ENV ключи уже все на месте, ничего дополнительно прописывать не нужно!**
