# 🚀 БЫСТРАЯ ИНСТРУКЦИЯ ПО ДЕПЛОЮ (для AI ассистентов)

> **Дай эту инструкцию другому ассистенту в Cursor когда нужен деплой**

---

## ⚡ КРАТКАЯ ВЕРСИЯ (копируй команды)

### 1️⃣ LOCAL: Коммит и Push

```bash
cd /Users/miso/onai-integrator-login
git add .
git commit -m "FEATURE: Описание изменений"
git push origin main
```

### 2️⃣ VERCEL: Автоматически деплоится (подожди 2-3 минуты)

**Проверь что правильный коммит задеплоен:**
- Открой: https://vercel.com/dashboard
- Найди проект `onai-integrator-login`
- Deployments → Latest → Git SHA должен совпадать с `git log -1`

**Если SHA НЕ совпадает:**
- Vercel → Deployments → Redeploy (БЕЗ кэша!)

### 3️⃣ DIGITALOCEAN: Backend деплой (вручную)

```bash
ssh root@207.154.231.30 "cd /var/www/onai-integrator-login-main && git pull origin main && cd backend && npm install && npm run build && pm2 restart onai-backend --update-env && pm2 logs onai-backend --lines 30 --nostream"
```

### 4️⃣ ПРОВЕРКА

```bash
# Frontend
open https://onai.academy

# Backend
curl https://api.onai.academy/api/health
```

✅ **Готово!**

---

## 📋 ДЕТАЛЬНАЯ ВЕРСИЯ (если что-то пошло не так)

### FRONTEND (Vercel)

#### Шаг 1: Push на GitHub

```bash
cd /Users/miso/onai-integrator-login
git status                    # Проверь изменения
git add .                     # Добавь все файлы
git commit -m "FEATURE: ..."  # Коммит с описанием
git push origin main          # Push на GitHub
```

#### Шаг 2: Проверь Vercel деплой

1. **Открой Dashboard:**
   ```
   https://vercel.com/dashboard
   ```

2. **Найди проект:**
   - Кликни на `onai-integrator-login` (или твое название)

3. **Проверь последний deployment:**
   - Deployments → Latest deployment
   - Status должен быть: **Ready ✅**
   - Git SHA должен совпадать с `git log -1 --format="%H"`

4. **Если SHA НЕ совпадает (старый коммит):**
   ```
   Vercel Dashboard
   → Deployments
   → Latest deployment
   → три точки (⋮)
   → Redeploy
   → ❌ БЕЗ галочки "Use existing Build Cache"
   → Redeploy
   ```

#### Шаг 3: Проверь ENV переменные (если первый раз)

```
Vercel Dashboard
→ Settings
→ Environment Variables
→ Проверь что установлены для Production:
```

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://api.onai.academy` |
| `VITE_SUPABASE_URL` | `https://arqhkacellqbhjhbebfh.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `<ключ из Supabase>` |

**Если изменил ENV переменные → обязательно Redeploy!**

#### Шаг 4: Проверь результат

```bash
# Открой в ИНКОГНИТО (чтобы не было кэша)
open -na "Google Chrome" --args --incognito https://onai.academy

# Открой DevTools (F12) → Console
# Проверь:
console.log(import.meta.env.VITE_API_URL)
// Должно вывести: https://api.onai.academy

# Проверь Network:
# Запросы должны идти на https://api.onai.academy/api/...
```

---

### BACKEND (DigitalOcean)

#### Быстрая команда (одна строка):

```bash
ssh root@207.154.231.30 "cd /var/www/onai-integrator-login-main && git pull origin main && cd backend && npm install && npm run build && pm2 restart onai-backend --update-env && pm2 logs onai-backend --lines 30 --nostream"
```

**Что делает:**
1. SSH на сервер
2. `git pull` - скачивает изменения с GitHub
3. `npm install` - устанавливает зависимости (включая dev для TypeScript)
4. `npm run build` - собирает TypeScript в JavaScript
5. `pm2 restart` - перезапускает Backend с обновлением ENV переменных
6. `pm2 logs` - показывает последние 30 строк логов

---

#### Пошаговая версия (если ошибка):

**Шаг 1: SSH на сервер**
```bash
ssh root@207.154.231.30
# Вводи пароль от сервера если спросит
```

**Шаг 2: Перейди в папку проекта**
```bash
cd /var/www/onai-integrator-login-main
pwd  # Проверь путь: /var/www/onai-integrator-login-main
```

**Шаг 3: Git pull**
```bash
git pull origin main

# Если ошибка "local changes would be overwritten":
git fetch origin
git reset --hard origin/main
# Это удалит локальные изменения и загрузит чистую версию
```

**Шаг 4: Проверь что правильный коммит**
```bash
git log -1 --oneline
# Должен совпадать с локальной машиной!
```

**Шаг 5: Перейди в backend**
```bash
cd backend
pwd  # Должно быть: /var/www/onai-integrator-login-main/backend
```

**Шаг 6: Установи зависимости**
```bash
npm install
# НЕ используй --production! Нужны dev зависимости для TypeScript
```

**Шаг 7: Собери проект**
```bash
npm run build

# Если ошибка компиляции:
# - Исправь ошибку локально
# - git commit + push
# - Повтори Шаг 3
```

**Шаг 8: Перезапусти PM2**
```bash
pm2 restart onai-backend --update-env

# ✅ Должно вывести:
# [PM2] [onai-backend](0) ✓
# status: online
```

**Шаг 9: Проверь логи**
```bash
pm2 logs onai-backend --lines 50 --nostream

# ✅ Должно быть:
# Backend запущен на http://localhost:3000
# AI Mentor Scheduler: Started successfully
# AI Analytics Scheduler: Started successfully

# ❌ Если ошибки:
# - Cannot find module → npm install не сработал
# - ECONNREFUSED → .env проблемы (см. ниже)
```

**Шаг 10: Проверь health**
```bash
# На сервере:
curl http://localhost:3000/api/health

# Должно вывести:
# {"status":"ok","timestamp":"..."}
```

---

#### Проверка ENV переменных на сервере

```bash
# На сервере:
cd /var/www/onai-integrator-login-main/backend
cat .env | head -20

# Должны быть:
NODE_ENV=production
SUPABASE_URL=https://arqhkacellqbhjhbebfh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_API_KEY=sk-proj-...
TELEGRAM_ADMIN_BOT_TOKEN=...
TELEGRAM_ADMIN_CHAT_ID=...
FRONTEND_URL=https://onai.academy
```

**Если переменной нет:**
```bash
nano /var/www/onai-integrator-login-main/backend/.env
# Добавь переменную
# Ctrl+X → Y → Enter (сохранить)

# ОБЯЗАТЕЛЬНО перезапусти:
pm2 restart onai-backend --update-env
```

---

## 🔥 TROUBLESHOOTING

### Vercel показывает старый код

```bash
# 1. Hard Refresh в браузере
# Chrome/Edge: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)

# 2. Проверь Git SHA на Vercel
# Dashboard → Deployments → Latest → Git SHA

# 3. Force Redeploy БЕЗ кэша
# Dashboard → Deployments → Redeploy (без галочки Use Cache)
```

### Backend не запускается

```bash
# 1. Проверь логи
ssh root@207.154.231.30
pm2 logs onai-backend --lines 100

# 2. Если "tsc: not found":
cd /var/www/onai-integrator-login-main/backend
npm install  # Установит TypeScript

# 3. Если "Cannot find module":
rm -rf node_modules package-lock.json
npm install
npm run build
pm2 restart onai-backend --update-env

# 4. Если ECONNREFUSED:
cat .env  # Проверь переменные
```

### CORS ошибки

```bash
# Backend должен разрешать запросы с frontend домена
# Проверь в backend/src/server.ts:
# allowedOrigins должен включать 'https://onai.academy'
```

---

## ✅ ФИНАЛЬНАЯ ПРОВЕРКА

После деплоя **ОБЯЗАТЕЛЬНО проверь:**

```bash
# 1. Frontend загружается
open https://onai.academy

# 2. Backend health check
curl https://api.onai.academy/api/health
# Должно: {"status":"ok","timestamp":"..."}

# 3. DevTools Console (F12)
# - Нет ошибок
# - API запросы идут на https://api.onai.academy

# 4. Network (DevTools)
# - Все запросы статус 200
# - Нет CORS ошибок
```

---

## 📞 ПОЛЕЗНЫЕ ССЫЛКИ

- **Frontend (Vercel):** https://onai.academy
- **Backend API:** https://api.onai.academy
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Supabase:** https://supabase.com/dashboard/project/arqhkacellqbhjhbebfh
- **Server IP:** 207.154.231.30

---

## 🎯 ПАМЯТКА

**Frontend (Vercel):**
- ✅ Автоматический деплой после `git push`
- ⏱️ Занимает 2-3 минуты
- 🔄 Force Redeploy если нужно обновить ENV или сбросить кэш

**Backend (DigitalOcean):**
- ❌ НЕ автоматический деплой
- 🖥️ Нужно вручную через SSH
- 📦 npm install (БЕЗ --production!)
- 🔨 npm run build
- 🔄 pm2 restart --update-env

**Всегда проверяй:**
- ✅ Git SHA совпадает на Vercel и локально
- ✅ PM2 логи без ошибок
- ✅ Health endpoint отвечает
- ✅ DevTools Console без ошибок


