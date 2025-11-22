# 🚀 ЗАПУСК LOCALHOST - БЫСТРЫЙ СТАРТ

**Домен:** https://onai.academy (только этот!)  
**Storage:** Supabase Storage (не Cloudflare R2)  
**Статус БД:** ✅ ВСЕ ТАБЛИЦЫ ГОТОВЫ

---

## ⚡ ШАГИ (5 МИНУТ):

### 1️⃣ Примени тестовые данные для Saint (30 сек)
```bash
# В Supabase SQL Editor:
CREATE_AI_MENTOR_DATA_FOR_SAINT.sql
```

### 2️⃣ Запусти Backend (1 мин)
```bash
cd backend
npm run dev

# Должно показать:
# ✅ Server running on http://localhost:3000
# ✅ Connected to Supabase
```

### 3️⃣ Запусти Frontend (1 мин)
```bash
# Новый терминал
npm run dev

# Должно показать:
# ✅ VITE ready at http://localhost:5173
```

### 4️⃣ Открой NeuroHub
```
http://localhost:5173/neurohub
```

---

## ✅ ЧТО ТЕСТИРОВАТЬ:

### БАЗОВОЕ (5 минут):
- [ ] Статистика: Level 4, 350 XP, Streak 7
- [ ] Миссии: 3 активных (8/10, 350/500, 7/10)
- [ ] Цели: 2 недельных
- [ ] Чат AI работает

### AI ПЕРСОНАЛИЗАЦИЯ (5 минут):
- [ ] Напиши: "Привет! Как мои дела?"
- [ ] AI знает имя (Saint), уровень, прогресс
- [ ] Напиши: "Как получить API ключ OpenAI?"
- [ ] AI дает готовый ответ из базы знаний

### ТРИГГЕРЫ (опционально):
- [ ] В БД есть задача в ai_mentor_tasks (проблема с видео)
- [ ] AI может предложить помощь

---

## 🎯 СТАТУС СИСТЕМЫ:

### ✅ ЧТО РАБОТАЕТ:
- ✅ База данных (все таблицы)
- ✅ Триггеры (streak, video_struggle)
- ✅ Функции (7 функций)
- ✅ База знаний (12 записей)
- ✅ Тестовые данные для Saint

### ⚠️ ЧТО НЕ ПОДКЛЮЧЕНО:
- ⚠️ Frontend НЕ отправляет метрики видео (пока)
- ⚠️ Backend НЕ принимает метрики видео (пока)

**Это нормально!** Мы подключим это ПОСЛЕ базового тестирования (~1 час работы).

---

## 📋 ЧЕКЛИСТ ПРИ ЗАПУСКЕ:

### Backend должен показать:
```
✅ Server listening on port 3000
✅ Supabase connected
✅ Database ready
```

### Frontend должен показать:
```
✅ VITE v5.x.x ready in XXX ms
➜  Local:   http://localhost:5173/
```

### NeuroHub должен показать:
```
✅ Карточки статистики (Level, XP, Streak)
✅ Миссии (3 активных)
✅ Цели (2 недельных)
✅ Чат AI (справа)
```

---

## 🐛 ЕСЛИ ЧТО-ТО НЕ РАБОТАЕТ:

### Backend не запускается:
```bash
cd backend
rm -rf node_modules
npm install
npm run dev
```

### Frontend не запускается:
```bash
rm -rf node_modules
npm install
npm run dev
```

### NeuroHub пустой (нет данных):
```sql
-- Проверь что данные для Saint созданы:
SELECT * FROM user_statistics 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'saint@onaiacademy.kz');
```

### AI не отвечает:
```bash
# Проверь backend/.env:
OPENAI_API_KEY=sk-proj-твой_ключ
OPENAI_ASSISTANT_CURATOR_ID=asst_твой_ассистент

# Проверь баланс OpenAI
```

---

## 🎯 ПОСЛЕ ТЕСТИРОВАНИЯ:

### Если всё работает:
1. [ ] Подключим метрики видео (~1 час)
2. [ ] Протестируем триггеры video_struggle
3. [ ] Оптимизируем OpenAI (кэш, gpt-4o-mini)
4. [ ] Добавим мониторинг

### Если есть баги:
1. [ ] Скриншот ошибки
2. [ ] Что делал
3. [ ] Что ожидал
4. [ ] Я исправлю быстро!

---

## 📝 ВАЖНЫЕ ЗАМЕТКИ:

### Домен:
- ✅ **onai.academy** - основной
- ❌ ~~integratoronai.kz~~ - старый, не используется

### Storage:
- ✅ **Supabase Storage** - для всех файлов
- ❌ ~~Cloudflare R2~~ - не используется

### База данных:
- ✅ Все 9 таблиц AI-наставника созданы
- ✅ Все 7 функций работают
- ✅ Триггеры настроены
- ✅ Тестовые данные для Saint готовы

---

## 🚀 ГОТОВ К ЗАПУСКУ!

**Запускай Backend + Frontend и тестируй!**

**Жду фидбека! 💪**

