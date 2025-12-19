# 🧪 ПОЛНЫЙ ПЛАН ТЕСТИРОВАНИЯ ПЕРЕД ДЕПЛОЕМ

**Дата:** 19 декабря 2025, 23:35 UTC+6  
**Критичность:** 🔴 ОБЯЗАТЕЛЬНО  
**Время:** ~30 минут

---

## 🎯 ЦЕЛЬ

Убедиться что:
1. ✅ Traffic Dashboard работает корректно
2. ✅ Tripwire платформа НЕ сломается
3. ✅ Студенты смогут двигаться по модулям
4. ✅ Таргетологи смогут работать в Traffic

---

## 📋 PHASE 1: PRE-DEPLOY TESTING (Локально)

### ✅ 1.1 Backend Health Check

```bash
# Terminal 1: Запустить backend
cd /Users/miso/onai-integrator-login/backend
npm run dev

# Ожидаемый output:
✅ Traffic Dashboard schedulers initialized
✅ All background services initialized
⚠️ Redis warnings (игнорировать)
```

**Проверка:**
```bash
curl http://localhost:3000/health
# Должен вернуть: {"status":"ok"}
```

**Статус:** [ ] PASSED / [ ] FAILED

---

### ✅ 1.2 Traffic API Endpoints

```bash
# Test 1: Teams
curl http://localhost:3000/api/traffic-constructor/teams | jq
# Ожидаем: 4 команды (Kenesary, Arystan, Muha, Traf4)

# Test 2: Users
curl http://localhost:3000/api/traffic-constructor/users | jq 'length'
# Ожидаем: 5 (users count)

# Test 3: Dashboard stats (нужен admin token)
TOKEN="YOUR_ADMIN_TOKEN"
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/traffic-admin/dashboard-stats | jq
# Ожидаем: stats.users.total = 5, stats.teams.total = 4
```

**Статус:** [ ] PASSED / [ ] FAILED

---

### ✅ 1.3 Frontend Compile

```bash
# Terminal 2: Build frontend
cd /Users/miso/onai-integrator-login
npm run build

# Ожидаемый output:
✓ built in XXXms
✓ No errors
```

**Проверка:**
- [ ] Build успешный (exitcode 0)
- [ ] Нет TypeScript errors
- [ ] Нет import errors
- [ ] dist/ folder создан

**Статус:** [ ] PASSED / [ ] FAILED

---

### ✅ 1.4 Frontend Manual Testing

```bash
# Terminal 2: Dev server
npm run dev
# Открыть: http://localhost:8080/traffic/login
```

**Чеклист:**

#### Login Page:
- [ ] Страница загружается
- [ ] Форма логина видна
- [ ] Нет console errors (F12)

#### Admin Login:
```
Email: admin@onai.academy
Password: [твой пароль]
```
- [ ] Login успешный
- [ ] Редирект на /traffic/admin

#### Admin Panel (/traffic/admin):
- [ ] Dashboard tab открывается
- [ ] Показывает 5 users ✅
- [ ] Показывает 4 teams ✅
- [ ] Нет 500 errors
- [ ] Нет hardcoded данных
- [ ] Stats загружаются из БД

#### Team Constructor (/traffic/admin/team-constructor):
- [ ] 4 команды показываются
- [ ] С ГРАДИЕНТНЫМИ аватарами (не emoji!)
- [ ] Форма создания пользователя работает
- [ ] Можно выбрать команду

#### Security Panel (/traffic/security):
- [ ] Открывается без ошибок
- [ ] Показывает Premium Empty State (если нет логов)
- [ ] Loading states работают

**Статус:** [ ] PASSED / [ ] FAILED

---

## 📋 PHASE 2: PRODUCTION SAFETY CHECK (Перед деплоем)

### ✅ 2.1 Supabase Dashboard Check

**Открыть:** https://supabase.com/dashboard/project/pjmvxecykysfrzppdcto

**Проверить:**
1. **Database Health:**
   - [ ] CPU < 50%
   - [ ] RAM < 70%
   - [ ] Disk space OK

2. **Connection Pool:**
   - [ ] Active connections < 10
   - [ ] Idle connections available
   - [ ] No connection errors

3. **Recent Queries:**
   - [ ] No slow queries (> 2 sec)
   - [ ] No locks
   - [ ] No deadlocks

**Статус:** [ ] SAFE / [ ] WAIT

---

### ✅ 2.2 Backup Database

```bash
# Через Supabase Dashboard:
# Settings → Database → Backups → Create Backup

# Или через CLI:
supabase db dump > backup_before_traffic_deploy_$(date +%Y%m%d_%H%M%S).sql
```

**Статус:** [ ] DONE

---

### ✅ 2.3 Check Production Logs

```bash
ssh root@207.154.231.30

# Backend logs
pm2 logs backend --lines 100 | grep -i error
# Должно быть чисто (нет критичных ошибок)

# Nginx error log
tail -50 /var/log/nginx/error.log
# Не должно быть 502, 503, 504 errors
```

**Статус:** [ ] CLEAN / [ ] ISSUES FOUND

---

## 📋 PHASE 3: DEPLOY (Пошагово)

### Step 1: Backend Deploy (5 мин)

```bash
# Local
cd /Users/miso/onai-integrator-login
git add backend/src/routes/traffic-admin.ts
git add src/pages/traffic/*.tsx
git add src/components/traffic/*.tsx
git commit -m "feat(traffic): add teams stats, premium UI, empty states"
git push origin main

# Server
ssh root@207.154.231.30
cd /var/www/backend
git pull
pm2 restart backend

# Check restart
pm2 logs backend --lines 20
# Должно быть:
✅ Traffic Dashboard schedulers initialized
✅ All background services initialized
```

**Статус:** [ ] SUCCESS / [ ] FAILED

---

### Step 2: Frontend Deploy (3 мин)

```bash
# Local: Build
npm run build

# Deploy
rsync -avz --delete dist/ root@207.154.231.30:/var/www/traffic.onai.academy/

# Verify
curl https://traffic.onai.academy
```

**Статус:** [ ] SUCCESS / [ ] FAILED

---

## 📋 PHASE 4: POST-DEPLOY TESTING (Production)

### ✅ 4.1 Tripwire Platform Test (КРИТИЧНО!)

**Цель:** Убедиться что студенты могут работать

```bash
# 1. Открыть Tripwire
open https://tripwire.onai.academy

# 2. Залогиниться как студент (test account)
# Email: [test student email]
# Password: [password]

# 3. Проверить модули:
- [ ] Модули отображаются
- [ ] Можно открыть урок
- [ ] Видео играет
- [ ] Прогресс сохраняется
- [ ] Нет 500 errors

# 4. Проверить sales manager panel:
open https://onai.academy/tripwire-manager
- [ ] Список студентов загружается
- [ ] Можно добавить нового студента
- [ ] Email отправляется
```

**Статус:** [ ] TRIPWIRE WORKS / [ ] BROKEN ❌

**Если BROKEN:**
```bash
# НЕМЕДЛЕННО ОТКАТИТЬ!
ssh root@207.154.231.30
cd /var/www/backend
git reset --hard HEAD~1
pm2 restart backend
```

---

### ✅ 4.2 Traffic Dashboard Test (Production)

```bash
# 1. Login как Admin
open https://traffic.onai.academy/login
Email: admin@onai.academy
Password: [password]

# Проверить:
- [ ] Login работает
- [ ] Редирект на /admin

# 2. Admin Panel
open https://traffic.onai.academy/admin
- [ ] Dashboard показывает stats:
  - Users: 5 ✅
  - Teams: 4 ✅
  - Plans: X ✅
- [ ] Quick Actions работают
- [ ] Нет console errors

# 3. Team Constructor
open https://traffic.onai.academy/admin/team-constructor
- [ ] 4 команды показываются
- [ ] Градиентные аватары (НЕ emoji!)
- [ ] Можно создать пользователя

# 4. Security Panel
open https://traffic.onai.academy/security
- [ ] Premium Empty State показывается
- [ ] Нет 500 errors

# 5. Settings
open https://traffic.onai.academy/settings
- [ ] UTM sources загружаются
- [ ] FB accounts можно загрузить
- [ ] Можно сохранить настройки
```

**Статус:** [ ] ALL PASSED / [ ] ISSUES

---

### ✅ 4.3 Targetologist Login Test

```bash
# 1. Login как таргетолог
open https://traffic.onai.academy/login
Email: [targetologist email]
Password: [password]

# Проверить:
- [ ] Login работает
- [ ] Dashboard загружается
- [ ] Может видеть свой план
- [ ] Settings доступны
- [ ] UTM sources работают
```

**Статус:** [ ] PASSED / [ ] FAILED

---

### ✅ 4.4 API Performance Test

```bash
# Проверить response time
time curl https://api.onai.academy/api/traffic-admin/dashboard-stats \
  -H "Authorization: Bearer $TOKEN"

# Ожидаем: < 500ms
# Допустимо: < 1000ms
# Медленно: > 2000ms

# Если медленно:
# - Добавить Redis cache
# - Оптимизировать queries
```

**Статус:** [ ] FAST (< 1s) / [ ] SLOW

---

## 📋 PHASE 5: 24H MONITORING

### Day 1 (Сразу после деплоя):

**Каждые 30 минут (первые 2 часа):**
```bash
# 1. Check backend logs
ssh root@207.154.231.30 "pm2 logs backend --lines 50 | grep -i error"

# 2. Check Supabase metrics
# https://supabase.com/dashboard/project/pjmvxecykysfrzppdcto/reports

# 3. Test Tripwire works
curl -I https://tripwire.onai.academy
```

**Checklist:**
- [ ] 1 час: Нет errors ✅
- [ ] 2 часа: Нет errors ✅
- [ ] 4 часа: Performance OK ✅
- [ ] 24 часа: Всё стабильно ✅

---

## 🚨 ROLLBACK TRIGGERS

**ОТКАТЫВАЕМСЯ ЕСЛИ:**

1. ❌ Tripwire сломался (студенты не могут работать)
2. ❌ 500 errors на Traffic Dashboard
3. ❌ Backend постоянно крашится (> 3 restarts)
4. ❌ Supabase connection pool exhausted
5. ❌ Response time > 5 секунд

**Rollback процедура:**
```bash
ssh root@207.154.231.30

# Backend rollback
cd /var/www/backend
git log --oneline | head -5
git reset --hard PREVIOUS_COMMIT_HASH
pm2 restart backend

# Frontend rollback
cd /var/www/traffic.onai.academy
rm -rf *
# Deploy old version
```

---

## ✅ SUCCESS CRITERIA

**Деплой успешен если:**

### Tripwire Platform:
- [x] Студенты могут логиниться
- [x] Модули открываются
- [x] Видео играет
- [x] Прогресс сохраняется
- [x] Sales Manager может добавлять студентов

### Traffic Dashboard:
- [x] Admin может залогиниться
- [x] Dashboard показывает реальные stats
- [x] 4 команды с градиентами (не emoji)
- [x] Таргетологи могут работать
- [x] Settings сохраняются

### Performance:
- [x] Backend response time < 1s
- [x] No 500 errors
- [x] Connection pool OK
- [x] CPU < 70%

---

## 📊 TESTING RESULTS

| Phase | Status | Time | Notes |
|-------|--------|------|-------|
| 1.1 Backend Health | [ ] | __ min | |
| 1.2 Traffic API | [ ] | __ min | |
| 1.3 Frontend Build | [ ] | __ min | |
| 1.4 Manual Testing | [ ] | __ min | |
| 2.1 Supabase Check | [ ] | __ min | |
| 2.2 Backup | [ ] | __ min | |
| 2.3 Prod Logs | [ ] | __ min | |
| 3.1 Backend Deploy | [ ] | __ min | |
| 3.2 Frontend Deploy | [ ] | __ min | |
| 4.1 Tripwire Test | [ ] | __ min | 🔴 КРИТИЧНО |
| 4.2 Traffic Test | [ ] | __ min | |
| 4.3 Targetologist | [ ] | __ min | |
| 4.4 Performance | [ ] | __ min | |

**TOTAL TIME:** ___ minutes

---

## 🎯 FINAL CHECKLIST

**Перед деплоем:**
- [ ] Все локальные тесты пройдены
- [ ] Frontend собирается без ошибок
- [ ] Backend работает локально
- [ ] Supabase метрики в норме
- [ ] Backup создан

**После деплоя:**
- [ ] Tripwire работает (студенты OK)
- [ ] Traffic Dashboard работает
- [ ] Нет критичных errors в логах
- [ ] Performance приемлемый
- [ ] 24h monitoring запущен

---

**Created:** 2025-12-19 23:35  
**Status:** Ready for execution  
**Estimated time:** 30-45 минут

**НАЧИНАЕМ ТЕСТИРОВАНИЕ! 🚀**
