# 🚨 ЭКСТРЕННАЯ ДИАГНОСТИКА 404 ОШИБКИ

**Дата:** 6 ноября 2025  
**Проблема:** 404 ошибка на сервере  
**Статус:** 🔴 ТРЕБУЕТ ДЕЙСТВИЯ

---

## ⚠️ SSH НЕ РАБОТАЕТ ИЗ CURSOR

SSH подключение из моего окружения заблокировано. Тебе нужно **САМОМУ** выполнить команды!

---

## 🚀 БЫСТРОЕ РЕШЕНИЕ (2 МИНУТЫ)

### ВАРИАНТ 1: Запусти скрипт диагностики

Я создал скрипт `diagnose-server.sh` в твоём проекте.

**На твоём Mac, в терминале:**

```bash
cd "/Users/miso/Documents/MVP onAI Academy Platform/onai-integrator-login"
./diagnose-server.sh
```

**Скопируй весь вывод и покажи мне!**

---

### ВАРИАНТ 2: Выполни команды вручную

**На твоём Mac, открой Terminal и выполни:**

```bash
ssh root@178.128.203.40
```

**После подключения к серверу, выполни:**

```bash
cd /var/www/onai-integrator-login

echo "=== 1. GIT STATUS ==="
git log --oneline -1
git status

echo ""
echo "=== 2. DIST FOLDER ==="
ls -lh dist/ | head -10

echo ""
echo "=== 3. NGINX STATUS ==="
systemctl status nginx | head -10

echo ""
echo "=== 4. NGINX CONFIG ==="
nginx -t

echo ""
echo "=== 5. INDEX.HTML ==="
ls -lh dist/index.html

echo ""
echo "=== 6. ПРОВЕРКА HTTP ==="
curl -I http://localhost/

echo ""
echo "=== 7. ПРОВЕРКА /admin/activity ==="
curl -I http://localhost/admin/activity
```

**СКОПИРУЙ ВЕСЬ ВЫВОД И ПОКАЖИ МНЕ!**

---

## 🤔 ВОЗМОЖНЫЕ ПРИЧИНЫ 404

### ТЕОРИЯ 1: Build не собрался ❌

**Проверка:**
```bash
cd /var/www/onai-integrator-login
npm run build
```

**Ожидаемый результат:**
```
✓ built in X.XXs
dist/index.html created
```

**Если ошибка:** Покажи мне полный вывод!

---

### ТЕОРИЯ 2: dist/ пустая или отсутствует ❌

**Проверка:**
```bash
ls -lh /var/www/onai-integrator-login/dist/
```

**Должно быть:**
```
-rw-r--r-- 1 www-data www-data  1.5K ... index.html
-rw-r--r-- 1 www-data www-data   96K ... index-XXX.css
-rw-r--r-- 1 www-data www-data  1.1M ... index-XXX.js
drwxr-xr-x 2 www-data www-data  4.0K ... assets/
```

**Если пусто:** Запусти `npm run build`!

---

### ТЕОРИЯ 3: Nginx конфиг сломался ❌

**Проверка:**
```bash
nginx -t
```

**Должно быть:**
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

**Если ошибка:** 
```bash
cat /etc/nginx/sites-available/onai-integrator-login
```

**Покажи мне конфиг!**

---

### ТЕОРИЯ 4: Права на файлы неправильные ❌

**Проверка:**
```bash
ls -la /var/www/onai-integrator-login/dist/
```

**Должно быть:**
```
Owner: www-data
Group: www-data
```

**Если не так, исправь:**
```bash
chown -R www-data:www-data /var/www/onai-integrator-login/dist
systemctl restart nginx
```

---

### ТЕОРИЯ 5: Git pull не выполнился ❌

**Проверка:**
```bash
cd /var/www/onai-integrator-login
git log --oneline -1
```

**Должно быть:**
```
76ad385 docs: полный отчёт об исправлении MOCK данных + история коммитов
```

**Если нет, обнови:**
```bash
git pull origin main
npm run build
chown -R www-data:www-data dist
systemctl restart nginx
```

---

### ТЕОРИЯ 6: Nginx SPA конфиг отсутствует ❌

**Проверка:**
```bash
cat /etc/nginx/sites-available/onai-integrator-login | grep -A 5 "location /"
```

**Должно быть:**
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

**Если нет, добавь:**
```bash
nano /etc/nginx/sites-available/onai-integrator-login
```

Найди блок `location /` и добавь строку:
```nginx
try_files $uri $uri/ /index.html;
```

Затем:
```bash
nginx -t
systemctl reload nginx
```

---

## 🛠️ БЫСТРОЕ ИСПРАВЛЕНИЕ (БЕЗ ДИАГНОСТИКИ)

Если не хочешь разбираться, просто выполни на сервере:

```bash
cd /var/www/onai-integrator-login

# 1. Получить последний код
git pull origin main

# 2. Установить зависимости (если нужно)
npm install

# 3. Собрать проект
npm run build

# 4. Выставить права
chown -R www-data:www-data dist

# 5. Перезапустить Nginx
systemctl restart nginx

# 6. Проверить
curl -I http://localhost/
```

**Последняя строка должна быть:**
```
HTTP/1.1 200 OK
```

**Если 404, покажи мне полный вывод всех команд!**

---

## 📋 CHECKLIST ДИАГНОСТИКИ

Отметь что проверил:

```
□ SSH на сервер работает
□ git log показывает 76ad385 или 6f20a36
□ git status показывает "clean"
□ dist/ существует
□ dist/index.html существует
□ npm run build без ошибок
□ nginx -t успешен
□ systemctl status nginx - active
□ ls -la dist показывает www-data
□ curl http://localhost/ дает 200
□ curl http://localhost/admin/activity дает 200
```

---

## 🆘 ЕСЛИ НИЧЕГО НЕ ПОМОГЛО

### Последний способ - полный rebuild:

```bash
cd /var/www/onai-integrator-login

# Бекап старого dist
mv dist dist.backup

# Полная переустановка
rm -rf node_modules package-lock.json
npm install
npm run build

# Права
chown -R www-data:www-data dist

# Перезапуск
systemctl restart nginx

# Проверка
curl -I https://onai.academy/
```

---

## 📊 ОЖИДАЕМЫЕ РЕЗУЛЬТАТЫ

### Успешная проверка выглядит так:

```bash
# Git
git log --oneline -1
# 76ad385 docs: полный отчёт об исправлении MOCK данных

# Dist
ls -lh dist/index.html
# -rw-r--r-- 1 www-data www-data 1.5K ... dist/index.html

# Nginx
nginx -t
# nginx: configuration file test is successful

# HTTP
curl -I http://localhost/
# HTTP/1.1 200 OK

# HTTP admin
curl -I http://localhost/admin/activity
# HTTP/1.1 200 OK
```

---

## 🎯 ЧТО МНЕ НУЖНО ОТ ТЕБЯ

**ВАРИАНТ А: Если скрипт работает**
```bash
cd "/Users/miso/Documents/MVP onAI Academy Platform/onai-integrator-login"
./diagnose-server.sh
```
Покажи мне весь вывод!

**ВАРИАНТ Б: Если скрипт не работает**
Выполни команды из ВАРИАНТ 2 вручную и покажи результаты!

**ВАРИАНТ В: Если не можешь подключиться**
Проверь что у тебя есть SSH ключ или пароль для `root@178.128.203.40`

---

## 🔗 ПОЛЕЗНЫЕ ССЫЛКИ

**Если сайт работает:**
- https://onai.academy/
- https://onai.academy/admin/activity

**GitHub (код там точно актуальный):**
- https://github.com/onaicademy/onai-integrator-login
- Последний коммит: https://github.com/onaicademy/onai-integrator-login/commit/76ad385

---

## ⚡ ДЕЙСТВУЙ БЫСТРО!

1. **Открой Terminal на Mac**
2. **Выполни `./diagnose-server.sh`** или команды вручную
3. **Скопируй ВЕСЬ вывод**
4. **Покажи мне результаты**

Я жду твоих результатов диагностики! 🚀

---

**Создано:** 6 ноября 2025  
**Скрипт:** diagnose-server.sh  
**Статус:** 🔴 ОЖИДАЕТ ДИАГНОСТИКИ

