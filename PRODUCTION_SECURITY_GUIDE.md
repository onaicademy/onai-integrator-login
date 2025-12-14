# 🔒 PRODUCTION SECURITY GUIDE

## ⚠️ КРИТИЧЕСКИЕ ПРАВИЛА БЕЗОПАСНОСТИ

### 🚨 ПЕРЕД КАЖДЫМ ДЕПЛОЕМ НА PRODUCTION:

---

## 1️⃣ УДАЛЕНИЕ DEBUG ЛОГОВ

### ❌ **ЗАПРЕЩЕНО на Production:**

```typescript
// ❌ НЕ ДОЛЖНО БЫТЬ в production коде:
console.log('🔑 JWT token:', token);
console.log('👤 User ID:', userId);
console.log('📧 Email:', email);
console.log('🔐 Password:', password);
console.debug('Internal logic:', data);
console.info('User metadata:', userData);
```

### ✅ **РАЗРЕШЕНО:**

```typescript
// ✅ Только для критических ошибок:
console.error('❌ Critical error:', error.message);
console.warn('⚠️ Warning:', warningMessage);
```

---

## 2️⃣ FRONTEND PRODUCTION BUILD

### **Автоматическое удаление логов:**

**File:** `vite.config.ts`

```typescript
export default defineConfig({
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,        // Удаляет console.log
        drop_debugger: true,       // Удаляет debugger
        pure_funcs: ['console.info', 'console.debug', 'console.trace']
      }
    }
  }
});
```

### **Команды сборки:**

```bash
# Development (с логами)
npm run dev

# Production (БЕЗ логов)
npm run build
npm run preview  # Тестируем production build локально
```

---

## 3️⃣ BACKEND PRODUCTION LOGGING

### **Использовать Logger вместо console.log:**

**File:** `backend/src/utils/logger.ts`

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'error' : 'debug',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' })
  ]
});

export default logger;
```

### **Замена console.log на logger:**

```typescript
// ❌ СТАРЫЙ КОД:
console.log('🔑 JWT token:', token);
console.log('👤 User created:', userId);

// ✅ НОВЫЙ КОД:
logger.debug('JWT token received'); // БЕЗ токена!
logger.info('User created', { userId }); // Только в dev
logger.error('Auth failed', { error: err.message }); // Только ошибка
```

---

## 4️⃣ ENVIRONMENT VARIABLES

### **НИКОГДА не коммитить:**

```bash
# ❌ ЗАПРЕЩЕНО:
.env
.env.local
.env.production

# ✅ Коммитить только:
.env.example  # Пример без реальных ключей
```

### **Пример `.env.example`:**

```bash
# Supabase Main Platform
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Supabase Tripwire
VITE_TRIPWIRE_SUPABASE_URL=https://your-tripwire-project.supabase.co
VITE_TRIPWIRE_SUPABASE_ANON_KEY=your_tripwire_anon_key_here

# Backend
TRIPWIRE_SERVICE_ROLE_KEY=your_service_role_key_here
```

---

## 5️⃣ ЧЕКЛИСТ ПЕРЕД ДЕПЛОЕМ

### ✅ **Обязательные проверки:**

- [ ] Frontend build создан через `npm run build`
- [ ] Backend `NODE_ENV=production`
- [ ] Все `console.log` удалены (автоматически через terser)
- [ ] Logger настроен на `level: 'error'` в production
- [ ] `.env` не закоммичен в Git
- [ ] Secrets добавлены в Vercel/Railway/PM2 ecosystem
- [ ] CORS настроен только на production домены
- [ ] Rate limiting включен
- [ ] HTTPS обязателен
- [ ] CSP headers настроены

---

## 6️⃣ ПРОВЕРКА PRODUCTION BUILD

### **Frontend:**

```bash
# 1. Собираем production build
npm run build

# 2. Тестируем локально
npm run preview

# 3. Проверяем что нет логов в консоли браузера
# Открываем DevTools → Console → должна быть пустая
```

### **Backend:**

```bash
# 1. Устанавливаем NODE_ENV
export NODE_ENV=production

# 2. Запускаем
npm start

# 3. Проверяем логи - только errors, без debug
```

---

## 7️⃣ МОНИТОРИНГ PRODUCTION

### **Что логировать:**

✅ **Разрешено:**
- Критические ошибки (500 errors)
- Failed authentication attempts (без паролей!)
- Database connection failures
- API rate limit violations

❌ **ЗАПРЕЩЕНО:**
- User emails
- Passwords (даже хэши!)
- JWT tokens
- API keys
- Internal IDs

---

## 8️⃣ SECURITY HEADERS

### **Добавить в `vercel.json` / nginx:**

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains"
        }
      ]
    }
  ]
}
```

---

## 9️⃣ GIT HOOKS (Pre-commit)

### **Установка:**

```bash
npm install --save-dev husky lint-staged
npx husky init
```

### **`.husky/pre-commit`:**

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Проверяем что нет console.log в staging
if git diff --cached --name-only | grep -E '\.(ts|tsx|js|jsx)$' | xargs grep -n "console\.log"; then
  echo "❌ ОШИБКА: Найдены console.log в коде!"
  echo "Удалите их перед коммитом или используйте logger."
  exit 1
fi

# Проверяем что нет .env файлов
if git diff --cached --name-only | grep -E '\.env$'; then
  echo "❌ ОШИБКА: Попытка закоммитить .env файл!"
  echo ".env файлы не должны быть в Git!"
  exit 1
fi

echo "✅ Pre-commit проверки пройдены"
```

---

## 🔟 INCIDENT RESPONSE

### **Если credentials утекли:**

1. ⚡ **НЕМЕДЛЕННО:**
   - Rotate все API keys
   - Сбросить все JWT токены (force logout всех пользователей)
   - Изменить Database passwords

2. 📧 **Уведомить:**
   - Security team
   - Пользователей (если их данные затронуты)

3. 🔍 **Анализ:**
   - Проверить логи на подозрительную активность
   - Найти источник утечки
   - Закрыть уязвимость

---

## 📚 ДОПОЛНИТЕЛЬНЫЕ РЕСУРСЫ

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/security)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

---

## 🎯 TL;DR - БЫСТРЫЙ ЧЕКЛИСТ

```bash
# 1. Production build
npm run build

# 2. Проверка (консоль должна быть пустая)
npm run preview

# 3. Deploy
vercel --prod
# или
git push origin main

# 4. Verify
# - Открыть DevTools
# - Консоль пустая? ✅
# - Network tab не показывает tokens? ✅
# - Logs только errors? ✅
```

---

**СОЗДАНО:** 2025-12-07  
**ВЕРСИЯ:** 1.0  
**АВТОР:** AI Assistant  
**СТАТУС:** 🔒 ОБЯЗАТЕЛЬНО К ПРИМЕНЕНИЮ

