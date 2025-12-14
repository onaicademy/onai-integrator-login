# 🚀 ПОЛНОЕ РУКОВОДСТВО ПО ДЕПЛОЮ onAI Academy

> **⚠️ ВАЖНО:** Этот файл содержит КРИТИЧЕСКИ ВАЖНУЮ информацию для деплоя проекта.  
> **Cursor AI:** При любых вопросах о деплое ОБЯЗАТЕЛЬНО читай этот файл первым!

---

## 📋 СОДЕРЖАНИЕ

1. [Критические проблемы и решения](#критические-проблемы)
2. [Полный алгоритм деплоя](#алгоритм-деплоя)
3. [Backend деплой (DigitalOcean)](#backend-деплой)
4. [Frontend деплой (Vercel)](#frontend-деплой)
5. [Troubleshooting](#troubleshooting)
6. [Чеклист перед деплоем](#чеклист)

---

## 🔥 КРИТИЧЕСКИЕ ПРОБЛЕМЫ

### ❌ ПРОБЛЕМА #1: Флаг --force в package.json

**СИМПТОМЫ:**
- Vercel build fails без понятных ошибок
- Локальный build работает, но на Vercel нет
- Assets не обновляются на продакшене
- Старые хеши файлов остаются

**ПРИЧИНА:**
В `package.json` был флаг `--force` который НЕ поддерживается Vite CLI:

```json
// ❌ НЕПРАВИЛЬНО (ломает Vercel build):
"build": "vite build --force"

// ✅ ПРАВИЛЬНО:
"build": "vite build"
```

**РЕШЕНИЕ:**
Убрать флаг `--force` из build скрипта в `package.json`

---

## 🎯 АЛГОРИТМ ДЕПЛОЯ

### 1️⃣ ПРОВЕРКА ЛОКАЛЬНЫХ ИЗМЕНЕНИЙ

```bash
cd /Users/miso/onai-integrator-login
git status
```

**Что проверять:**
- Какие файлы изменены
- Есть ли незакоммиченные изменения
- Нет ли временных файлов для коммита

---

### 2️⃣ ЛОКАЛЬНАЯ ПРОВЕРКА BUILD

```bash
# Очистка кэша
rm -rf dist .vite/deps

# Локальный build
npm run build

# Проверить что build прошёл успешно
# Записать хеши новых файлов (например: index-LKw1A5xx.js)
```

**⚠️ ВАЖНО:** Если локальный build failed - НЕ деплоить! Сначала исправить ошибки.

---

### 3️⃣ КОММИТ И PUSH

```bash
# Добавить все изменения
git add -A

# Коммит с описанием изменений
git commit -m "🚀 Deploy: описание изменений"

# Push на GitHub
git push origin main
```

---

### 4️⃣ BACKEND ДЕПЛОЙ (DigitalOcean)

```bash
ssh root@207.154.231.30 "cd /var/www/onai-integrator-login-main && \
  git fetch origin && \
  git reset --hard origin/main && \
  cd backend && \
  rm -rf node_modules package-lock.json && \
  npm install --legacy-peer-deps && \
  npm run build && \
  pm2 restart onai-backend && \
  pm2 logs onai-backend --lines 30 --nostream"
```

**Проверка:**
```bash
curl https://api.onai.academy/api/health
# Должен вернуть: {"status":"ok","timestamp":"..."}
```

---

### 5️⃣ FRONTEND ДЕПЛОЙ (Vercel)

#### Вариант A: Автоматический (через GitHub webhook)

**Обычно работает автоматически после push на GitHub.**

Проверить через 2-3 минуты:
```bash
curl -I https://onai.academy | grep -E "age|x-vercel"
```

#### Вариант B: Принудительный (через Vercel CLI)

**Если webhook не сработал или нужно форсировать деплой:**

```bash
cd /Users/miso/onai-integrator-login

# Если Vercel токен НЕ сохранён:
npx vercel --yes --prod --token YOUR_VERCEL_TOKEN

# Если Vercel токен сохранён (после vercel login):
npx vercel --yes --prod
```

**Получить Vercel токен:**
1. https://vercel.com/ → Login
2. Settings → Tokens → Create Token
3. Name: `cursor-deploy`, Scope: Full Account
4. Скопировать токен (начинается с `vercel_...`)

---

### 6️⃣ ПРОВЕРКА ДЕПЛОЯ

#### Проверка через cURL:

```bash
# Проверить хеши assets
curl -s https://onai.academy | grep -o 'index-[^.]*\.js' | head -1

# Проверить age кэша (должен быть свежий, < 60 секунд)
curl -I https://onai.academy | grep age
```

#### Проверка через браузер:

```javascript
// Очистить все кэши и перезагрузить
localStorage.clear();
sessionStorage.clear();
if ('caches' in window) {
  caches.keys().then(names => names.forEach(name => caches.delete(name)));
}
location.reload(true);
```

Затем открыть DevTools → Network и проверить:
- Хеши файлов (например: `index-LKw1A5xx.js`)
- Должны совпадать с локальным build
- Статус: 200 OK для всех assets

---

## 🖥️ BACKEND ДЕПЛОЙ (DigitalOcean)

### Сервер:
- **IP:** 207.154.231.30
- **Path:** `/var/www/onai-integrator-login-main/backend`
- **PM2 процесс:** `onai-backend`
- **API URL:** https://api.onai.academy

### Полная команда деплоя:

```bash
ssh root@207.154.231.30 "
  cd /var/www/onai-integrator-login-main && \
  git fetch origin && \
  git reset --hard origin/main && \
  cd backend && \
  npm install --legacy-peer-deps && \
  npm run build && \
  pm2 restart onai-backend && \
  pm2 logs onai-backend --lines 30 --nostream
"
```

### Если есть конфликты зависимостей:

```bash
# Полная переустановка
ssh root@207.154.231.30 "
  cd /var/www/onai-integrator-login-main/backend && \
  rm -rf node_modules package-lock.json && \
  npm install --legacy-peer-deps && \
  npm run build && \
  pm2 restart onai-backend
"
```

### Проверка статуса:

```bash
# PM2 статус
ssh root@207.154.231.30 "pm2 status"

# Логи (последние 50 строк)
ssh root@207.154.231.30 "pm2 logs onai-backend --lines 50 --nostream"

# Health check
curl https://api.onai.academy/api/health
```

---

## 🌐 FRONTEND ДЕПЛОЙ (Vercel)

### Production URLs:
- **Main domain:** https://onai.academy
- **Vercel domain:** https://onai-integrator-login-*.vercel.app

### Автоматический деплой:

1. **Push на GitHub** → Vercel webhook автоматически триггерится
2. **Ждать 2-3 минуты** для завершения build
3. **Проверить** что новые assets загружаются

### Принудительный деплой (если webhook не сработал):

```bash
# С Vercel токеном
cd /Users/miso/onai-integrator-login
npx vercel --yes --prod --token YOUR_VERCEL_TOKEN
```

### Если build failed:

**Проверить package.json:**
```json
{
  "scripts": {
    "build": "vite build"  // БЕЗ --force флага!
  }
}
```

### Очистка Vercel кэша:

**Через CLI:**
```bash
npx vercel --yes --prod --force
```

**Через пустой коммит:**
```bash
git commit --allow-empty -m "[FORCE-REBUILD] Clear Vercel cache"
git push origin main
```

---

## 🔧 TROUBLESHOOTING

### Проблема: "Изменения не отображаются на фронте"

**Решение:**
1. Проверить что коммит есть на GitHub:
   ```bash
   curl -s https://api.github.com/repos/onaicademy/onai-integrator-login/commits/main | grep '"message"'
   ```

2. Собрать локально и проверить хеши:
   ```bash
   npm run build
   # Записать хеши файлов из dist/assets/
   ```

3. Проверить хеши на продакшене:
   ```bash
   curl -s https://onai.academy | grep -o 'assets/index-[^"]*\.js'
   ```

4. Если хеши НЕ совпадают → принудительный Vercel деплой через CLI

---

### Проблема: "Backend не запускается после деплоя"

**Решение:**
1. Проверить логи:
   ```bash
   ssh root@207.154.231.30 "pm2 logs onai-backend --lines 100 --nostream"
   ```

2. Проверить TypeScript compilation:
   ```bash
   ssh root@207.154.231.30 "cd /var/www/onai-integrator-login-main/backend && npm run build"
   ```

3. Если `tsc: not found`:
   ```bash
   ssh root@207.154.231.30 "cd /var/www/onai-integrator-login-main/backend && npm install"
   ```

4. Перезапустить PM2:
   ```bash
   ssh root@207.154.231.30 "pm2 restart onai-backend"
   ```

---

### Проблема: "Vercel build fails"

**Возможные причины:**

1. **Флаг --force в package.json** (самая частая!)
   - Проверить: `cat package.json | grep '"build"'`
   - Должно быть: `"build": "vite build"` (БЕЗ --force)

2. **Конфликт зависимостей**
   - Добавить в package.json: `"overrides": { "zod": "^3.23.8" }`
   - Или использовать `--legacy-peer-deps`

3. **Старый Node.js**
   - Vercel требует Node.js 18+
   - Проверить в `package.json`: `"engines": { "node": ">=18.0.0" }`

---

### Проблема: "Старый кэш не очищается"

**Решение:**

1. **Очистка браузерного кэша:**
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   caches.keys().then(names => names.forEach(name => caches.delete(name)));
   location.reload(true);
   ```

2. **Проверка age заголовка:**
   ```bash
   curl -I https://onai.academy | grep age
   # Если age > 300 (5 минут) → кэш старый
   ```

3. **Принудительный bypass кэша:**
   ```bash
   curl -I "https://onai.academy?nocache=$(date +%s)"
   ```

---

## ✅ ЧЕКЛИСТ ПЕРЕД ДЕПЛОЕМ

### 📝 Подготовка:
- [ ] Все изменения закоммичены локально
- [ ] Локальный `npm run build` проходит успешно
- [ ] Записаны хеши новых assets (для проверки)
- [ ] В package.json НЕТ флага `--force` в build скрипте

### 🚀 Backend деплой:
- [ ] Git push на GitHub прошёл успешно
- [ ] SSH подключение к серверу работает
- [ ] Backend code pulled с GitHub
- [ ] Dependencies установлены (`npm install --legacy-peer-deps`)
- [ ] TypeScript скомпилирован (`npm run build`)
- [ ] PM2 процесс перезапущен
- [ ] API health check возвращает OK: `curl https://api.onai.academy/api/health`

### 🌐 Frontend деплой:
- [ ] Vercel webhook триггернулся (или используется CLI)
- [ ] Vercel build завершился успешно (проверить через 2-3 мин)
- [ ] Новые хеши assets загружаются на https://onai.academy
- [ ] Браузерный кэш очищен
- [ ] DevTools → Network показывает новые файлы
- [ ] Визуальная проверка: страница загружается корректно

### 🔍 Финальная проверка:
- [ ] Frontend: https://onai.academy ✅
- [ ] Backend: https://api.onai.academy/api/health ✅
- [ ] Новые изменения видны на продакшене
- [ ] Нет критических ошибок в console
- [ ] Все assets загружаются (статус 200)

---

## 📞 КОНТАКТЫ И URLS

### Production:
- **Frontend:** https://onai.academy (Vercel)
- **Backend API:** https://api.onai.academy (DigitalOcean)
- **Server IP:** 207.154.231.30

### Repository:
- **GitHub:** https://github.com/onaicademy/onai-integrator-login
- **Branch:** main

### Services:
- **Vercel:** https://vercel.com/onais-projects-6a1beeec/onai-integrator-login
- **Supabase:** arqhkacellqbhjhbebfh.supabase.co
- **Cloudflare R2:** video.onai.academy

---

## 🎓 ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ

### Node.js версии:
- **Локально:** v22.17.0
- **На сервере (DigitalOcean):** v18.20.8 (нужно обновить до v20+)
- **Vercel:** v18+ (автоматически)

### Обновление Node.js на сервере (опционально):
```bash
ssh root@207.154.231.30 "curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs"
```

---

## 📚 СВЯЗАННЫЕ ДОКУМЕНТЫ

- `TELEGRAM_BOTS_SCHEME.md` - схема работы с Telegram ботами
- `DEPLOY_CHECKLIST.md` - краткий чеклист деплоя
- `README.md` - общая информация о проекте

---

**Последнее обновление:** 2025-12-02  
**Автор:** onAI Academy Team  
**Статус:** ✅ Актуально

---

> 💡 **Для Cursor AI:** При любых проблемах с деплоем СНАЧАЛА прочитай этот файл и следуй инструкциям. Все известные проблемы и их решения описаны здесь.

