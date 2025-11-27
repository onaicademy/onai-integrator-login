# 🚀 Инструкции для деплоя на сервер

**Дата:** 5 ноября 2025  
**Статус:** ⏳ ТРЕБУЕТСЯ ВЫПОЛНИТЬ НА СЕРВЕРЕ

---

## ⚠️ ВАЖНО: Что уже сделано

✅ **На локальной машине:**
- Авторизация отключена на всех страницах
- Изменения закоммичены в Git
- Push в GitHub выполнен успешно

⏳ **На сервере НУЖНО выполнить:**
- Обновить код с GitHub
- Пересобрать проект
- Проверить Nginx конфигурацию
- Проверить .env файл

---

## 📋 ПОШАГОВАЯ ИНСТРУКЦИЯ ДЛЯ СЕРВЕРА

### Шаг 1: Подключиться к серверу

```bash
ssh root@178.128.203.40
```

---

### Шаг 2: Перейти в директорию проекта

```bash
cd /var/www/onai-integrator-login
```

---

### Шаг 3: Обновить код с GitHub

```bash
git pull origin main
```

**Ожидаемый результат:**
```
From https://github.com/onaicademy/onai-integrator-login
 * branch            main       -> FETCH_HEAD
Updating 85a5bdb..abe2f31
Fast-forward
 AUTH_DISABLED_FOR_TESTING.md     | 320 +++++++++++++++++++++++++++++++
 src/pages/admin/Activity.tsx     |  45 ++---
 2 files changed, 320 insertions(+), 45 deletions(-)
```

---

### Шаг 4: Установить зависимости

```bash
npm install
```

---

### Шаг 5: Проверить .env файл на сервере

```bash
cat .env
```

**Должно быть:**
```env
VITE_SUPABASE_URL=https://capdjvokjdivxjfdddmx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGc...
VITE_SITE_URL=https://onai.academy
```

**Если файла нет или неправильные данные - создать/исправить:**
```bash
cat > .env << 'EOF'
VITE_SUPABASE_URL=https://capdjvokjdivxjfdddmx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhcGRqdm9ramRpdnhqZmRkZG14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA2Mzc3MDIsImV4cCI6MjA0NjIxMzcwMn0.1rHZY2Ng0HqA-A5JVh3IKYx4jqZqx9FJfI8iqMKLHVc
VITE_SITE_URL=https://onai.academy
EOF
```

---

### Шаг 6: Собрать проект

```bash
npm run build
```

**Ожидаемый результат:**
```
vite v5.x.x building for production...
✓ xxx modules transformed.
dist/index.html                   x.xx kB
dist/assets/index-xxxxxx.js       xxx.xx kB
✓ built in xxxs
```

---

### Шаг 7: Установить права на файлы

```bash
chown -R www-data:www-data dist
```

---

### Шаг 8: КРИТИЧНО - Проверить Nginx конфигурацию для SPA

```bash
cat /etc/nginx/sites-available/onai-integrator-login
```

**ДОЛЖНО БЫТЬ (ключевое - `try_files`):**
```nginx
server {
    server_name onai.academy www.onai.academy;
    root /var/www/onai-integrator-login/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # SSL настройки...
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/onai.academy/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/onai.academy/privkey.pem;
}
```

**Если `try_files` отсутствует - ДОБАВИТЬ:**

```bash
# Редактировать конфигурацию
nano /etc/nginx/sites-available/onai-integrator-login

# Найти блок:
location / {
    ...
}

# Добавить внутрь:
    try_files $uri $uri/ /index.html;

# Сохранить: Ctrl+O, Enter, Ctrl+X
```

---

### Шаг 9: Проверить конфигурацию Nginx

```bash
nginx -t
```

**Должно быть:**
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

---

### Шаг 10: Перезапустить Nginx

```bash
systemctl restart nginx
```

**Проверить статус:**
```bash
systemctl status nginx
```

**Должно быть:**
```
● nginx.service - A high performance web server
   Active: active (running)
```

---

## ✅ ПРОВЕРКА РЕЗУЛЬТАТА

### 1. Проверить через curl на сервере:

```bash
# Главная страница
curl -I http://localhost

# Должно вернуть: HTTP/1.1 200 OK

# Профиль (должен вернуть index.html, а не 404)
curl -I http://localhost/profile

# Должно вернуть: HTTP/1.1 200 OK
```

### 2. Проверить в браузере:

Открой в браузере:
```
https://onai.academy/
https://onai.academy/profile
https://onai.academy/welcome
https://onai.academy/admin/activity
```

**Ожидаемый результат:**
- ✅ Все страницы открываются сразу
- ✅ Нет ошибок 404
- ✅ Нет редиректов на главную
- ✅ UI отображается полностью

---

## 🐛 Troubleshooting

### Проблема: 404 на /profile, /welcome, /admin/activity

**Причина:** Отсутствует `try_files` в Nginx

**Решение:**
```bash
nano /etc/nginx/sites-available/onai-integrator-login
# Добавить: try_files $uri $uri/ /index.html;
nginx -t
systemctl restart nginx
```

---

### Проблема: Бесконечная загрузка

**Причина:** Неправильные переменные в .env

**Решение:**
```bash
cd /var/www/onai-integrator-login
cat .env  # Проверить
# Если неправильно - пересоздать (см. Шаг 5)
npm run build
chown -R www-data:www-data dist
systemctl restart nginx
```

---

### Проблема: Старая версия кода

**Причина:** Не сделан git pull

**Решение:**
```bash
cd /var/www/onai-integrator-login
git pull origin main
npm install
npm run build
chown -R www-data:www-data dist
```

---

## 📊 ЧТО ДОЛЖНО РАБОТАТЬ ПОСЛЕ ДЕПЛОЯ

```
✅ https://onai.academy/ 
   - Открывается главная страница

✅ https://onai.academy/profile 
   - Открывается профиль БЕЗ авторизации

✅ https://onai.academy/welcome 
   - Открывается опросник БЕЗ авторизации

✅ https://onai.academy/admin/activity 
   - Открывается админ-панель БЕЗ авторизации

✅ Все страницы без 404 ошибок
✅ Все страницы без редиректов
✅ React Router работает корректно
```

---

## 📝 БЫСТРАЯ КОМАНДА (всё сразу)

Если хочешь выполнить всё одной командой (после SSH):

```bash
cd /var/www/onai-integrator-login && \
git pull origin main && \
npm install && \
npm run build && \
chown -R www-data:www-data dist && \
echo "✅ Код обновлён и собран!" && \
echo "" && \
echo "⚠️ ПРОВЕРЬ Nginx конфигурацию:" && \
echo "cat /etc/nginx/sites-available/onai-integrator-login | grep 'try_files'" && \
echo "" && \
echo "Если try_files нет - добавь и перезапусти nginx!"
```

---

## 🎯 КРИТИЧНЫЕ МОМЕНТЫ

### 1. `try_files $uri $uri/ /index.html;`
**ЭТО САМОЕ ВАЖНОЕ!** Без этого React Router не работает на production.

### 2. Правильный .env
Убедись что URL правильный: `capdjvokjdivxjfdddmx.supabase.co`

### 3. npm run build после изменений
Всегда пересобирай после изменения .env или кода!

---

## ✅ ФИНАЛЬНЫЙ ЧЕКЛИСТ

Отметь по мере выполнения:

- [ ] SSH подключение к серверу
- [ ] `cd /var/www/onai-integrator-login`
- [ ] `git pull origin main`
- [ ] `npm install`
- [ ] Проверить/создать правильный .env
- [ ] `npm run build`
- [ ] `chown -R www-data:www-data dist`
- [ ] Проверить Nginx: есть ли `try_files`?
- [ ] Если нет - добавить `try_files $uri $uri/ /index.html;`
- [ ] `nginx -t` (проверка конфигурации)
- [ ] `systemctl restart nginx`
- [ ] Проверить в браузере все страницы

---

**После выполнения всех шагов - ВСЁ ДОЛЖНО РАБОТАТЬ!** 🎉

**Проблемы?** Проверь логи: `tail -f /var/log/nginx/error.log`

