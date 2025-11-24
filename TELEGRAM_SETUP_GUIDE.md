# 🤖 TELEGRAM BOT INTEGRATION - SETUP GUIDE

## 📋 ЧТО СДЕЛАНО

### ✅ Backend
1. **Миграция БД** - `supabase/migrations/20251124_add_telegram_fields.sql`
   - Добавлены колонки: `telegram_user_id`, `telegram_chat_id`, `telegram_connected`, `telegram_verification_token`
2. **Telegram Routes** - `backend/src/routes/telegram.ts`
   - `/api/telegram/generate-token` - генерация токена для deep link
   - `/api/telegram/webhook/:token` - webhook для Telegram
   - `/api/telegram/status/:userId` - статус подключения
   - `/api/telegram/send-reminder` - отправка напоминаний
   - Обработчики команд: `/start`, `/disconnect`, `/help`
3. **Reminder Scheduler** - `backend/src/services/reminderScheduler.ts`
   - Проверяет задачи каждую минуту
   - Отправляет напоминания за N минут до дедлайна
   - Автоматически отключает юзера если бот заблокирован (403)

### ✅ Frontend
1. **Обновлен** `src/components/goals/GoalsTodoSystemDB.tsx`
   - Использует API для генерации токена
   - Правильный deep link: `https://t.me/onaimentor_bot?start=TOKEN`

---

## 🚀 УСТАНОВКА И ЗАПУСК

### Шаг 1: Установить зависимости

```bash
cd backend
npm install node-telegram-bot-api @types/node-telegram-bot-api node-cron @types/node-cron
```

### Шаг 2: Настроить .env

Добавь в `backend/.env`:

```env
# Telegram Bot
TELEGRAM_MENTOR_BOT_TOKEN=your_bot_token_here
TELEGRAM_ADMIN_BOT_TOKEN=your_bot_token_here
BACKEND_URL=http://localhost:3000
FRONTEND_URL=http://localhost:8080
```

**Как получить BOT_TOKEN:**
1. Открой [@BotFather](https://t.me/BotFather) в Telegram
2. Отправь `/newbot` и следуй инструкциям
3. Скопируй токен (например: `7894561230:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw`)

### Шаг 3: Запустить миграцию

```sql
-- Выполни в Supabase SQL Editor
-- Или через CLI: supabase migration up

-- Файл: supabase/migrations/20251124_add_telegram_fields.sql
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS telegram_user_id BIGINT UNIQUE,
ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT,
ADD COLUMN IF NOT EXISTS telegram_connected BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS telegram_connected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS telegram_verification_token TEXT UNIQUE;
```

### Шаг 4: Настроить Telegram Webhook

**ВАЖНО:** Webhook работает только с HTTPS! Для локальной разработки используй **ngrok** или **localtunnel**.

#### 4.1. Установить ngrok

```bash
# Скачай ngrok: https://ngrok.com/download
# Или через npm:
npm install -g ngrok
```

#### 4.2. Запустить ngrok

```bash
# Запусти туннель к локальному backend (порт 3000)
ngrok http 3000
```

Получишь URL вида: `https://abc123.ngrok.io`

#### 4.3. Установить webhook в Telegram

```bash
# Замени YOUR_BOT_TOKEN и NGROK_URL
curl -X POST "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook" \
  -d "url=https://abc123.ngrok.io/api/telegram/webhook/YOUR_BOT_TOKEN"
```

**Пример:**
```bash
curl -X POST "https://api.telegram.org/bot7894561230:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw/setWebhook" \
  -d "url=https://abc123.ngrok.io/api/telegram/webhook/7894561230:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw"
```

#### 4.4. Проверить webhook

```bash
curl "https://api.telegram.org/botYOUR_BOT_TOKEN/getWebhookInfo"
```

Должен вернуть:
```json
{
  "ok": true,
  "result": {
    "url": "https://abc123.ngrok.io/api/telegram/webhook/...",
    "has_custom_certificate": false,
    "pending_update_count": 0
  }
}
```

### Шаг 5: Перезапустить backend

```bash
# Останови текущий backend (Ctrl+C)
cd backend
npm run dev
```

Должен увидеть:
```
🚀 Backend API запущен на http://localhost:3000
✅ Reminder scheduler started (runs every minute)
```

---

## 🧪 ТЕСТИРОВАНИЕ

### 1. Проверить генерацию токена

```bash
curl -X POST http://localhost:3000/api/telegram/generate-token \
  -H "Content-Type: application/json" \
  -d '{"userId":"YOUR_USER_ID"}'
```

Ответ:
```json
{
  "success": true,
  "token": "abc-123-def",
  "deepLink": "https://t.me/onaimentor_bot?start=abc-123-def"
}
```

### 2. Подключить Telegram через интерфейс

1. Открой **http://localhost:8080/neurohub**
2. Нажми **"Канбан"**
3. Создай новую задачу
4. Поставь галочку **"📱 Telegram напоминание"**
5. Откроется Telegram → нажми **START**

### 3. Проверить подключение в БД

```sql
SELECT 
  id, 
  email, 
  telegram_user_id, 
  telegram_chat_id, 
  telegram_connected,
  telegram_connected_at
FROM users 
WHERE telegram_connected = true;
```

### 4. Протестировать напоминания

**Создай задачу с дедлайном через 5 минут:**
1. Открой Kanban
2. Создай задачу
3. Установи дату/время через 5-10 минут
4. Включи **"📱 Telegram напоминание"**
5. Сохрани

**Через 5 минут бот пришлёт:**
```
⚡ Напоминание о задаче!

👤 Александр
📋 Тестовая задача

⏰ Осталось 5 минут
📅 Дедлайн: 24 ноября в 18:30

💪 Самое время завершить задачу!
```

---

## 📱 TELEGRAM КОМАНДЫ

Пользователь может использовать в боте:

- `/start TOKEN` - Подключить Telegram (автоматически из deep link)
- `/disconnect` - Отключить уведомления
- `/help` - Справка

---

## 🐛 TROUBLESHOOTING

### Проблема: "Bot blocked by user (403)"

**Решение:**  
Пользователь заблокировал бота. Scheduler автоматически отключит его в БД (`telegram_connected = false`). Пользователь должен снова подключиться через интерфейс.

### Проблема: "Webhook не работает"

**Проверь:**
1. ngrok запущен и URL правильный
2. Webhook установлен через Telegram API
3. Backend запущен на порту 3000

```bash
# Проверить webhook
curl "https://api.telegram.org/botYOUR_TOKEN/getWebhookInfo"
```

### Проблема: "Токен не генерируется"

**Проверь:**
1. Миграция выполнена (`telegram_verification_token` column exists)
2. Backend logs показывают запрос
3. userId существует в БД

```bash
# Логи backend покажут:
✅ Generated verification token for user abc-123: xyz-789
```

### Проблема: "Scheduler не отправляет напоминания"

**Проверь:**
1. Scheduler запущен (лог при старте backend)
2. Задача имеет `due_date` в будущем (within next 60 min)
3. `telegram_reminder = true`
4. `status != 'done'`
5. User `telegram_connected = true`

```bash
# Логи scheduler (каждую минуту):
🔔 [Scheduler] Checking for task reminders...
📋 [Scheduler] Found 2 tasks to check
📨 [Scheduler] Sending reminder for task abc-123 to Александр
✅ [Scheduler] Reminder sent to chat 123456789
```

---

## 🎯 ЧТО ДАЛЬШЕ

### Готово ✅
- [x] Telegram webhook + deep linking
- [x] Сохранение telegram_user_id в БД
- [x] Scheduler напоминаний (node-cron)
- [x] Статус подключения
- [x] Обработка блокировки бота (403)

### TODO (Необязательно)
- [ ] Tooltip инструкция для Telegram кнопки
- [ ] Настройка времени напоминания (15/30/60 мин)
- [ ] Telegram Mini App для просмотра задач
- [ ] Voice reminders через Telegram
- [ ] Inline keyboard для быстрых действий

---

## 📚 ПОЛЕЗНЫЕ ССЫЛКИ

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [node-telegram-bot-api Docs](https://github.com/yagop/node-telegram-bot-api)
- [node-cron Guide](https://www.npmjs.com/package/node-cron)
- [ngrok Docs](https://ngrok.com/docs)
- [Perplexity Prompt](./PERPLEXITY_PROMPT_TELEGRAM_KANBAN.md)

---

**🚀 ВСЁ ГОТОВО К ЗАПУСКУ!** Следуй инструкциям выше шаг за шагом.




