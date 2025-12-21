# 🚨 Telegram Alerts - Production Setup Complete

## ✅ Status: АКТИВНО

### 📋 Что было настроено:

**File:** `/var/www/onai-integrator-login-main/backend/env.env`

```env
# 🚨 TELEGRAM ALERTS (Admin notifications)
TELEGRAM_BOT_TOKEN=8275130868:AAGiH466WmyoUQUKN4VfwI3nM1qZAmlUJOQ
TELEGRAM_ADMIN_CHAT_ID=789638302
```

**Bot:** @onaimentor_bot (тот же, что для лидов)  
**Chat ID:** 789638302 (твой личный Telegram)  
**Backend:** Restarted with new env vars

---

## 🎯 Как работает:

### Триггеры:
1. **CRITICAL событие** → Redis queue fail → Telegram alert
2. **SWITCH событие** → Admin changes mode → Telegram alert

### Примеры сообщений:

**CRITICAL:**
```
🚨 SYSTEM ALERT

Type: CRITICAL
Message: Redis queue failed! Auto-fallback to sync mode for user@example.com
Time: 2025-12-21T14:30:00Z

Details:
```json
{
  "error": "Connection refused",
  "email": "user@example.com",
  "stack": "..."
}
```
```

**SWITCH:**
```
🔄 SYSTEM ALERT

Type: SWITCH
Message: System mode changed to: sync_direct
Time: 2025-12-21T14:30:00Z

Details:
```json
{
  "changed_by": "admin@onai.academy",
  "previous_mode": "async_queue"
}
```
```

---

## 🧪 Testing:

### Manual test (optional):
```bash
ssh root@onai.academy
cd /var/www/onai-integrator-login-main/backend
node -e "
const fetch = require('node-fetch');
fetch('https://api.telegram.org/bot8275130868:AAGiH466WmyoUQUKN4VfwI3nM1qZAmlUJOQ/sendMessage', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    chat_id: '789638302',
    text: '✅ Test: Telegram alerts are working!'
  })
}).then(r => r.json()).then(console.log);
"
```

---

## ✅ Production Ready:

**Features active:**
- ✅ Debug Panel (https://onai.academy/admin/debug)
- ✅ Operation Logger ("Policeman")
- ✅ Queue Architecture (Redis + BullMQ)
- ✅ Config Caching (60s TTL)
- ✅ Idempotency (3 layers)
- ✅ **Telegram Alerts (CRITICAL/SWITCH)**

**Next trigger:**
- Если Redis упадет → Telegram alert придет автоматически
- Если админ переключит режим → Telegram alert

---

**Deployed:** December 21, 2025, 13:51 UTC+5  
**Status:** 🚀 ALL SYSTEMS OPERATIONAL
