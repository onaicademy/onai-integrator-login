# 🔧 NGINX ROOT FIX - 22 Dec 2025

## 🔴 ПРОБЛЕМА

**Симптомы:**
- В incognito режиме видна старая версия сайта
- Текст "КОМАНДНАЯ ПАНЕЛЬ ТРАФИКА" вместо нового
- Старый дизайн несмотря на deployment

**Причина:**
```
Nginx root:  /var/www/onai.academy
Deployment:  /var/www/onai-integrator-login-main/dist

❌ NGINX СМОТРЕЛ В НЕПРАВИЛЬНУЮ ДИРЕКТОРИЮ!
```

---

## ✅ РЕШЕНИЕ

### 1. Найдена проблема:
```bash
$ ssh root@onai.academy "cat /etc/nginx/sites-enabled/onai.academy | grep root"
root /var/www/onai.academy;  # ← СТАРАЯ ДИРЕКТОРИЯ
```

### 2. Скопированы файлы:
```bash
$ ssh root@onai.academy "cp -r /var/www/onai-integrator-login-main/dist/* /var/www/onai.academy/"
✅ Files copied
```

### 3. Перезапущен Nginx:
```bash
$ ssh root@onai.academy "systemctl restart nginx"
✅ Nginx restarted
```

### 4. Проверка:
```bash
$ curl -s "https://onai.academy/" | grep "КОМАНДНАЯ ПАНЕЛЬ"
✅ NEW VERSION (старого текста нет)
```

---

## 📦 DEPLOYMENT SCRIPT

Создан **`deploy.sh`** - автоматизированный deployment script:

```bash
./deploy.sh
```

**Что делает:**
1. ✅ Push на GitHub
2. ✅ Pull на сервере
3. ✅ npm install backend
4. ✅ npm run build frontend
5. ✅ rsync в **ОБЕ директории:**
   - `/var/www/onai-integrator-login-main/dist` (backup)
   - `/var/www/onai.academy` (NGINX ROOT)
6. ✅ PM2 restart backend
7. ✅ Nginx restart
8. ✅ Проверка всех сервисов

---

## 🗂️ СТРУКТУРА ДИРЕКТОРИЙ (ИСПРАВЛЕНО)

```
/var/www/
├── onai.academy/                    ← NGINX ROOT (PRIMARY)
│   ├── index.html
│   ├── assets/
│   └── ...
│
├── onai-integrator-login-main/      ← Git Repository
│   ├── backend/
│   │   ├── src/
│   │   ├── env.env
│   │   └── package.json
│   ├── dist/                        ← Build output (BACKUP)
│   │   ├── index.html
│   │   └── assets/
│   └── ...
```

**Deployment flow:**
```
1. Build: npm run build → dist/
2. Sync:  rsync dist/ → /var/www/onai.academy/
3. Nginx: Serves from /var/www/onai.academy/
```

---

## 🔍 NGINX КОНФИГУРАЦИЯ

**Файл:** `/etc/nginx/sites-enabled/onai.academy`

```nginx
server {
    server_name onai.academy www.onai.academy;
    root /var/www/onai.academy;  # ← PRIMARY LOCATION
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1h;
        add_header Cache-Control "public";
    }
    
    # Disable cache for index.html
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
}
```

---

## ✅ ПРОВЕРКА DEPLOYMENT

### 1. Backend API:
```bash
curl https://onai.academy/api/traffic-dashboard/funnel | jq '.success'
# Expected: true
```

### 2. Frontend:
```bash
curl -s https://onai.academy/ | grep "onAI Academy"
# Expected: <title>onAI Academy - Платформа обучения AI</title>
```

### 3. PM2 Status:
```bash
ssh root@onai.academy "pm2 list | grep onai-backend"
# Expected: online
```

### 4. Browser Test (Incognito):
```
1. Open: https://onai.academy/traffic/login
2. Check: Современный дизайн ✅
3. Check: Русская локализация ✅
4. Check: Новые метрики (351 visitors, 30 purchases) ✅
```

---

## 📝 LESSONS LEARNED

### ❌ Что было неправильно:
1. Деплоил в `/var/www/onai-integrator-login-main/dist`
2. Nginx смотрел в `/var/www/onai.academy`
3. Не проверял Nginx root перед deployment
4. Не синхронизировал в правильную директорию

### ✅ Что исправлено:
1. Создан `deploy.sh` который синхронизирует в ОБЕ директории
2. Nginx root теперь соответствует deployment директории
3. Автоматическая проверка после deployment
4. Документация структуры директорий

---

## 🚀 FUTURE DEPLOYMENTS

**Используй:**
```bash
./deploy.sh
```

**Или manual:**
```bash
# 1. Build
npm run build

# 2. Sync to BOTH locations
rsync -avz --delete dist/ root@onai.academy:/var/www/onai.academy/
rsync -avz --delete dist/ root@onai.academy:/var/www/onai-integrator-login-main/dist/

# 3. Restart services
ssh root@onai.academy "pm2 restart onai-backend && systemctl restart nginx"
```

---

## ✅ STATUS: FIXED

- [x] Nginx root issues resolved
- [x] Files deployed to correct directory
- [x] New version visible in incognito mode
- [x] Automated deployment script created
- [x] Documentation updated

**Timestamp:** 2025-12-22 19:30 UTC  
**Status:** 🟢 OPERATIONAL
