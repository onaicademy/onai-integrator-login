# 🛡️ CRASH PROTECTION & DEBUG SYSTEM

## 📦 ЧТО ДОБАВЛЕНО:

### 1️⃣ **Error Tracking Service**
- **Файл:** `src/services/errorTrackingService.ts`
- **Функция:** Централизованное логирование ошибок с сохранением в БД
- **Категории:** AmoCRM, Telegram, Database, Queue, API, Validation, Network, Auth
- **Уровни:** Low, Medium, High, Critical

### 2️⃣ **Crash Protection System**
- **Файл:** `src/utils/crashProtection.ts`
- **Функция:** Защита от unexpected crashes + graceful shutdown
- **Обработка:**
  - ✅ Uncaught exceptions
  - ✅ Unhandled promise rejections
  - ✅ SIGTERM/SIGINT signals
  - ✅ Graceful shutdown (wait for active requests)

### 3️⃣ **Debug Dashboard API**
- **Файл:** `src/routes/debug.ts`
- **Endpoints:**
  - `GET /api/debug/health` - Extended health check
  - `GET /api/debug/errors` - Recent errors
  - `GET /api/debug/errors/stats` - Error statistics
  - `POST /api/debug/errors/:id/resolve` - Resolve error
  - `GET /api/debug/queue` - BullMQ queue stats
  - `GET /api/debug/memory` - Memory usage

### 4️⃣ **Database Table**
- **Таблица:** `error_logs` (в Landing BD Supabase)
- **Поля:** severity, category, message, stack, context, timestamp, resolved

### 5️⃣ **Frontend Debug Dashboard**
- **Файл:** `src/pages/admin/DebugDashboard.tsx`
- **URL:** `https://onai.academy/admin/debug`
- **Features:**
  - Real-time system monitoring
  - Error logs table
  - Error statistics
  - Auto-refresh (5s)

---

## 🚀 DEPLOYMENT ИНСТРУКЦИЯ:

### **Шаг 1: Commit & Push новые файлы**

```bash
cd /Users/miso/onai-integrator-login

# Add all new files
git add backend/src/services/errorTrackingService.ts
git add backend/src/utils/crashProtection.ts
git add backend/src/routes/debug.ts
git add src/pages/admin/DebugDashboard.tsx

# Commit
git commit -m "feat: add crash protection & debug system with error tracking"

# Push to GitHub
git push origin main
```

### **Шаг 2: Apply patch to server-minimal.ts**

**НА СЕРВЕРЕ (SSH):**

```bash
ssh root@207.154.231.30
cd /var/www/onai-integrator-login-main

# Pull latest changes
git pull origin main

# Manually apply CRASH_PROTECTION_PATCH.md changes to server-minimal.ts
nano backend/src/server-minimal.ts
```

### **Шаг 3: Install dependencies (if needed)**

```bash
cd backend
npm install
```

### **Шаг 4: Build & Restart**

```bash
cd backend
npm run build
pm2 restart onai-backend
pm2 logs onai-backend --lines 30
```

### **Шаг 5: Verify**

```bash
# Check health
curl https://api.onai.academy/api/debug/health | jq

# Check errors
curl https://api.onai.academy/api/debug/errors | jq

# Check queue
curl https://api.onai.academy/api/debug/queue | jq
```

---

## 🔍 USAGE EXAMPLES:

### **Backend: Track error manually**

```typescript
import { errorTracking, ErrorSeverity, ErrorCategory } from '@/services/errorTrackingService';

try {
  // Your code here
} catch (error) {
  await errorTracking.trackError(
    error,
    ErrorSeverity.HIGH,
    ErrorCategory.AMOCRM,
    {
      leadId: '123',
      syncId: 'abc',
      metadata: { customInfo: 'value' }
    }
  );
  throw error;
}
```

### **Backend: Wrap route with crash protection**

```typescript
import { crashProtection } from '@/utils/crashProtection';

router.post('/submit', crashProtection.wrapRoute(async (req, res) => {
  // Your code here - automatically catches errors
}));
```

### **Frontend: Access debug dashboard**

```
https://onai.academy/admin/debug
```

---

## 📊 МОНИТОРИНГ:

### **1. Через API (curl)**

```bash
# System health
curl https://api.onai.academy/api/debug/health | jq

# Recent errors (last 50)
curl https://api.onai.academy/api/debug/errors?limit=50 | jq

# Error stats (last 24h)
curl https://api.onai.academy/api/debug/errors/stats?hours=24 | jq

# Queue statistics
curl https://api.onai.academy/api/debug/queue | jq

# Memory usage
curl https://api.onai.academy/api/debug/memory | jq
```

### **2. Через Frontend Dashboard**

```
https://onai.academy/admin/debug
```

### **3. Через PM2 Logs**

```bash
pm2 logs onai-backend --lines 100 | grep -E 'ERROR|CRITICAL|FATAL'
```

---

## 🔴 CRASH SCENARIOS & PROTECTION:

| Scenario | Protection | Recovery |
|----------|-----------|----------|
| **Uncaught Exception** | ✅ Logged to DB → Exit(1) → PM2 auto-restart | Auto-restart |
| **Unhandled Promise** | ✅ Logged to DB → Continue | No restart |
| **AmoCRM Timeout** | ✅ Logged → Retry 3x → Failed queue | Manual review |
| **Redis Disconnect** | ✅ Logged → Graceful degradation | Auto-reconnect |
| **Database Error** | ✅ Logged → Return 500 → Continue | No restart |
| **SIGTERM/SIGINT** | ✅ Graceful shutdown (wait 30s) | Clean exit |
| **Memory Leak** | ⚠️ PM2 monitoring + alerts | PM2 restart on limit |

---

## 🎯 BEST PRACTICES:

1. **Always wrap async operations:**
   ```typescript
   const safeFn = errorTracking.wrapAsync(myAsyncFn, ErrorCategory.API, ErrorSeverity.MEDIUM);
   ```

2. **Use appropriate severity levels:**
   - `LOW`: Warnings, non-critical
   - `MEDIUM`: Expected errors (validation, 404)
   - `HIGH`: Unexpected errors (API failures, timeouts)
   - `CRITICAL`: System failures (DB down, Redis down)

3. **Include context in errors:**
   ```typescript
   await errorTracking.trackError(error, severity, category, {
     leadId: lead.id,
     userId: user.id,
     metadata: { action: 'sync', attempt: 3 }
   });
   ```

4. **Monitor debug dashboard regularly:**
   - Check daily for new errors
   - Resolve known errors
   - Analyze error patterns

5. **Set up alerts (optional):**
   - Create cron job to check critical errors
   - Send Telegram notifications
   - Email alerts for high/critical errors

---

## ✅ ГОТОВО!

Система защиты от крашей и debug dashboard готовы к production использованию! 🚀

