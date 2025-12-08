# 🔥 ФИНАЛЬНАЯ НАСТРОЙКА AMOCRM

## ✅ Что уже сделано:

1. ✅ SQL миграция применена (таблица `landing_leads` создана)
2. ✅ Логотип OnAI с правильным цветом (#00FF94) в форме
3. ✅ Плейсхолдер изменен на "Диас Серекбай"
4. ✅ API endpoint `/api/landing/submit` создан
5. ✅ Callback URL для AmoCRM создан

---

## 🔐 ДОБАВЬ В `backend/.env`:

```bash
# ============================================
# LANDING PAGE DATABASE (New Supabase Project)
# ============================================
LANDING_SUPABASE_URL=https://xikaiavwqinamgolmtcy.supabase.co
LANDING_SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpa2FpYXZ3cWluYW1nb2xtdGN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDg1MzIyMSwiZXhwIjoyMDgwNDI5MjIxfQ.eP7ake2RkWqCaLTKv0jI3vWMkBjDySKsAdToKIgb7fA

# ============================================
# AMOCRM INTEGRATION
# ============================================
AMOCRM_DOMAIN=onaiagencykz.amocrm.ru
AMOCRM_ACCESS_TOKEN=eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjFjMDQ0M2VlMDg3ZGNmN2JlODk2ZTRhNDg1MTk1YjkwODdiZTJkZDlkMmY3ODE0Y2JlMzA4NDMzYWFmN2JiNGQ1OWMwNTg1ZTZlNGNhZGI0In0.eyJhdWQiOiIyOTQ0YWQ2Ni0zNmY2LTQ4MzMtOWJkYy05NDZlOGZlNWVmODciLCJqdGkiOiIxYzA0NDNlZTA4N2RjZjdiZTg5NmU0YTQ4NTE5NWI5MDg3YmUyZGQ5ZDJmNzgxNGNiZTMwODQzM2FhZjdiYjRkNTljMDU4NWU2ZTRjYWRiNCIsImlhdCI6MTc2NTE4NDAxOCwibmJmIjoxNzY1MTg0MDE4LCJleHAiOjE4NTY2NDk2MDAsInN1YiI6IjExMjM5OTA2IiwiZ3JhbnRfdHlwZSI6IiIsImFjY291bnRfaWQiOjMxODM0NTc4LCJiYXNlX2RvbWFpbiI6ImFtb2NybS5ydSIsInZlcnNpb24iOjIsInNjb3BlcyI6WyJjcm0iLCJmaWxlcyIsImZpbGVzX2RlbGV0ZSIsIm5vdGlmaWNhdGlvbnMiLCJwdXNoX25vdGlmaWNhdGlvbnMiXSwiaGFzaF91dWlkIjoiNzUxMWRkMGItZTk3Yi00MmExLTkzYzQtNGM2ODMyYmM3NDA0IiwidXNlcl9mbGFncyI6MCwiYXBpX2RvbWFpbiI6ImFwaS1iLmFtb2NybS5ydSJ9.ey_ktAElbXEQePgL5_IEKbq7zGbHNs4R1nX114SgQoeQFk_eEx-lDcCpJ2gnluGUGK9xdkN1u5G-8zwcpDGZQLPSBgIJAxkUPcC87ipUj9ESeop6I3hj-irj7dtzNnJaNj4X5-WWARY3ebBnFNJNq40JRV1k03twhTnMSuIf1GRMc9Yo3WZvuX4KYaKHYBJNjg5cN5Kp1Vx2-Hz8uAcNT-n7ewfmJ6yFuJLRE8C-2ww9H1BoXat1VSHB5iTJc4_V0NFx1iufcivqFUSm4MOs_B0Uq6pKLA0Oa7C2jkLdkhZOTMMyCXiitEt2GkvNTPoSJ1PjoY35jlQpV00qh3T5bA

# Pipeline ID (из ссылки https://onaiagencykz.amocrm.ru/leads/pipeline/10350882)
AMOCRM_PIPELINE_ID=10350882

# Status ID (оставь пустым - определится автоматически для "Не разобранное")
AMOCRM_STATUS_ID=

# Дополнительные данные (для справки, не обязательно в .env)
# Client ID: 2944ad66-36f6-4833-9bdc-946e8fe5ef87
# Client Secret: kCknQxJ40od4Kt3imfGb2930YCXND1r1Gwak49KUFgR9qYqu8A1RhPjenGwrhL0X
```

---

## 🔗 Callback URL для AmoCRM:

Если нужно указать Redirect URI в настройках AmoCRM:

### Development (локальный):
```
http://localhost:3000/api/landing/amocrm/callback
```

### Production:
```
https://your-domain.com/api/landing/amocrm/callback
```

---

## ⚡ ЗАПУСК:

### 1. Перезапусти Backend:

```bash
cd backend
npm run dev
```

### 2. Проверь что всё работает:

```bash
# Test 1: Health Check
curl http://localhost:3000/api/landing/health

# Ожидаемый ответ:
# {
#   "database": true,
#   "amocrm": true,
#   "timestamp": "2025-01-08T..."
# }
```

### 3. Открой лендинг:

```
http://localhost:8080/twland
```

### 4. Протестируй форму:

1. Нажми **"ЗАНЯТЬ МЕСТО"**
2. Увидишь форму с:
   - ✅ Логотипом OnAI (зеленый #00FF94)
   - ✅ Плейсхолдерами:
     - Email: `ivan@example.com`
     - Имя: `Диас Серекбай`
     - Телефон: `+7 (700) 123-45-67`
3. Заполни форму и отправь
4. Проверь:
   - В Supabase: таблица `landing_leads`
   - В AmoCRM: воронка → "Не разобранное"

---

## 🎯 Как работает:

### Когда пользователь отправляет форму:

1. ✅ **Данные сохраняются** в Supabase (`landing_leads`)
2. ✅ **Создается контакт** в AmoCRM с email и телефоном
3. ✅ **Создается сделка** в AmoCRM:
   - Название: "Заявка с лендинга: [Имя]"
   - Воронка: ID `10350882`
   - Статус: "Не разобранное" (определяется автоматически)
   - Привязанный контакт
4. ✅ **Показывается успех** с галочкой
5. ✅ **Форма закрывается** через 2 секунды

---

## 📊 Проверка лидов:

### В Supabase:

1. Открой: https://xikaiavwqinamgolmtcy.supabase.co
2. Table Editor → `landing_leads`
3. Увидишь все заявки

### В AmoCRM:

1. Открой: https://onaiagencykz.amocrm.ru/leads/pipeline/10350882
2. Раздел: **"Не разобранное"**
3. Увидишь сделки с лендинга

---

## 🔍 Логи для отладки:

Backend будет выводить:
```
📝 New lead submission: Диас Серекбай (dias@example.com)
✅ AmoCRM contact created: 12345
✅ AmoCRM lead created: 67890 (Pipeline: 10350882, Status: 123)
✅ Lead saved to database: uuid-here
```

---

## 🆘 Troubleshooting:

### Ошибка: "AmoCRM not configured"

**Решение:** Проверь что `AMOCRM_ACCESS_TOKEN` добавлен в `.env`

### Лиды не попадают в AmoCRM

**Решение:** 
1. Проверь токен через health check: `curl http://localhost:3000/api/landing/health`
2. Проверь что токен не истек (действителен до 2028 года)

### Лиды создаются но в другом статусе

**Решение:** 
1. Проверь название статуса в AmoCRM (должен быть "Не разобранное" или "Неразобранное")
2. Или укажи вручную `AMOCRM_STATUS_ID` в `.env`

---

## ✨ Что дальше:

После настройки можно добавить:

1. 📧 **Email уведомления** (через Resend)
2. 📱 **SMS уведомления** (через SMS.ru)
3. 💬 **WhatsApp сообщения** (через WhatsApp Business API)
4. 📊 **Аналитика** (Google Analytics, Яндекс.Метрика)
5. 🎯 **UTM-метки** для отслеживания источников

---

## 🎉 Готово!

Теперь у тебя полностью рабочая система:
- ✅ Красивая форма на лендинге
- ✅ Сохранение в БД
- ✅ Автоматическое создание сделок в AmoCRM
- ✅ Правильная воронка и статус

**Перезапусти backend и тестируй!** 🚀
