# 📦 ПРАВИЛА ПРАВИЛЬНОГО ДЕПЛОЯ НА PRODUCTION

> **Версия:** 1.0  
> **Дата:** 02.12.2025  
> **Проект:** onAI Academy Platform

---

## 🎯 ОБЩИЕ ПРИНЦИПЫ

### ⚠️ КРИТИЧЕСКИ ВАЖНО

1. **НИКОГДА** не деплой код, который не протестирован локально
2. **ВСЕГДА** проверяй environment variables перед деплоем
3. **ОБЯЗАТЕЛЬНО** делай коммит с понятным описанием изменений
4. **ПРОВЕРЯЙ** логи после каждого деплоя

---

## 🔄 ПРОЦЕСС ДЕПЛОЯ: ПОШАГОВАЯ ИНСТРУКЦИЯ

### ШАГ 1: ЛОКАЛЬНОЕ ТЕСТИРОВАНИЕ

```bash
# 1. Убедись, что локально все работает
npm run dev

# 2. Проверь браузер на localhost:8080
# - Открой все основные страницы
# - Проверь API запросы в Network (F12)
# - Убедись, что нет ошибок в Console

# 3. Проверь backend локально
cd backend
npm run dev

# 4. Убедись, что backend отвечает
curl http://localhost:3000/api/health
```

**✅ ЧЕКЛИСТ ЛОКАЛЬНОГО ТЕСТИРОВАНИЯ:**
- [ ] Frontend загружается без ошибок
- [ ] API запросы работают (проверь Network в DevTools)
- [ ] Авторизация работает
- [ ] Админ-панель загружается
- [ ] Tripwire страницы работают
- [ ] Console без критических ошибок

---

### ШАГ 2: ПОДГОТОВКА КОДА К ДЕПЛОЮ

#### 2.1 Проверка Environment Variables

**Frontend (.env.production)**
```bash
VITE_API_URL=https://api.onai.academy
VITE_SUPABASE_URL=https://arqhkacellqbhjhbebfh.supabase.co
VITE_SUPABASE_ANON_KEY=<твой ключ>
```

**Backend (.env на сервере DigitalOcean)**
```bash
# Supabase
SUPABASE_URL=https://arqhkacellqbhjhbebfh.supabase.co
SUPABASE_SERVICE_KEY=<service key>

# OpenAI
OPENAI_API_KEY=<твой ключ>
OPENAI_ASSISTANT_CURATOR_TRIPWIRE_ID=<ID триптайр куратора>
OPENAI_ASSISTANT_CURATOR_ID=<ID основного куратора>

# Bunny
BUNNY_STREAM_LIBRARY_ID=<ID>
BUNNY_STREAM_API_KEY=<ключ>
BUNNY_STREAM_CDN_HOSTNAME=video.onai.academy

# Groq
GROQ_API_KEY=<ключ>

# Frontend URL
FRONTEND_URL=https://onai.academy

# Node Environment
NODE_ENV=production
```

#### 2.2 Проверка .gitignore

```bash
# Убедись, что эти файлы ИГНОРИРУЮТСЯ Git
cat .gitignore

# Должно быть:
# .env
# .env.local
# .env.production
# dist
# node_modules
# .vite
```

#### 2.3 Проверка кода на хардкод

```bash
# Найди все упоминания localhost в src
grep -r "localhost" src/

# Найди все упоминания 127.0.0.1
grep -r "127.0.0.1" src/

# Найди все http:// (должны быть только в dev режиме)
grep -r "http://" src/ | grep -v "https://"
```

**⚠️ ЕСЛИ НАШЕЛ ХАРДКОД - ЗАМЕНИ НА ПЕРЕМЕННЫЕ!**

---

### ШАГ 3: GIT COMMIT И PUSH

```bash
# 1. Проверь статус
git status

# 2. Добавь ВСЕ изменения
git add .

# 3. Сделай коммит с понятным описанием
git commit -m "FEATURE: Описание изменений

- Что добавлено
- Что исправлено
- Что оптимизировано"

# 4. Push на GitHub
git push origin main
```

**📝 ПРАВИЛА COMMIT MESSAGE:**
- `FEATURE:` - новая функциональность
- `FIX:` - исправление бага
- `REFACTOR:` - рефакторинг кода
- `UPDATE:` - обновление зависимостей
- `CONFIG:` - изменение конфигурации
- `HOTFIX:` - срочное исправление на production

---

### ШАГ 4: VERCEL DEPLOY (FRONTEND)

#### 4.1 Автоматический деплой

```bash
# Vercel автоматически деплоит после git push
# Проверь статус на https://vercel.com/dashboard
```

#### 4.2 Проверка Environment Variables на Vercel

1. Зайди на https://vercel.com/dashboard
2. Открой проект `onai-integrator-login`
3. Settings → Environment Variables
4. Убедись, что установлены:
   - `VITE_API_URL` = `https://api.onai.academy`
   - `VITE_SUPABASE_URL` = `https://arqhkacellqbhjhbebfh.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `<ключ>`

#### 4.3 Force Redeploy (если нужно)

```bash
# Если автодеплой не сработал
# 1. Зайди на Vercel Dashboard
# 2. Deployments → Latest deployment
# 3. Нажми три точки → Redeploy
# 4. Выбери "Use existing Build Cache" → NO
```

---

### ШАГ 5: DIGITALOCEAN DEPLOY (BACKEND)

#### 5.1 Стандартный деплой

```bash
# Подключись к серверу
ssh root@207.154.231.30

# Перейди в папку проекта
cd /var/www/onai-integrator-login-main

# Забери изменения из GitHub
git pull origin main

# Если возникает конфликт:
git fetch origin
git reset --hard origin/main

# Перейди в backend
cd backend

# Установи зависимости (если были изменения)
npm install --production

# Собери проект
npm run build

# Перезапусти PM2 с обновлением env
pm2 restart onai-backend --update-env

# Проверь логи (ОБЯЗАТЕЛЬНО!)
pm2 logs onai-backend --lines 50
```

#### 5.2 Проверка здоровья Backend

```bash
# На сервере
curl http://localhost:3000/api/health

# С локальной машины
curl https://api.onai.academy/api/health
```

**✅ Ожидаемый ответ:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-02T..."
}
```

#### 5.3 Проверка environment variables на сервере

```bash
# На сервере
cd /var/www/onai-integrator-login-main/backend
cat .env | grep -v "SECRET\|KEY" | head -20

# Убедись, что NODE_ENV=production
```

#### 5.4 Если PM2 не запускается

```bash
# Убей процесс
pm2 delete onai-backend

# Запусти заново
pm2 start npm --name "onai-backend" -- run start

# Сохрани конфигурацию
pm2 save

# Настрой автозапуск
pm2 startup
```

---

### ШАГ 6: ПРОВЕРКА PRODUCTION

#### 6.1 Frontend Checklist

```bash
# Открой в браузере (ИНКОГНИТО!)
https://onai.academy
```

**✅ ЧТО ПРОВЕРИТЬ:**
- [ ] Главная страница загружается
- [ ] Логин работает
- [ ] Админ-панель загружается
- [ ] Tripwire страницы работают
- [ ] API запросы идут на `https://api.onai.academy`
- [ ] Console без критических ошибок
- [ ] Network: статус 200/201 для API запросов

#### 6.2 Backend Checklist

```bash
# Проверь API эндпоинты
curl https://api.onai.academy/api/health
curl https://api.onai.academy/api/tripwire/modules # (с токеном)

# Проверь логи на сервере
ssh root@207.154.231.30
pm2 logs onai-backend --lines 100
```

**✅ ЧТО ПРОВЕРИТЬ В ЛОГАХ:**
- [ ] Нет ошибок `Missing environment variable`
- [ ] Нет ошибок `ECONNREFUSED`
- [ ] Нет ошибок `401 Unauthorized` (если есть токен)
- [ ] API запросы успешно обрабатываются
- [ ] Нет ошибок `yt-dlp: not found`
- [ ] Нет ошибок `ffmpeg: not found`

---

## 🚨 TROUBLESHOOTING: ТИПИЧНЫЕ ПРОБЛЕМЫ

### Проблема 1: Vercel показывает старый код

**Причина:** Кэш Vercel или проблема с билдом

**Решение:**
```bash
# 1. Force redeploy на Vercel (без кэша)
# 2. Проверь, что git push прошел успешно
git log -1 --oneline

# 3. Проверь .gitignore (dist не должен быть в git)
cat .gitignore | grep dist

# 4. Очисти локальный кэш и пересобери
rm -rf .vite dist node_modules/.vite
npm run build
```

### Проблема 2: API запросы возвращают 401 Unauthorized

**Причина:** JWT токен не передается или неправильный

**Решение:**
```javascript
// Проверь в DevTools → Application → Local Storage
// Ключ: sb-arqhkacellqbhjhbebfh-auth-token

// В apiClient.ts используй getAuthToken()
import { getAuthToken } from '@/utils/apiClient';

const token = getAuthToken();
headers: {
  'Authorization': `Bearer ${token}`
}
```

### Проблема 3: Backend не стартует после деплоя

**Причина:** Ошибка сборки или отсутствие environment variables

**Решение:**
```bash
# 1. Проверь логи PM2
pm2 logs onai-backend --lines 100

# 2. Проверь .env на сервере
cd /var/www/onai-integrator-login-main/backend
cat .env

# 3. Перезапусти PM2 с обновлением env
pm2 restart all --update-env

# 4. Если не помогает - пересобери
npm run build
pm2 restart onai-backend
```

### Проблема 4: Module IDs не совпадают

**Причина:** Хардкод ID в коде вместо динамической загрузки

**Решение:**
```bash
# Найди все хардкод ID
grep -r "moduleId.*=.*1[678]" src/

# Замени на динамическую загрузку из API
# Или убедись, что ID в коде совпадают с БД
```

### Проблема 5: Git конфликты при pull на сервере

**Причина:** Локальные изменения на сервере

**Решение:**
```bash
# Хардовый сброс (удаляет локальные изменения!)
cd /var/www/onai-integrator-login-main
git fetch origin
git reset --hard origin/main

# Продолжи деплой
cd backend
npm install --production
npm run build
pm2 restart onai-backend --update-env
```

---

## 📋 ФИНАЛЬНЫЙ ЧЕКЛИСТ ПЕРЕД ДЕПЛОЕМ

### Перед коммитом:
- [ ] Код протестирован локально
- [ ] Нет хардкода localhost/127.0.0.1
- [ ] .env файлы в .gitignore
- [ ] dist папка в .gitignore
- [ ] Console без критических ошибок
- [ ] API запросы работают локально

### После git push:
- [ ] Vercel автоматически начал деплой
- [ ] Vercel деплой завершился успешно (зеленая галочка)
- [ ] Backend задеплоен на DigitalOcean
- [ ] PM2 перезапущен с --update-env
- [ ] Логи PM2 без ошибок

### Проверка Production:
- [ ] Frontend загружается на https://onai.academy
- [ ] API работает на https://api.onai.academy
- [ ] Авторизация работает
- [ ] Админ-панель загружается
- [ ] Tripwire работает
- [ ] Console без критических ошибок
- [ ] Network: все запросы со статусом 200/201

---

## 🎯 БЫСТРЫЕ КОМАНДЫ ДЛЯ ДЕПЛОЯ

### Полный деплой (Frontend + Backend):

```bash
# 1. Локально
git add .
git commit -m "UPDATE: Описание изменений"
git push origin main

# 2. На сервере DigitalOcean
ssh root@207.154.231.30 "cd /var/www/onai-integrator-login-main && git pull origin main && cd backend && npm install --production && npm run build && pm2 restart onai-backend --update-env && pm2 logs onai-backend --lines 20"

# 3. Проверка
curl https://api.onai.academy/api/health
```

### Force redeploy Backend (если PM2 глючит):

```bash
ssh root@207.154.231.30 "cd /var/www/onai-integrator-login-main/backend && pm2 delete onai-backend && pm2 start npm --name 'onai-backend' -- run start && pm2 save && pm2 logs onai-backend --lines 20"
```

### Hard reset Git на сервере (ОПАСНО! Удаляет локальные изменения):

```bash
ssh root@207.154.231.30 "cd /var/www/onai-integrator-login-main && git fetch origin && git reset --hard origin/main && cd backend && npm install --production && npm run build && pm2 restart onai-backend --update-env"
```

---

## 🔐 БЕЗОПАСНОСТЬ

### НИКОГДА не коммить в Git:
- `.env` файлы
- API ключи
- Пароли
- Service keys
- JWT секреты

### ВСЕГДА проверяй:
- `.gitignore` актуален
- Секреты в переменных окружения (Vercel, DigitalOcean)
- CORS настройки на backend
- SSL сертификаты актуальны

---

## 📞 КОНТАКТЫ И ССЫЛКИ

- **Frontend (Vercel):** https://onai.academy
- **Backend (DigitalOcean):** https://api.onai.academy
- **Supabase Dashboard:** https://supabase.com/dashboard/project/arqhkacellqbhjhbebfh
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Server IP:** 207.154.231.30

---

## 📝 ВЕРСИОНИРОВАНИЕ

| Версия | Дата | Изменения |
|--------|------|-----------|
| 1.0 | 02.12.2025 | Первая версия правил деплоя |

---

**💡 Совет:** Сохрани этот файл в закладках и следуй ему ПРИ КАЖДОМ ДЕПЛОЕ!


