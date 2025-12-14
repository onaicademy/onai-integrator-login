# 🔴 CRITICAL: Email Update API URL Issue

**Дата:** 3 декабря 2025  
**Статус:** ❌ БЛОКИРУЮЩАЯ ОШИБКА  
**Приоритет:** КРИТИЧЕСКИЙ

---

## 📋 КРАТКОЕ ОПИСАНИЕ ПРОБЛЕМЫ

Frontend обращается к **production API** (`https://api.onai.academy`) вместо **localhost backend** (`http://localhost:3000`) при попытке обновить email/password на localhost.

---

## ❌ СИМПТОМЫ

### Консоль браузера:
```
🌐 API Request: POST https://api.onai.academy/api/users/update-email
📦 Body type: object
📤 Body: {newEmail: 'zankachidix.ai@gmail.com', userName: 'Александр [CEO]'}

❌ API Error: Not found
Failed to load resource: the server responded with a status of 404 (Not Found)
```

### Поведение в UI:
1. Пользователь вводит новый email `zankachidix.ai@gmail.com`
2. Нажимает "ОБНОВИТЬ EMAIL"
3. **Email МГНОВЕННО обновляется** в UI (оптимистичное обновление работает)
4. Запрос уходит на `https://api.onai.academy/api/users/update-email` (PRODUCTION!)
5. Получает **404 Not Found** (endpoint не существует на production)
6. **Email откатывается** обратно на `saint@onaiacademy.kz`
7. Показывается toast с ошибкой

---

## 🔍 ROOT CAUSE ANALYSIS

### 1. Проблема в `apiClient.ts`

**Файл:** `src/utils/apiClient.ts`  
**Строка:** 48

```typescript
const baseUrl = import.meta.env.VITE_API_URL || 'https://api.onai.academy';
```

**Проблема:**
- Если `VITE_API_URL` **НЕ УСТАНОВЛЕН** в environment variables
- Используется fallback на **PRODUCTION URL**: `https://api.onai.academy`
- Это **ОШИБКА** для localhost разработки!

### 2. Отсутствие `.env.local` файла

**Проблема:**
- В корне проекта **НЕТ** файла `.env.local`
- `VITE_API_URL` не установлен для localhost development
- Vite не знает, что нужно использовать `http://localhost:3000`

**Попытка создать `.env.local`:**
```
Error: Editing this file is blocked by globalignore
```
- Не могу создать `.env.local` из-за ограничений безопасности

### 3. Новые endpoints существуют только на localhost

**Созданные endpoints:**
- `POST /api/users/update-email` ✅ Существует на localhost:3000
- `POST /api/users/update-password` ✅ Существует на localhost:3000

**Production backend:**
- `POST /api/users/update-email` ❌ НЕ СУЩЕСТВУЕТ на api.onai.academy
- `POST /api/users/update-password` ❌ НЕ СУЩЕСТВУЕТ на api.onai.academy

**Результат:**
- Frontend отправляет запрос на production
- Production возвращает 404
- Оптимистичное обновление откатывается

---

## 📝 ИСТОРИЯ ПОПЫТОК ИСПРАВЛЕНИЯ

### Попытка #1: Переписать на `apiClient`
**Что сделал:**
- Заменил прямые `fetch()` вызовы на `api.post()` в `AccountSettings.tsx`
- Добавил импорт `import { api } from '@/utils/apiClient'`

**Код:**
```typescript
// ❌ СТАРЫЙ КОД (был с прямым fetch к VITE_API_URL):
const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users/update-email`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
  },
  body: JSON.stringify({ newEmail, userName }),
});

// ✅ НОВЫЙ КОД (использует apiClient с fallback):
const result = await api.post('/api/users/update-email', {
  newEmail,
  userName: full_name || 'Пользователь',
});
```

**Результат:**
- ❌ НЕ ПОМОГЛО
- `apiClient` все равно использует fallback на production
- Проблема осталась

### Попытка #2: Создать `.env.local`
**Что сделал:**
- Попытался создать `/Users/miso/onai-integrator-login/.env.local`
- Содержимое:
```env
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=https://arqhkacellqbhjhbebfh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

**Результат:**
```
Error: Editing this file is blocked by globalignore
```
- ❌ ЗАБЛОКИРОВАНО системой безопасности
- Не могу создать `.env` файлы

### Попытка #3: Hard Refresh браузера
**Что сделал:**
- `F5` (обычный refresh)
- `Shift+F5` (hard refresh с очисткой кэша)
- Несколько раз перезагружал страницу

**Результат:**
- ❌ НЕ ПОМОГЛО
- HMR (Hot Module Replacement) обновился
- Но `VITE_API_URL` все равно не установлен
- Продолжает использовать production URL

---

## 🎯 КОРНЕВАЯ ПРИЧИНА

**Environment Variables НЕ УСТАНОВЛЕНЫ для localhost development.**

### Как Vite определяет `VITE_API_URL`:

1. **Первый приоритет:** `.env.local` (только для localhost)
   - ❌ Файл отсутствует
   
2. **Второй приоритет:** `.env.development` (для development mode)
   - ❌ Файл отсутствует
   
3. **Третий приоритет:** `.env` (для всех режимов)
   - ❌ Файл отсутствует или не содержит `VITE_API_URL`

4. **Fallback в коде:** `https://api.onai.academy`
   - ✅ Используется по умолчанию
   - ❌ **НЕПРАВИЛЬНО для localhost!**

---

## 💡 РЕКОМЕНДУЕМЫЕ РЕШЕНИЯ

### РЕШЕНИЕ 1: Создать `.env.local` вручную (РЕКОМЕНДУЕТСЯ)

**Кто:** Пользователь должен сделать вручную  
**Что сделать:**

```bash
# В корне проекта создать файл .env.local
cd /Users/miso/onai-integrator-login
cat > .env.local << 'EOF'
# 🔧 LOCAL DEVELOPMENT ONLY
# Этот файл используется только для localhost
VITE_API_URL=http://localhost:3000
EOF
```

**Затем перезапустить frontend:**
```bash
# Остановить Vite dev server (Ctrl+C в терминале где запущен npm run dev)
# Запустить снова:
npm run dev
```

**Результат:**
- ✅ `VITE_API_URL` будет установлен в `http://localhost:3000`
- ✅ Frontend будет обращаться к localhost backend
- ✅ Email/Password update заработает

---

### РЕШЕНИЕ 2: Временно изменить fallback в `apiClient.ts` (НЕ РЕКОМЕНДУЕТСЯ)

**Файл:** `src/utils/apiClient.ts`  
**Строка:** 48

**Изменить:**
```typescript
// ❌ ТЕКУЩИЙ КОД:
const baseUrl = import.meta.env.VITE_API_URL || 'https://api.onai.academy';

// ✅ ВРЕМЕННОЕ РЕШЕНИЕ ДЛЯ LOCALHOST:
const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
```

**Проблемы этого подхода:**
- ❌ Придется откатывать перед деплоем на production
- ❌ Можно случайно задеплоить с localhost URL
- ❌ Не является правильным решением

---

### РЕШЕНИЕ 3: Добавить режим определения environment (ДОЛГОСРОЧНОЕ)

**Файл:** `src/utils/apiClient.ts`  
**Код:**

```typescript
// Определяем окружение
const isDevelopment = import.meta.env.DEV; // Vite встроенная переменная
const isProduction = import.meta.env.PROD;

// Умный fallback в зависимости от окружения
const defaultApiUrl = isDevelopment 
  ? 'http://localhost:3000'  // localhost для dev
  : 'https://api.onai.academy'; // production для prod

const baseUrl = import.meta.env.VITE_API_URL || defaultApiUrl;
```

**Преимущества:**
- ✅ Автоматически определяет окружение
- ✅ Не нужно создавать `.env.local`
- ✅ Безопасно для production деплоя
- ✅ Правильный паттерн для Vite

---

## 📊 ТЕКУЩЕЕ СОСТОЯНИЕ

### ✅ ЧТО РАБОТАЕТ:
1. Backend endpoints созданы и работают на `localhost:3000`
   - `POST /api/users/update-email` ✅
   - `POST /api/users/update-password` ✅
2. Frontend оптимистичное обновление работает ✅
3. AuthContext throttle исправлен (нет 429 ошибок) ✅
4. Email шаблоны обновлены с Security Alert дизайном ✅

### ❌ ЧТО НЕ РАБОТАЕТ:
1. Frontend обращается к production API вместо localhost ❌
2. Запросы получают 404 Not Found ❌
3. Email/Password update откатывается ❌
4. Нет `.env.local` файла ❌

---

## 🚀 СЛЕДУЮЩИЕ ШАГИ

### ДЛЯ НЕМЕДЛЕННОГО ИСПРАВЛЕНИЯ:

**Вариант A: Пользователь создает `.env.local`** (РЕКОМЕНДУЕТСЯ)
1. Вручную создать `/Users/miso/onai-integrator-login/.env.local`
2. Добавить `VITE_API_URL=http://localhost:3000`
3. Перезапустить Vite dev server

**Вариант B: AI применяет РЕШЕНИЕ 3** (ДОЛГОСРОЧНОЕ)
1. Изменить `apiClient.ts` с умным fallback
2. Использовать `import.meta.env.DEV` для определения окружения
3. Автоматический выбор localhost/production

### ДЛЯ PRODUCTION DEPLOY:
1. ✅ Убедиться что endpoint `/api/users/update-email` задеплоен на `api.onai.academy`
2. ✅ Убедиться что endpoint `/api/users/update-password` задеплоен на `api.onai.academy`
3. ✅ Убедиться что `VITE_API_URL=https://api.onai.academy` установлен в Vercel Environment Variables
4. ✅ Задеплоить backend с новыми endpoints
5. ✅ Задеплоить frontend

---

## 🔗 СВЯЗАННЫЕ ФАЙЛЫ

### Frontend:
- `src/utils/apiClient.ts` (строка 48) - Fallback URL
- `src/pages/tripwire/components/AccountSettings.tsx` (строки 61, 133) - Email/Password update calls
- `.env.local` (ОТСУТСТВУЕТ) - Должен содержать `VITE_API_URL` для localhost

### Backend:
- `backend/src/routes/users.ts` (строки ~25-30) - Новые routes для update-email/update-password
- `backend/src/controllers/userController.ts` (строки ~80-160) - Handlers для update
- `backend/src/services/emailService.ts` (строки 220-420) - Email notification templates

---

## 📞 ВОПРОСЫ К АРХИТЕКТОРУ

1. **Какое решение использовать для localhost development?**
   - Создать `.env.local` вручную?
   - Использовать умный fallback с `import.meta.env.DEV`?
   - Другой подход?

2. **Когда планируется deploy backend на production?**
   - Нужно задеплоить новые endpoints `/api/users/update-email` и `/api/users/update-password`
   - Без этого production frontend не будет работать после deploy

3. **Нужно ли добавить `.env.example` в репозиторий?**
   - Для документирования требуемых environment variables
   - Чтобы другие разработчики знали что создавать в `.env.local`

---

## ⚙️ ENVIRONMENT VARIABLES REFERENCE

### Для localhost development (`.env.local`):
```env
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=https://arqhkacellqbhjhbebfh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Для production (Vercel Environment Variables):
```env
VITE_API_URL=https://api.onai.academy
VITE_SUPABASE_URL=https://arqhkacellqbhjhbebfh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

**Конец отчета**  
**Статус:** Ожидает решения от архитектора  
**Блокирует:** Тестирование email/password update на localhost

