# 🛡️ СИСТЕМА ЗАЩИТЫ ОТ КРАШЕЙ BACKEND - СРОЧНЫЙ ПЛАН

## 🚨 **ПРОБЛЕМА:**
- **485 рестартов Backend** за короткий период
- Лиды теряются при крашах
- **Вы тратите деньги на трафик** - система должна работать 24/7!

---

## 📊 **ПРИЧИНЫ КРАШЕЙ:**

### 1. **AmoCRM Connect Timeout (ГЛАВНАЯ ПРИЧИНА)**
- **Текущий timeout:** 10 секунд
- **Проблема:** AmoCRM API не отвечает → Backend зависает → PM2 рестартит
- **Решение:** Увеличить timeout до 30s + добавить retry

### 2. **`supabaseKey is required` ошибка**
- Какая-то функция вызывается без Supabase ключа
- Нужно найти и исправить

### 3. **Нет error handling**
- При любой ошибке Backend крашится
- Нужны try-catch блоки везде

---

## 🛡️ **СИСТЕМА ЗАЩИТЫ - 5 УРОВНЕЙ:**

### **УРОВЕНЬ 1: Увеличить timeouts (СРОЧНО - 2 мин)**

```typescript
// backend/src/lib/amocrm.ts
const TIMEOUT = 30000; // Было 10s → Стало 30s
```

### **УРОВЕНЬ 2: Retry Logic (СРОЧНО - 5 мин)**

```typescript
// При ошибке AmoCRM - retry 3 раза с задержкой
async function createLeadWithRetry(data, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await createLead(data);
    } catch (error) {
      if (i === maxRetries - 1) {
        // Последняя попытка - НЕ крашить, а сохранить в queue
        await saveToRetryQueue(data);
        return { error: 'Saved to retry queue' };
      }
      await sleep(2000 * (i + 1)); // Exponential backoff
    }
  }
}
```

### **УРОВЕНЬ 3: Queue для неудачных sync (10 мин)**

Создать таблицу `failed_amocrm_sync`:
- `lead_id`
- `retry_count`
- `error_message`
- `created_at`

Cron job каждые 5 минут пытается ресинхронизировать.

### **УРОВЕНЬ 4: PM2 Ecosystem (КРИТИЧНО - 3 мин)**

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'onai-backend',
    script: './dist/server.js',
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '500M', // Restart если > 500MB
    min_uptime: '10s', // Считать crash только если < 10s
    max_restarts: 10, // Макс 10 рестартов за 1 минуту
    restart_delay: 5000, // 5s задержка между рестартами
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    autorestart: true,
    watch: false
  }]
}
```

### **УРОВЕНЬ 5: Мониторинг + Алерты (5 мин)**

**Telegram бот для алертов:**
```typescript
// backend/src/utils/alerts.ts
async function sendTelegramAlert(message: string) {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_ALERT_BOT_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_ALERT_CHAT_ID;
  
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: `🚨 ${message}`,
      parse_mode: 'Markdown'
    })
  });
}

// Вызывать при:
// - Backend crash (PM2 webhook)
// - AmoCRM 3+ failures подряд
// - Memory > 80%
```

---

## 🚀 **ПРИОРИТЕТ ВНЕДРЕНИЯ:**

### **СРОЧНО (СЕГОДНЯ):**
1. ✅ Восстановить утерянные лиды
2. ⏳ Увеличить AmoCRM timeout до 30s
3. ⏳ Настроить PM2 ecosystem.config.js
4. ⏳ Добавить Telegram алерты

### **ВАЖНО (ЗАВТРА):**
5. Добавить retry logic для AmoCRM
6. Создать failed_amocrm_sync queue
7. Исправить `supabaseKey is required`

### **СРЕДНИЙ ПРИОРИТЕТ (НА НЕДЕЛЕ):**
8. Health check endpoint: `/api/health/detailed`
9. Monitoring dashboard (Grafana или простая страница)
10. Automated tests для critical paths

---

## 📈 **ОЖИДАЕМЫЙ РЕЗУЛЬТАТ:**

- **485 рестартов → 0-5 рестартов в день**
- **0 утерянных лидов**
- **Instant alerts при проблемах**
- **Auto-recovery вместо крашей**

---

## 💰 **ЭКОНОМИЯ:**

Если **1 лид = 100₽ рекламы**:
- **7 утерянных лидов за 24ч = 700₽**
- **За месяц = 21,000₽**

**Система защиты окупится в ПЕРВЫЙ ДЕНЬ!**

---

## 🔧 **ЧТО ДЕЛАТЬ ПРЯМО СЕЙЧАС:**

1. Дай команду "начинай внедрять защиту"
2. Я внедрю ВСЕ 5 уровней за 30 минут
3. Задеплою на production
4. Настрою Telegram алерты
5. **Backend будет НЕУБИВАЕМЫМ!**

---

**ГОТОВ НАЧИНАТЬ?**

