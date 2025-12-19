# 🚀 TRAFFIC DASHBOARD - PRODUCTION DEPLOY

**Дата:** 19 декабря 2025  
**Сервер:** Digital Ocean (207.154.231.30)  
**Домен:** `traffic.onai.academy` (поддомен)

---

## 📋 СОДЕРЖАНИЕ

1. [Pre-deploy Checklist](#pre-deploy-checklist)
2. [Применение миграций Supabase](#миграции-supabase)
3. [Nginx конфигурация поддомена](#nginx-конфигурация)
4. [Frontend deploy](#frontend-deploy)
5. [Backend проверка](#backend-проверка)
6. [Проверка результата](#проверка)
7. [Rollback](#rollback)

---

## ✅ PRE-DEPLOY CHECKLIST

### 1. Локальное тестирование

```bash
# 1. Backend работает
cd /Users/miso/onai-integrator-login/backend
npm run dev
# Проверь: http://localhost:3000/api/traffic-constructor/teams

# 2. Frontend работает
cd /Users/miso/onai-integrator-login
npm run dev
# Проверь: http://localhost:8080/traffic/login

# 3. Login работает
# Email: admin@onai.academy
# Все страницы открываются без ошибок
```

### 2. Код готов

```bash
# Проверь что нет uncommitted changes
git status

# Проверь что нет TypeScript ошибок
npm run type-check  # или tsc --noEmit

# Проверь что нет linter warnings
npm run lint
```

### 3. Environment variables

**Backend `.env` уже настроен на сервере:**
- ✅ `TRIPWIRE_SUPABASE_URL`
- ✅ `TRIPWIRE_SUPABASE_SERVICE_ROLE_KEY`
- ✅ `RESEND_API_KEY`
- ✅ `NODE_ENV=production`

**Файл:** `/var/www/onai-integrator-login-main/backend/env.env`

---

## 🗄️ МИГРАЦИИ SUPABASE

### ⚠️ КРИТИЧНО: Применить ДО деплоя!

**Проект Supabase:** `pjmvxecykysfrzppdcto` (Tripwire DB)

### Шаги:

#### 1. Подготовка

```bash
# Проверь что миграции существуют локально
ls -lh supabase/migrations/20251219_*.sql

# Должно быть 5 файлов:
# 20251219_create_traffic_teams.sql
# 20251219_create_traffic_sessions.sql
# 20251219_create_all_sales_tracking.sql
# 20251219_create_onboarding_progress.sql
# 20251219_create_targetologist_settings.sql
```

#### 2. Применение через MCP Supabase

**Документ с командами:** `MCP_COMMANDS.md`

**Краткая инструкция:**

```
Для каждого файла (по порядку 1→2→3→4→5):

1. Прочитай файл миграции
2. Выполни SQL в проекте pjmvxecykysfrzppdcto через MCP
3. Проверь результат (SQL queries в MCP_COMMANDS.md)
```

#### 3. Финальная проверка

```sql
-- В Supabase SQL Editor:

-- Проверить таблицы (должно быть 6)
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name LIKE 'traffic%' OR table_name = 'all_sales_tracking')
ORDER BY table_name;

-- Проверить команды (должно быть 4)
SELECT name, company, emoji FROM traffic_teams ORDER BY name;

-- Ожидаемый результат:
-- Arystan   | Arystan   | ⚡
-- Kenesary  | Nutcab    | 👑
-- Muha      | OnAI      | 🚀
-- Traf4     | ProfTest  | 🎯
```

**✅ Если все 4 команды есть - миграции применены успешно!**

---

## 🌐 NGINX КОНФИГУРАЦИЯ

### Создание конфига для traffic.onai.academy

#### 1. SSH на сервер

```bash
ssh root@207.154.231.30
```

#### 2. Создать конфиг

```bash
nano /etc/nginx/sites-available/traffic.onai.academy
```

#### 3. Содержимое конфига

```nginx
# Traffic Dashboard - Subdomain
server {
    listen 443 ssl http2;
    server_name traffic.onai.academy;
    
    # SSL сертификаты (общие для onai.academy)
    ssl_certificate /etc/letsencrypt/live/onai.academy/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/onai.academy/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    
    # Frontend root
    root /var/www/traffic.onai.academy;
    index index.html;
    
    # Логи
    access_log /var/log/nginx/traffic.onai.academy-access.log;
    error_log /var/log/nginx/traffic.onai.academy-error.log;
    
    # SPA routing (все routes идут на index.html)
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API proxy (на основной backend на порту 3000)
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Таймауты
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    
    # NO cache for index.html (критично для обновлений!)
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}

# HTTP → HTTPS redirect
server {
    listen 80;
    server_name traffic.onai.academy;
    return 301 https://$server_name$request_uri;
}
```

#### 4. Активировать конфиг

```bash
# Создать symlink
ln -s /etc/nginx/sites-available/traffic.onai.academy /etc/nginx/sites-enabled/

# Проверить синтаксис
nginx -t

# Если OK - перезагрузить
systemctl reload nginx
```

#### 5. Создать директорию для frontend

```bash
mkdir -p /var/www/traffic.onai.academy
chown -R www-data:www-data /var/www/traffic.onai.academy
chmod -R 755 /var/www/traffic.onai.academy
```

---

## 🎨 FRONTEND DEPLOY

### Важно: Production vs Local routing

**Локально:** Routes имеют префикс `/traffic/*`  
**Production:** Routes БЕЗ префикса (на поддомене `traffic.onai.academy`)

**Это уже учтено в коде** через `getPath()` helper!

### Шаги деплоя

#### 1. Локальный build

```bash
cd /Users/miso/onai-integrator-login

# Чистый build
rm -rf dist node_modules/.vite
npm run build
```

**Проверка:**
```bash
# Файлы должны существовать
ls -lh dist/index.html
ls -lh dist/assets/

# Проверь размер (должен быть адекватный, не 0 байт)
du -sh dist/
```

#### 2. Backup текущей версии (если уже есть)

```bash
ssh root@207.154.231.30 "if [ -d /var/www/traffic.onai.academy ]; then tar -czf /root/backup-traffic-$(date +%Y%m%d-%H%M).tar.gz /var/www/traffic.onai.academy/; fi"
```

#### 3. Deploy через rsync

```bash
rsync -avz --delete \
  --chown=www-data:www-data \
  /Users/miso/onai-integrator-login/dist/ \
  root@207.154.231.30:/var/www/traffic.onai.academy/
```

**Флаги:**
- `-a` = archive mode
- `-v` = verbose
- `-z` = compress
- `--delete` = удалить файлы которых нет в source
- `--chown=www-data:www-data` = **КРИТИЧНО!** Правильный владелец

#### 4. Проверка на сервере

```bash
# Timestamp (должен быть свежий)
ssh root@207.154.231.30 "stat -c '%y' /var/www/traffic.onai.academy/index.html"

# Владелец (должен быть www-data:www-data)
ssh root@207.154.231.30 "ls -la /var/www/traffic.onai.academy/ | head -5"

# Размер файлов
ssh root@207.154.231.30 "du -sh /var/www/traffic.onai.academy/"
```

#### 5. Reload Nginx

```bash
ssh root@207.154.231.30 "systemctl reload nginx"
```

---

## ⚙️ BACKEND ПРОВЕРКА

Backend уже работает на сервере (основной Node.js процесс).

### Проверка что Traffic routes работают

```bash
# 1. Статус backend
ssh root@207.154.231.30 "pm2 status | grep onai-backend"

# 2. Проверка Traffic API endpoints
ssh root@207.154.231.30 "curl -s http://localhost:3000/api/traffic-constructor/teams | jq"

# Должно вернуть 4 команды (после миграций)

# 3. Логи backend
ssh root@207.154.231.30 "pm2 logs onai-backend --lines 50"
```

### Если backend нужно перезапустить

```bash
ssh root@207.154.231.30 "pm2 restart onai-backend"
```

### Если нужно обновить backend код

```bash
# 1. Backup
ssh root@207.154.231.30 "tar -czf /root/backup-backend-$(date +%Y%m%d-%H%M).tar.gz /var/www/onai-integrator-login-main/backend/"

# 2. Upload через rsync
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude 'dist' \
  /Users/miso/onai-integrator-login/backend/ \
  root@207.154.231.30:/var/www/onai-integrator-login-main/backend/

# 3. Установить зависимости (если package.json изменился)
ssh root@207.154.231.30 "cd /var/www/onai-integrator-login-main/backend && npm install"

# 4. Перезапустить
ssh root@207.154.231.30 "pm2 restart onai-backend"

# 5. Проверить логи
ssh root@207.154.231.30 "pm2 logs onai-backend --lines 30"
```

---

## ✅ ПРОВЕРКА РЕЗУЛЬТАТА

### 1. DNS проверка

```bash
# Проверить что traffic.onai.academy указывает на правильный IP
dig traffic.onai.academy +short

# Должно вернуть: 207.154.231.30
```

**Если DNS не настроен:**
- Зайти в Cloudflare/Domain registrar
- Добавить A record: `traffic` → `207.154.231.30`
- Подождать 5-10 минут для propagation

### 2. SSL сертификат

```bash
# Проверить SSL
curl -vI https://traffic.onai.academy/ 2>&1 | grep -i "ssl\|certificate"

# Должно показать валидный сертификат
```

**Если SSL не работает:**
```bash
# На сервере - добавить домен в certbot
ssh root@207.154.231.30
certbot --nginx -d traffic.onai.academy
```

### 3. HTTP проверка

```bash
# Статус код
curl -s -o /dev/null -w "%{http_code}\n" https://traffic.onai.academy/

# Должно вернуть: 200

# Содержимое
curl -s https://traffic.onai.academy/ | grep -o "<title>.*</title>"

# Должно содержать title из index.html
```

### 4. Проверка страниц

```bash
# Login page
curl -s https://traffic.onai.academy/login | grep -i "traffic"

# Admin panel (без auth покажет redirect или login)
curl -I https://traffic.onai.academy/admin

# API endpoint (должен работать)
curl -s https://traffic.onai.academy/api/traffic-constructor/teams | jq
```

### 5. Проверка в браузере

**ОБЯЗАТЕЛЬНО в Incognito mode!**

```
1. Открой: https://traffic.onai.academy/login
2. Залогинься: admin@onai.academy
3. Проверь routes:
   ✓ /admin
   ✓ /admin/team-constructor
   ✓ /settings
   ✓ /security
   ✓ /dashboard
4. Проверь что данные загружаются (команды, юзеры)
5. Проверь Chrome DevTools → Console (не должно быть ошибок)
6. Проверь Chrome DevTools → Network → API calls (200 OK)
```

### 6. Логи после деплоя

```bash
# Nginx access log (последние 20 запросов)
ssh root@207.154.231.30 "tail -20 /var/log/nginx/traffic.onai.academy-access.log"

# Nginx error log (не должно быть свежих ошибок)
ssh root@207.154.231.30 "tail -20 /var/log/nginx/traffic.onai.academy-error.log"

# Backend logs (проверить Traffic API calls)
ssh root@207.154.231.30 "pm2 logs onai-backend --lines 50 | grep -i traffic"
```

---

## 🐛 TROUBLESHOOTING

### Проблема: 502 Bad Gateway

**Причина:** Backend не работает

**Решение:**
```bash
ssh root@207.154.231.30 "pm2 restart onai-backend"
ssh root@207.154.231.30 "pm2 logs onai-backend --lines 50"
```

### Проблема: 404 Not Found

**Причина:** Nginx не перенаправляет SPA routes на index.html

**Решение:**
```bash
# Проверить конфиг
ssh root@207.154.231.30 "nginx -t"

# Убедиться что есть: try_files $uri $uri/ /index.html;

# Reload
ssh root@207.154.231.30 "systemctl reload nginx"
```

### Проблема: Старая версия в браузере

**Причина:** Browser cache

**Решение:**
1. Hard refresh: Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows)
2. Открыть в Incognito mode
3. Проверить что index.html имеет no-cache header:
```bash
curl -I https://traffic.onai.academy/index.html | grep -i cache
```

### Проблема: API calls возвращают 500

**Причина:** Миграции не применены или backend ошибка

**Решение:**
```bash
# 1. Проверить что таблицы созданы в Supabase
# SELECT * FROM traffic_teams;

# 2. Проверить backend логи
ssh root@207.154.231.30 "pm2 logs onai-backend --lines 100"

# 3. Проверить .env на сервере
ssh root@207.154.231.30 "cat /var/www/onai-integrator-login-main/backend/env.env | grep TRIPWIRE"
```

### Проблема: DNS не резолвится

**Причина:** DNS record не настроен

**Решение:**
1. Cloudflare dashboard → DNS
2. Add record:
   - Type: A
   - Name: traffic
   - Content: 207.154.231.30
   - Proxy: ON (оранжевое облако)
3. Wait 5 minutes
4. Test: `dig traffic.onai.academy`

---

## ⏮️ ROLLBACK

### Быстрый откат frontend

```bash
# 1. Найти backup
ssh root@207.154.231.30 "ls -lht /root/backup-traffic-*.tar.gz | head -3"

# 2. Восстановить
ssh root@207.154.231.30 "tar -xzf /root/backup-traffic-YYYYMMDD-HHMM.tar.gz -C /"

# 3. Исправить права
ssh root@207.154.231.30 "chown -R www-data:www-data /var/www/traffic.onai.academy/"

# 4. Reload Nginx
ssh root@207.154.231.30 "systemctl reload nginx"
```

### Откат backend

```bash
# 1. Найти backup
ssh root@207.154.231.30 "ls -lht /root/backup-backend-*.tar.gz | head -3"

# 2. Восстановить
ssh root@207.154.231.30 "tar -xzf /root/backup-backend-YYYYMMDD-HHMM.tar.gz -C /"

# 3. Restart
ssh root@207.154.231.30 "pm2 restart onai-backend"
```

---

## 🚀 DEPLOY SCRIPT (Автоматизация)

Создай файл `deploy-traffic.sh`:

```bash
#!/bin/bash
set -e

SERVER="root@207.154.231.30"
FRONTEND_DIR="/var/www/traffic.onai.academy"
BACKEND_DIR="/var/www/onai-integrator-login-main/backend"

echo "🚀 Traffic Dashboard Deploy Script"
echo "===================================="
echo ""

# 1. Check SSH connection
echo "🔌 Checking SSH connection..."
ssh $SERVER "echo 'Connected!'" || { echo "❌ SSH connection failed!"; exit 1; }

# 2. Backup
echo "📦 Creating backup..."
ssh $SERVER "tar -czf /root/backup-traffic-$(date +%Y%m%d-%H%M).tar.gz $FRONTEND_DIR/ 2>/dev/null || echo 'No existing frontend to backup'"

# 3. Local build
echo "🏗️  Building frontend..."
rm -rf dist
npm run build

# 4. Deploy frontend
echo "📤 Deploying frontend..."
rsync -avz --delete --chown=www-data:www-data dist/ $SERVER:$FRONTEND_DIR/

# 5. Reload Nginx
echo "♻️  Reloading Nginx..."
ssh $SERVER "systemctl reload nginx"

# 6. Verify
echo "✅ Verifying deployment..."
ssh $SERVER "stat -c '%y' $FRONTEND_DIR/index.html"

# 7. Check backend
echo "⚙️  Checking backend..."
ssh $SERVER "pm2 status | grep onai-backend"

# 8. Test API
echo "🌐 Testing API..."
ssh $SERVER "curl -s http://localhost:3000/api/traffic-constructor/teams | jq -r '.[0].name' || echo 'API check failed'"

echo ""
echo "🎉 Deploy completed!"
echo "🌍 Visit: https://traffic.onai.academy/login"
```

**Использование:**
```bash
chmod +x deploy-traffic.sh
./deploy-traffic.sh
```

---

## 📋 DEPLOY CHECKLIST

### Pre-deploy

- [ ] Миграции Supabase применены
- [ ] Код протестирован локально
- [ ] Backend API работает
- [ ] Frontend собирается без ошибок
- [ ] Нет TypeScript/ESLint ошибок
- [ ] Git commit создан

### Deploy

- [ ] Nginx конфиг создан (`traffic.onai.academy`)
- [ ] DNS record настроен (A record: traffic → 207.154.231.30)
- [ ] SSL сертификат получен (certbot)
- [ ] Backup создан
- [ ] Frontend задеплоен (rsync)
- [ ] Права доступа исправлены (www-data:www-data)
- [ ] Nginx перезагружен

### Post-deploy

- [ ] HTTPS работает (200 OK)
- [ ] Login страница открывается
- [ ] Можно залогиниться (admin@onai.academy)
- [ ] Все routes работают (/admin, /settings, etc)
- [ ] API calls работают (команды загружаются)
- [ ] Console без ошибок (Chrome DevTools)
- [ ] Логи Nginx чистые (no errors)
- [ ] Backend логи OK (pm2 logs)

### Monitoring (первые 24 часа)

- [ ] Проверять логи каждые 2 часа
- [ ] Мониторить memory/CPU (pm2 monit)
- [ ] Проверять что юзеры могут залогиниться
- [ ] Следить за ошибками в Sentry (если настроен)

---

## 🎯 КРИТИЧНЫЕ МОМЕНТЫ

### 1. Routing на production

**Код уже готов!** `getPath()` helper автоматически определяет домен:

```typescript
const getPath = (path: string) => {
  const isProduction = window.location.hostname === 'traffic.onai.academy';
  return isProduction ? path : `/traffic${path}`;
};
```

**Локально:** `http://localhost:8080/traffic/login`  
**Production:** `https://traffic.onai.academy/login`

### 2. API calls

API calls идут на `/api/*` - работает через Nginx proxy на обоих доменах:
- `onai.academy/api/*` → `localhost:3000`
- `traffic.onai.academy/api/*` → `localhost:3000`

**Один backend для обоих!**

### 3. Supabase credentials

Backend использует `TRIPWIRE_SUPABASE_*` переменные из `.env`:
- Проверь что они правильные
- Проверь что миграции применены в правильном проекте

### 4. Email sending

Email через Resend API:
- Проверь что `RESEND_API_KEY` валидный в production `.env`
- Test: создать юзера в Team Constructor с галочкой "Send email"

---

## 📞 SUPPORT

### Если что-то пошло не так

1. **Rollback** (см. раздел выше)
2. **Проверить логи:**
   ```bash
   ssh root@207.154.231.30 "pm2 logs onai-backend --lines 100"
   ssh root@207.154.231.30 "tail -50 /var/log/nginx/traffic.onai.academy-error.log"
   ```
3. **Restart services:**
   ```bash
   ssh root@207.154.231.30 "pm2 restart onai-backend"
   ssh root@207.154.231.30 "systemctl restart nginx"
   ```

### Контакты

- **Server:** Digital Ocean Droplet
- **Dashboard:** https://cloud.digitalocean.com/
- **IP:** 207.154.231.30
- **Документация:** См. `TRAFFIC_DASHBOARD_HANDOFF.md`

---

## 🎉 SUCCESS!

После успешного деплоя:

```
✅ Traffic Dashboard доступен на: https://traffic.onai.academy/login
✅ Admin может залогиниться: admin@onai.academy
✅ Все API работают (команды, юзеры, настройки)
✅ Email sending работает
✅ Security logs собираются

🚀 Ready for production use!
```

---

**Создано:** 2025-12-19  
**Last Updated:** 2025-12-19  
**Version:** 1.0  
**Status:** Ready to Deploy

---

**Удачи с деплоем!** 🚀✨

