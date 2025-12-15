# 🧪 ТЕСТИРОВАНИЕ SENTRY ЛОГОВ

## ✅ ЧТО ДОБАВЛЕНО:

1. ✅ `consoleIntegration()` - отправляет console.log/warn/error в Sentry
2. ✅ `enableLogs: true` - включает отправку логов

---

## 🧪 КАК ПРОТЕСТИРОВАТЬ:

### **1️⃣ Перезапусти dev сервер:**

```bash
# В терминале:
Ctrl+C
npm run dev
```

---

### **2️⃣ Открой браузер и консоль:**

```
1. Открой http://localhost:5173
2. Нажми F12 → Console
3. Напиши в консоли:
```

```javascript
// Тест 1: Обычный лог
console.log('🧪 Test Sentry Log', { user: 'test', action: 'test_log' });

// Тест 2: Warning
console.warn('⚠️ Test Sentry Warning');

// Тест 3: Error
console.error('❌ Test Sentry Error');
```

---

### **3️⃣ ИЛИ используй Sentry.logger (рекомендуется):**

```javascript
import * as Sentry from "@sentry/react";

// Тест 1: Info лог
Sentry.logger.info('User triggered test log', { 
  log_source: 'sentry_test',
  timestamp: new Date().toISOString()
});

// Тест 2: Warning
Sentry.logger.warn('Test warning from Sentry.logger', {
  severity: 'medium'
});

// Тест 3: Error
Sentry.logger.error('Test error from Sentry.logger', {
  error_type: 'test'
});
```

---

### **4️⃣ Проверь в Sentry Dashboard:**

```
1. Зайди на https://sentry.io
2. Перейди в свой проект
3. Обнови страницу (F5)
4. Должны появиться логи через 5-10 секунд
```

**Где смотреть:**
- **Issues** → увидишь ошибки (console.error, Sentry.logger.error)
- **Performance** → увидишь производительность
- **Logs** (если есть вкладка) → увидишь все логи

---

## 📊 ЧТО БУДЕТ В SENTRY:

### **Console.log → Breadcrumbs:**
```
Console: 🧪 Test Sentry Log
Data: {user: "test", action: "test_log"}
Level: info
```

### **Console.warn → Warning Issue:**
```
⚠️ Test Sentry Warning
Level: warning
```

### **Console.error → Error Issue:**
```
❌ Test Sentry Error
Level: error
Fingerprint: [...]
```

### **Sentry.logger.info → Log Entry:**
```
User triggered test log
Data: {log_source: "sentry_test", timestamp: "2025-12-14T..."}
```

---

## 🎯 ПОЛНЫЙ ТЕСТ В КОДЕ:

Добавь временно в любой компонент (например, `App.tsx`):

```typescript
import * as Sentry from "@sentry/react";
import { useEffect } from "react";

function TestSentryLogs() {
  useEffect(() => {
    // Подожди 2 секунды после загрузки
    setTimeout(() => {
      console.log('🧪 [TEST] Sentry console.log test');
      console.warn('⚠️ [TEST] Sentry console.warn test');
      console.error('❌ [TEST] Sentry console.error test');
      
      Sentry.logger.info('✅ [TEST] Sentry.logger.info test', {
        test_type: 'automated',
        browser: navigator.userAgent,
      });
      
      Sentry.logger.warn('⚠️ [TEST] Sentry.logger.warn test');
      Sentry.logger.error('❌ [TEST] Sentry.logger.error test');
    }, 2000);
  }, []);
  
  return null;
}

// В App.tsx добавь:
<TestSentryLogs />
```

---

## ✅ ПРОВЕРКА ЧТО РАБОТАЕТ:

### **1. Локально (консоль браузера):**
```
✅ Sentry initialized for frontend monitoring
🧪 [TEST] Sentry console.log test
⚠️ [TEST] Sentry console.warn test
❌ [TEST] Sentry console.error test
```

### **2. В Sentry Dashboard:**

**После 5-10 секунд должны появиться:**
- ✅ 3 новые Issue (warning + 2 errors)
- ✅ 6 breadcrumbs (все логи)
- ✅ Session Replay (если была ошибка)

---

## 🎉 ИТОГ:

- ✅ `consoleIntegration()` - отправляет console.log в Sentry
- ✅ `enableLogs: true` - включает логи
- ✅ Можно использовать `Sentry.logger.info()`, `Sentry.logger.warn()`, `Sentry.logger.error()`
- ✅ Все логи появляются в Sentry Dashboard

**ВСЁ ГОТОВО ДЛЯ ТЕСТИРОВАНИЯ!** 🚀
