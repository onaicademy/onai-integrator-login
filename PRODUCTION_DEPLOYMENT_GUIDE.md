# 🚀 PRODUCTION DEPLOYMENT GUIDE - Facebook API Integration

**Дата:** 24 декабря 2025 г.  
**Версия:** 1.0  
**Статус:** Ready for deployment

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### ✅ Разработке (Development) завершено:

- [x] Все скрипты созданы и протестированы
- [x] Получена полная информация о Facebook ресурсах (8 BM, 21 AC)
- [x] Система автоматического обновления токена установлена
- [x] Крон-задача активна и работает
- [x] Логирование настроено
- [x] JSON структура сохранена

### 🔄 Production подготовка:

- [ ] Проверить путь для production директории
- [ ] Обновить конфиги для production окружения
- [ ] Настроить monitoring и alerting
- [ ] Подготовить backup процедуры
- [ ] Настроить логирование для production

---

## 📁 ФАЙЛЫ ДЛЯ ДЕПЛОЯ

### Основной набор файлов:

```
Development:                          Production:
/Users/miso/onai-integrator-login/   /production/facebook/
├── facebook-complete-final.js        ├── facebook-complete-final.js
├── check-token-info.js               ├── check-token-info.js
├── token-manager.cjs                 ├── token-manager.cjs
├── setup-token-auto-refresh.sh       ├── setup-token-auto-refresh.sh
├── fetch-facebook-managers-accounts.js
├── fetch-complete-facebook-structure.js
└── fetch-all-facebook-managers.js
```

### Конфигурационные файлы (будут созданы):

```
Production:
/production/facebook/
├── .env                              # Переменные окружения
├── .facebook_token.json              # Сохраненный токен (auto)
├── token-manager.log                 # Логи обновления (auto)
└── config.json                       # Конфигурация
```

---

## 🔐 ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ

### Создать файл `/production/facebook/.env`:

```bash
# Facebook API Configuration
FACEBOOK_APP_ID=1079708200963910
FACEBOOK_APP_SECRET=48a635657fd97b73afc817d95a1f9dff
FACEBOOK_BUSINESS_ID=1425104648731040

# Access Token (ВАЖНО: обновить перед деплоем!)
FACEBOOK_ACCESS_TOKEN=EAAPVZCSfHj0YBQVquZClCxwS6vLHo5zvmt3hgMZAP4zoZAd0FiRk3vG2H9Ix4zrf8C0i7V7AihEZB4dTY3gaKBq3eIlZAa1ZAce6ljcj7jLg8OJM24FZAD2vD5M6B2OhZAhUaThnfApvhmHqi1ZCXEQPGFX1uepZAYI2hpDgOzU4UMwFZBd9fdLtOM2aozIayjuC1quHZBQFpRLvzZBqkkjyfZBxtRhpVXVbenXzJt656Kiz9bZBP8PDol2YV5dHwuzhoJq5j6lhplU3VL7UDLZBZBh8ApZBCAf4qru

# Paths
FACEBOOK_TOKEN_FILE=/production/facebook/.facebook_token.json
FACEBOOK_LOG_FILE=/production/facebook/token-manager.log

# Monitoring
ALERT_EMAIL=admin@example.com
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

---

## 🛠️ STEP-BY-STEP DEPLOYMENT

### STEP 1: Подготовка Production сервера

```bash
# 1.1. Создать директорию
mkdir -p /production/facebook
cd /production/facebook

# 1.2. Установить необходимые инструменты (если нет)
# Node.js должен быть установлен
which node
node --version  # должен быть v18+

# 1.3. Инициализировать Git (если нужно)
git init
```

### STEP 2: Копирование файлов

```bash
# 2.1. Копировать основные скрипты из Development
cp /Users/miso/onai-integrator-login/facebook-complete-final.js /production/facebook/
cp /Users/miso/onai-integrator-login/check-token-info.js /production/facebook/
cp /Users/miso/onai-integrator-login/token-manager.cjs /production/facebook/
cp /Users/miso/onai-integrator-login/setup-token-auto-refresh.sh /production/facebook/

# 2.2. Копировать остальные скрипты (опционально)
cp /Users/miso/onai-integrator-login/fetch-facebook-managers-accounts.js /production/facebook/
cp /Users/miso/onai-integrator-login/fetch-complete-facebook-structure.js /production/facebook/
cp /Users/miso/onai-integrator-login/fetch-all-facebook-managers.js /production/facebook/

# 2.3. Сделать скрипты исполняемыми
chmod +x /production/facebook/*.sh
chmod +x /production/facebook/*.cjs
chmod +x /production/facebook/*.js

# 2.4. Установить права доступа
# Только читать/писать для владельца, не для других
chmod 700 /production/facebook
```

### STEP 3: Создание конфигурационных файлов

```bash
# 3.1. Создать .env файл (скопировать конфигурацию выше)
cat > /production/facebook/.env << 'EOF'
FACEBOOK_APP_ID=1079708200963910
FACEBOOK_APP_SECRET=48a635657fd97b73afc817d95a1f9dff
FACEBOOK_BUSINESS_ID=1425104648731040
FACEBOOK_ACCESS_TOKEN=YOUR_TOKEN_HERE
FACEBOOK_TOKEN_FILE=/production/facebook/.facebook_token.json
FACEBOOK_LOG_FILE=/production/facebook/token-manager.log
ALERT_EMAIL=admin@example.com
EOF

# 3.2. Создать директории для логов и данных
mkdir -p /production/facebook/logs
mkdir -p /production/facebook/data
mkdir -p /production/facebook/backups

# 3.3. Установить права на директории
chmod 755 /production/facebook/logs
chmod 755 /production/facebook/data
chmod 755 /production/facebook/backups
```

### STEP 4: Проверка и тестирование

```bash
# 4.1. Проверить версию Node.js
node --version

# 4.2. Проверить доступ к скриптам
ls -la /production/facebook/*.js
ls -la /production/facebook/*.cjs
ls -la /production/facebook/*.sh

# 4.3. Запустить проверку токена (первый тест)
cd /production/facebook
node check-token-info.js

# 4.4. Запустить главный скрипт получения данных
cd /production/facebook
node facebook-complete-final.js

# 4.5. Проверить результаты
ls -la /production/facebook/*.json
head -20 COMPLETE_FACEBOOK_STRUCTURE_*.json
```

### STEP 5: Установка автоматического обновления токена

```bash
# 5.1. Запустить скрипт установки
cd /production/facebook
bash setup-token-auto-refresh.sh

# 5.2. Проверить установку крон-задачи
crontab -l | grep token-manager

# 5.3. Проверить логи (если есть)
# ls -la /production/facebook/token-manager.log
```

### STEP 6: Настройка Monitoring

```bash
# 6.1. Создать скрипт для мониторинга токена
cat > /production/facebook/monitor-token.sh << 'EOF'
#!/bin/bash
# Простой мониторинг статуса токена

TOKEN_FILE="/production/facebook/.facebook_token.json"
LOG_FILE="/production/facebook/token-manager.log"

echo "=== FACEBOOK TOKEN MONITOR ==="
echo "Last token update:"
tail -1 $TOKEN_FILE 2>/dev/null || echo "No token file found"

echo -e "\nLast log entry:"
tail -5 $LOG_FILE 2>/dev/null || echo "No log file found"

echo -e "\n=== CRON STATUS ==="
crontab -l | grep token-manager || echo "Cron task not found"
EOF

chmod +x /production/facebook/monitor-token.sh

# 6.2. Запустить мониторинг
/production/facebook/monitor-token.sh
```

---

## 🔄 POST-DEPLOYMENT VERIFICATION

### Проверки после деплоя:

```bash
# 1. Проверить что файлы на месте
ls -la /production/facebook/facebook-complete-final.js
ls -la /production/facebook/token-manager.cjs
ls -la /production/facebook/setup-token-auto-refresh.sh

# 2. Проверить права доступа
stat /production/facebook/*.js
stat /production/facebook/*.cjs

# 3. Проверить крон-задачу
crontab -l

# 4. Запустить тест токена
cd /production/facebook && node check-token-info.js

# 5. Запустить полный тест данных
cd /production/facebook && node facebook-complete-final.js

# 6. Проверить логи
tail -20 /production/facebook/token-manager.log

# 7. Проверить сохраненный токен
cat /production/facebook/.facebook_token.json | head -5
```

---

## 📊 MONITORING И MAINTENANCE

### Ежедневный мониторинг:

```bash
# Проверять каждый день:
tail -f /production/facebook/token-manager.log

# Проверять крон-задачу:
crontab -l | grep -A1 token-manager
```

### Еженедельный чек:

```bash
# Проверить валидность токена
cd /production/facebook && node check-token-info.js

# Проверить обновление структуры
ls -lt /production/facebook/COMPLETE_FACEBOOK_STRUCTURE_*.json | head -1
```

### Ежемесячный аудит:

```bash
# Запустить полный анализ
cd /production/facebook && node facebook-complete-final.js

# Проверить логи обновлений
wc -l /production/facebook/token-manager.log

# Создать backup результатов
cp /production/facebook/COMPLETE_FACEBOOK_STRUCTURE_*.json /production/facebook/backups/
```

---

## 🆘 TROUBLESHOOTING

### Проблема: Крон-задача не работает

```bash
# Проверить установку
crontab -l

# Проверить логи системы
log stream --predicate 'eventMessage contains "token-manager"'

# Переустановить крон-задачу
cd /production/facebook
bash setup-token-auto-refresh.sh
```

### Проблема: Токен истек

```bash
# Запустить обновление вручную
cd /production/facebook
node token-manager.cjs

# Если не обновляется автоматически - получить новый токен
# Перейти на https://developers.facebook.com/tools/debug/
```

### Проблема: Нет доступа к файлам

```bash
# Проверить права доступа
ls -la /production/facebook/

# Исправить права (если нужно)
chmod 700 /production/facebook/
chmod 755 /production/facebook/*.js
chmod 755 /production/facebook/*.cjs
chmod 755 /production/facebook/*.sh
```

### Проблема: Node.js не найден

```bash
# Проверить где установлен Node.js
which node
which npm

# Если не установлен - установить
# Для Mac: brew install node
# Для Linux: sudo apt-get install nodejs

# Проверить версию (должен быть 18+)
node --version
```

---

## 🔄 ROLLBACK ПЛАН

Если что-то пошло не так:

```bash
# 1. Остановить крон-задачу
crontab -e
# Закомментировать или удалить строку с token-manager

# 2. Вернуться к Development версии
# Скопировать обратно файлы из Development

# 3. Восстановить старый токен из backup
cp /production/facebook/backups/.facebook_token.json.backup /production/facebook/.facebook_token.json

# 4. Переустановить
cd /production/facebook
bash setup-token-auto-refresh.sh
```

---

## 📋 CHECKLIST ФИНАЛЬНОГО ДЕПЛОЯ

- [ ] Development тесты пройдены
- [ ] Все файлы скопированы в production
- [ ] .env файл создан и заполнен
- [ ] Права доступа установлены правильно
- [ ] Тестовый запуск скриптов успешен
- [ ] Крон-задача установлена и работает
- [ ] Логи проверены
- [ ] Backup создан
- [ ] Мониторинг настроен
- [ ] Документация обновлена
- [ ] Team уведомлена о деплою
- [ ] Готово к использованию в production

---

## 📞 КОНТАКТНАЯ ИНФОРМАЦИЯ

**На случай проблем:**
- GitHub Copilot (текущий агент)
- Next Agent (новый агент)
- Facebook Support: https://developers.facebook.com/support

**Документация:**
- Полный отчет: DEPLOYMENT_REPORT_FACEBOOK_API.md
- Graph API Docs: https://developers.facebook.com/docs/graph-api

---

**Статус Deployment:** ✅ READY  
**Дата подготовки:** 24 декабря 2025 г.  
**Последнее обновление:** Сейчас
