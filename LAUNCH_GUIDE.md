# 🚀 ИНСТРУКЦИЯ ПО ЗАПУСКУ onAI Academy

**Дата:** 21 ноября 2025
**Репозиторий:** onai-integrator-login

---

## 📋 ЭТАП 0: ПОДГОТОВКА БД (ЗАПУСТИТЬ ОДИН РАЗ)

### 1. Применить миграции в Supabase

Перейдите в Supabase Dashboard → SQL Editor и выполните **по порядку**:

```bash
1. supabase/migrations/20251121_ai_mentor_missing_tables.sql
2. supabase/migrations/20251121_ai_mentor_functions.sql
3. supabase/seeds/curator_knowledge_base_seed.sql
```

**Как выполнить:**
1. Откройте файл в VS Code
2. Скопируйте весь SQL код
3. Вставьте в Supabase SQL Editor
4. Нажмите "Run"
5. Проверьте что появилось сообщение "Success"

**Проверка:**
```sql
-- Проверка что таблицы созданы
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'user_progress',
    'video_watch_sessions',
    'missions',
    'weekly_goals',
    'daily_challenges',
    'curator_knowledge_base',
    'student_questions_log',
    'ai_mentor_advice_log',
    'ai_mentor_tasks'
  )
ORDER BY table_name;
```

Должно вернуть 9 таблиц ✅

---

## 🔧 ЭТАП 1: НАСТРОЙКА ПЕРЕМЕННЫХ ОКРУЖЕНИЯ

### Frontend (.env в корне)

Создайте файл `.env` в **корне проекта**:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Backend API URL
VITE_API_URL=http://localhost:3000

# OpenAI Configuration (опционально, если не через Backend)
VITE_OPENAI_API_KEY=sk-proj-your_openai_api_key_here
VITE_OPENAI_ASSISTANT_ID=asst_your_assistant_id_here
```

**Где взять данные:**
1. `VITE_SUPABASE_URL` - Supabase Dashboard → Settings → API → Project URL
2. `VITE_SUPABASE_ANON_KEY` - Supabase Dashboard → Settings → API → anon public
3. `VITE_OPENAI_API_KEY` - https://platform.openai.com/api-keys
4. `VITE_OPENAI_ASSISTANT_ID` - https://platform.openai.com/assistants

---

### Backend (backend/.env)

Создайте файл `backend/.env`:

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# OpenAI Configuration
OPENAI_API_KEY=sk-proj-your_openai_api_key_here
OPENAI_ASSISTANT_CURATOR_ID=asst_curator_id_here
OPENAI_ASSISTANT_MENTOR_ID=asst_mentor_id_here
OPENAI_ASSISTANT_ANALYST_ID=asst_analyst_id_here

# Telegram Bots (опционально)
AI_MENTOR_TELEGRAM_TOKEN=your_mentor_bot_token_here
AI_ANALYST_TELEGRAM_TOKEN=your_analyst_bot_token_here

# JWT Secret
JWT_SECRET=your_random_secret_key_here
```

**Где взять данные:**
1. `SUPABASE_SERVICE_ROLE_KEY` - Supabase Dashboard → Settings → API → service_role secret
2. Остальное - то же что и для Frontend

---

## 🏃 ЭТАП 2: ЗАПУСК ПРОЕКТА

### Вариант 1: Запуск в 2 терминалах (РЕКОМЕНДУЕТСЯ)

**Терминал 1 - Backend:**
```bash
cd backend
npm install
npm run dev
```

Должно появиться:
```
✅ Backend запущен на http://localhost:3000
✅ Supabase подключен
✅ OpenAI готов
```

**Терминал 2 - Frontend:**
```bash
npm install
npm run dev
```

Должно появиться:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

### Вариант 2: Запуск через один скрипт (если есть concurrently)

```bash
npm run dev:all
```

---

## 🌐 ЭТАП 3: ОТКРЫТЬ В БРАУЗЕРЕ

Откройте: **http://localhost:5173**

### Авторизация:

1. Зарегистрируйтесь или войдите
2. После авторизации перейдите на страницу **NeuroHub** (`/neurohub`)
3. Проверьте что:
   - ✅ Чат с AI работает
   - ✅ Карточки статистики отображаются
   - ✅ Достижения видны

---

## 🧪 ЭТАП 4: ТЕСТИРОВАНИЕ AI-НАСТАВНИКА

### Тест 1: Отправка сообщения в чат

1. Откройте NeuroHub
2. Напишите: "Привет! Как мои дела?"
3. AI должен ответить с вашим именем и статистикой

### Тест 2: Прикрепление файла

1. Нажмите 📎
2. Выберите PDF или изображение
3. Отправьте
4. AI должен обработать файл

### Тест 3: Прогресс урока

1. Откройте любой урок
2. Посмотрите видео
3. Завершите урок
4. Вернитесь в NeuroHub
5. Проверьте что:
   - ✅ Прогресс обновился
   - ✅ XP начислен
   - ✅ Streak обновился

### Тест 4: Проверка достижений

Выполните SQL в Supabase:
```sql
-- Принудительная проверка достижений
SELECT * FROM check_and_unlock_achievements(auth.uid());
```

Должны разблокироваться доступные достижения.

---

## 🔍 ЭТАП 5: ПРОВЕРКА БАЗЫ ДАННЫХ

### Проверить что данные сохраняются:

```sql
-- 1. Проверка прогресса
SELECT * FROM user_progress WHERE user_id = 'your_user_id';

-- 2. Проверка сессий видео
SELECT * FROM video_watch_sessions WHERE user_id = 'your_user_id';

-- 3. Проверка вопросов
SELECT * FROM student_questions_log WHERE user_id = 'your_user_id';

-- 4. Проверка достижений
SELECT * FROM user_achievements WHERE user_id = 'your_user_id';

-- 5. Проверка статистики
SELECT * FROM user_statistics WHERE user_id = 'your_user_id';
```

---

## ⚠️ TROUBLESHOOTING

### Проблема: Backend не запускается

**Решение:**
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Проблема: Frontend не видит Backend

**Решение:**
1. Проверьте что Backend запущен на http://localhost:3000
2. Проверьте `.env`: `VITE_API_URL=http://localhost:3000`
3. Откройте DevTools → Network → проверьте запросы

### Проблема: AI не отвечает

**Решение:**
1. Проверьте `OPENAI_API_KEY` в backend/.env
2. Проверьте логи Backend (там должна быть ошибка)
3. Проверьте что у вас есть деньги на OpenAI аккаунте

### Проблема: Нет данных в NeuroHub

**Решение:**
1. Проверьте что миграции применены
2. Проверьте RLS политики в Supabase
3. Проверьте что вы авторизованы

### Проблема: Ошибка 403 при запросах

**Решение:**
- Проверьте RLS политики в Supabase
- Проверьте что `SUPABASE_SERVICE_ROLE_KEY` указан в backend/.env
- Проверьте что JWT токен валидный

---

## 📊 МОНИТОРИНГ

### Backend логи:
```bash
# В терминале Backend появляются логи:
[INFO] POST /api/analytics/student/:userId/dashboard
[INFO] POST /api/openai/threads/:threadId/messages
[INFO] User stats updated for user_id=...
```

### Frontend DevTools:
```bash
F12 → Console → проверьте логи
F12 → Network → проверьте API запросы
```

### Supabase Dashboard:
```
Table Editor → проверьте данные в таблицах
Logs → проверьте ошибки
```

---

## 🎯 СЛЕДУЮЩИЕ ШАГИ

После успешного запуска:

1. ✅ **Этап 1** - Analytics Engine (трекинг видео)
2. ✅ **Этап 2** - Achievements System (автоматическая разблокировка)
3. ✅ **Этап 3** - Missions & Goals (миссии и цели)
4. ✅ **Этап 4** - Dashboard API (оптимизация)
5. ✅ **Этап 5** - AI Context Builder (контекст для AI)
6. ✅ **Этап 6** - Персонализированные советы
7. ✅ **Этап 7** - Пуш-уведомления

---

## 📝 ГОТОВО К РАБОТЕ!

Если все работает - можно начинать разработку! 🚀
