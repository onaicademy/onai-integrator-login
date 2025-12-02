# 🚀 DEPLOY BACKEND НА DIGITALOCEAN

**Сервер:** 207.154.231.30  
**User:** root  
**Путь:** `/var/www/onai-integrator-login-main/backend`  
**PM2 Process:** `onai-backend`

---

## 📋 **КОМАНДЫ ДЛЯ ДЕПЛОЯ:**

### **Автоматический деплой (одна команда):**

```bash
ssh root@207.154.231.30 << 'EOF'
cd /var/www/onai-integrator-login-main
git pull origin main
cd backend
npm install --production
npm run build
pm2 restart onai-backend
pm2 logs onai-backend --lines 20
EOF
```

---

## 🔧 **ЧТО ДЕЛАЕТ:**

1. ✅ Подключается к серверу по SSH
2. ✅ Переходит в папку проекта
3. ✅ Подтягивает последние изменения из GitHub
4. ✅ Устанавливает зависимости (только production)
5. ✅ Собирает TypeScript → JavaScript
6. ✅ Перезапускает Backend через PM2
7. ✅ Показывает последние 20 строк логов

---

## ✅ **ПРОВЕРКА ПОСЛЕ ДЕПЛОЯ:**

### **Health Check:**
```bash
curl https://api.onai.academy/api/health
```

**Ожидаемый ответ:**
```json
{"status":"ok","timestamp":"2025-11-16T12:00:00.000Z"}
```

### **Courses API:**
```bash
curl https://api.onai.academy/api/courses
```

**Ожидаемый ответ:**
```json
[{"id":1,"name":"Интегратор 2.0","slug":"integrator-2-0",...}]
```

---

## 🆘 **В СЛУЧАЕ ОШИБОК:**

### **Посмотреть полные логи:**
```bash
ssh root@207.154.231.30
pm2 logs onai-backend --lines 50
```

### **Перезапустить с обновлением env:**
```bash
pm2 restart onai-backend --update-env
```

### **Проверить статус:**
```bash
pm2 status
```

### **Проверить процессы:**
```bash
pm2 list
```

### **Остановить и запустить заново:**
```bash
pm2 stop onai-backend
pm2 start onai-backend
```

### **Посмотреть логи Nginx:**
```bash
tail -100 /var/log/nginx/error.log
tail -100 /var/log/nginx/access.log
```

---

## 🔍 **MANUAL DEPLOY (пошагово):**

### **1. Подключение:**
```bash
ssh root@207.154.231.30
```

### **2. Переход в директорию:**
```bash
cd /var/www/onai-integrator-login-main
```

### **3. Pull последних изменений:**
```bash
git pull origin main
```

### **4. Установка зависимостей:**
```bash
cd backend
npm install --production
```

### **5. Сборка TypeScript:**
```bash
npm run build
```

### **6. Перезапуск PM2:**
```bash
pm2 restart onai-backend
```

### **7. Проверка логов:**
```bash
pm2 logs onai-backend --lines 20
```

---

## 📊 **ПОЛЕЗНЫЕ КОМАНДЫ:**

### **PM2 команды:**
```bash
# Статус всех процессов
pm2 status

# Логи в реальном времени
pm2 logs onai-backend

# Последние 50 строк логов
pm2 logs onai-backend --lines 50

# Перезапуск
pm2 restart onai-backend

# Остановка
pm2 stop onai-backend

# Запуск
pm2 start onai-backend

# Удалить процесс из PM2
pm2 delete onai-backend

# Информация о процессе
pm2 info onai-backend

# Monitoring
pm2 monit
```

### **Git команды:**
```bash
# Проверить текущую ветку и статус
git status

# Посмотреть последние коммиты
git log --oneline -10

# Откатить изменения (если что-то сломалось)
git reset --hard HEAD

# Переключиться на конкретный коммит
git checkout <commit-hash>
```

### **Nginx команды:**
```bash
# Проверить конфигурацию
nginx -t

# Перезапустить Nginx
systemctl restart nginx

# Статус Nginx
systemctl status nginx

# Посмотреть логи
tail -100 /var/log/nginx/error.log
```

### **Проверка портов:**
```bash
# Проверить что порт 3000 слушается
netstat -tlnp | grep 3000

# Проверить процессы Node.js
ps aux | grep node
```

---

## 🔐 **ПРОВЕРКА .ENV ФАЙЛА:**

```bash
ssh root@207.154.231.30
cat /var/www/onai-integrator-login-main/backend/.env
```

**Должен содержать:**
```env
PORT=3000
NODE_ENV=production

SUPABASE_URL=https://arqhkacellqbhjhbebfh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...

R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=onai-academy-videos
R2_PUBLIC_URL=...
```

---

## 📝 **CHECKLIST ПОСЛЕ ДЕПЛОЯ:**

- [ ] Backend запущен (pm2 status показывает "online")
- [ ] Health check возвращает {"status":"ok"}
- [ ] /api/courses возвращает список курсов
- [ ] Нет ошибок в pm2 logs
- [ ] Nginx работает (systemctl status nginx)
- [ ] HTTPS сертификат валиден (открыть https://api.onai.academy)
- [ ] Frontend может подключиться к API

---

## 🚨 **COMMON ISSUES:**

### **1. "Cannot find module 'dist/server.js'"**
**Решение:**
```bash
cd /var/www/onai-integrator-login-main/backend
npm run build
pm2 restart onai-backend
```

### **2. "Port 3000 already in use"**
**Решение:**
```bash
# Найти процесс на порту 3000
lsof -i :3000

# Убить процесс
kill -9 <PID>

# Или перезапустить через PM2
pm2 restart onai-backend
```

### **3. "Git pull failed"**
**Решение:**
```bash
cd /var/www/onai-integrator-login-main
git stash
git pull origin main
```

### **4. "npm install failed"**
**Решение:**
```bash
cd /var/www/onai-integrator-login-main/backend
rm -rf node_modules package-lock.json
npm install --production
```

### **5. Backend работает, но 502 Bad Gateway**
**Решение:**
```bash
# Проверить Nginx конфиг
nginx -t

# Перезапустить Nginx
systemctl restart nginx

# Проверить что Backend на порту 3000
curl http://localhost:3000/api/health
```

---

## 🎯 **БЫСТРЫЕ КОМАНДЫ:**

### **Деплой + проверка в одну строку:**
```bash
ssh root@207.154.231.30 "cd /var/www/onai-integrator-login-main && git pull origin main && cd backend && npm install --production && npm run build && pm2 restart onai-backend && sleep 3 && curl http://localhost:3000/api/health"
```

### **Только перезапуск (если код уже обновлён):**
```bash
ssh root@207.154.231.30 "pm2 restart onai-backend && pm2 logs onai-backend --lines 20"
```

### **Быстрая проверка логов:**
```bash
ssh root@207.154.231.30 "pm2 logs onai-backend --lines 30"
```

---

## 📊 **MONITORING:**

### **Real-time logs:**
```bash
ssh root@207.154.231.30
pm2 logs onai-backend
```

### **PM2 monitoring dashboard:**
```bash
pm2 monit
```

### **Memory и CPU usage:**
```bash
pm2 status
```

---

**Создано:** 16 ноября 2025  
**Обновлено:** 16 ноября 2025  
**Статус:** ✅ Актуально

