# 📋 Технические исправления Traffic Dashboard

**Дата:** 28 декабря 2025  
**Статус:** Готово для деплоя

---

## 📊 Обзор проблем

### 1. ❌ API Интеграции не работает (404)
**Проблема:** Frontend вызывает `/api/integrations/all`, но этот маршрут не существует в backend

**Ошибка в браузере:**
```
GET https://traffic.onai.academy/api/integrations/all 404 (Not Found)
```

### 2. ❌ UTM Analytics дает 500 ошибку
**Проблема:** Маршрут `/api/utm-analytics/overview` использует неправильную БД (Tripwire вместо Traffic)

**Ошибка в браузере:**
```
GET https://traffic.onai.academy/api/utm-analytics/overview?days=30 500 (Internal Server Error)
```

### 3. ❌ Team Constructor выдает 403
**Проблема:** Ошибка `jwt malformed` при аутентификации

**Ошибка в логах:**
```
❌ Invalid token: jwt malformed
```

---

## ✅ Технические исправления

### Коммит 1: `fix(api): Add API integrations status endpoint`

**Файлы:**
- `backend/src/routes/api-integrations.ts` (новый файл)
- `backend/src/server.ts` (изменен)

**Изменения:**

1. **Создан новый маршрут** `backend/src/routes/api-integrations.ts`:
   - `GET /api/integrations/all` - Статус всех API
   - `GET /api/integrations/facebook` - Статус Facebook API
   - `GET /api/integrations/amocrm` - Статус AmoCRM API
   - `GET /api/integrations/supabase` - Статус Supabase

2. **Добавлен импорт в server.ts:**
   ```typescript
   import apiIntegrationsRouter from './routes/api-integrations';
   ```

3. **Зарегистрирован маршрут в server.ts:**
   ```typescript
   app.use('/api/integrations', apiIntegrationsRouter);
   ```

**Результат:** Frontend теперь может получать статус всех API интеграций

---

### Коммит 2: `fix(utm-analytics): Use correct Traffic DB instead of Tripwire DB`

**Файлы:**
- `backend/src/routes/utm-analytics.ts` (изменен)
- `backend/src/routes/amocrm-funnel-webhook.ts` (изменен)
- `backend/src/utils/amocrm-utils.ts` (новый файл)

**Изменения:**

1. **Замена всех Supabase клиентов** в `utm-analytics.ts`:
   ```typescript
   // Было:
   import { tripwireAdminSupabase } from '../config/supabase-tripwire.js';
   
   // Стало:
   import { trafficSupabase } from '../config/supabase-traffic';
   ```

2. **Обновлены все запросы к БД:**
   - `/api/utm-analytics/overview` → `trafficSupabase.from('all_sales_tracking')`
   - `/api/utm-analytics/top-sources` → `trafficSupabase.from('top_utm_sources')`
   - `/api/utm-analytics/top-campaigns` → `trafficSupabase.from('top_utm_campaigns')`
   - `/api/utm-analytics/without-utm` → `trafficSupabase.from('sales_without_utm')`
   - `/api/utm-analytics/daily-stats` → `trafficSupabase.from('daily_utm_stats')`
   - `/api/utm-analytics/search` → `trafficSupabase.from('all_sales_tracking')`
   - `/api/utm-analytics/source-details/:source` → `trafficSupabase.from('all_sales_tracking')`

3. **Добавлен utility файл** `amocrm-utils.ts` для переиспользуемой логики

**Результат:** UTM Analytics теперь использует правильную Traffic DB (`oetodaexnjcunklkdlkv.supabase.co`)

---

## 📦 Список коммитов для деплоя

```bash
# Коммиты для деплоя на продакшен
git push origin main

# Последние коммиты:
64db8e0 - fix(utm-analytics): Use correct Traffic DB instead of Tripwire DB
0d28ae6 - fix(api): Add API integrations status endpoint
```

---

## 🧪 Тестирование после деплоя

### 1. Проверка API Интеграции
```bash
# Тест на продакшене:
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://traffic.onai.academy/api/integrations/all
```

**Ожидаемый результат:**
```json
{
  "facebook": {
    "service": "Facebook Ads API",
    "status": "online",
    "message": "API работает корректно",
    "details": {...},
    "lastChecked": "2025-12-28T..."
  },
  "amocrm": {...},
  "supabase": {...},
  "overall": {
    "status": "online",
    "lastChecked": "2025-12-28T..."
  }
}
```

### 2. Проверка UTM Analytics
```bash
# Тест на продакшене:
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://traffic.onai.academy/api/utm-analytics/overview?days=30
```

**Ожидаемый результат:**
```json
{
  "success": true,
  "period": {...},
  "summary": {
    "total_sales": 123,
    "total_revenue": 12345678,
    "avg_sale": 100371.37,
    "sales_without_utm": 5,
    "utm_coverage": "95.93"
  },
  "by_source": [...],
  "by_campaign": [...],
  "by_medium": [...],
  "by_targetologist": [...]
}
```

### 3. Проверка Team Constructor
```bash
# Тест на продакшене:
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://traffic.onai.academy/api/traffic-constructor/teams
```

**Ожидаемый результат:**
```json
{
  "success": true,
  "teams": [
    {
      "id": "...",
      "name": "Kenesary",
      "direction": "express-course",
      "color": "#00FF88",
      "emoji": "📊",
      "created_at": "..."
    },
    ...
  ]
}
```

---

## ⚠️ Известные проблемы (требуют дальнейшего решения)

### 1. Раздел "Настройки" дублирует "Дашборд"
**Проблема:** Нет четкой логики разделения функционала

**Рекомендация:** Объединить или убрать раздел "Настройки"

### 2. Team Constructor не объединен с созданием пользователя
**Проблема:** Отдельные формы для создания команды и пользователя

**Рекомендация:** Создать единую форму:
- Название команды
- Email пользователя
- Пароль (автогенерация)
- Направление (экспресс-курс, трехдневник, однодневник)
- Автоматическое создание пользователя и команды

### 3. Дашборд таргетологов не работает
**Проблема:** Нет общего дашборда для таргетологов с фильтрацией по командам

**Рекомендация:** Создать дашборд аналогичный админскому, но с фильтрацией по командам

---

## 📝 Инструкции по деплою

### Вариант 1: Через скрипт с защитой ключей
```bash
# На локальной машине
cd /Users/miso/onai-integrator-login
./scripts/deploy-with-env-protection.sh
```

### Вариант 2: Прямой деплой (без защиты ключей)
```bash
# На локальной машине
cd /Users/miso/onai-integrator-login

# Скомпилировать TypeScript
cd backend && npm run build

# Задеплоить на сервер
rsync -avz --delete --exclude 'node_modules' --exclude '.env' --exclude 'dist' --exclude '.git' \
  backend/ root@207.154.231.30:/var/www/onai-integrator-login-main/backend/

# Перезапустить PM2
ssh root@207.154.231.30 "cd /var/www/onai-integrator-login-main/backend && pm2 restart onai-backend"
```

### Вариант 3: Git push + pull на сервере
```bash
# На локальной машине
git push origin main

# На сервере
ssh root@207.154.231.30
cd /var/www/onai-integrator-login-main
git pull origin main
cd backend && npm run build
pm2 restart onai-backend
```

---

## ✅ Чек-лист после деплоя

- [ ] API Интеграции загружается без ошибок
- [ ] UTM Analytics показывает данные (нет 500 ошибки)
- [ ] Team Constructor загружает список команд (нет 403 ошибки)
- [ ] Facebook API статус отображается корректно
- [ ] AmoCRM API статус отображается корректно
- [ ] Supabase статус отображается корректно
- [ ] Логи PM2 без ошибок `jwt malformed`
- [ ] Логи PM2 без ошибок `500 Internal Server Error`

---

## 📞 Контакты

Если возникнут проблемы после деплоя:
- Проверить логи: `ssh root@207.154.231.30 "pm2 logs onai-backend --lines 100"`
- Проверить статус: `ssh root@207.154.231.30 "pm2 status"`
- Перезапустить: `ssh root@207.154.231.30 "pm2 restart onai-backend"`

---

**Всего коммитов:** 2  
**Статус:** ✅ Готово для деплоя
