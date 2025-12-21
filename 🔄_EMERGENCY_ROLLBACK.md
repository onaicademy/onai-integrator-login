# 🔄 АВАРИЙНЫЙ ОТКАТ (EMERGENCY ROLLBACK)

**Создано:** 19 декабря 2024, 12:45 UTC+3  
**Статус:** ✅ Готово к использованию  
**Назначение:** Быстрый откат к стабильной версии

---

## 🛡️ **STABLE CHECKPOINT**

### **📋 Commit ID:**
```
41c936753c97e380d552f81c05d3ba55c9b42f05
```

### **🏷️ Tag:**
```
v1.0.0-stable
```

### **📝 Short ID:**
```
41c9367
```

---

## 🚨 **КОГДА ИСПОЛЬЗОВАТЬ:**

Используй этот откат если:
- ❌ Сломались модули (не открываются, не завершаются)
- ❌ Ошибки FK constraint в базе данных
- ❌ Студенты не могут проходить уроки
- ❌ Критические 500 ошибки на production
- ❌ После изменений что-то перестало работать
- ❌ Нужно срочно вернуть работоспособность

---

## ⚡ **БЫСТРЫЙ ОТКАТ (30 СЕКУНД)**

### **Вариант 1: По Tag (РЕКОМЕНДУЕТСЯ)**
```bash
# На локалке:
git fetch --all --tags
git reset --hard v1.0.0-stable
git push origin main --force

# На сервере:
ssh root@onai.academy
cd /var/www/onai-integrator-login-main
git fetch --all --tags
git reset --hard v1.0.0-stable
pm2 restart tripwire-backend
systemctl restart nginx
```

### **Вариант 2: По Commit ID**
```bash
# На локалке:
git reset --hard 41c936753c97e380d552f81c05d3ba55c9b42f05
git push origin main --force

# На сервере:
ssh root@onai.academy
cd /var/www/onai-integrator-login-main
git reset --hard 41c936753c97e380d552f81c05d3ba55c9b42f05
pm2 restart tripwire-backend
systemctl restart nginx
```

---

## 🔧 **ПОЛНЫЙ ПРОЦЕСС ОТКАТА**

### **ШАГ 1: Сохрани текущее состояние (backup)**
```bash
# На локалке:
git branch backup-before-rollback-$(date +%Y%m%d-%H%M%S)
git push origin backup-before-rollback-$(date +%Y%m%d-%H%M%S)

# На сервере:
ssh root@onai.academy
cd /var/www/onai-integrator-login-main
git branch backup-prod-$(date +%Y%m%d-%H%M%S)
```

### **ШАГ 2: Откат локальной версии**
```bash
cd /Users/miso/onai-integrator-login

# Получи все теги и обновления
git fetch --all --tags

# Откат к stable checkpoint
git reset --hard v1.0.0-stable

# Форсированный пуш на GitHub
git push origin main --force

# ✅ Локалка откачена!
```

### **ШАГ 3: Откат production сервера**
```bash
# Подключись к серверу
ssh root@onai.academy

# Перейди в директорию проекта
cd /var/www/onai-integrator-login-main

# Получи обновления (откат с GitHub)
git fetch --all --tags
git reset --hard v1.0.0-stable

# Установи зависимости (если нужно)
npm install --production

# Пересобери frontend
npx vite build

# Скопируй новый build в Nginx
rm -rf /var/www/onai.academy/*
cp -r dist/* /var/www/onai.academy/
chown -R www-data:www-data /var/www/onai.academy

# Перезапусти backend
pm2 restart tripwire-backend

# Перезапусти Nginx
systemctl restart nginx

# ✅ Production откачен!
```

### **ШАГ 4: Проверка работоспособности**
```bash
# Проверь backend
pm2 logs tripwire-backend --lines 50

# Проверь Nginx
systemctl status nginx

# Проверь API
curl -I https://api.onai.academy/health

# Проверь frontend
curl -I https://onai.academy

# Открой браузер и проверь:
# - https://onai.academy/integrator/login
# - https://onai.academy/integrator (залогинься)
# - Открой урок, проверь что видео работает
# - Завершение урока работает
# - Модули открываются
```

---

## 📊 **ЧТО ВКЛЮЧАЕТ STABLE CHECKPOINT:**

### ✅ **Backend:**
- Все API endpoints работают
- lesson completion endpoint (`/api/tripwire/complete`)
- module unlocks endpoint
- admin dashboard endpoints
- traffic stats endpoints
- Foreign key constraints правильные

### ✅ **Frontend:**
- TripwireProductPage (modules display)
- TripwireLesson (video playback)
- Module unlock logic
- Admin dashboard
- Traffic command dashboard
- Responsive design

### ✅ **Database:**
- Все таблицы на месте
- FK constraints корректные (auth.users.id)
- tripwire_progress работает
- module_unlocks работает
- tripwire_user_profile работает

### ✅ **Integrations:**
- Telegram bots (IAE Agent, Traffic Command)
- Email (Resend)
- SMS (Mobizon)
- Video CDN (Bunny)
- Supabase auth

### ✅ **Student Experience:**
- 62 студента могут входить
- Уроки открываются и завершаются
- Модули разблокируются правильно
- Видео воспроизводятся
- Прогресс сохраняется

---

## ⚠️ **ВАЖНЫЕ ПРИМЕЧАНИЯ:**

### **База данных НЕ откатывается:**
- `git reset` откатывает только код
- Данные в БД остаются как есть
- Если нужен откат БД - делай отдельно через Supabase

### **Форсированный пуш:**
- `--force` перезаписывает историю
- Все коммиты после checkpoint будут потеряны
- Поэтому сначала создаём backup branch!

### **Зависимости:**
- После отката запусти `npm install`
- На production используй `npm install --production`

### **Frontend build:**
- Обязательно пересобери: `npx vite build`
- Скопируй в Nginx директорию
- Restart Nginx

---

## 🔍 **ПРОВЕРКА ТЕКУЩЕЙ ВЕРСИИ:**

### **Локалка:**
```bash
cd /Users/miso/onai-integrator-login
git log --oneline -1
git describe --tags
```

### **Production:**
```bash
ssh root@onai.academy
cd /var/www/onai-integrator-login-main
git log --oneline -1
git describe --tags
```

Если видишь `v1.0.0-stable` или commit `41c9367` - ты на stable checkpoint! ✅

---

## 🚑 **ОТКАТ БАЗЫ ДАННЫХ (опционально):**

### **Через Supabase Dashboard:**
1. Зайди в Supabase Dashboard
2. **Database** → **Backups**
3. Выбери backup от **19 декабря 2024, 12:45**
4. **Restore**

### **Или через SQL (если есть backup):**
```sql
-- Подключись к Supabase SQL Editor
-- Восстанови данные из backup файла
```

---

## 📝 **ЛОГ ОПЕРАЦИИ:**

После отката заполни:

**Дата отката:** _______________  
**Причина:** _______________  
**Откачено с commit:** _______________  
**Откачено на commit:** `41c9367` (v1.0.0-stable)  
**Backup branch:** _______________  
**Статус после отката:** ⬜ OK / ⬜ Проблемы  
**Проблемы (если есть):** _______________

---

## 🎯 **ПОСЛЕ УСПЕШНОГО ОТКАТА:**

1. ✅ Проверь что всё работает
2. ✅ Уведомь команду (если нужно)
3. ✅ Изучи что пошло не так (логи, коммиты после checkpoint)
4. ✅ Исправь баг на отдельной ветке
5. ✅ Протестируй фикс
6. ✅ Задеплой фикс через PR/review

---

## 📚 **ПОЛЕЗНЫЕ КОМАНДЫ:**

### **Посмотреть разницу между текущей версией и checkpoint:**
```bash
git diff v1.0.0-stable HEAD
```

### **Посмотреть список коммитов после checkpoint:**
```bash
git log v1.0.0-stable..HEAD --oneline
```

### **Создать новый checkpoint (после фикса):**
```bash
git tag -a "v1.0.1-stable" -m "🛡️ New stable checkpoint"
git push origin v1.0.1-stable
```

### **Удалить backup branch (после того как убедился что откат успешен):**
```bash
git branch -D backup-before-rollback-YYYYMMDD-HHMMSS
git push origin --delete backup-before-rollback-YYYYMMDD-HHMMSS
```

---

## 🆘 **КОНТАКТЫ ДЛЯ ПОМОЩИ:**

**GitHub Repo:**  
https://github.com/onaicademy/onai-integrator-login

**Stable Commit:**  
https://github.com/onaicademy/onai-integrator-login/commit/41c936753c97e380d552f81c05d3ba55c9b42f05

**Stable Tag:**  
https://github.com/onaicademy/onai-integrator-login/releases/tag/v1.0.0-stable

---

## ✅ **ЧЕКЛИСТ ОТКАТА:**

- [ ] Создан backup branch текущего состояния
- [ ] Выполнен `git reset --hard v1.0.0-stable` на локалке
- [ ] Выполнен force push на GitHub
- [ ] Выполнен `git reset --hard v1.0.0-stable` на production
- [ ] Выполнен `npm install --production` на production
- [ ] Выполнен `npx vite build` на production
- [ ] Скопирован build в Nginx директорию
- [ ] Выполнен `pm2 restart tripwire-backend`
- [ ] Выполнен `systemctl restart nginx`
- [ ] Проверены логи backend (`pm2 logs`)
- [ ] Проверен статус Nginx (`systemctl status nginx`)
- [ ] Проверен API endpoint (`curl https://api.onai.academy/health`)
- [ ] Проверен frontend в браузере
- [ ] Проверена работа модулей и уроков
- [ ] Студенты могут войти и пройти обучение
- [ ] Заполнен лог операции

---

## 🎉 **ОТКАТ ЗАВЕРШЁН!**

**Система должна работать стабильно как 19 декабря 2024, 12:45 UTC+3**

**Все критические функции работают:**
- ✅ Login/Signup
- ✅ Lesson completion
- ✅ Module unlocking
- ✅ Video playback
- ✅ Progress tracking
- ✅ Admin dashboard
- ✅ Email notifications

**Если всё работает - ты вернулся к stable checkpoint! 🎯**

---

**Создано:** 19.12.2024 12:45  
**Версия:** Tripwire v1.0.0  
**Статус:** ✅ Готово к использованию




