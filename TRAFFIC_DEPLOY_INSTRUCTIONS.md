# 🚀 TRAFFIC DASHBOARD - PRODUCTION DEPLOY INSTRUCTIONS

**Дата:** 18 декабря 2025  
**Версия:** v1.0 - Personal Cabinets System

---

## ✅ ЧТО ГОТОВО К ДЕПЛОЮ

### Backend (NEW):
- ✅ `backend/src/routes/traffic-auth.ts` - Authentication (JWT + bcrypt)
- ✅ `backend/src/routes/traffic-plans.ts` - Weekly Plans API
- ✅ `backend/src/routes/traffic-admin.ts` - Admin Panel API
- ✅ `backend/src/services/trafficPlanService.ts` - Groq AI Service
- ✅ `backend/src/jobs/weeklyPlanGenerator.ts` - Cron Job (Mondays 00:01)
- ✅ `backend/scripts/seed-traffic-users.ts` - User Seeding Script
- ✅ `backend/src/server.ts` - Роуты и schedulers интегрированы

### Frontend (NEW):
- ✅ `src/pages/traffic/TrafficLogin.tsx` - Login Page
- ✅ `src/pages/traffic/TrafficCabinetDashboard.tsx` - Cabinet Dashboard
- ✅ `src/pages/traffic/TrafficAdminPanel.tsx` - Admin Panel
- ✅ `src/components/traffic/TrafficCabinetLayout.tsx` - Layout with Sidebar
- ✅ `src/components/traffic/WeeklyKPIWidget.tsx` - KPI Widget
- ✅ `src/App.tsx` - Роуты обновлены

### Database (CREATED):
- ✅ `traffic_users` - 5 users (4 targetologists + 1 admin)
- ✅ `traffic_weekly_plans` - 1 plan for Kenesary (test)
- ✅ `traffic_admin_settings` - 5 settings

### Infrastructure (READY):
- ✅ `nginx-traffic.onai.academy.conf` - Nginx config
- ✅ DNS уже настроен (пользователь подтвердил)

---

## 📋 ШАГИ ДЕПЛОЯ

### ШАГ 1: Деплой Backend

```bash
# 1.1 Создать архив новых файлов
cd /Users/miso/onai-integrator-login/backend
tar -czf traffic-backend-update.tar.gz \
  src/routes/traffic-auth.ts \
  src/routes/traffic-plans.ts \
  src/routes/traffic-admin.ts \
  src/services/trafficPlanService.ts \
  src/jobs/weeklyPlanGenerator.ts \
  scripts/seed-traffic-users.ts \
  src/server.ts

# 1.2 Скопировать на сервер
scp traffic-backend-update.tar.gz root@207.154.231.30:/tmp/

# 1.3 Распаковать на сервере
ssh root@207.154.231.30 "cd /var/www/onai-integrator-login-main/backend && tar -xzf /tmp/traffic-backend-update.tar.gz"

# 1.4 Создать пользователей (seed)
ssh root@207.154.231.30 "cd /var/www/onai-integrator-login-main/backend && npx tsx scripts/seed-traffic-users.ts"
```

### ШАГ 2: Деплой Frontend

```bash
# 2.1 Создать production build (уже сделан)
cd /Users/miso/onai-integrator-login
npm run build

# 2.2 Создать архив
cd dist
tar -czf ../traffic-frontend-dist.tar.gz .
cd ..

# 2.3 Скопировать на сервер
scp traffic-frontend-dist.tar.gz root@207.154.231.30:/tmp/

# 2.4 Распаковать на сервере
ssh root@207.154.231.30 "cd /var/www/onai-integrator-login-main/dist && rm -rf assets/*.js assets/*.css && tar -xzf /tmp/traffic-frontend-dist.tar.gz"

# 2.5 Установить права
ssh root@207.154.231.30 "chown -R www-data:www-data /var/www/onai-integrator-login-main/dist && chmod -R 755 /var/www/onai-integrator-login-main/dist"
```

### ШАГ 3: Настройка Nginx

```bash
# 3.1 Скопировать конфиг на сервер
scp nginx-traffic.onai.academy.conf root@207.154.231.30:/etc/nginx/sites-available/traffic.onai.academy

# 3.2 Получить SSL сертификат
ssh root@207.154.231.30 "certbot certonly --nginx -d traffic.onai.academy --non-interactive --agree-tos -m admin@onai.academy"

# 3.3 Активировать конфиг
ssh root@207.154.231.30 "ln -sf /etc/nginx/sites-available/traffic.onai.academy /etc/nginx/sites-enabled/"

# 3.4 Проверить и перезагрузить Nginx
ssh root@207.154.231.30 "nginx -t && systemctl reload nginx"
```

### ШАГ 4: Перезапуск Backend

```bash
# Перезапустить PM2 с новыми роутами и schedulers
ssh root@207.154.231.30 "pm2 restart onai-backend"

# Проверить логи
ssh root@207.154.231.30 "pm2 logs onai-backend --lines 50 --nostream" | grep -E "(Traffic|Weekly|Plan|Scheduler)"
```

### ШАГ 5: Финальная Проверка

```bash
# 5.1 Health Check
curl https://traffic.onai.academy/api/health

# 5.2 Login Test
curl -X POST https://traffic.onai.academy/api/traffic-auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@onai.academy","password":"admin123"}'

# 5.3 Weekly Plan Test
TOKEN="<получить из предыдущего шага>"
curl https://traffic.onai.academy/api/traffic-plans/current?team=Kenesary \
  -H "Authorization: Bearer $TOKEN"

# 5.4 Frontend Test
curl -I https://traffic.onai.academy/login
# Должен вернуть: 200 OK
```

---

## 🔑 CREDENTIALS (для тестирования)

### Admin:
- Email: `admin@onai.academy`
- Password: `admin123`
- Access: Все команды + настройки

### Targetologists:
- Email: `kenesary@onai.academy` / Password: `changeme123`
- Email: `arystan@onai.academy` / Password: `changeme123`
- Email: `traf4@onai.academy` / Password: `changeme123`
- Email: `muha@onai.academy` / Password: `changeme123`

**⚠️ ВАЖНО:** После первого входа каждый пользователь должен сменить пароль!

---

## 📊 ПРОВЕРКА GROQ AI

```bash
# Генерация планов для всех команд (Admin only)
TOKEN="<admin token>"
curl -X POST https://traffic.onai.academy/api/traffic-admin/generate-all-plans \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Должен вернуть:
# {
#   "success": true,
#   "results": [...],
#   "summary": {
#     "total": 4,
#     "successful": 4,
#     "failed": 0
#   }
# }
```

---

## 🤖 ПРОВЕРКА CRON JOB

Scheduler запускается каждый понедельник в 00:01 (Almaty time).

### Мануальная проверка:

```bash
# Проверить логи PM2
ssh root@207.154.231.30 "pm2 logs onai-backend --lines 100" | grep "Weekly plan generator"

# Должен показать:
# ✅ Traffic Dashboard schedulers initialized
# 📅 Weekly plan generator scheduled (Mondays 00:01 Almaty)
```

---

## 📱 ПРОВЕРКА UI

### 1. Login Page
Открой: https://traffic.onai.academy/login

Должна показаться красивая страница входа с полями Email/Password.

### 2. Personal Cabinet (Kenesary)
После входа как kenesary@onai.academy → редирект на:
https://traffic.onai.academy/cabinet/kenesary

Должно показаться:
- ✅ Sidebar слева (профиль, Dashboard, История, Выйти)
- ✅ Weekly KPI Widget (план недели с прогресс-барами)
- ✅ Full Traffic Dashboard (таблица всех команд)

### 3. Admin Panel
После входа как admin@onai.academy → редирект на:
https://traffic.onai.academy/admin/dashboard

Должно показаться:
- ✅ Sidebar с админ меню
- ✅ Tabs: Настройки AI, Пользователи, Генерация планов
- ✅ Все 5 пользователей в списке

---

## 🎯 ФИНАЛЬНЫЙ ЧЕКЛИСТ

- [ ] Backend деплоен (новые routes)
- [ ] Frontend деплоен (новые pages + components)
- [ ] Nginx настроен для traffic.onai.academy
- [ ] SSL сертификат получен
- [ ] PM2 перезапущен
- [ ] 5 пользователей созданы в БД
- [ ] Login работает
- [ ] Personal cabinets открываются
- [ ] Weekly plans API работает
- [ ] AI генерация работает
- [ ] Cron scheduler активен
- [ ] Mobile responsive проверен

---

## 🔥 ПОСЛЕ ДЕПЛОЯ

1. **Отправить credentials таргетологам**
2. **Попросить сменить пароли** (первый логин)
3. **Показать интерфейс команде** (обучение)
4. **Следить за логами** первую неделю
5. **Проверить в понедельник 00:01** что планы автоматически создались

---

**Автор:** AI Assistant  
**Дата:** 18 декабря 2025  
**Статус:** Ready for Production ✅




