# 🚀 КОРОТКАЯ ИНСТРУКЦИЯ: ДЕПЛОЙ НА DIGITAL OCEAN

**Обновлено:** 20 декабря 2025  
**Сервер:** Digital Ocean (207.154.231.30)  
**Домен:** onai.academy

---

## ⚡ БЫСТРЫЙ ДЕПЛОЙ (3 минуты)

### 1️⃣ ЛОКАЛЬНЫЙ БИЛД

```bash
cd /Users/miso/onai-integrator-login
rm -rf dist
npm run build
```

**Проверка:** файл `dist/index.html` должен появиться

---

### 2️⃣ ДЕПЛОЙ FRONTEND (Метод 1: SCP)

```bash
# Удалить старые файлы на сервере
ssh root@207.154.231.30 "rm -rf /var/www/onai.academy/*"

# Загрузить новые
scp -r dist/* root@207.154.231.30:/var/www/onai.academy/

# Исправить права
ssh root@207.154.231.30 "chown -R www-data:www-data /var/www/onai.academy/ && chmod -R 755 /var/www/onai.academy/"
```

**✅ Этот метод ВСЕГДА работает!**

---

### 3️⃣ ОЧИСТКА ВСЕХ КЭШЕЙ

```bash
# 1. Очистить кэш Nginx
ssh root@207.154.231.30 "rm -rf /var/cache/nginx/* && systemctl restart nginx"

# 2. Проверить что обновилось
ssh root@207.154.231.30 "stat -c '%y' /var/www/onai.academy/index.html"
```

**Timestamp должен быть свежим (сейчас)!**

---

### 4️⃣ ПРОВЕРКА В БРАУЗЕРЕ

1. **Открыть Incognito mode** (Cmd+Shift+N)
2. **Перейти:** https://onai.academy/integrator/sales-manager
3. **Hard refresh:** Cmd+Shift+R (Mac) или Ctrl+Shift+R (Windows)

**✅ Если видишь изменения - деплой успешен!**

---

## 🔥 ЕСЛИ НЕ ОБНОВЛЯЕТСЯ (Полная очистка)

### Вариант A: Полная переустановка Frontend

```bash
# 1. Backup (на всякий случай)
ssh root@207.154.231.30 "tar -czf /root/backup-$(date +%Y%m%d-%H%M).tar.gz /var/www/onai.academy/"

# 2. УДАЛИТЬ ВСЁ
ssh root@207.154.231.30 "rm -rf /var/www/onai.academy/*"

# 3. Локальный билд (свежий!)
cd /Users/miso/onai-integrator-login
rm -rf dist node_modules/.vite
npm run build

# 4. Загрузить через tar (быстрее для больших файлов)
tar -czf /tmp/onai-new.tar.gz -C dist .
scp /tmp/onai-new.tar.gz root@207.154.231.30:/tmp/
ssh root@207.154.231.30 "cd /var/www/onai.academy && tar -xzf /tmp/onai-new.tar.gz"

# 5. Права
ssh root@207.154.231.30 "chown -R www-data:www-data /var/www/onai.academy/ && chmod -R 755 /var/www/onai.academy/"

# 6. ЖЕСТКАЯ перезагрузка Nginx
ssh root@207.154.231.30 "systemctl stop nginx && rm -rf /var/cache/nginx/* && systemctl start nginx"
```

---

### Вариант B: Через rsync (если SCP не сработал)

```bash
rsync -avz --delete \
  --no-perms --no-owner --no-group \
  --chown=www-data:www-data \
  dist/ root@207.154.231.30:/var/www/onai.academy/

ssh root@207.154.231.30 "systemctl reload nginx"
```

---

## 🛠️ ДЕПЛОЙ BACKEND (если менялся API)

```bash
# 1. Подключиться к серверу
ssh root@207.154.231.30

# 2. Перейти в папку backend
cd /var/www/onai-integrator-login-main/backend

# 3. Забрать изменения из Git
git pull origin main

# 4. Установить зависимости (если добавились новые)
npm install

# 5. Перезапустить backend
pm2 restart onai-backend

# 6. Проверить логи
pm2 logs onai-backend --lines 20
```

**✅ Если нет ошибок - backend обновлен!**

---

## 🐛 ТИПИЧНЫЕ ПРОБЛЕМЫ

### Проблема 1: "Frontend не обновляется"

**Симптомы:** Вижу старый UI, даже в Incognito

**Решение:**
```bash
# Жесткая очистка всех кэшей
ssh root@207.154.231.30 "systemctl stop nginx && rm -rf /var/cache/nginx/* && systemctl start nginx"

# Проверить timestamp
ssh root@207.154.231.30 "stat -c '%y' /var/www/onai.academy/index.html"
```

Если timestamp старый - файлы не обновились! Используй **Вариант A (Полная переустановка)**.

---

### Проблема 2: "API не отвечает / 502 Bad Gateway"

**Симптомы:** Frontend загружается, но API запросы падают

**Решение:**
```bash
# 1. Проверить статус backend
ssh root@207.154.231.30 "pm2 status"

# 2. Если backend "stopped" - запустить
ssh root@207.154.231.30 "pm2 restart onai-backend"

# 3. Проверить логи ошибок
ssh root@207.154.231.30 "pm2 logs onai-backend --lines 50 --err"
```

---

### Проблема 3: "rsync говорит Permission denied"

**Решение:** Используй **SCP** вместо rsync (см. раздел "БЫСТРЫЙ ДЕПЛОЙ").

---

### Проблема 4: "Браузер кэширует старую версию"

**Решение:**
1. Открой **Incognito mode**
2. Нажми **Cmd+Shift+R** (hard refresh)
3. Если не помогает - очисти кэш браузера:
   - Chrome: Settings → Privacy → Clear browsing data
   - Safari: Safari → Clear History

---

### Проблема 5: "Backend падает после деплоя"

**Симптомы:** pm2 статус показывает "errored"

**Решение:**
```bash
# 1. Посмотреть ошибку
ssh root@207.154.231.30 "pm2 logs onai-backend --lines 100 --err"

# 2. Если "Cannot find module" - установить зависимости
ssh root@207.154.231.30 "cd /var/www/onai-integrator-login-main/backend && npm install"

# 3. Перезапустить
ssh root@207.154.231.30 "pm2 restart onai-backend"
```

---

## ✅ ПРОВЕРКА ПОСЛЕ ДЕПЛОЯ

### 1. Проверка файлов на сервере

```bash
ssh root@207.154.231.30 "ls -lh /var/www/onai.academy/ | head -5"
```

**Должно быть:**
- Timestamp = сейчас (текущее время)
- Владелец = `www-data:www-data`

---

### 2. Проверка backend

```bash
ssh root@207.154.231.30 "pm2 status && pm2 logs onai-backend --lines 10"
```

**Должно быть:**
- Статус = `online`
- Нет ошибок в логах

---

### 3. Проверка в браузере

1. **Incognito mode:** Cmd+Shift+N
2. **Открыть:** https://onai.academy/integrator/sales-manager
3. **Проверить:** UI обновился, API работает

**✅ Если всё работает - деплой успешен!**

---

## 🔄 ROLLBACK (Откат изменений)

Если что-то сломалось - откат за 1 минуту:

```bash
# 1. Найти последний backup
ssh root@207.154.231.30 "ls -lht /root/backup-*.tar.gz | head -3"

# 2. Восстановить (замените YYYYMMDD-HHMM на нужную дату)
ssh root@207.154.231.30 "tar -xzf /root/backup-20251220-1430.tar.gz -C /"

# 3. Права
ssh root@207.154.231.30 "chown -R www-data:www-data /var/www/onai.academy/"

# 4. Перезагрузить
ssh root@207.154.231.30 "systemctl reload nginx"
```

---

## 🎯 БЫСТРАЯ ШПАРГАЛКА

```bash
# 1. БИЛД
cd /Users/miso/onai-integrator-login && rm -rf dist && npm run build

# 2. ДЕПЛОЙ (метод A - всегда работает)
ssh root@207.154.231.30 "rm -rf /var/www/onai.academy/*"
scp -r dist/* root@207.154.231.30:/var/www/onai.academy/
ssh root@207.154.231.30 "chown -R www-data:www-data /var/www/onai.academy/ && chmod -R 755 /var/www/onai.academy/"

# 3. ОЧИСТКА КЭША
ssh root@207.154.231.30 "rm -rf /var/cache/nginx/* && systemctl restart nginx"

# 4. ПРОВЕРКА
ssh root@207.154.231.30 "stat -c '%y' /var/www/onai.academy/index.html"
```

**Копируй эти 4 команды и запускай последовательно!**

---

## 📋 CHECKLIST

Перед деплоем:
- [ ] Код протестирован локально
- [ ] Создан backup: `ssh root@207.154.231.30 "tar -czf /root/backup-$(date +%Y%m%d-%H%M).tar.gz /var/www/onai.academy/"`

После деплоя:
- [ ] Timestamp обновился
- [ ] Владелец = www-data:www-data
- [ ] Backend online (pm2 status)
- [ ] UI обновился (Incognito mode)
- [ ] API работает (проверить запросы в DevTools)

---

## 🆘 ЕСЛИ НИЧЕГО НЕ ПОМОГАЕТ

### Последний вариант (Nuclear Option):

```bash
# 1. Backup
ssh root@207.154.231.30 "tar -czf /root/emergency-backup-$(date +%Y%m%d-%H%M).tar.gz /var/www/onai.academy/"

# 2. Остановить всё
ssh root@207.154.231.30 "systemctl stop nginx && pm2 stop all"

# 3. Удалить ВСЁ
ssh root@207.154.231.30 "rm -rf /var/www/onai.academy/* && rm -rf /var/cache/nginx/*"

# 4. Свежий билд
cd /Users/miso/onai-integrator-login
rm -rf dist node_modules/.vite
npm run build

# 5. Загрузить
scp -r dist/* root@207.154.231.30:/var/www/onai.academy/

# 6. Права
ssh root@207.154.231.30 "chown -R www-data:www-data /var/www/onai.academy/ && chmod -R 755 /var/www/onai.academy/"

# 7. Запустить всё
ssh root@207.154.231.30 "systemctl start nginx && pm2 restart all"

# 8. Проверить
ssh root@207.154.231.30 "pm2 status && systemctl status nginx"
```

---

## 📞 КОНТАКТЫ

**Server:** Digital Ocean  
**IP:** 207.154.231.30  
**Dashboard:** https://cloud.digitalocean.com/

---

**🎉 Готово! Используй эту инструкцию для всех деплоев!**
