# 🔐 Production Environment Variables - UPDATE

**Date:** 2025-12-22  
**Action:** Add these variables to production `env.env`

---

## 🆕 NEW VARIABLES TO ADD

```bash
# ============================================
# 🤖 TELEGRAM DEBUGGER BOT (@oapdbugger_bot)
# ============================================
# ⚠️ ГЛАВНЫЙ БОТ ДЛЯ ВСЕХ ОШИБОК ПЛАТФОРМЫ!
# Отправляет отчёты напрямую в личку saint4ai
# + Умные GROQ отчёты каждый день в 23:00
TELEGRAM_ANALYTICS_BOT_TOKEN=8206369316:AAGX278b_TMrWSxjy6hJOzo2DacElC84HK8
TELEGRAM_ANALYTICS_CHAT_ID=789638302

# ============================================
# 📊 TRAFFIC ANALYTICS BOT (@analisistonaitrafic_bot)
# ============================================
# Для группы "Аналитика систем трафика" (Traffic Dashboard мониторинг)
TELEGRAM_TRAFFIC_ANALYTICS_BOT_TOKEN=8439289933:AAH5eED6m0HOK1ZEUGRO1MYCF93srAfjEF4
TELEGRAM_TRAFFIC_ANALYTICS_CHAT_ID=-1002480099602

# ============================================
# 🐛 GROQ DEBUGGER API KEY
# ============================================
# Для генерации умных отчётов об ошибках
GROQ_DEBUGGER_API_KEY=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
```

---

## 📝 HOW TO UPDATE ON PRODUCTION

### Step 1: SSH to server
```bash
ssh root@207.154.231.30
```

### Step 2: Edit env.env
```bash
cd /var/www/onai-integrator-login-main/backend
nano env.env

# Add the variables above (copy-paste)
# Save: Ctrl+O, Enter, Ctrl+X
```

### Step 3: Restart backend
```bash
pm2 restart onai-backend
pm2 logs onai-backend --lines 50
```

### Step 4: Verify schedulers
```bash
# Check logs for:
# ✅ Daily Debug Report: 23:00 Almaty (17:00 UTC)
```

---

## ✅ WHAT THESE BOTS DO

### @oapdbugger_bot (Main):
```
✅ Receives ALL platform errors
✅ Frontend errors (via ErrorBoundary button)
✅ Backend errors (CRITICAL + HIGH automatically)
✅ Daily GROQ reports at 23:00 Almaty
✅ Sends to: saint4ai (789638302)
```

### @analisistonaitrafic_bot (Traffic):
```
✅ Traffic Dashboard specific monitoring
✅ Group: "Аналитика систем трафика"
✅ Chat ID: -1002480099602
✅ Reserved for future Traffic-specific alerts
```

---

## 🕐 SCHEDULED JOBS

After adding these variables, backend will run:

```
✅ 08:00 Almaty - Exchange Rate Fetch
✅ 08:05 Almaty - Daily Traffic Report
✅ Monday 08:10 - Weekly Traffic Report
✅ 23:00 Almaty - Daily Debug Report (GROQ AI) 🆕
```

---

## 🧪 TESTING ON PRODUCTION

After deployment, test:

```bash
# Test error report endpoint
curl -X POST https://api.onai.academy/api/error-reports/test

# Check PM2 logs
ssh root@207.154.231.30 "pm2 logs onai-backend | grep 'Debug Report'"

# Verify in Telegram
# Check @oapdbugger_bot for test message
```

---

## ⚠️ SECURITY NOTES

**IMPORTANT:** Never commit these tokens to Git!

- ✅ Already in `.gitignore`: `env.env`
- ✅ GitHub push protection: Enabled
- ✅ Server-side only: Yes

---

**Ready for production deployment!** 🚀
