# 🚀 Руководство по деплою Tripwire

## 📋 Что было изменено

### Измененные файлы
1. **`backend/src/routes/tripwire-lessons.ts`**
   - Добавлен флаг `AUTO_UNLOCK_ENABLED = false` (строка 268)
   - Логика разблокировки модулей обернута в условие

2. **`src/pages/tripwire/TripwireLesson.tsx`**
   - Добавлено информационное сообщение "📚 Модули 2 и 3 появятся скоро!"
   - Показывается после кнопки "Завершить урок" когда урок готов к завершению

### Новые файлы
3. **`backend/scripts/reset-admin-tripwire.ts`**
   - Скрипт для сброса админ-аккаунта (smmmcwin@gmail.com)
   - Удаляет сертификат и устанавливает прогресс 3/3 модулей

4. **`TRIPWIRE_TESTING_INSTRUCTIONS.md`**
   - Детальные инструкции для тестирования

5. **`TRIPWIRE_DEPLOYMENT_GUIDE.md`** (этот файл)
   - Руководство по деплою

---

## ✅ Pre-Deployment Checklist

### Локальное тестирование (обязательно!)
```
[ ] Тест #1: Новый студент - завершение урока без разблокировки модуля 2
[ ] Тест #2: Админ-аккаунт - генерация сертификата
[ ] Backend логи: "Auto-unlock disabled" присутствует
[ ] Нет ошибок в консоли браузера
[ ] Нет ошибок в backend логах
```

### Проверка изменений
```
[ ] git status - проверить что изменены только нужные файлы
[ ] git diff - проверить изменения построчно
[ ] Нет случайных изменений в публичных лендингах
[ ] Нет изменений в AmoCRM интеграции
```

### Backup (на всякий случай)
```
[ ] Экспорт текущих данных Supabase (если нужно)
[ ] Сохранить текущую версию кода (git commit)
```

---

## 📦 Шаг 1: Коммит изменений

### 1.1 Проверить статус
```bash
cd /Users/miso/onai-integrator-login
git status
```

**Ожидаемый вывод:**
```
modified:   backend/src/routes/tripwire-lessons.ts
modified:   src/pages/tripwire/TripwireLesson.tsx
new file:   backend/scripts/reset-admin-tripwire.ts
new file:   TRIPWIRE_TESTING_INSTRUCTIONS.md
new file:   TRIPWIRE_DEPLOYMENT_GUIDE.md
```

### 1.2 Добавить файлы в stage
```bash
git add backend/src/routes/tripwire-lessons.ts
git add backend/scripts/reset-admin-tripwire.ts
git add src/pages/tripwire/TripwireLesson.tsx
git add TRIPWIRE_TESTING_INSTRUCTIONS.md
git add TRIPWIRE_DEPLOYMENT_GUIDE.md
```

### 1.3 Коммит
```bash
git commit -m "feat(tripwire): temporarily disable module auto-unlock for launch

- Add AUTO_UNLOCK_ENABLED flag to disable auto-unlock progression
- Add informational message for students about upcoming modules
- Create reset-admin-tripwire.ts script for certificate testing
- Add comprehensive testing instructions

BREAKING CHANGE: Module auto-unlock is temporarily disabled until
modules 2-3 content is ready. Progress tracking still works.

Resolves: Tripwire launch preparation
"
```

### 1.4 Push в репозиторий
```bash
git push origin main
```

---

## 🚀 Шаг 2: Деплой Backend на Digital Ocean

### 2.1 SSH в backend сервер
```bash
ssh root@<backend-server-ip>
# или
ssh <your-username>@<backend-server-ip>
```

### 2.2 Перейти в директорию проекта
```bash
cd /path/to/backend
# Обычно: cd /var/www/backend или ~/backend
```

### 2.3 Pull изменений
```bash
git pull origin main
```

### 2.4 Установить зависимости (если нужно)
```bash
npm install
```

### 2.5 Проверить изменения
```bash
# Проверить что файл изменен
cat src/routes/tripwire-lessons.ts | grep "AUTO_UNLOCK_ENABLED"

# Должно вывести:
# const AUTO_UNLOCK_ENABLED = false;
```

### 2.6 Перезапустить backend
```bash
# Если используется PM2
pm2 restart backend

# Или
pm2 restart all

# Проверить статус
pm2 status

# Проверить логи
pm2 logs backend --lines 50
```

**Ожидаемый вывод логов:**
```
✅ Backend started on port 3001
✅ Connected to Tripwire database
```

### 2.7 Проверка работоспособности backend
```bash
# Тест health check
curl http://localhost:3001/health

# Должно вернуть:
# {"status":"ok"}
```

---

## 🌐 Шаг 3: Деплой Frontend на Digital Ocean

### 3.1 SSH в frontend сервер (или тот же сервер)
```bash
ssh root@<frontend-server-ip>
```

### 3.2 Перейти в директорию проекта
```bash
cd /path/to/frontend
# Обычно: cd /var/www/frontend или ~/onai-integrator-login
```

### 3.3 Pull изменений
```bash
git pull origin main
```

### 3.4 Установить зависимости (если нужно)
```bash
npm install
```

### 3.5 Build production
```bash
npm run build
```

**Ожидаемый вывод:**
```
✓ built in XXXms
dist/index.html  XX kB
dist/assets/...
```

### 3.6 Проверка build
```bash
# Проверить что файлы собрались
ls -lh dist/
```

### 3.7 Перезапустить frontend сервер

**Если используется Nginx + статические файлы:**
```bash
# Копировать build в директорию Nginx
sudo cp -r dist/* /var/www/html/

# Перезапустить Nginx
sudo systemctl restart nginx

# Проверить статус
sudo systemctl status nginx
```

**Если используется PM2 для serve:**
```bash
pm2 restart frontend
pm2 logs frontend --lines 50
```

---

## 🔧 Шаг 4: Запуск скрипта для админа на продакшене

### 4.1 SSH в backend сервер (если еще не там)
```bash
ssh root@<backend-server-ip>
cd /path/to/backend
```

### 4.2 Запустить скрипт reset-admin-tripwire.ts
```bash
npx tsx scripts/reset-admin-tripwire.ts
```

**Ожидаемый вывод:**
```
🔧 Сброс админ-аккаунта Tripwire: smmmcwin@gmail.com
✅ User found: { userId: '...', tripwireUserId: '...', email: 'smmmcwin@gmail.com' }
🗑️ Deleting old certificate: ...
✅ Certificate file deleted from storage
✅ Certificate record deleted from DB
📊 Setting progress: all 3 modules completed...
✅ Progress set: Module 16, Lesson 67
✅ Progress set: Module 17, Lesson 68
✅ Progress set: Module 18, Lesson 69
✅ Profile updated: 3/3 modules, certificate_issued = false

✅ ADMIN ACCOUNT RESET COMPLETE!
📌 Next steps:
1. Login as admin: smmmcwin@gmail.com
2. Go to /integrator/profile
3. Click "Получить сертификат"
4. Test certificate generation
```

### 4.3 Проверка результатов в БД (опционально)
```bash
# Можно проверить через Supabase Dashboard или psql
# Или через curl запрос к API
```

---

## 🧪 Шаг 5: Smoke Test на продакшене

### 5.1 Тест как новый студент

1. **Открыть браузер в режиме инкогнито**
2. **Перейти на:** `https://onai.academy/integrator/login`
3. **Залогиниться тестовым студенческим аккаунтом**

4. **Проверить главную страницу:**
   - ✅ Модуль 1 открыт
   - ✅ Модули 2, 3 заблокированы (замочек)

5. **Открыть урок модуля 1:**
   - URL: `https://onai.academy/integrator/lesson/67`
   - ✅ Видео загружается

6. **Завершить урок:**
   - Просмотреть до 80%
   - Кликнуть "Завершить урок"
   - ✅ Confetti появляется
   - ✅ Редирект на главную
   - ✅ Модуль 1 помечен как завершенный
   - ❌ **КРИТИЧНО:** Модуль 2 ВСЁ ЕЩЁ ЗАБЛОКИРОВАН

**Проверка:**
```
[ ] Видео работает
[ ] Прогресс отслеживается
[ ] Урок завершается
[ ] Модуль 2 НЕ разблокировался
```

### 5.2 Тест как админ (smmmcwin@gmail.com)

1. **Открыть новое окно инкогнито**
2. **Перейти на:** `https://onai.academy/integrator/login`
3. **Email:** `smmmcwin@gmail.com`
4. **Password:** [текущий пароль]

5. **Проверить главную страницу:**
   - ✅ Все 3 модуля завершены (галочки)
   - ✅ Прогресс 3/3 (100%)

6. **Перейти на профиль:**
   - URL: `https://onai.academy/integrator/profile`
   - ✅ Кнопка "Получить сертификат" активна

7. **Генерация сертификата:**
   - Кликнуть "Получить сертификат"
   - ✅ Прогресс-бар появляется
   - ✅ Сертификат генерируется
   - ✅ PDF открывается
   - ✅ Данные корректные

**Проверка:**
```
[ ] Прогресс 3/3 модулей
[ ] Кнопка сертификата активна
[ ] Сертификат генерируется
[ ] PDF корректный
```

### 5.3 Проверка backend логов на продакшене

```bash
# SSH в backend сервер
pm2 logs backend --lines 100

# Искать строки:
# ⏸️ [STEP 6a SKIPPED] Auto-unlock disabled (waiting for module 2-3 content)
```

**Критично:**
- ✅ Должна быть строка "Auto-unlock disabled"
- ❌ НЕ должно быть "Module unlocked"

---

## 🎯 Шаг 6: Мониторинг после деплоя

### 6.1 Первые 30 минут после деплоя

**Backend логи:**
```bash
pm2 logs backend --lines 200
```

Следить за:
- ❌ Ошибки в API `/api/tripwire/complete`
- ❌ Database connection errors
- ❌ Supabase auth errors

**Frontend:**
- Открыть https://onai.academy/integrator
- Проверить консоль браузера (F12)
- Следить за JavaScript ошибками

### 6.2 Метрики для отслеживания

**В течение первого дня:**
1. Количество завершенных уроков модуля 1
2. Количество попыток разблокировать модуль 2 (должно быть 0)
3. Количество ошибок в backend логах
4. Response time API `/api/tripwire/complete`

**Проверка через Supabase Dashboard:**
```sql
-- Сколько студентов завершили модуль 1
SELECT COUNT(DISTINCT tripwire_user_id) 
FROM tripwire_progress 
WHERE module_id = 16 AND is_completed = true;

-- Проверить что модуль 2 НЕ разблокировался
SELECT COUNT(*) 
FROM module_unlocks 
WHERE module_id = 17 
AND unlocked_at > NOW() - INTERVAL '1 day';
-- Должно быть: 0
```

---

## 🔥 Rollback план (если что-то пошло не так)

### Критическая проблема обнаружена?

### Быстрый откат (Option A)

**Git revert:**
```bash
# На backend сервере
cd /path/to/backend
git log --oneline -5  # Найти commit hash
git revert <commit-hash>
git push origin main

# Перезапустить backend
pm2 restart backend

# На frontend сервере
cd /path/to/frontend
git pull origin main
npm run build
sudo cp -r dist/* /var/www/html/
sudo systemctl restart nginx
```

### Ручной откат (Option B)

**Вернуть авто-разблокировку:**
```bash
# На backend сервере
cd /path/to/backend
nano src/routes/tripwire-lessons.ts

# Изменить строку 268:
const AUTO_UNLOCK_ENABLED = true;  // ✅ Включить обратно

# Сохранить (Ctrl+O, Enter, Ctrl+X)
pm2 restart backend
```

**Удалить информационное сообщение:**
```bash
# На frontend сервере
cd /path/to/frontend
nano src/pages/tripwire/TripwireLesson.tsx

# Удалить строки ~876-883 (блок с сообщением "Модули 2 и 3 появятся скоро")

# Rebuild
npm run build
sudo cp -r dist/* /var/www/html/
```

### Проверка после отката
```bash
# Backend логи
pm2 logs backend --lines 50

# Искать:
# ✅ [STEP 6a SUCCESS] Module <next> unlocked  <-- Должно появиться после отката
```

---

## 📊 Включение авто-разблокировки (будущее)

Когда модули 2 и 3 будут готовы:

### Шаг 1: Изменить флаг

**На backend сервере:**
```bash
cd /path/to/backend
nano src/routes/tripwire-lessons.ts

# Изменить строку 268:
const AUTO_UNLOCK_ENABLED = true;  // ✅ Включить

# Сохранить и перезапустить
pm2 restart backend
```

### Шаг 2: Удалить информационное сообщение

**На frontend сервере:**
```bash
cd /path/to/frontend
nano src/pages/tripwire/TripwireLesson.tsx

# Удалить строки ~876-883:
{/* 📚 Информационное сообщение для студентов */}
{isQualifiedForCompletion && moduleId === 16 && (
  <motion.div ...>
    📚 Модули 2 и 3 появятся скоро! Следите за объявлениями.
  </motion.div>
)}

# Rebuild
npm run build
sudo cp -r dist/* /var/www/html/
sudo systemctl restart nginx
```

### Шаг 3: Коммит изменений
```bash
git add backend/src/routes/tripwire-lessons.ts
git add src/pages/tripwire/TripwireLesson.tsx
git commit -m "feat(tripwire): enable module auto-unlock progression

- Set AUTO_UNLOCK_ENABLED = true
- Remove temporary informational message
- Modules 2-3 content is now ready

Resolves: Full Tripwire progression enabled
"
git push origin main
```

---

## 🔍 Troubleshooting

### Проблема: "Cannot find module 'tripwire-pool'"

**Решение:**
```bash
cd backend
npm install
pm2 restart backend
```

### Проблема: Frontend показывает старую версию

**Причина:** Кэш браузера

**Решение:**
1. Очистить кэш браузера (Ctrl+Shift+R)
2. Проверить что build обновился: `ls -lh /var/www/html/`
3. Проверить Nginx кэш: `sudo nginx -s reload`

### Проблема: Backend API возвращает 500

**Проверка:**
```bash
pm2 logs backend --lines 200
```

**Возможные причины:**
- Database connection error
- Supabase timeout
- TypeScript compilation error

**Решение:**
```bash
# Проверить переменные окружения
cat .env | grep SUPABASE

# Перезапустить backend
pm2 restart backend

# Проверить health
curl http://localhost:3001/health
```

### Проблема: Скрипт reset-admin-tripwire.ts не находит пользователя

**Проверка в Supabase:**
1. Открыть Supabase Dashboard
2. Перейти в Table Editor → tripwire_users
3. Найти `smmmcwin@gmail.com`

**Если не найден:**
- Создать пользователя вручную через Sales Manager
- Или проверить правильный email

---

## ✅ Final Checklist

### Before Deployment
```
[ ] Локальное тестирование пройдено
[ ] Нет ошибок в backend/frontend логах
[ ] Git commit создан
[ ] Backup данных (если нужно)
```

### During Deployment
```
[ ] Backend деплой завершен
[ ] Frontend деплой завершен
[ ] Скрипт reset-admin-tripwire.ts выполнен
[ ] PM2 процессы запущены
[ ] Nginx работает
```

### After Deployment
```
[ ] Smoke test как студент пройден
[ ] Smoke test как админ пройден
[ ] Backend логи: "Auto-unlock disabled" ✅
[ ] Модуль 2 НЕ разблокируется ✅
[ ] Сертификат генерируется ✅
[ ] Нет критических ошибок в логах
```

### Monitoring (первые 24 часа)
```
[ ] Backend логи проверяются каждые 2 часа
[ ] Метрики в Supabase: завершенные уроки
[ ] Метрики: попытки разблокировать модуль 2 (должно быть 0)
[ ] Response time API < 500ms
```

---

## 📞 Контакты для поддержки

**Если что-то пошло не так:**
1. Проверить логи: `pm2 logs backend`
2. Проверить Troubleshooting секцию выше
3. Rollback если критично (см. Rollback план)
4. Связаться с командой

**Supabase Dashboard:**
- Tripwire DB: https://supabase.com/dashboard/project/[tripwire-project-id]

**Server access:**
- Backend: `ssh root@<backend-ip>`
- Frontend: `ssh root@<frontend-ip>`

---

## 🎉 Success Criteria

Деплой считается успешным если:

✅ **Backend:**
- API `/api/tripwire/complete` работает
- Логи показывают "Auto-unlock disabled"
- Нет database errors

✅ **Frontend:**
- Страницы загружаются без ошибок
- Видео проигрывается
- Кнопка "Завершить урок" работает
- Confetti анимация появляется

✅ **Функционал:**
- Модуль 1 можно завершить
- Модуль 2 НЕ разблокируется автоматически
- Прогресс фиксируется (1/3)
- Achievement создается

✅ **Админ-тест:**
- Скрипт reset выполнился
- Сертификат генерируется
- PDF корректный

---

**Готово! Продукт Tripwire готов к запуску! 🚀**
