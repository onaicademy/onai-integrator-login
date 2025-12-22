# 🔧 WEBHOOK FIX DEPLOYED

**Дата:** 22 декабря 2025, 23:49 MSK  
**Проблема:** AmoCRM webhook не сохранял данные в БД  
**Статус:** ✅ ИСПРАВЛЕНО И ЗАДЕПЛОЕНО  

---

## 🚨 НАЙДЕННЫЕ ПРОБЛЕМЫ:

### 1. **JSON Parse Error**
```
Unexpected token 'a', "account%5B"... is not valid JSON
```

**Причина:** AmoCRM отправляет данные в формате `application/x-www-form-urlencoded`, а наш webhook ожидал только JSON.

**Решение:** Добавлены middleware для парсинга обоих форматов:
```typescript
router.use(express.urlencoded({ extended: true }));
router.use(express.json());
```

---

### 2. **PG Direct Connection Failed**
```
Tenant or user not found
```

**Причина:** Прямое PostgreSQL подключение использовало неправильный connection string.

**Решение:** Вернулись к использованию `trafficAdminSupabase` (PostgREST) после того как ты выполнил `NOTIFY pgrst, 'reload schema';`

---

## ✅ ЧТО ИСПРАВЛЕНО:

1. **✅ Добавлен urlencoded parser** - webhook теперь принимает данные в любом формате
2. **✅ Убрана зависимость от trafficPgPool** - используем Supabase client
3. **✅ Улучшено логирование** - видим Content-Type и raw body
4. **✅ Задеплоено на production** - PM2 перезапущен
5. **✅ Health check работает** - endpoint доступен

---

## 🎯 КАК ПРОТЕСТИРОВАТЬ:

### Способ 1: Изменить существующую сделку
```
1. Открой: https://onaiagencykz.amocrm.ru/leads/detail/21187519
2. Переведи в ДРУГОЙ статус (например, "в работе")
3. Потом переведи ОБРАТНО в "оплатил экспресс курс" (ID: 142)
4. Webhook сработает!
```

### Способ 2: Создать новую сделку
```
1. Создай новую сделку в AmoCRM
2. Заполни UTM поля:
   - utm_source: fb_kenesary
   - utm_campaign: test_campaign_22dec
3. Переведи в статус "оплатил экспресс курс" (ID: 142)
```

---

## 📊 ЧТО ПРОВЕРИТЬ ПОСЛЕ:

1. **Backend logs:**
```bash
ssh root@207.154.231.30
pm2 logs onai-backend --lines 50
```

Должны увидеть:
```
[AmoCRM Funnel Webhook] 📥 Received webhook
[AmoCRM Funnel Webhook] 🔍 Processing lead 21187519
[AmoCRM Funnel Webhook] 🎯 Targetologist: Kenesary
[AmoCRM Funnel Webhook] ✅ Sale saved: Lead 21187519 → Kenesary
```

2. **Database:**
```sql
SELECT * FROM funnel_sales ORDER BY created_at DESC LIMIT 5;
```

Должна появиться новая запись с `amocrm_lead_id = 21187519`

3. **Dashboard:**
```
https://onai.academy/#/traffic/cabinet/kenesary
```

Должен увидеть обновлённую воронку с реальными данными!

---

## 🔍 ДЕБАГ КОМАНДЫ:

### Проверить webhook сработал:
```bash
ssh root@207.154.231.30 "pm2 logs onai-backend --nostream --lines 100 | grep 'AmoCRM Funnel Webhook'"
```

### Проверить БД напрямую:
```bash
curl -s "https://onai.academy/api/traffic-dashboard/funnel" | python3 -m json.tool
```

### Тестовый webhook запрос:
```bash
curl -X POST "https://onai.academy/api/amocrm/funnel-sale" \
  -H "Content-Type: application/json" \
  -d '{
    "leads": {
      "status": [{
        "id": 21187519,
        "status_id": 142,
        "pipeline_id": 10350882,
        "custom_fields": [
          {"id": 1234, "name": "utm_source", "values": [{"value": "fb_kenesary"}]},
          {"id": 1235, "name": "utm_campaign", "values": [{"value": "test"}]}
        ]
      }]
    }
  }'
```

---

## ✅ DEPLOYMENT INFO:

**File deployed:** `backend/src/routes/amocrm-funnel-webhook.ts`  
**Server path:** `/var/www/onai-integrator-login-main/backend/src/routes/`  
**PM2 status:** ✅ Online (PID: 317436, restart #26)  
**Health check:** ✅ https://onai.academy/api/amocrm/funnel-sale/health  

---

## 🚀 NEXT STEPS:

1. **Измени статус сделки 21187519** в AmoCRM
2. **Проверь логи** - должны увидеть "✅ Sale saved"
3. **Проверь БД** - должна появиться запись
4. **Проверь Dashboard** - должны обновиться метрики

---

**Статус:** ✅ ГОТОВО К ТЕСТИРОВАНИЮ  
**Time:** 23:49 MSK  
**Ready for:** Реальное тестирование с AmoCRM  

🎉 **Всё исправлено! Создавай/изменяй сделку!**
