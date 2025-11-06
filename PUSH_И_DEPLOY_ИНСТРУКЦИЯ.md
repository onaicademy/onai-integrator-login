# 🚀 КАК СДЕЛАТЬ PUSH И DEPLOY

**Быстрая инструкция для GitHub и Digital Ocean**

---

## 1️⃣ PUSH В GITHUB

```bash
# Проверь что все закоммичено
git status

# Должно быть:
# On branch main
# nothing to commit, working tree clean

# Если есть изменения:
git add .
git commit -m "feat: Добавлены новые страницы админ-панели"

# Push в GitHub
git push origin main

# Если просит пароль:
# Используй Personal Access Token вместо пароля
# https://github.com/settings/tokens
```

### ❌ Если ошибка "failed to push":

```bash
# Подтяни изменения с сервера
git pull origin main --rebase

# Потом снова push
git push origin main
```

---

## 2️⃣ DEPLOY НА DIGITAL OCEAN

### Способ 1: Автоматический (если настроен GitHub Actions)

```bash
# Push автоматически задеплоит на сервер
git push origin main

# Жди 2-3 минуты
# Проверь: https://integratoronai.kz
```

### Способ 2: Вручную через SSH

```bash
# 1. Подключись к серверу
ssh root@integratoronai.kz
# Или:
ssh root@YOUR_SERVER_IP

# 2. Перейди в папку проекта
cd /var/www/onai-integrator-login
# Или узнай где проект:
find /var/www -name "onai-integrator-login" -type d

# 3. Подтяни изменения
git pull origin main

# 4. Установи зависимости (если нужно)
npm install

# 5. Собери проект
npm run build

# 6. Перезапусти сервер
# Если используешь PM2:
pm2 restart all

# Если используешь systemd:
sudo systemctl restart onai-app

# Если используешь nginx + node:
sudo systemctl restart nginx
```

### Способ 3: Через DigitalOcean App Platform

```bash
# 1. Открой: https://cloud.digitalocean.com/apps
# 2. Выбери своё приложение
# 3. Deploy → Deploy Latest Commit
# 4. Жди 5-10 минут
# 5. Проверь: https://integratoronai.kz
```

---

## 🔍 ПРОВЕРКА ПОСЛЕ DEPLOY

```bash
# Открой сайт
https://integratoronai.kz

# Проверь страницы:
✅ https://integratoronai.kz/admin
✅ https://integratoronai.kz/profile
✅ https://integratoronai.kz/achievements

# Консоль браузера (F12):
✅ Нет ошибок?
✅ Все загружается?
```

---

## ❓ ЕСЛИ НЕ РАБОТАЕТ

### Проблема 1: "404 Not Found" на новых страницах

```bash
# Проверь nginx конфигурацию
ssh root@integratoronai.kz
cat /etc/nginx/sites-available/onai-integrator-login

# Должно быть:
location / {
    try_files $uri $uri/ /index.html;
}

# Если нет, добавь и перезапусти nginx:
sudo systemctl restart nginx
```

### Проблема 2: "Пустая страница"

```bash
# Проверь логи на сервере
ssh root@integratoronai.kz
pm2 logs

# Или:
journalctl -u onai-app -n 50

# Очисти кэш браузера:
Ctrl+Shift+R (Chrome/Firefox)
```

### Проблема 3: ".env токены не работают"

```bash
# Проверь что .env на сервере обновлён
ssh root@integratoronai.kz
cd /var/www/onai-integrator-login
cat .env | grep TELEGRAM

# Если нет токенов, добавь:
nano .env

# Добавь:
VITE_TELEGRAM_MENTOR_BOT_TOKEN=8380600260:AAGtuSG9GqFOmkyThhWqRzilHi3gKdKiOSo
VITE_TELEGRAM_ADMIN_BOT_TOKEN=8400927507:AAF1w1H8lyE2vonPY-Z61vBybBT8dkN-Ip4

# Сохрани (Ctrl+X → Y → Enter)

# Пересобери:
npm run build

# Перезапусти:
pm2 restart all
```

---

## 🎯 БЫСТРАЯ КОМАНДА (ВСЁ В ОДНОМ)

```bash
# На локальной машине:
git add . && \
git commit -m "feat: Новые страницы админ-панели" && \
git push origin main

# На сервере (через SSH):
ssh root@integratoronai.kz "cd /var/www/onai-integrator-login && \
git pull origin main && \
npm install && \
npm run build && \
pm2 restart all"

# Жди 2 минуты, потом проверь:
open https://integratoronai.kz/admin
```

---

## ✅ ГОТОВО!

После успешного deploy, проверь:

```
✅ https://integratoronai.kz/admin
✅ https://integratoronai.kz/admin/students-activity
✅ https://integratoronai.kz/admin/ai-analytics
✅ https://integratoronai.kz/profile/settings
✅ https://integratoronai.kz/messages
```

**Всё должно работать!** 🎉

