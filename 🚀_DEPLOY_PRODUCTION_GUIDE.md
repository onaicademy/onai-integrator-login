# 🚀 ПОЛНОЕ РУКОВОДСТВО ПО ДЕПЛОЮ НА PRODUCTION

**Дата создания:** 16 декабря 2025  
**Версия:** 1.0  
**Статус:** Проверено и работает на Digital Ocean

---

## 📑 СОДЕРЖАНИЕ

1. [Конфигурация сервера](#конфигурация-сервера)
2. [Быстрый деплой (стандартный случай)](#быстрый-деплой)
3. [Полный деплой (с проблемами)](#полный-деплой)
4. [Типичные проблемы и решения](#проблемы-и-решения)
5. [Проверка результата](#проверка-результата)
6. [Rollback (откат изменений)](#rollback)
7. [Лучшие практики](#лучшие-практики)

---

## 🔧 КОНФИГУРАЦИЯ СЕРВЕРА

### Основная информация

**Сервер:** Digital Ocean Droplet  
**IP:** `207.154.231.30`  
**Домен:** `onai.academy`  
**ОС:** Ubuntu Linux

### SSH доступ

```bash
# Подключение к серверу
ssh root@207.154.231.30

# Если нужен пароль - запросить у администратора
```

**💡 Совет:** Добавьте SSH ключ для быстрого доступа:
```bash
# Локально
ssh-copy-id root@207.154.231.30
```

### Структура файлов на сервере

```
/var/www/
├── onai.academy/              # Frontend (React SPA)
│   ├── index.html
│   ├── assets/
│   ├── favicon.ico
│   └── ...
├── onai-integrator-login-main/  # Backend (Node.js)
│   └── backend/
│       ├── src/
│       ├── env.env
│       └── package.json
└── html/                      # Старая папка (игнорировать)
```

### Nginx конфигурация

**Файл:** `/etc/nginx/sites-enabled/onai.academy`

```nginx
server {
    listen 443 ssl http2;
    server_name onai.academy;
    
    root /var/www/onai.academy;
    index index.html;
    
    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API proxy
    location /api/ {
        proxy_pass http://localhost:3000;
        # ... headers
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1h;
        add_header Cache-Control "public";
    }
    
    # Disable cache for index.html
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
}
```

### PM2 (Backend)

```bash
# Проверка статуса
pm2 status

# Логи
pm2 logs onai-backend

# Перезапуск
pm2 restart onai-backend

# Полная остановка и запуск
pm2 stop onai-backend
pm2 start src/server.ts --name onai-backend --interpreter npx --interpreter-args 'tsx'
```

---

## ⚡ БЫСТРЫЙ ДЕПЛОЙ (Стандартный случай)

**Когда использовать:**
- Небольшие изменения UI
- Исправление багов
- Обновление текстов
- Файлы на сервере в порядке (правильный владелец)

### Шаги

#### 1. Локальный билд

```bash
cd /Users/miso/onai-integrator-login

# Чистый билд
rm -rf dist
npm run build
```

**Проверка:**
```bash
ls -lh dist/index.html
# Должен быть свежий timestamp
```

#### 2. Деплой через rsync

```bash
rsync -avz --delete \
  --chown=www-data:www-data \
  /Users/miso/onai-integrator-login/dist/ \
  root@207.154.231.30:/var/www/onai.academy/
```

**Флаги:**
- `-a` = archive mode (сохраняет права, timestamps)
- `-v` = verbose (показывает процесс)
- `-z` = compress (сжимает при передаче)
- `--delete` = удаляет файлы которых нет в source
- `--chown=www-data:www-data` = **КРИТИЧНО!** Устанавливает правильного владельца

#### 3. Перезагрузка Nginx

```bash
ssh root@207.154.231.30 "systemctl reload nginx"
```

#### 4. Проверка

```bash
# Timestamp
ssh root@207.154.231.30 "stat -c '%y' /var/www/onai.academy/index.html"

# Владелец
ssh root@207.154.231.30 "ls -la /var/www/onai.academy/ | head -5"
```

**Ожидаемый результат:**
- Timestamp = текущее время UTC
- Владелец = `www-data:www-data`

---

## 🔥 ПОЛНЫЙ ДЕПЛОЙ (С проблемами)

**Когда использовать:**
- rsync не обновляет файлы
- Проблемы с правами доступа
- Файлы на сервере "битые"
- После долгого перерыва в деплоях

### Шаги

#### 1. ОБЯЗАТЕЛЬНО! Backup

```bash
ssh root@207.154.231.30 "tar -czf /root/backup-onai-academy-$(date +%Y%m%d-%H%M).tar.gz /var/www/onai.academy/"
```

**Проверка backup:**
```bash
ssh root@207.154.231.30 "ls -lh /root/backup-onai-academy-*.tar.gz | tail -1"
```

**Восстановление (если что-то пошло не так):**
```bash
ssh root@207.154.231.30 "tar -xzf /root/backup-onai-academy-YYYYMMDD-HHMM.tar.gz -C /"
```

#### 2. Чистый локальный rebuild

```bash
cd /Users/miso/onai-integrator-login

# Очистка кэшей
rm -rf dist node_modules/.vite

# Билд
npm run build
```

#### 3. Удаление старых файлов на сервере

```bash
ssh root@207.154.231.30 "rm -rf /var/www/onai.academy/*"
```

**⚠️ ВАЖНО:** Сначала делайте backup! (Шаг 1)

#### 4. Загрузка через SCP

**Метод A: Прямое копирование**
```bash
scp -r /Users/miso/onai-integrator-login/dist/* root@207.154.231.30:/var/www/onai.academy/
```

**Метод B: Через tar (быстрее для больших файлов)**
```bash
# Архивируем локально
cd /Users/miso/onai-integrator-login
tar -czf /tmp/onai-dist-new.tar.gz -C dist .

# Копируем на сервер
scp /tmp/onai-dist-new.tar.gz root@207.154.231.30:/tmp/

# Распаковываем на сервере
ssh root@207.154.231.30 "cd /var/www/onai.academy && tar -xzf /tmp/onai-dist-new.tar.gz"
```

#### 5. Исправление прав доступа

```bash
ssh root@207.154.231.30 "chown -R www-data:www-data /var/www/onai.academy/"
ssh root@207.154.231.30 "chmod -R 755 /var/www/onai.academy/"
```

**Проверка:**
```bash
ssh root@207.154.231.30 "ls -la /var/www/onai.academy/ | head -8"
# Владелец должен быть: www-data:www-data
```

#### 6. Перезагрузка Nginx

```bash
ssh root@207.154.231.30 "systemctl reload nginx"

# Или жесткая перезагрузка (если reload не помогает)
ssh root@207.154.231.30 "systemctl restart nginx"
```

#### 7. Проверка результата

```bash
# Timestamp (должен быть свежий)
ssh root@207.154.231.30 "stat -c '%y' /var/www/onai.academy/index.html"

# Содержимое (поиск нового текста)
curl -s "https://onai.academy/integrator/login?t=$(date +%s)" | grep -i "Добро пожаловать"
```

---

## 🐛 ПРОБЛЕМЫ И РЕШЕНИЯ

### Проблема 1: rsync не обновляет файлы

**Симптомы:**
- Timestamp файлов на сервере не меняется
- Визуально интерфейс старый
- `curl` показывает старое содержимое

**Причина:**
Файлы на сервере принадлежат неправильному пользователю (например, UID 501:staff вместо www-data:www-data)

**Решение:**
```bash
# 1. Проверить владельца
ssh root@207.154.231.30 "ls -la /var/www/onai.academy/ | head -5"

# 2. Если видите UID 501 или другой странный ID - используйте Полный деплой
# (см. раздел выше)

# 3. Или исправьте права и попробуйте rsync снова
ssh root@207.154.231.30 "chown -R www-data:www-data /var/www/onai.academy/"
rsync -avz --delete --chown=www-data:www-data dist/ root@207.154.231.30:/var/www/onai.academy/
```

---

### Проблема 2: Browser показывает старую версию

**Симптомы:**
- Файлы на сервере обновлены (свежий timestamp)
- Но браузер показывает старый UI
- Даже в Incognito mode

**Причина:**
Агрессивное кэширование браузером или CDN (Cloudflare)

**Решение:**

**A. Очистка browser cache (для пользователя)**
```
1. Откройте https://onai.academy/c.html
2. Или используйте страницу: https://onai.academy/clear-cache
3. Или: Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows)
```

**B. Проверка CDN**
```bash
curl -I https://onai.academy/ | grep -i "cf-cache\|cloudflare"
```

Если есть Cloudflare:
- Зайти в Cloudflare Dashboard
- Caching → Purge Everything

**C. Жесткая очистка Nginx cache**
```bash
ssh root@207.154.231.30 "rm -rf /var/cache/nginx/* && systemctl restart nginx"
```

---

### Проблема 3: 502 Bad Gateway

**Симптомы:**
- Сайт показывает 502 ошибку
- API не отвечает

**Причина:**
Backend упал или не запущен

**Решение:**
```bash
# 1. Проверить статус
ssh root@207.154.231.30 "pm2 status"

# 2. Проверить логи
ssh root@207.154.231.30 "pm2 logs onai-backend --lines 50"

# 3. Перезапустить backend
ssh root@207.154.231.30 "pm2 restart onai-backend"

# 4. Если не помогает - полный перезапуск
ssh root@207.154.231.30 "pm2 delete onai-backend && cd /var/www/onai-integrator-login-main/backend && npx pm2 start src/server.ts --name onai-backend --interpreter npx --interpreter-args 'tsx'"
```

---

### Проблема 4: Permission denied при rsync

**Симптомы:**
```
rsync: failed to set permissions on "...": Operation not permitted
```

**Причина:**
Локальные файлы имеют специфичные для macOS атрибуты

**Решение:**
```bash
# Используйте флаги для игнорирования расширенных атрибутов
rsync -avz --delete \
  --no-perms --no-owner --no-group \
  --chown=www-data:www-data \
  dist/ root@207.154.231.30:/var/www/onai.academy/
```

---

### Проблема 5: Nginx не стартует после reload

**Симптомы:**
```
nginx: [emerg] ...
```

**Причина:**
Синтаксическая ошибка в конфиге

**Решение:**
```bash
# 1. Проверить конфигурацию
ssh root@207.154.231.30 "nginx -t"

# 2. Посмотреть логи
ssh root@207.154.231.30 "journalctl -u nginx -n 50"

# 3. Если конфиг сломан - восстановить из backup
ssh root@207.154.231.30 "cp /etc/nginx/sites-enabled/onai.academy.backup /etc/nginx/sites-enabled/onai.academy"
ssh root@207.154.231.30 "nginx -t && systemctl restart nginx"
```

---

### Проблема 6: Symlink не работает (redis.ts)

**Симптомы:**
```
Cannot find module '../config/redis'
```

**Причина:**
Symlink на сервере указывает на локальный путь macOS

**Решение:**
```bash
# 1. Удалить symlink
ssh root@207.154.231.30 "cd /var/www/onai-integrator-login-main/backend/src/config && rm redis.ts"

# 2. Создать копию вместо symlink
ssh root@207.154.231.30 "cd /var/www/onai-integrator-login-main/backend/src/config && cp redis-amocrm.ts redis.ts"

# 3. Перезапустить backend
ssh root@207.154.231.30 "pm2 restart onai-backend"
```

---

### Проблема 7: Missing dependencies (@sentry/node)

**Симптомы:**
```
Cannot find module '@sentry/node'
```

**Причина:**
Пакет не установлен на продакшене

**Решение A: Установить пакет**
```bash
ssh root@207.154.231.30 "cd /var/www/onai-integrator-login-main/backend && npm install @sentry/node @sentry/profiling-node"
ssh root@207.154.231.30 "pm2 restart onai-backend"
```

**Решение B: Временно отключить (если срочно)**
```bash
# Закомментировать в src/server.ts:
# initSentry(app); // TEMP DISABLED
```

---

## ✅ ПРОВЕРКА РЕЗУЛЬТАТА

### Автоматическая проверка (скрипт)

Создайте файл `check-deploy.sh`:

```bash
#!/bin/bash

echo "🔍 Проверка деплоя..."
echo ""

# 1. Timestamp
echo "📅 Timestamp файлов:"
ssh root@207.154.231.30 "stat -c '%y' /var/www/onai.academy/index.html"
echo ""

# 2. Владелец
echo "👤 Владелец:"
ssh root@207.154.231.30 "ls -la /var/www/onai.academy/ | head -3"
echo ""

# 3. Nginx статус
echo "🌐 Nginx статус:"
ssh root@207.154.231.30 "systemctl is-active nginx"
echo ""

# 4. Backend статус
echo "⚙️ Backend статус:"
ssh root@207.154.231.30 "pm2 status | grep onai-backend"
echo ""

# 5. HTTP проверка
echo "🌍 HTTP проверка:"
curl -s -o /dev/null -w "Status: %{http_code}\n" https://onai.academy/
echo ""

echo "✅ Проверка завершена!"
```

Запуск:
```bash
chmod +x check-deploy.sh
./check-deploy.sh
```

### Ручная проверка

**1. Проверка файлов на сервере:**
```bash
ssh root@207.154.231.30 "ls -lh /var/www/onai.academy/ | head -10"
```

Проверьте:
- ✅ Timestamp = текущее время
- ✅ Владелец = `www-data:www-data`
- ✅ Размер файлов адекватный

**2. Проверка через curl:**
```bash
curl -s "https://onai.academy/integrator/login?t=$(date +%s)" | grep -o "Добро пожаловать\|ИНТЕГРАТОР"
```

Ожидаемый результат: должен вернуть новый текст

**3. Проверка в браузере:**
- Откройте **Incognito mode** (Cmd+Shift+N / Ctrl+Shift+N)
- Перейдите на https://onai.academy/integrator/login
- Проверьте визуально что UI обновился

**4. Проверка backend:**
```bash
ssh root@207.154.231.30 "pm2 status && pm2 logs onai-backend --lines 10"
```

**5. Проверка логов Nginx:**
```bash
ssh root@207.154.231.30 "tail -20 /var/log/nginx/error.log"
```

---

## ⏮️ ROLLBACK (Откат изменений)

### Быстрый откат из backup

**1. Найти последний backup:**
```bash
ssh root@207.154.231.30 "ls -lht /root/backup-onai-academy-*.tar.gz | head -5"
```

**2. Восстановить:**
```bash
# Замените YYYYMMDD-HHMM на нужную дату
ssh root@207.154.231.30 "tar -xzf /root/backup-onai-academy-20251216-1914.tar.gz -C /"
```

**3. Исправить права:**
```bash
ssh root@207.154.231.30 "chown -R www-data:www-data /var/www/onai.academy/ && chmod -R 755 /var/www/onai.academy/"
```

**4. Перезагрузить Nginx:**
```bash
ssh root@207.154.231.30 "systemctl reload nginx"
```

### Откат через Git (если код в репозитории)

```bash
# Локально
git log --oneline -10  # Найти нужный коммит
git checkout <commit-hash> dist/

# Задеплоить старую версию
rsync -avz --delete --chown=www-data:www-data dist/ root@207.154.231.30:/var/www/onai.academy/
```

---

## 🎯 ЛУЧШИЕ ПРАКТИКИ

### 1. Всегда делайте backup перед деплоем

```bash
# Автоматический backup в скрипте деплоя
ssh root@207.154.231.30 "tar -czf /root/backup-onai-academy-$(date +%Y%m%d-%H%M).tar.gz /var/www/onai.academy/"
```

### 2. Используйте --chown в rsync

```bash
rsync -avz --delete --chown=www-data:www-data ...
```

Это предотвращает проблему с UID 501.

### 3. Проверяйте timestamp после деплоя

```bash
ssh root@207.154.231.30 "stat -c '%y' /var/www/onai.academy/index.html"
```

Если не обновился - деплой не сработал!

### 4. Тестируйте в Incognito mode

Обычный браузер может кэшировать. Всегда проверяйте в Incognito.

### 5. Ведите лог деплоев

Создайте файл `DEPLOY_LOG.md`:

```markdown
## 2025-12-16 19:30 - Deploy успешен
- Изменения: Убрана кнопка "ЗАВЕРШИТЬ", добавлено превью видео
- Timestamp: 2025-12-16 14:30:23
- Проблемы: Нет
- Rollback plan: backup-onai-academy-20251216-1914.tar.gz
```

### 6. Не деплойте напрямую в production в рабочее время

Лучшее время для деплоя:
- Ночь (22:00 - 06:00 UTC)
- Выходные
- После уведомления пользователей

### 7. Используйте staging environment (если возможно)

```bash
# Staging деплой
rsync -avz dist/ root@staging.onai.academy:/var/www/

# Тестирование на staging
curl https://staging.onai.academy/

# Production деплой только после проверки
rsync -avz dist/ root@onai.academy:/var/www/
```

### 8. Автоматизируйте деплой

Создайте `deploy.sh` скрипт:

```bash
#!/bin/bash
set -e  # Выход при ошибке

echo "🚀 Starting deploy..."

# 1. Backup
echo "📦 Creating backup..."
ssh root@207.154.231.30 "tar -czf /root/backup-onai-academy-$(date +%Y%m%d-%H%M).tar.gz /var/www/onai.academy/"

# 2. Build
echo "🏗️ Building..."
rm -rf dist
npm run build

# 3. Deploy
echo "📤 Deploying..."
rsync -avz --delete --chown=www-data:www-data dist/ root@207.154.231.30:/var/www/onai.academy/

# 4. Reload Nginx
echo "♻️ Reloading Nginx..."
ssh root@207.154.231.30 "systemctl reload nginx"

# 5. Verify
echo "✅ Verifying..."
ssh root@207.154.231.30 "stat -c '%y' /var/www/onai.academy/index.html"

echo "🎉 Deploy completed!"
```

Использование:
```bash
chmod +x deploy.sh
./deploy.sh
```

### 9. Мониторинг после деплоя

После каждого деплоя проверяйте:

```bash
# Backend логи (первые 5 минут)
ssh root@207.154.231.30 "pm2 logs onai-backend --lines 50"

# Nginx error log
ssh root@207.154.231.30 "tail -50 /var/log/nginx/error.log"

# System resources
ssh root@207.154.231.30 "top -bn1 | head -20"
```

### 10. Cache busting для frontend

В `vite.config.ts`:

```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]'
      }
    }
  }
})
```

Это гарантирует что браузер не будет кэшировать старые версии.

---

## 📚 ПОЛЕЗНЫЕ КОМАНДЫ

### Мониторинг

```bash
# Disk usage
ssh root@207.154.231.30 "df -h"

# Memory
ssh root@207.154.231.30 "free -h"

# PM2 processes
ssh root@207.154.231.30 "pm2 status"

# Nginx access log (последние запросы)
ssh root@207.154.231.30 "tail -50 /var/log/nginx/access.log"

# Nginx error log
ssh root@207.154.231.30 "tail -50 /var/log/nginx/error.log"
```

### Очистка

```bash
# Удалить старые backups (оставить последние 10)
ssh root@207.154.231.30 "cd /root && ls -t backup-onai-academy-*.tar.gz | tail -n +11 | xargs rm -f"

# Очистить PM2 logs
ssh root@207.154.231.30 "pm2 flush"

# Очистить Nginx cache
ssh root@207.154.231.30 "rm -rf /var/cache/nginx/*"
```

### Debug

```bash
# Проверка портов
ssh root@207.154.231.30 "netstat -tulpn | grep -E '3000|80|443'"

# Проверка процессов
ssh root@207.154.231.30 "ps aux | grep -E 'node|nginx'"

# Проверка DNS
dig onai.academy

# Проверка SSL сертификата
curl -vI https://onai.academy/ 2>&1 | grep -i "ssl\|certificate"
```

---

## 🔐 БЕЗОПАСНОСТЬ

### SSH ключ вместо пароля

```bash
# Генерация ключа (если нет)
ssh-keygen -t ed25519 -C "deploy@onai.academy"

# Копирование на сервер
ssh-copy-id root@207.154.231.30

# Проверка
ssh root@207.154.231.30 "echo 'Connected!'"
```

### Ограничение доступа к серверу

```bash
# Создать deploy-пользователя (не root)
ssh root@207.154.231.30 "adduser deploy"
ssh root@207.154.231.30 "usermod -aG sudo deploy"

# Использовать для деплоя
rsync -avz dist/ deploy@207.154.231.30:/var/www/onai.academy/
```

### Автоматическое обновление SSL (Let's Encrypt)

```bash
# Проверка авто-обновления
ssh root@207.154.231.30 "certbot renew --dry-run"

# Если не настроено - настроить
ssh root@207.154.231.30 "certbot renew --post-hook 'systemctl reload nginx'"
```

---

## 📝 CHECKLIST ПЕРЕД ДЕПЛОЕМ

- [ ] Код протестирован локально
- [ ] Все изменения закоммичены в Git
- [ ] Создан backup текущей версии
- [ ] Backend не упадет от изменений (проверка зависимостей)
- [ ] Nginx конфигурация корректна
- [ ] Пользователи уведомлены (если breaking changes)
- [ ] План rollback готов
- [ ] Мониторинг настроен (логи, метрики)

---

## 🆘 КОНТАКТЫ ДЛЯ СРОЧНОЙ ПОМОЩИ

**Server Provider:** Digital Ocean  
**Dashboard:** https://cloud.digitalocean.com/

**В случае критических проблем:**
1. Сделать rollback из backup
2. Проверить логи: `pm2 logs`, `/var/log/nginx/error.log`
3. Перезапустить сервисы: `pm2 restart all`, `systemctl restart nginx`
4. Связаться с тех. поддержкой Digital Ocean

---

## 📊 МЕТРИКИ УСПЕШНОГО ДЕПЛОЯ

**Время выполнения:**
- Быстрый деплой: 2-3 минуты
- Полный деплой: 5-7 минут
- Rollback: 1-2 минуты

**Критерии успеха:**
- ✅ Timestamp файлов обновлен
- ✅ Владелец = www-data:www-data
- ✅ Nginx статус = active (running)
- ✅ Backend PM2 статус = online
- ✅ HTTP status = 200
- ✅ Визуально UI обновился
- ✅ Нет ошибок в логах (последние 50 строк)

---

## 🔄 CI/CD (Будущее улучшение)

### GitHub Actions пример

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Deploy to server
        uses: easingthemes/ssh-deploy@v2.1.5
        env:
          SSH_PRIVATE_KEY: ${{ secrets.SSH_PRIVATE_KEY }}
          ARGS: "-avz --delete --chown=www-data:www-data"
          SOURCE: "dist/"
          REMOTE_HOST: "207.154.231.30"
          REMOTE_USER: "root"
          TARGET: "/var/www/onai.academy/"
      
      - name: Reload Nginx
        uses: appleboy/ssh-action@master
        with:
          host: 207.154.231.30
          username: root
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: systemctl reload nginx
```

---

## 📖 ИСТОРИЯ ИЗМЕНЕНИЙ

### 2025-12-16 - Initial version
- Создано полное руководство по деплою
- Добавлены решения для типичных проблем
- Добавлены best practices
- Добавлены скрипты автоматизации

---

**Конец документа**

*Последнее обновление: 16 декабря 2025*







