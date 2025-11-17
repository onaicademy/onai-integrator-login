# 🚀 GIT PUSH И ДЕПЛОЙ - ИНСТРУКЦИИ

## ✅ ЧТО МЫ СДЕЛАЛИ (что коммитим):

### Frontend:
- ✅ Исправлена кликабельность уроков
- ✅ Убраны дубликаты при создании урока
- ✅ Откачена на красивую страницу Lesson.tsx
- ✅ Добавлены кнопки навигации
- ✅ Полностью рабочий видеоплеер
- ✅ Загрузка видео и материалов работает

### Backend:
- ✅ Удален `updated_at` из всех routes
- ✅ Исправлена работа с `lessons` таблицей
- ✅ Видео сохраняется в `lessons.video_url`
- ✅ Материалы загружаются в Supabase Storage
- ✅ Детальное логирование

---

## 📦 ШАГ 1: GIT COMMIT + PUSH

Открой PowerShell и выполни:

```powershell
# Перейди в папку проекта
cd C:\onai-integrator-login

# Проверь статус
git status

# Добавь все изменения
git add .

# Создай commit
git commit -m "✅ Fix: Урок создается без дубликатов, видеоплеер работает, кликабельность исправлена

- Исправлена кликабельность уроков (status='active' по умолчанию)
- Убрано двойное создание урока в LessonEditDialog
- Откачена страница урока на красивую версию Lesson.tsx
- Удален updated_at из всех backend routes
- Видео сохраняется в lessons.video_url
- Материалы загружаются корректно
- Добавлены кнопки навигации на странице урока"

# Push на GitHub
git push origin main
```

---

## 🚀 ШАГ 2: ДЕПЛОЙ BACKEND НА DIGITALOCEAN

### Вариант A: Автоматический деплой (если настроен)

```powershell
ssh root@207.154.231.30 "cd /var/www/onai-integrator-login-main && git pull origin main && cd backend && npm install --production && npm run build && pm2 restart onai-backend && pm2 logs onai-backend --lines 20"
```

### Вариант B: Ручной деплой

```bash
# 1. Подключись к серверу
ssh root@207.154.231.30

# 2. Перейди в папку проекта
cd /var/www/onai-integrator-login-main

# 3. Обнови код
git pull origin main

# 4. Обнови зависимости Backend
cd backend
npm install --production

# 5. Собери TypeScript
npm run build

# 6. Перезапусти PM2
pm2 restart onai-backend

# 7. Проверь логи
pm2 logs onai-backend --lines 20

# 8. Проверь статус
pm2 status

# 9. Проверь API
curl https://api.onai.academy/api/health
```

---

## 🌐 ШАГ 3: ДЕПЛОЙ FRONTEND НА VERCEL

### Через Vercel Dashboard:

1. Открой [Vercel Dashboard](https://vercel.com/dashboard)
2. Найди проект **onai-academy**
3. Нажми **"Redeploy"** (или Vercel подхватит push автоматически)
4. Дождись деплоя (~2-3 минуты)
5. Проверь: https://onai.academy

### Если нужно вручную:

```powershell
# Установи Vercel CLI (если нет)
npm install -g vercel

# Логин
vercel login

# Деплой
cd C:\onai-integrator-login
vercel --prod
```

---

## ⚙️ ШАГ 4: ПРОВЕРКА ENVIRONMENT VARIABLES

### Backend на DigitalOcean:

Проверь что в `/var/www/onai-integrator-login-main/backend/.env` есть:

```env
# Database
SUPABASE_URL=https://arqhkacellqbhjhbebfh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# Cloudflare R2
R2_ENDPOINT=https://ed982acdb78dd7e090e6584c8e46f2bb.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=be03b0...
R2_SECRET_ACCESS_KEY=5b3b98... (64 символа!)
R2_BUCKET_NAME=onai-academy-videos
R2_PUBLIC_URL=https://pub-...r2.dev

# Server
PORT=3000
NODE_ENV=production
```

### Frontend на Vercel:

Проверь Environment Variables в Vercel Dashboard:

```
VITE_SUPABASE_URL=https://arqhkacellqbhjhbebfh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_API_URL=https://api.onai.academy
```

---

## 🧪 ШАГ 5: ТЕСТИРОВАНИЕ ПОСЛЕ ДЕПЛОЯ

### 1. Проверь Backend API:

```bash
# Health check
curl https://api.onai.academy/api/health

# Lessons endpoint
curl https://api.onai.academy/api/lessons?module_id=1
```

### 2. Проверь Frontend:

Открой: https://onai.academy

1. ✅ Авторизация работает
2. ✅ Список курсов загружается
3. ✅ Список уроков загружается
4. ✅ Клик на урок открывает страницу
5. ✅ Видео отображается
6. ✅ Материалы доступны

### 3. Проверь создание урока:

1. Открой https://onai.academy/course/1/module/1
2. Нажми "Добавить урок"
3. Заполни форму
4. Загрузи видео (5-10 MB)
5. Загрузи материалы
6. Нажми "Создать урок"
7. **Проверь:** Урок создался **ОДИН РАЗ** (не дубликат)
8. **Проверь:** Видео отображается
9. **Проверь:** Материалы доступны

---

## 🔍 ШАГ 6: ЕСЛИ ЧТО-ТО НЕ РАБОТАЕТ

### Backend не отвечает:

```bash
# Подключись к серверу
ssh root@207.154.231.30

# Проверь PM2
pm2 status

# Перезапусти
pm2 restart onai-backend

# Смотри логи
pm2 logs onai-backend

# Проверь порт
netstat -tuln | grep 3000
```

### Frontend не подключается к Backend:

Проверь CORS в `backend/src/server.ts`:

```typescript
app.use(cors({
  origin: [
    'http://localhost:8080',
    'http://localhost:5173',
    'https://onai.academy',
    'https://www.onai.academy'
  ],
  credentials: true
}));
```

### Видео не загружается:

1. Проверь R2 credentials в `.env`
2. Проверь Supabase Storage policies
3. Смотри Backend logs: `pm2 logs onai-backend`

---

## 📋 ЧЕКЛИСТ:

- [ ] Git commit сделан
- [ ] Git push на GitHub
- [ ] Backend задеплоен на DigitalOcean
- [ ] Frontend задеплоен на Vercel
- [ ] Environment variables проверены
- [ ] Backend API отвечает (curl https://api.onai.academy/api/health)
- [ ] Frontend открывается (https://onai.academy)
- [ ] Авторизация работает
- [ ] Уроки загружаются
- [ ] Клик на урок работает
- [ ] Видео отображается
- [ ] Материалы доступны
- [ ] Создание урока работает (без дубликатов)

---

## 🎯 ВАЖНО:

### НЕ забудь проверить:

1. **CORS** - Frontend на Vercel должен иметь доступ к Backend API
2. **Environment Variables** - должны быть на обоих серверах
3. **Supabase RLS Policies** - должны разрешать доступ
4. **Cloudflare R2** - credentials должны быть правильные

---

## 📤 ПОСЛЕ ДЕПЛОЯ НАПИШИ МНЕ:

```
=== РЕЗУЛЬТАТ ДЕПЛОЯ ===

1. Git push:
   ✅ DONE

2. Backend деплой:
   ✅ SUCCESS / ❌ FAILED
   [Если failed - скопируй ошибку]

3. Frontend деплой:
   ✅ SUCCESS / ❌ FAILED

4. Backend API:
   curl https://api.onai.academy/api/health
   [Результат]

5. Frontend:
   https://onai.academy
   ✅ РАБОТАЕТ / ❌ НЕ РАБОТАЕТ

6. Тест создания урока:
   ✅ РАБОТАЕТ / ❌ НЕ РАБОТАЕТ
```

---

# 🚀 ВЫПОЛНЯЙ ПО ПОРЯДКУ И ПИШИ РЕЗУЛЬТАТЫ!
