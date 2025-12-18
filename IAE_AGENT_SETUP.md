# 🤖 IAE Agent - Setup Guide

Intelligence Analytics Engine - система автоматического мониторинга и проверки аналитики трафика

---

## 📋 Быстрый старт

### 1. Database Setup

Примен SQL схему к Supabase Tripwire:

```bash
# Подключись к Supabase Tripwire Dashboard
# https://supabase.com/dashboard/project/pjmvxecykysfrzppdcto

# Выполни SQL из файла:
backend/database/iae_agent_reports.sql
```

### 2. Environment Variables

Добавь в `.env`:

```bash
# IAE Agent Telegram Bot
IAE_BOT_TOKEN=8439289933:AAH5eED6m0HOK1ZEUGRO1MYCF93srAfjEF4
```

### 3. Backend Deploy

```bash
# 1. SSH в сервер
ssh root@207.154.231.30

# 2. Перейди в директорию backend
cd /var/www/onai.academy-backend

# 3. Pull latest changes
git pull origin main

# 4. Install dependencies (если нужно)
npm install

# 5. Restart PM2
pm2 restart onai-backend

# 6. Check logs
pm2 logs onai-backend --lines 100
```

### 4. Telegram Bot Activation

```
1. Добавь бота в группу: @IAEAgentBot
2. Отправь код активации: 2134
3. Бот подтвердит активацию
```

---

## 🎯 Архитектура

### Components:

1. **Data Collector** - Собирает данные из AmoCRM, Facebook Ads, Database
2. **Data Validator** - Проверяет корректность, находит аномалии
3. **Groq AI Analyzer** - Анализирует состояние, дает рекомендации
4. **Report Generator** - Генерирует читаемые отчеты
5. **Telegram Bot** - Отправляет отчеты в группу
6. **Schedulers** - Cron jobs для автоматических отчетов

### Data Flow:

```
Sources (AmoCRM, FB Ads, DB)
  ↓
Data Collector
  ↓
Validator (проверка + аномалии)
  ↓
Groq AI Analyzer (insights + recommendations)
  ↓
Report Generator
  ↓
Telegram Bot / Admin Dashboard
```

---

## ⏰ Расписание отчетов

| Время | Тип | Описание |
|-------|-----|----------|
| **10:00** | Daily | Отчет за вчерашний день |
| **16:00** | Current | Текущий статус сегодня |
| **1-го числа 10:00** | Monthly | Отчет за прошедший месяц |
| **Каждый час** | Health Check | Только при обнаружении проблем |

---

## 📊 API Endpoints

### POST `/api/iae-agent/trigger`
Ручная проверка (кнопка Синхронизация)

**Request:**
```json
{
  "sendToTelegram": true
}
```

**Response:**
```json
{
  "success": true,
  "status": "success",
  "healthScore": 95,
  "issues": [],
  "anomalies": [],
  "recommendations": ["..."],
  "metrics": {
    "spend": 1276.00,
    "revenue": 90000,
    "sales": 18,
    "roas": 0.14
  }
}
```

### GET `/api/iae-agent/reports`
История отчетов

**Query params:**
- `limit` (default: 50)
- `type` (daily|current|monthly|health_check|manual)

### GET `/api/iae-agent/health`
Последний health check

### GET `/api/iae-agent/stats`
Статистика за период

**Query params:**
- `days` (default: 7)

---

## 🧪 Testing

### Ручной тест:

```bash
# 1. Curl к API
curl -X POST http://localhost:3000/api/iae-agent/trigger \
  -H "Content-Type: application/json" \
  -d '{"sendToTelegram":true}'

# 2. Проверь логи
pm2 logs onai-backend | grep IAE

# 3. Проверь Telegram группу
# Должно прийти сообщение с отчетом
```

### Health Check:

```bash
curl http://localhost:3000/api/iae-agent/health
```

---

## 🔍 Monitoring

### Проверка статуса IAE Agent:

```bash
# Логи PM2
pm2 logs onai-backend | grep IAE

# Проверка активных чатов Telegram
cat /var/www/onai.academy-backend/data/iae-active-chats.json

# Проверка отчетов в БД (Supabase)
# SELECT * FROM iae_agent_reports ORDER BY created_at DESC LIMIT 10;
```

### Типичные проблемы:

#### 1. Telegram бот не отправляет сообщения
```bash
# Проверь токен
echo $IAE_BOT_TOKEN

# Проверь active chats
cat data/iae-active-chats.json

# Restart backend
pm2 restart onai-backend
```

#### 2. Groq AI не отвечает
```bash
# Проверь API key
echo $GROQ_API_KEY

# Проверь логи ошибок
pm2 logs --err | grep Groq
```

#### 3. AmoCRM/Facebook токены истекли
```bash
# Обнови токены в .env
nano .env

# Restart
pm2 restart onai-backend
```

---

## 📝 Логи

### Важные логи IAE Agent:

```
🤖 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 [IAE] Starting daily analysis (yesterday)
🤖 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 [IAE] Date range: 2024-12-17 to 2024-12-17
📦 [IAE] Data collected from 3 sources
✅ [IAE] Validation complete. Healthy: true
   Issues: 0, Anomalies: 0
📊 [IAE] Metrics: $1276 spend, ₸90000 revenue, 18 sales
🤖 [IAE] AI Analysis: Health Score 95/100
💾 [IAE] Report saved: abc123...
📤 [IAE Bot] Sending report to 3 chats...
✅ [IAE Bot] Report sent to chat 123456, message 789
✅ [IAE 10:00] Отчет за вчера отправлен в 3 чатов
   Health Score: 95/100
   Status: ✅ Healthy
```

---

## 🎨 Frontend Integration

### Кнопка Синхронизации (TrafficCommandDashboard):

```tsx
const handleSync = async () => {
  setIsSyncing(true);
  
  // 1. IAE Agent check
  const iaeCheck = await axios.post('/api/iae-agent/trigger');
  
  // 2. Show result
  if (iaeCheck.data.healthScore < 70) {
    toast.warning(`IAE: Health ${iaeCheck.data.healthScore}/100`);
  } else {
    toast.success('IAE: Всё в порядке ✅');
  }
  
  // 3. Refresh data
  await refetch();
  setIsSyncing(false);
};
```

---

## 🔧 Maintenance

### Очистка старых отчетов (optional):

```sql
-- Удалить отчеты старше 3 месяцев
DELETE FROM iae_agent_reports
WHERE created_at < NOW() - INTERVAL '3 months'
  AND report_type = 'health_check';
```

### Backup active chats:

```bash
cp data/iae-active-chats.json data/iae-active-chats.backup.json
```

---

## 📞 Support

Если возникли проблемы:

1. Проверь логи: `pm2 logs onai-backend | grep IAE`
2. Проверь env переменные: `IAE_BOT_TOKEN`, `GROQ_API_KEY`
3. Проверь database connection: Supabase Tripwire
4. Restart: `pm2 restart onai-backend`

---

**🤖 IAE Agent v1.0 - Powered by Groq AI**
