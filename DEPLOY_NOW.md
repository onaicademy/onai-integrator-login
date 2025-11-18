# 🚀 ДЕПЛОЙ НА PRODUCTION - ФИНАЛЬНАЯ ИНСТРУКЦИЯ

## ✅ ВЫПОЛНЕНО:

- ✅ Все изменения добавлены в Git
- ✅ Commit создан: `98cbbab`
- ✅ Push на GitHub: `main -> main`
- ✅ Код на GitHub обновлён

**Коммит:** `feat: Add module duration counter, fix duplicate reorder route, add tip/description columns`

---

## ⚠️ КРИТИЧНО: SQL МИГРАЦИЯ (ВЫПОЛНИ СЕЙЧАС!)

**URL:** https://supabase.com/dashboard/project/arqhkacellqbhjhbebfh

**SQL Editor → New Query → Вставь и запусти:**

```sql
-- Добавляем отсутствующие колонки
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS tip TEXT;

-- Комментарии
COMMENT ON COLUMN lessons.description IS 'Описание урока';
COMMENT ON COLUMN lessons.tip IS 'Полезный совет или рекомендация для студента по данному уроку';

-- Перезагрузка схемы PostgREST (КРИТИЧНО!)
NOTIFY pgrst, 'reload schema';

-- Проверка (должна показать все колонки)
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'lessons' 
ORDER BY ordinal_position;
```

**ПРОВЕРЬ РЕЗУЛЬТАТ:**  
В таблице внизу должны быть строки:
- ✅ `description | text | YES`
- ✅ `tip | text | YES`

---

## 🔧 ДЕПЛОЙ BACKEND НА DIGITALOCEAN

### Способ 1: Одной командой (рекомендуется)

**Скопируй и выполни:**

```bash
ssh root@207.154.231.30 "cd /var/www/onai-integrator-login-main && git pull origin main && cd backend && npm install --production && npm run build && pm2 restart onai-backend && pm2 logs onai-backend --lines 20"
```

### Способ 2: Пошагово (если хочешь видеть каждый шаг)

```bash
# 1. Подключись к серверу
ssh root@207.154.231.30

# 2. Перейди в директорию
cd /var/www/onai-integrator-login-main

# 3. Стяни изменения
git pull origin main

# 4. Перейди в backend
cd backend

# 5. Установи зависимости
npm install --production

# 6. Собери проект
npm run build

# 7. Перезапусти PM2
pm2 restart onai-backend

# 8. Проверь логи
pm2 logs onai-backend --lines 20

# 9. Проверь статус
pm2 status
```

---

## ✅ ПРОВЕРКА BACKEND ПОСЛЕ ДЕПЛОЯ:

### 1. Health Check
```bash
curl https://api.onai.academy/api/health
```

**Ожидаемый ответ:**
```json
{"status":"ok","timestamp":"2025-11-18T..."}
```

### 2. Проверка в браузере
```
https://api.onai.academy/api/health
```

Должен показать: `{"status":"ok","timestamp":"..."}`

---

## 🌐 ДЕПЛОЙ FRONTEND НА VERCEL

### Автоматический (уже запущен)
После push на GitHub, Vercel автоматически начал деплой:
- ✅ Следи за статусом: https://vercel.com/dashboard
- ✅ Или дождись webhook уведомления

### Вручную (если нужно форсировать)
```bash
# В локальной директории проекта
cd C:\onai-integrator-login
npx vercel --prod
```

---

## 🔍 ФИНАЛЬНАЯ ПРОВЕРКА:

### 1. Backend работает?
```bash
curl https://api.onai.academy/api/health
```
**Статус:** 200 OK

### 2. Frontend доступен?
```
https://onai.academy
```
**Статус:** Загружается без ошибок

### 3. Создание урока работает?
1. Открой: `https://onai.academy/course/1/module/1`
2. Нажми "Добавить урок"
3. Заполни поля (название, описание, совет)
4. Нажми "Создать урок"
5. **Должно работать БЕЗ ошибок!**

### 4. Счётчик длительности?
1. Открой: `https://onai.academy/course/1/module/1`
2. Под прогресс-баром должна быть строка:
   ```
   ⏱️ Общая длительность: X минут (Y уроков)
   ```

### 5. Drag & Drop работает?
1. Наведи на урок
2. Появится иконка захвата
3. Перетащи урок вверх/вниз
4. Обнови страницу → порядок сохранён

---

## 🐛 ЕСЛИ ЧТО-ТО НЕ РАБОТАЕТ:

### Проблема 1: "Could not find the 'description' column"
**Решение:** Выполни SQL миграцию (см. выше)

### Проблема 2: Backend не обновился
```bash
ssh root@207.154.231.30
cd /var/www/onai-integrator-login-main
git reset --hard origin/main
git pull origin main
cd backend
npm run build
pm2 restart onai-backend
pm2 logs onai-backend
```

### Проблема 3: Frontend показывает старую версию
1. Открой DevTools (F12)
2. Нажми Ctrl+Shift+R (hard refresh)
3. Очисти кэш браузера
4. Проверь Vercel Dashboard - деплой завершён?

### Проблема 4: CORS ошибки
**На сервере проверь `.env`:**
```bash
ssh root@207.154.231.30
cat /var/www/onai-integrator-login-main/backend/.env | grep FRONTEND_URL
```
Должно быть: `FRONTEND_URL=https://onai.academy`

---

## 📋 ЧЕКЛИСТ:

- [ ] **1. SQL миграция выполнена** ⚠️ КРИТИЧНО!
- [ ] **2. Backend задеплоен на DigitalOcean**
- [ ] **3. Backend health check OK**
- [ ] **4. Frontend задеплоен на Vercel**
- [ ] **5. Frontend доступен https://onai.academy**
- [ ] **6. Создание урока работает**
- [ ] **7. Счётчик длительности отображается**
- [ ] **8. Drag & Drop работает**

---

## 🎯 КОМАНДЫ ДЛЯ КОПИРОВАНИЯ:

### SQL Миграция (Supabase):
```sql
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS tip TEXT;
COMMENT ON COLUMN lessons.description IS 'Описание урока';
COMMENT ON COLUMN lessons.tip IS 'Полезный совет или рекомендация для студента по данному уроку';
NOTIFY pgrst, 'reload schema';
SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'lessons' ORDER BY ordinal_position;
```

### Backend Deploy (DigitalOcean):
```bash
ssh root@207.154.231.30 "cd /var/www/onai-integrator-login-main && git pull origin main && cd backend && npm install --production && npm run build && pm2 restart onai-backend && pm2 logs onai-backend --lines 20"
```

### Backend Health Check:
```bash
curl https://api.onai.academy/api/health
```

---

**Создано:** 2025-11-18  
**Коммит:** 98cbbab  
**Статус:** READY TO DEPLOY 🚀
