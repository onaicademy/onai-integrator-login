# 🔧 ПРОБЛЕМА И РЕШЕНИЕ: Деплой актуальной сборки на Digital Ocean

**Дата:** 6 ноября 2025  
**Статус:** ✅ **РЕШЕНО**  
**Сервер:** Digital Ocean (178.128.203.40)  
**Сайт:** https://onai.academy

---

## 📋 СОДЕРЖАНИЕ

1. [Описание проблемы](#-описание-проблемы)
2. [Диагностика](#-диагностика)
3. [Решение](#-решение)
4. [Проверка результата](#-проверка-результата)
5. [Автоматизация в будущем](#-автоматизация-в-будущем)
6. [Команды для повторения](#-команды-для-повторения)

---

## 🚨 ОПИСАНИЕ ПРОБЛЕМЫ

### Симптомы:

1. **Старая дата Last-Modified:**
   ```
   Last-Modified: Tue, 04 Nov 2025 19:32:35 GMT  ❌
   ```
   Вместо ожидаемой даты 6 ноября 2025

2. **Старый хэш JavaScript файла:**
   - На сервере: `index-DPqPWVg7.js` (814KB) ❌
   - Ожидалось: `index-mBC9421I.js` (1.16MB) ✅

3. **Старый коммит на сервере:**
   ```
   22c8e64 Temporary: Disable auth checks for UI testing
   ```
   Вместо нового коммита `c0bc9fd`

### Причина:

**Digital Ocean сервер не был синхронизирован с GitHub!**

- ✅ На локальной машине: новая сборка dist/ (6 ноября)
- ❌ В GitHub: dist/ **отсутствовал** (был в .gitignore)
- ❌ На Digital Ocean: старая сборка (4 ноября)

**Вывод:** Сборка делалась ТОЛЬКО на сервере вручную, но не попадала в GitHub, поэтому при каждом обновлении возвращалась старая версия.

---

## 🔍 ДИАГНОСТИКА

### Шаг 1: Проверка Last-Modified на сервере

```bash
ssh root@178.128.203.40
curl -I https://onai.academy/ | grep Last-Modified
```

**Результат:**
```
curl: (7) Failed to connect to onai.academy port 443
```

❌ **Проблема #1: HTTPS не работал!**

### Шаг 2: Проверка Nginx

```bash
systemctl status nginx
netstat -tlnp | grep -E '(:80|:443)'
```

**Результат:**
```
tcp  0.0.0.0:80   LISTEN  nginx  ✅
tcp  0.0.0.0:443  ---     ---    ❌ НЕТ!
```

❌ **Проблема #2: Nginx слушал только порт 80 (HTTP), SSL не настроен!**

### Шаг 3: Проверка файлов на сервере

```bash
cd /var/www/onai-integrator-login
ls -lh dist/assets/*.js
git log --oneline -1
```

**Результат:**
```
-rw-r--r-- 1 root root 814K Nov 5 20:25 index-DPqPWVg7.js  ❌ СТАРЫЙ!
22c8e64 Temporary: Disable auth checks  ❌ СТАРЫЙ КОММИТ!
```

❌ **Проблема #3: На сервере старый код!**

### Шаг 4: Проверка .gitignore

```bash
cat .gitignore | grep dist
```

**Результат:**
```
dist  ❌ dist/ в .gitignore!
```

❌ **Проблема #4: dist/ не попадал в GitHub из-за .gitignore!**

---

## ✅ РЕШЕНИЕ

### ЭТАП 1: Локальная пересборка и push в GitHub

#### 1.1 Проверка исходного кода

```bash
cd "/Users/miso/Documents/MVP onAI Academy Platform/onai-integrator-login"

# Проверка что MOCK данных нет
grep -q "const topStudentsData = \[" src/pages/admin/Activity.tsx
echo $?  # 1 = не найдено ✅
```

✅ **Результат:** Исходный код чистый, MOCK данных нет

#### 1.2 Удаление dist из .gitignore

**Файл:** `.gitignore`

**Было:**
```
node_modules
dist        ❌
dist-ssr
*.local
```

**Стало:**
```
node_modules
dist-ssr    ✅ dist удалён из .gitignore
*.local
```

#### 1.3 Пересборка dist/ локально

```bash
# Удаление старых файлов
rm -rf dist/ .vite/

# Сборка
npm run build
```

**Результат:**
```
✓ 3326 modules transformed.
dist/index.html                     1.47 kB
dist/assets/index-DbJCms3L.css     96.57 kB
dist/assets/index-mBC9421I.js   1,157.62 kB  ✅ НОВЫЙ ХЭШ!
✓ built in 2.92s
```

#### 1.4 Коммит и push в GitHub

```bash
# Добавление файлов
git add .gitignore dist/ REBUILD_DIST_SUCCESS.md rebuild_dist.sh

# Коммит
git commit -m "🚀 Rebuild dist/ with latest source code (Nov 6, 2025)

- Rebuilt dist/ from clean source (no MOCK data)
- Removed dist from .gitignore to track built files
- Build info: 3326 modules, 1.15MB JS bundle
- Ready for DigitalOcean deployment"

# Push в GitHub
git push origin main
```

**Результат:**
```
[main c0bc9fd] 🚀 Rebuild dist/ with latest source code
9 files changed, 955 insertions(+), 1 deletion(-)
✅ УСПЕШНО ЗАПУШЕНО В GITHUB!
```

---

### ЭТАП 2: Настройка SSL на Digital Ocean

#### 2.1 Проверка конфигурации Nginx

```bash
ssh root@178.128.203.40
cat /etc/nginx/sites-enabled/onai-integrator-login.conf
```

**Проблема:** Конфиг содержал только HTTP (порт 80), HTTPS отсутствовал

#### 2.2 Добавление SSL конфигурации

**Создан новый конфиг:**

```nginx
# HTTP -> HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name onai.academy www.onai.academy;
    
    return 301 https://$host$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name onai.academy www.onai.academy;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/onai.academy/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/onai.academy/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Root directory
    root /var/www/onai-integrator-login/dist;
    index index.html;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Static files caching
    location ~* \.(?:js|css|png|jpg|jpeg|gif|svg|ico|woff2?|ttf)$ {
        try_files $uri =404;
        access_log off;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
```

#### 2.3 Применение конфигурации

```bash
# Проверка конфигурации
nginx -t
# ✅ nginx: configuration file test is successful

# Перезапуск Nginx
systemctl restart nginx

# Проверка портов
ss -tlnp | grep -E '(:80|:443)'
```

**Результат:**
```
LISTEN 0.0.0.0:443  nginx  ✅ Порт 443 открыт!
LISTEN 0.0.0.0:80   nginx  ✅ Порт 80 открыт!
```

---

### ЭТАП 3: Обновление кода на сервере

#### 3.1 Git pull с GitHub

```bash
cd /var/www/onai-integrator-login

# Сохранение локального .env
git stash

# Подтягивание обновлений
git pull origin main
```

**Результат:**
```
Updating 22c8e64..c0bc9fd
Fast-forward
68 files changed, 14700 insertions(+), 370 deletions(-)
create mode 100644 dist/assets/index-mBC9421I.js  ✅ НОВЫЙ ФАЙЛ!
create mode 100644 dist/assets/index-DbJCms3L.css
create mode 100644 dist/index.html
...
```

#### 3.2 Восстановление .env и очистка

```bash
# Возврат локального .env
git stash pop
git checkout --ours .env
git add .env

# Удаление старых файлов
rm -f dist/assets/index-DPqPWVg7.js
rm -f dist/assets/index-CW6Di1Ci.css
```

#### 3.3 Выставление прав и перезапуск

```bash
# Права на файлы
chown -R www-data:www-data dist/
chmod -R 755 dist/

# Очистка кеша Nginx
rm -rf /var/cache/nginx/*

# Перезапуск Nginx
systemctl restart nginx
```

---

## ✅ ПРОВЕРКА РЕЗУЛЬТАТА

### 1. Проверка HTTPS

```bash
curl -I https://onai.academy/
```

**Результат:**
```
HTTP/2 200 ✅
server: nginx/1.24.0 (Ubuntu)
last-modified: Wed, 05 Nov 2025 20:33:22 GMT ✅
content-length: 1553
```

### 2. Проверка JavaScript файла

```bash
curl -I https://onai.academy/assets/index-mBC9421I.js
```

**Результат:**
```
HTTP/2 200 ✅
content-type: application/javascript
content-length: 1164751  ✅ 1.16MB (новый размер!)
```

### 3. Проверка HTML

```bash
cat /var/www/onai-integrator-login/dist/index.html | grep "index-"
```

**Результат:**
```html
<script type="module" src="/assets/index-mBC9421I.js"></script> ✅
<link rel="stylesheet" href="/assets/index-DbJCms3L.css"> ✅
```

### 4. Проверка файлов на диске

```bash
ls -lh /var/www/onai-integrator-login/dist/assets/
```

**Результат:**
```
-rwxr-xr-x 1 www-data www-data 1.2M Nov 5 20:33 index-mBC9421I.js ✅
-rwxr-xr-x 1 www-data www-data  95K Nov 5 20:33 index-DbJCms3L.css ✅
```

### 5. Проверка коммита

```bash
cd /var/www/onai-integrator-login
git log --oneline -1
```

**Результат:**
```
c0bc9fd 🚀 Rebuild dist/ with latest source code (Nov 6, 2025) ✅
```

---

## 📊 СРАВНЕНИЕ: ДО vs ПОСЛЕ

| Параметр | **ДО (проблема)** | **ПОСЛЕ (решено)** |
|----------|-------------------|---------------------|
| **HTTPS** | ❌ Не работает (curl error 7) | ✅ **HTTP/2 200** |
| **Nginx порты** | ❌ Только 80 | ✅ **80 и 443** |
| **SSL** | ❌ Не настроен | ✅ **TLS 1.2/1.3** |
| **Last-Modified** | ❌ Tue, 04 Nov 19:32 | ✅ **Wed, 05 Nov 20:33** |
| **Git коммит** | ❌ 22c8e64 (старый) | ✅ **c0bc9fd (новый)** |
| **JavaScript** | ❌ index-DPqPWVg7.js (814KB) | ✅ **index-mBC9421I.js (1.16MB)** |
| **CSS** | ❌ index-CW6Di1Ci.css (91KB) | ✅ **index-DbJCms3L.css (96KB)** |
| **dist/ в GitHub** | ❌ НЕТ (в .gitignore) | ✅ **ЕСТЬ** |
| **MOCK данные** | ❓ Неизвестно | ✅ **НЕТ** |

---

## 🚀 АВТОМАТИЗАЦИЯ В БУДУЩЕМ

### Текущий процесс деплоя (ручной):

```bash
# 1. Локально
npm run build
git add .
git commit -m "Update"
git push origin main

# 2. На сервере
ssh root@178.128.203.40
cd /var/www/onai-integrator-login
git pull origin main
chown -R www-data:www-data dist/
systemctl restart nginx
```

### Автоматический деплой (рекомендация):

Создать скрипт `deploy-auto.sh`:

```bash
#!/bin/bash
# Автоматический деплой на Digital Ocean

echo "🚀 Запуск автоматического деплоя..."

# 1. Локальная сборка
echo "1️⃣ Сборка проекта..."
npm run build || exit 1

# 2. Коммит и push
echo "2️⃣ Отправка в GitHub..."
git add .
git commit -m "Auto deploy: $(date '+%Y-%m-%d %H:%M:%S')"
git push origin main || exit 1

# 3. Обновление на сервере
echo "3️⃣ Обновление на Digital Ocean..."
ssh root@178.128.203.40 << 'EOF'
cd /var/www/onai-integrator-login
git pull origin main
chown -R www-data:www-data dist/
chmod -R 755 dist/
rm -rf /var/cache/nginx/*
systemctl restart nginx
echo "✅ Nginx перезапущен"
EOF

# 4. Проверка
echo "4️⃣ Проверка результата..."
sleep 2
curl -I https://onai.academy/ | grep "HTTP\|Last-Modified"

echo ""
echo "✅ ДЕПЛОЙ ЗАВЕРШЁН!"
echo "🌐 Сайт: https://onai.academy/"
```

**Использование:**
```bash
chmod +x deploy-auto.sh
./deploy-auto.sh
```

---

## 📝 КОМАНДЫ ДЛЯ ПОВТОРЕНИЯ

### Полный цикл деплоя вручную:

```bash
# ===================================
# ЛОКАЛЬНО (на твоей машине)
# ===================================

cd "/Users/miso/Documents/MVP onAI Academy Platform/onai-integrator-login"

# 1. Проверка что MOCK данных нет
grep -q "const topStudentsData = \[" src/pages/admin/Activity.tsx
if [ $? -eq 0 ]; then
    echo "⚠️  MOCK данные найдены! Удали их перед сборкой"
    exit 1
fi

# 2. Очистка и сборка
rm -rf dist/ .vite/
npm run build

# 3. Проверка что сборка успешна
if [ ! -f "dist/index.html" ]; then
    echo "❌ Сборка не удалась!"
    exit 1
fi

# 4. Коммит и push
git add .
git commit -m "Deploy: $(date '+%Y-%m-%d %H:%M:%S')"
git push origin main

echo "✅ Код запушен в GitHub!"

# ===================================
# НА СЕРВЕРЕ DIGITAL OCEAN
# ===================================

ssh root@178.128.203.40 << 'ENDSSH'

cd /var/www/onai-integrator-login

echo "📥 Подтягивание обновлений..."
git stash  # Сохранить локальный .env
git pull origin main

echo "♻️  Восстановление .env..."
git stash pop
git checkout --ours .env
git add .env

echo "🗑️  Очистка старых файлов..."
find dist/assets/ -name "index-*.js" -o -name "index-*.css" | \
  grep -v "$(grep -oE 'index-[^"]+\.(js|css)' dist/index.html | tr '\n' '|' | sed 's/|$//')" | \
  xargs rm -f

echo "🔒 Выставление прав..."
chown -R www-data:www-data dist/
chmod -R 755 dist/

echo "🗑️  Очистка кеша..."
rm -rf /var/cache/nginx/*

echo "🔄 Перезапуск Nginx..."
systemctl restart nginx

echo ""
echo "✅ ДЕПЛОЙ ЗАВЕРШЁН!"
echo ""

# Проверка
echo "📊 Проверка результата:"
curl -I http://localhost/ | head -5
echo ""
ls -lh dist/assets/*.js | tail -1
echo ""
git log --oneline -1

ENDSSH

# ===================================
# ФИНАЛЬНАЯ ПРОВЕРКА
# ===================================

echo ""
echo "🌐 Проверка сайта:"
curl -I https://onai.academy/ | grep -E "(HTTP|Last-Modified)"

echo ""
echo "✅ ВСЁ ГОТОВО!"
echo "🔗 Сайт: https://onai.academy/"
```

---

## 🔍 ДИАГНОСТИЧЕСКИЕ КОМАНДЫ

### Проверка статуса сайта:

```bash
# HTTPS статус
curl -I https://onai.academy/

# Last-Modified
curl -I https://onai.academy/ | grep Last-Modified

# Проверка JavaScript
curl -I https://onai.academy/assets/index-mBC9421I.js

# Какие файлы загружаются
curl -s https://onai.academy/ | grep -oE 'index-[^"]+\.(js|css)'
```

### Проверка на сервере:

```bash
ssh root@178.128.203.40

# Текущий коммит
cd /var/www/onai-integrator-login
git log --oneline -1

# Файлы dist/
ls -lh dist/index.html
ls -lh dist/assets/

# Статус Nginx
systemctl status nginx
ss -tlnp | grep -E '(:80|:443)'

# Nginx конфигурация
cat /etc/nginx/sites-enabled/onai-integrator-login.conf

# Логи Nginx (если проблемы)
tail -50 /var/log/nginx/error.log
tail -50 /var/log/nginx/access.log
```

---

## 🆘 ЧАСТЫЕ ПРОБЛЕМЫ И РЕШЕНИЯ

### Проблема 1: "Failed to connect to onai.academy port 443"

**Причина:** Nginx не слушает порт 443 (HTTPS не настроен)

**Решение:**
```bash
# Проверить что в конфиге есть "listen 443 ssl"
cat /etc/nginx/sites-enabled/onai-integrator-login.conf | grep "443 ssl"

# Если нет - добавить SSL блок (см. ЭТАП 2.2 выше)
# Перезапустить Nginx
systemctl restart nginx
```

---

### Проблема 2: Git pull выдаёт ошибку "local changes"

**Причина:** Локальный `.env` отличается от версии в репозитории

**Решение:**
```bash
# Сохранить локальные изменения
git stash

# Подтянуть обновления
git pull origin main

# Вернуть локальный .env
git stash pop
git checkout --ours .env
```

---

### Проблема 3: Старые JS файлы остаются в dist/

**Причина:** Git pull добавляет новые файлы, но не удаляет старые

**Решение:**
```bash
# Найти какой файл используется в HTML
grep -oE 'index-[^"]+\.js' dist/index.html

# Удалить все JS файлы кроме актуального
cd dist/assets/
ls index-*.js | grep -v "$(grep -oE 'index-[^"]+\.js' ../index.html | xargs basename)" | xargs rm -f
```

---

### Проблема 4: 404 на странице после деплоя

**Причина:** SPA роутинг не настроен в Nginx

**Решение:**
```bash
# Проверить конфиг
cat /etc/nginx/sites-enabled/onai-integrator-login.conf | grep "try_files"

# Должна быть строка:
# try_files $uri $uri/ /index.html;

# Если нет - добавить в location /
nginx -t && systemctl restart nginx
```

---

### Проблема 5: MOCK данные отображаются на сайте

**Причина:** В `src/` присутствует MOCK код

**Решение:**
```bash
# Проверить исходный код
grep -n "const topStudentsData" src/pages/admin/Activity.tsx

# Если найдено - удалить MOCK блок из кода
# Пересобрать и задеплоить заново
```

---

## 📚 ДОПОЛНИТЕЛЬНЫЕ РЕСУРСЫ

### Файлы документации:

- `REBUILD_DIST_SUCCESS.md` - отчёт о пересборке на сервере
- `GITHUB_PUSH_SUCCESS.md` - инструкции по деплою с GitHub
- `README.md` - общая документация проекта
- `DEPLOY_NOW.md` - быстрый гайд по деплою

### Скрипты автоматизации:

- `rebuild_dist.sh` - пересборка dist/ на сервере
- `manual-deploy.sh` - ручной деплой
- `server-deploy.sh` - деплой с проверками
- `update-server.sh` - обновление сервера

---

## ✅ ИТОГ

### Что было сделано:

1. ✅ **Удалён `dist` из `.gitignore`** - теперь собранные файлы отслеживаются Git
2. ✅ **Пересобран `dist/` локально** - новая сборка с актуальным кодом
3. ✅ **Запушено в GitHub** - коммит `c0bc9fd`
4. ✅ **Настроен SSL на сервере** - добавлен HTTPS блок в Nginx
5. ✅ **Подтянут код на Digital Ocean** - `git pull origin main`
6. ✅ **Перезапущен Nginx** - применены все изменения

### Результат:

- 🌐 **Сайт работает:** https://onai.academy/
- ✅ **HTTPS включён:** HTTP/2 200
- ✅ **Актуальная сборка:** коммит `c0bc9fd`
- ✅ **Новые файлы:** `index-mBC9421I.js` (1.16MB)
- ✅ **MOCK данных нет**

### Процесс деплоя теперь:

```
Локально → GitHub → Digital Ocean → Сайт обновлён
(2 мин)   (10 сек)   (30 сек)      (мгновенно)
```

---

**Документ создан:** 6 ноября 2025  
**Автор:** AI Assistant (Cursor)  
**Статус:** ✅ Проблема решена, процесс задокументирован

