# 🚀 PRODUCTION DEPLOYMENT - 2025-11-18

## ⚠️ КРИТИЧНО: SQL МИГРАЦИЯ ПЕРЕД ДЕПЛОЕМ!

**БЕЗ ЭТОЙ МИГРАЦИИ СОЗДАНИЕ УРОКОВ НЕ БУДЕТ РАБОТАТЬ!**

### 📝 Выполни в Supabase SQL Editor:

```sql
-- ========================================
-- КРИТИЧНАЯ МИГРАЦИЯ: Добавление колонок description и tip
-- ========================================

-- 1. Добавляем колонку description
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS description TEXT;

-- 2. Добавляем колонку tip
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS tip TEXT;

-- 3. Комментарии для ясности
COMMENT ON COLUMN lessons.description IS 'Описание урока';
COMMENT ON COLUMN lessons.tip IS 'Полезный совет или рекомендация для студента по данному уроку';

-- 4. Перезагрузка схемы PostgREST (ОБЯЗАТЕЛЬНО!)
NOTIFY pgrst, 'reload schema';

-- 5. ПРОВЕРКА (должна показать все колонки)
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'lessons' 
ORDER BY ordinal_position;
```

**ОЖИДАЕМЫЙ РЕЗУЛЬТАТ:**  
Таблица должна содержать строки:
- ✅ `description | text | YES`
- ✅ `tip | text | YES`

---

## 📦 ИЗМЕНЕНИЯ В ЭТОМ РЕЛИЗЕ:

### ✅ Backend (backend/src/routes/lessons.ts)
- ✅ Удалён дублирующийся роут `PUT /reorder` (строки 198-220)
- ✅ Оставлен один правильный роут `/reorder` с логированием

### ✅ Frontend (src/pages/Module.tsx)
- ✅ Добавлен счётчик длительности модуля
- ✅ Показывает общую длительность всех уроков
- ✅ Правильное склонение: "урок/урока/уроков"

### ✅ Новые функции (из предыдущих коммитов):
- ✅ Drag & Drop уроков (@dnd-kit)
- ✅ Автонумерация уроков (1, 2, 3...)
- ✅ Fullscreen видеоплеера
- ✅ Переключение качества видео
- ✅ Редактирование совета по уроку (tip)
- ✅ Удаление видео (DELETE API)
- ✅ Загрузка материалов при редактировании урока

---

## 🔧 DEPLOYMENT НА DIGITALOCEAN:

### Способ 1: Автоматический (рекомендуется)

```bash
ssh root@207.154.231.30 "cd /var/www/onai-integrator-login-main && \
git pull origin main && \
cd backend && \
npm install --production && \
npm run build && \
pm2 restart onai-backend && \
pm2 logs onai-backend --lines 20"
```

### Способ 2: Пошаговый (для диагностики)

```bash
# 1. Подключись к серверу
ssh root@207.154.231.30

# 2. Перейди в директорию проекта
cd /var/www/onai-integrator-login-main

# 3. Проверь текущую ветку
git branch

# 4. Стяни изменения
git pull origin main

# 5. Перейди в backend
cd backend

# 6. Установи зависимости (если нужно)
npm install --production

# 7. Собери проект
npm run build

# 8. Перезапусти PM2
pm2 restart onai-backend

# 9. Проверь логи
pm2 logs onai-backend --lines 20

# 10. Проверь статус
pm2 status
```

---

## 🔍 ПРОВЕРКА ПОСЛЕ ДЕПЛОЯ:

### 1. Backend Health Check
```bash
curl https://api.onai.academy/api/health
```
**Ожидаемый результат:**
```json
{"status":"ok","timestamp":"2025-11-18T..."}
```

### 2. Проверка создания урока
```bash
curl -X POST https://api.onai.academy/api/lessons \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Test Lesson",
    "description": "Test Description",
    "tip": "Test Tip",
    "module_id": 1
  }'
```
**Ожидаемый результат:** `201 Created` с данными урока

### 3. Проверка Frontend
```
https://onai.academy/course/1/module/1
```
**Проверь:**
- ✅ Счётчик длительности модуля отображается
- ✅ Drag & Drop уроков работает
- ✅ Создание урока работает
- ✅ Редактирование урока работает

---

## 🌐 FRONTEND DEPLOY (VERCEL):

### Автоматически
Push на GitHub → Vercel автоматически задеплоит

### Вручную (если нужно)
```bash
# В локальной директории проекта
npx vercel --prod
```

---

## ⚠️ ВАЖНЫЕ ПРОВЕРКИ:

### ✅ Environment Variables на Production:

**Backend (.env на сервере):**
```env
SUPABASE_URL=https://arqhkacellqbhjhbebfh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJh...
OPENAI_API_KEY=sk-...
FRONTEND_URL=https://onai.academy
R2_ENDPOINT=https://...
R2_BUCKET_NAME=onai-academy-videos
R2_PUBLIC_URL=https://...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
```

**Frontend (Vercel Environment Variables):**
```env
VITE_API_URL=https://api.onai.academy
VITE_SUPABASE_URL=https://arqhkacellqbhjhbebfh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJh...
```

---

## 🐛 TROUBLESHOOTING:

### Проблема 1: "Could not find the 'description' column"
**Решение:** Выполни SQL миграцию (см. начало документа)

### Проблема 2: Backend не перезапускается
```bash
pm2 kill
pm2 start ecosystem.config.js
```

### Проблема 3: Старый код после деплоя
```bash
# На сервере:
git reset --hard origin/main
git pull origin main
npm run build
pm2 restart onai-backend
```

### Проблема 4: CORS ошибки
**Проверь:** `FRONTEND_URL` в `.env` на сервере = `https://onai.academy`

---

## 📊 ЧЕКЛИСТ ДЕПЛОЯ:

- [ ] **1. SQL миграция выполнена в Supabase**
- [ ] **2. Git commit + push на GitHub**
- [ ] **3. Backend задеплоен на DigitalOcean**
- [ ] **4. PM2 перезапущен**
- [ ] **5. Backend health check OK**
- [ ] **6. Frontend задеплоен на Vercel**
- [ ] **7. Frontend доступен на https://onai.academy**
- [ ] **8. Создание урока работает**
- [ ] **9. Редактирование урока работает**
- [ ] **10. Drag & Drop работает**

---

## 🎯 ФИНАЛЬНАЯ ПРОВЕРКА:

1. Открой: `https://onai.academy/course/1/module/1`
2. Создай новый урок с описанием и советом
3. Проверь что урок создался
4. Проверь счётчик длительности модуля
5. Попробуй перетащить уроки (Drag & Drop)
6. Проверь редактирование урока

---

**Создано:** 2025-11-18  
**Автор:** AI Assistant  
**Статус:** READY FOR DEPLOY ✅

