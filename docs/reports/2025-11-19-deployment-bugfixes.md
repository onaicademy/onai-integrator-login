# 🚀 ФИНАЛЬНЫЙ ДЕПЛОЙ НА PRODUCTION

**Дата:** 2025-11-19  
**Время:** $(Get-Date -Format "HH:mm")  
**Статус:** ✅ В ПРОЦЕССЕ

---

## 📋 ЧТО ДЕПЛОИТСЯ

### Backend изменения:
1. ✅ `/api/lessons DELETE endpoint` — исправлен парсинг ID (parseInt)
2. ✅ `/api/lessons/reorder PUT endpoint` — исправлена обработка порядка
3. ✅ `/api/modules/reorder PUT endpoint` — исправлена обработка порядка
4. ✅ Улучшенное логирование и обработка ошибок

### Frontend изменения:
1. ✅ `src/pages/Module.tsx` — улучшен `handleDragEnd` для уроков с toast-уведомлениями
2. ✅ `src/pages/Course.tsx` — добавлен drag-and-drop для модулей
3. ✅ Toast-уведомления при успехе и ошибках (sonner)

### Database миграции:
1. ✅ `supabase/migrations/CHECK_ORDER_INDEX.sql` — проверка наличия полей `order_index`

---

## 🔧 ПРОЦЕСС ДЕПЛОЯ

### Шаг 1: Git Commit и Push ✅
```bash
git add .
git commit -m "fix: исправления багов удаления, drag-and-drop и order_index для production"
git checkout main
git merge [текущая_ветка]
git push origin main
```

### Шаг 2: Backend деплой на DigitalOcean ✅
```bash
ssh root@207.154.231.30
cd /var/www/onai-integrator-login-main/backend
git stash
git pull origin main
npm install
npm run build
pm2 reload onai-backend --update-env
```

### Шаг 3: Frontend деплой на Vercel ✅
- Автоматический деплой при push в `main` ветку
- Vercel автоматически обнаружит изменения и задеплоит

### Шаг 4: Проверка Supabase миграций ⏳
- Проверить наличие `order_index` в таблицах `lessons` и `modules`
- Если полей нет — выполнить миграцию через SQL Editor

---

## ✅ ПРОВЕРКА ПОСЛЕ ДЕПЛОЯ

### Backend Health Check:
- [ ] `https://api.onai.academy/api/health` — 200 OK
- [ ] `https://api.onai.academy/api/debug/env` — 200 OK

### Тест удаления урока:
- [ ] Перейти на https://onai.academy
- [ ] Открыть курс → модуль
- [ ] Нажать кнопку удаления на уроке
- [ ] Проверить: урок удален, нет ошибок 404

### Тест drag-and-drop уроков:
- [ ] В модуле перетащить урок на другую позицию
- [ ] Проверить: появляется тост "Порядок обновлён"
- [ ] Обновить страницу — порядок сохранился

### Тест drag-and-drop модулей:
- [ ] На странице курса перетащить модуль на другую позицию
- [ ] Проверить: появляется тост "Порядок обновлён"
- [ ] Обновить страницу — порядок сохранился

### Проверка логов backend:
- [ ] `pm2 logs onai-backend` — нет критичных ошибок
- [ ] Логи показывают успешные запросы DELETE и reorder

---

## 📊 РЕЗУЛЬТАТЫ ДЕПЛОЯ

### Backend:
- **Статус:** ⏳ В процессе
- **Health Endpoint:** ⏳ Проверяется
- **PM2 Status:** ⏳ Проверяется

### Frontend:
- **Статус:** ⏳ Ожидает Vercel деплоя
- **URL:** https://onai.academy
- **Vercel Dashboard:** https://vercel.com/dashboard

### Database:
- **order_index в lessons:** ⏳ Проверяется
- **order_index в modules:** ⏳ Проверяется

---

## 🔍 ЛОГИ И ОШИБКИ

### Backend логи:
```bash
pm2 logs onai-backend --lines 100
```

### Проверка ошибок:
```bash
pm2 logs onai-backend --lines 100 | grep -i "error\|delete\|reorder"
```

---

## ⚠️ ЕСЛИ ВОЗНИКЛИ ОШИБКИ

### Откат изменений:
```bash
ssh root@207.154.231.30
cd /var/www/onai-integrator-login-main/backend
git reset --hard HEAD~1
pm2 reload onai-backend --update-env
```

### Пересборка:
```bash
npm run build
pm2 reload onai-backend --update-env
```

---

## ✅ ИТОГОВЫЙ СТАТУС

**Статус:** ⏳ ДЕПЛОЙ В ПРОЦЕССЕ

После завершения всех проверок статус будет обновлён на ✅ PRODUCTION READY

---

**Дата начала деплоя:** 2025-11-19  
**Время начала:** $(Get-Date -Format "HH:mm")

