# 📝 ЧТО НУЖНО СДЕЛАТЬ ВРУЧНУЮ СЕЙЧАС

## ✅ ОБЯЗАТЕЛЬНЫЕ ЗАДАЧИ:

### 1️⃣ GIT COMMIT + PUSH

```powershell
cd C:\onai-integrator-login
git add .
git commit -m "✅ Fix: Урок создается без дубликатов, видеоплеер работает"
git push origin main
```

**Зачем:** Сохранить текущую рабочую версию перед новыми изменениями.

---

### 2️⃣ ДЕПЛОЙ BACKEND НА DIGITALOCEAN

**Вариант A: Автоматический** (если помнишь команду):
```powershell
ssh root@207.154.231.30 "cd /var/www/onai-integrator-login-main && git pull origin main && cd backend && npm install --production && npm run build && pm2 restart onai-backend && pm2 logs onai-backend --lines 20"
```

**Вариант B: Ручной:**
```bash
# 1. Подключись
ssh root@207.154.231.30

# 2. Обнови код
cd /var/www/onai-integrator-login-main
git pull origin main

# 3. Backend
cd backend
npm install --production
npm run build
pm2 restart onai-backend
pm2 logs onai-backend

# 4. Проверь
curl http://localhost:3000/api/health
```

---

### 3️⃣ ПРОВЕРЬ ENVIRONMENT VARIABLES НА СЕРВЕРЕ

```bash
# На сервере
cat /var/www/onai-integrator-login-main/backend/.env
```

**Должно быть:**
```env
R2_ENDPOINT=https://ed982acdb78dd7e090e6584c8e46f2bb.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=be03b0...
R2_SECRET_ACCESS_KEY=5b3b98... (64 символа!)
R2_BUCKET_NAME=onai-academy-videos
R2_PUBLIC_URL=https://pub-...r2.dev
SUPABASE_URL=https://arqhkacellqbhjhbebfh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
PORT=3000
NODE_ENV=production
```

**Если чего-то нет - добавь:**
```bash
nano /var/www/onai-integrator-login-main/backend/.env
# Добавь недостающие переменные
# Ctrl+X, Y, Enter для сохранения
```

---

### 4️⃣ ДЕПЛОЙ FRONTEND НА VERCEL

**Автоматически:**
- Vercel подхватит push на GitHub
- Дождись ~2-3 минуты
- Проверь https://onai.academy

**Или вручную через Dashboard:**
1. Открой [Vercel Dashboard](https://vercel.com/dashboard)
2. Найди проект
3. Нажми "Redeploy"

---

### 5️⃣ ПРОВЕРЬ VERCEL ENVIRONMENT VARIABLES

В Vercel Dashboard → Settings → Environment Variables:

```
VITE_SUPABASE_URL=https://arqhkacellqbhjhbebfh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_API_URL=https://api.onai.academy
```

**Если нет VITE_API_URL - ДОБАВЬ!**

---

## ⚠️ ОПЦИОНАЛЬНЫЕ (если что-то не работает):

### 6️⃣ УДАЛИ ДУБЛИКАТЫ УРОКОВ (если есть)

**Через UI:**
1. Открой http://localhost:8080/course/1/module/1
2. Найди пустые уроки (без видео)
3. Нажми кнопку корзины

**Или через Supabase SQL:**
```sql
-- Удалить уроки БЕЗ видео
DELETE FROM lessons 
WHERE module_id = 1 
  AND video_url IS NULL;
```

---

### 7️⃣ ПРОВЕРЬ SUPABASE STORAGE BUCKET

В Supabase Dashboard → Storage:

**Должен быть bucket:** `lesson-materials`
- **Public:** Yes
- **File size limit:** 50 MB

**Если нет - создай:**
1. Storage → New bucket
2. Name: `lesson-materials`
3. Public: ✅
4. Create

---

### 8️⃣ ПРОВЕРЬ CORS НА BACKEND

Если frontend не подключается к backend, проверь:

`backend/src/server.ts`:
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

---

## 🧪 ТЕСТИРОВАНИЕ ПОСЛЕ ДЕПЛОЯ:

### Тест 1: Backend API
```bash
curl https://api.onai.academy/api/health
# Должно вернуть: {"status":"ok"}

curl https://api.onai.academy/api/lessons?module_id=1
# Должно вернуть: {"lessons":[...]}
```

### Тест 2: Frontend
1. Открой https://onai.academy
2. Авторизуйся
3. Открой курс → модуль
4. Проверь что уроки загружаются
5. Кликни на урок
6. Проверь что видео отображается

### Тест 3: Создание урока
1. Нажми "Добавить урок"
2. Заполни форму
3. Загрузи видео + материалы
4. Создай урок
5. **Проверь:** Создался ОДИН урок (не дубликат)
6. **Проверь:** Видео отображается
7. **Проверь:** Материалы доступны

---

## 📊 ЧЕКЛИСТ:

**Обязательно:**
- [ ] Git commit + push
- [ ] Backend деплой на DigitalOcean
- [ ] Проверка `.env` на сервере
- [ ] Frontend деплой на Vercel
- [ ] Проверка Vercel env variables
- [ ] Тест Backend API (curl)
- [ ] Тест Frontend (открыть сайт)
- [ ] Тест создания урока

**Опционально:**
- [ ] Удалить дубликаты уроков
- [ ] Проверить Supabase Storage bucket
- [ ] Проверить CORS
- [ ] Проверить R2 credentials

---

## 🚨 ЕСЛИ ЧТО-ТО НЕ РАБОТАЕТ:

### Backend не отвечает:
```bash
ssh root@207.154.231.30
pm2 logs onai-backend
pm2 restart onai-backend
```

### Frontend не подключается:
- Проверь VITE_API_URL в Vercel
- Проверь CORS в backend
- Проверь что backend запущен

### Видео не загружается:
- Проверь R2 credentials в `.env`
- Проверь что R2_SECRET_ACCESS_KEY = 64 символа
- Смотри pm2 logs onai-backend

---

## 📤 ПОСЛЕ ВЫПОЛНЕНИЯ НАПИШИ:

```
=== РЕЗУЛЬТАТ ===

✅ Git push: DONE
✅ Backend деплой: SUCCESS/FAILED
✅ Frontend деплой: SUCCESS/FAILED
✅ Backend API работает: YES/NO
✅ Frontend работает: YES/NO
✅ Создание урока: WORKS/BROKEN
✅ Видео отображается: YES/NO
✅ Материалы доступны: YES/NO

Проблемы (если есть):
[опиши]
```

---

# 🚀 НАЧИНАЙ С ШАГА 1 (GIT PUSH)!

