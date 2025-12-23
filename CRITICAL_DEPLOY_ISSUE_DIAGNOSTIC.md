# 🚨 КРИТИЧЕСКАЯ ПРОБЛЕМА ДЕПЛОЯ - ПОЛНАЯ ДИАГНОСТИКА

**Дата:** 23 декабря 2025, 19:15 Almaty  
**Статус:** ⚠️ КРИТИЧЕСКИЙ - Frontend не обновляется в Incognito mode  
**Проект:** onAI Academy (onai.academy)  

---

## 📋 ОПИСАНИЕ ПРОБЛЕМЫ

### Симптомы:
1. ✅ Backend обновляется успешно (PM2 restart работает)
2. ✅ API работает корректно (health check OK)
3. ❌ **Frontend НЕ ОБНОВЛЯЕТСЯ даже в Incognito mode**
4. ❌ Пользователь видит "TRAFFIC COMMAND" (старый текст)
5. ❌ Должен видеть "Командная Панель Трафика" (новый текст)

### Что уже сделано:
- ✅ `rm -rf /var/www/onai.academy/*` (удалили все файлы)
- ✅ `npm run build` (свежий build локально)
- ✅ `rsync -avz dist/ root@207.154.231.30:/var/www/onai.academy/`
- ✅ `chown -R www-data:www-data /var/www/onai.academy/`
- ✅ `rm -rf /var/cache/nginx/*` (очистили nginx cache)
- ✅ `systemctl restart nginx`
- ✅ Проверили в Incognito mode
- ❌ **РЕЗУЛЬТАТ: Всё равно старый интерфейс!**

---

## 🔍 ДИАГНОСТИЧЕСКИЕ ДАННЫЕ

### 1. Файловая система

**Локальный index.html:**
```bash
ls -lh /Users/miso/onai-integrator-login/dist/index.html
# Timestamp: [БУДЕТ ЗАПОЛНЕНО]
# Size: [БУДЕТ ЗАПОЛНЕНО]
```

**Production index.html:**
```bash
ssh root@207.154.231.30 "ls -lh /var/www/onai.academy/index.html"
# Timestamp: [БУДЕТ ЗАПОЛНЕНО]
# Size: [БУДЕТ ЗАПОЛНЕНО]
```

**MD5 Checksums:**
```bash
# Локально:
md5 /Users/miso/onai-integrator-login/dist/index.html
# [БУДЕТ ЗАПОЛНЕНО]

# Production:
ssh root@207.154.231.30 "md5sum /var/www/onai.academy/index.html"
# [БУДЕТ ЗАПОЛНЕНО]
```

### 2. Nginx Configuration

```bash
ssh root@207.154.231.30 "cat /etc/nginx/sites-enabled/onai.academy"
# [БУДЕТ ЗАПОЛНЕНО]
```

**Ключевые параметры:**
- `root` directive: должен быть `/var/www/onai.academy`
- `try_files` для SPA: должен быть `$uri $uri/ /index.html`
- Cache headers для `index.html`: должен быть `no-cache`

### 3. CDN / Proxy

```bash
curl -I https://onai.academy/
# Проверка на Cloudflare: [БУДЕТ ЗАПОЛНЕНО]
```

**Признаки Cloudflare:**
- Header: `server: cloudflare`
- Header: `cf-cache-status`
- Header: `cf-ray`

### 4. JavaScript Bundle Files

**Локально:**
```bash
ls /Users/miso/onai-integrator-login/dist/assets/*.js | wc -l
# Количество: [БУДЕТ ЗАПОЛНЕНО]
```

**Production:**
```bash
ssh root@207.154.231.30 "ls /var/www/onai.academy/assets/*.js | wc -l"
# Количество: [БУДЕТ ЗАПОЛНЕНО]
```

### 5. Содержимое index.html

**Локальный (dist/index.html):**
```html
[БУДЕТ ЗАПОЛНЕНО - полный HTML]
```

**Production (/var/www/onai.academy/index.html):**
```html
[БУДЕТ ЗАПОЛНЕНО - полный HTML]
```

---

## 🎯 ВОЗМОЖНЫЕ ПРИЧИНЫ

### 1. CDN Cache (Cloudflare)
**Вероятность: 🔥 ВЫСОКАЯ**

Если используется Cloudflare:
- Edge servers кешируют файлы
- Команда `systemctl restart nginx` не влияет на CDN
- Нужно очистить кэш в Cloudflare Dashboard

**Как проверить:**
```bash
curl -I https://onai.academy/ | grep -i cloudflare
```

**Решение:**
1. Зайти в Cloudflare Dashboard
2. Caching → Purge Everything
3. Или Development Mode на 3 часа

### 2. Неправильный root в Nginx
**Вероятность: 🟡 СРЕДНЯЯ**

Nginx может отдавать файлы из другой директории:
- `/var/www/html/` (старая папка)
- `/var/www/onai-integrator-login-main/` (backend папка)

**Как проверить:**
```bash
grep "root" /etc/nginx/sites-enabled/onai.academy
```

**Решение:**
Изменить `root` на `/var/www/onai.academy`

### 3. Браузерный кэш (несмотря на Incognito)
**Вероятность: 🟢 НИЗКАЯ**

Service Workers могут кешировать даже в Incognito:
- Vite может генерировать Service Worker
- PWA манифест может регистрировать SW

**Как проверить:**
1. DevTools → Application → Service Workers
2. Если есть - нажать "Unregister"

**Решение:**
Добавить в `index.html`:
```html
<script>
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(r => r.unregister());
});
</script>
```

### 4. Симлинк или несколько копий
**Вероятность: 🟡 СРЕДНЯЯ**

На сервере может быть несколько директорий:
- `/var/www/onai.academy/`
- `/var/www/html/onai.academy/`
- Symlink на другую папку

**Как проверить:**
```bash
ssh root@207.154.231.30 "ls -la /var/www/ | grep onai"
ssh root@207.154.231.30 "readlink /var/www/onai.academy"
```

### 5. Nginx не перезагрузился
**Вероятность: 🟢 НИЗКАЯ**

Nginx процесс может "зависнуть":

**Как проверить:**
```bash
ssh root@207.154.231.30 "systemctl status nginx"
ssh root@207.154.231.30 "ps aux | grep nginx"
```

**Решение:**
```bash
ssh root@207.154.231.30 "killall -9 nginx && systemctl start nginx"
```

### 6. Хэш в URL не обновился
**Вероятность: 🟡 СРЕДНЯЯ**

Vite генерирует хэши для chunk files:
- `index-BwPI5ypq.js` (новый)
- `index-ABC123old.js` (старый в кеше)

Если `index.html` не обновился, он загружает старые chunk'и.

**Как проверить:**
```bash
# Посмотреть какие JS файлы импортируются в index.html
grep "assets/index" /var/www/onai.academy/index.html
grep "assets/index" dist/index.html
```

---

## 🛠️ ПЛАН ДЕЙСТВИЙ (ПОШАГОВО)

### ШАГ 1: Проверка Cloudflare

```bash
curl -I https://onai.academy/ | grep -i cloudflare
```

**Если найден Cloudflare:**
1. Зайти в https://dash.cloudflare.com/
2. Выбрать домен `onai.academy`
3. Caching → Configuration → Purge Everything
4. Подождать 1-2 минуты
5. Проверить снова в Incognito

**Если Cloudflare НЕ найден → ШАГ 2**

---

### ШАГ 2: Проверка Nginx root

```bash
ssh root@207.154.231.30 "grep 'root' /etc/nginx/sites-enabled/onai.academy"
```

**Должно быть:**
```nginx
root /var/www/onai.academy;
```

**Если другой путь:**
```bash
# Изменить конфиг
ssh root@207.154.231.30 "nano /etc/nginx/sites-enabled/onai.academy"
# Изменить root на /var/www/onai.academy
# Сохранить

# Проверить синтаксис
ssh root@207.154.231.30 "nginx -t"

# Перезагрузить
ssh root@207.154.231.30 "systemctl reload nginx"
```

---

### ШАГ 3: Жесткая замена с прямым SCP

```bash
# 1. На локальной машине
cd /Users/miso/onai-integrator-login
npm run build

# 2. Создать tar без macOS атрибутов
tar --no-mac-metadata -czf /tmp/frontend-clean.tar.gz -C dist .

# 3. Скопировать на сервер
scp /tmp/frontend-clean.tar.gz root@207.154.231.30:/tmp/

# 4. На сервере: ПОЛНАЯ ОЧИСТКА
ssh root@207.154.231.30 "rm -rf /var/www/onai.academy"
ssh root@207.154.231.30 "mkdir -p /var/www/onai.academy"

# 5. Распаковать
ssh root@207.154.231.30 "cd /var/www/onai.academy && tar -xzf /tmp/frontend-clean.tar.gz"

# 6. Права
ssh root@207.154.231.30 "chown -R www-data:www-data /var/www/onai.academy && chmod -R 755 /var/www/onai.academy"

# 7. Жесткий рестарт Nginx
ssh root@207.154.231.30 "killall -9 nginx; sleep 2; systemctl start nginx"

# 8. Проверка
curl -I https://onai.academy/
```

---

### ШАГ 4: Проверка Service Workers

```javascript
// В DevTools Console (F12):
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('Service Workers:', registrations);
  registrations.forEach(r => {
    console.log('Unregistering:', r);
    r.unregister();
  });
});

// Затем
location.reload();
```

---

### ШАГ 5: Проверка реального содержимого

```bash
# Что реально отдает сервер
curl https://onai.academy/ > /tmp/real-html.txt
cat /tmp/real-html.txt

# Сравнить с локальным
diff /tmp/real-html.txt dist/index.html
```

---

## 🔬 ДОПОЛНИТЕЛЬНЫЕ КОМАНДЫ ДЛЯ AI АРХИТЕКТОРА

### Полная диагностика одной командой

```bash
#!/bin/bash
echo "=== FRONTEND DEPLOYMENT DIAGNOSTIC ==="
echo ""
echo "1. LOCAL BUILD INFO:"
ls -lh dist/index.html
md5 dist/index.html
echo ""

echo "2. PRODUCTION FILE INFO:"
ssh root@207.154.231.30 "ls -lh /var/www/onai.academy/index.html"
ssh root@207.154.231.30 "md5sum /var/www/onai.academy/index.html"
echo ""

echo "3. NGINX ROOT:"
ssh root@207.154.231.30 "grep -n 'root' /etc/nginx/sites-enabled/onai.academy"
echo ""

echo "4. CDN CHECK:"
curl -sI https://onai.academy/ | grep -i "server:\|cloudflare\|cache"
echo ""

echo "5. FILES COUNT:"
echo "Local: $(ls dist/assets/*.js | wc -l) JS files"
echo "Production: $(ssh root@207.154.231.30 'ls /var/www/onai.academy/assets/*.js 2>/dev/null | wc -l') JS files"
echo ""

echo "6. CONTENT COMPARISON:"
echo "Fetching live content..."
curl -s https://onai.academy/ | head -20
echo ""

echo "7. NGINX STATUS:"
ssh root@207.154.231.30 "systemctl status nginx | grep Active"
echo ""

echo "=== END DIAGNOSTIC ==="
```

---

## 💡 РЕКОМЕНДАЦИИ ДЛЯ AI АРХИТЕКТОРА

### Что анализировать:

1. **Cloudflare Detection:**
   - Если в headers есть `cf-cache-status`, `cf-ray` → 100% Cloudflare
   - Решение: Purge CDN cache

2. **MD5 Comparison:**
   - Если MD5 локального ≠ MD5 production → файлы разные
   - Решение: Перезалить файлы

3. **Nginx root:**
   - Если `root /var/www/html` или другой путь → неправильная директория
   - Решение: Изменить на `/var/www/onai.academy`

4. **File Count Mismatch:**
   - Если локально 126 JS, а на production 80 → неполная загрузка
   - Решение: Повторить rsync/scp

5. **Content Fetch:**
   - Если `curl https://onai.academy/` возвращает старый HTML → проблема на сервере
   - Если возвращает новый HTML, но браузер показывает старый → Service Worker

---

## 🎯 ФИНАЛЬНОЕ РЕШЕНИЕ (NUCLEAR OPTION)

Если ничего не помогает:

```bash
# 1. ПОЛНАЯ ОЧИСТКА ВСЕГО
ssh root@207.154.231.30 "rm -rf /var/www/onai.academy /var/cache/nginx/* /tmp/*"

# 2. СОЗДАТЬ ЧИСТУЮ ДИРЕКТОРИЮ
ssh root@207.154.231.30 "mkdir -p /var/www/onai.academy"

# 3. ПРЯМОЕ КОПИРОВАНИЕ ФАЙЛОВ (БЕЗ TAR/RSYNC)
cd /Users/miso/onai-integrator-login/dist
find . -type f -exec scp {} root@207.154.231.30:/var/www/onai.academy/{} \;

# 4. ПРАВА
ssh root@207.154.231.30 "chown -R www-data:www-data /var/www/onai.academy && chmod -R 755 /var/www/onai.academy"

# 5. KILL NGINX + RESTART
ssh root@207.154.231.30 "pkill -9 nginx && sleep 2 && systemctl start nginx"

# 6. PURGE CLOUDFLARE (если есть)
# Через Dashboard вручную

# 7. ПРОВЕРКА
curl -I https://onai.academy/?nocache=$(date +%s)
```

---

## 📊 CHECKLIST ДЛЯ ФИНАЛЬНОЙ ПРОВЕРКИ

- [ ] `curl -I https://onai.academy/` возвращает 200 OK
- [ ] `curl https://onai.academy/` содержит свежий HTML (с новыми JS хэшами)
- [ ] `ssh root@207.154.231.30 "ls -lh /var/www/onai.academy/"` показывает свежие timestamp'ы
- [ ] MD5 локального index.html = MD5 production index.html
- [ ] Количество JS файлов локально = количество на production
- [ ] Nginx config: `root /var/www/onai.academy`
- [ ] Nginx status: `active (running)`
- [ ] Cloudflare cache: purged (если используется)
- [ ] Service Workers: unregistered
- [ ] Incognito mode: показывает новый интерфейс

---

## 🆘 ЕСЛИ НИЧЕГО НЕ ПОМОГАЕТ

1. **Проверить DNS:**
   ```bash
   dig onai.academy
   # Убедиться что IP = 207.154.231.30
   ```

2. **Проверить Load Balancer:**
   - Может быть несколько серверов за LB
   - Один обновлен, другой нет

3. **Проверить Docker/Container:**
   - Может быть frontend в Docker контейнере
   - Который не перезапускается

4. **Временно отключить кеширование в Nginx:**
   ```nginx
   location / {
     add_header Cache-Control "no-store, no-cache, must-revalidate";
     try_files $uri $uri/ /index.html;
   }
   ```

---

**Prepared for:** AI Архитектор (Perplexity/Claude)  
**Date:** 23 декабря 2025  
**Status:** 🚨 ТРЕБУЕТ НЕМЕДЛЕННОГО РЕШЕНИЯ
