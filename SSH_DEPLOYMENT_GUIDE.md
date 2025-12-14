# 🔑 SSH Deployment Guide для onAI Academy Backend

## 📋 Обзор

Автоматический деплой backend на Digital Ocean сервер через SSH.

**Сервер**: `207.154.231.30` (Digital Ocean Droplet)  
**Алиас**: `onai-backend`  
**SSH ключ**: `~/.ssh/id_rsa`

---

## 🚀 Быстрый старт

### 1️⃣ Настройка SSH (первый раз)

```bash
# Добавить SSH ключ на сервер
./scripts/setup-ssh-key.sh

# Будет запрошен пароль root для сервера
# После успешного добавления ключа, пароль больше не нужен
```

### 2️⃣ Деплой Backend

```bash
# Полный автоматический деплой
./scripts/deploy-backend.sh
```

**Что делает скрипт:**
1. ✅ Проверяет SSH соединение
2. ✅ Собирает backend локально (`npm run build`)
3. ✅ Создает архив `dist/`
4. ✅ Загружает на сервер
5. ✅ Распаковывает и устанавливает зависимости
6. ✅ Перезапускает PM2 процесс
7. ✅ Показывает логи

---

## 📁 Структура файлов

```
onai-integrator-login/
├── .ssh/
│   └── config              # SSH конфигурация (локальная)
├── scripts/
│   ├── setup-ssh-key.sh   # Настройка SSH ключа
│   └── deploy-backend.sh  # Деплой скрипт
└── SSH_DEPLOYMENT_GUIDE.md # Эта документация
```

---

## 🔧 SSH Конфигурация

### `~/.ssh/config`

```ssh
# onAI Academy Backend Server (Digital Ocean)
Host onai-backend
    HostName 207.154.231.30
    User root
    IdentityFile ~/.ssh/id_rsa
    IdentitiesOnly yes
    StrictHostKeyChecking no
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

### Проверка соединения

```bash
# Простая проверка
ssh onai-backend

# Выполнить команду
ssh onai-backend "pm2 list"

# Посмотреть логи
ssh onai-backend "pm2 logs onai-academy-backend --lines 50"
```

---

## 🔐 Безопасность

### Публичный ключ (id_rsa.pub)

Ваш публичный SSH ключ добавлен в `/root/.ssh/authorized_keys` на сервере.

**На сервере уже есть следующие ключи:**
- `ssh-ed25519 ...` - onai.agency.kz@gmail.com
- `ssh-ed25519 ...` - github-actions-deploy
- `ssh-rsa ...` - (длинный RSA ключ)
- `ssh-ed25519 ...` - github-actions@onai.academy
- `ecdsa-sha2-nistp256 ...` - DigitalOcean Droplet Agent (DOTTY) x2

**Ваш ключ добавлен в конец файла.**

### Права доступа

```bash
# SSH config
chmod 600 ~/.ssh/config

# Приватный ключ
chmod 600 ~/.ssh/id_rsa

# Публичный ключ
chmod 644 ~/.ssh/id_rsa.pub
```

---

## 📦 Deployment Process

### Локальная подготовка

```bash
cd backend
npm install
npm run build
# → dist/
```

### Загрузка на сервер

```bash
scp -r dist/* onai-backend:/root/onai-academy-backend/dist/
```

### На сервере

```bash
cd /root/onai-academy-backend
npm install --production
pm2 restart onai-academy-backend
```

---

## 🛠️ Полезные команды

### PM2 Management

```bash
# Статус всех процессов
ssh onai-backend "pm2 list"

# Логи (real-time)
ssh onai-backend "pm2 logs onai-academy-backend"

# Последние 100 строк
ssh onai-backend "pm2 logs onai-academy-backend --lines 100 --nostream"

# Рестарт
ssh onai-backend "pm2 restart onai-academy-backend"

# Остановить
ssh onai-backend "pm2 stop onai-academy-backend"

# Информация о процессе
ssh onai-backend "pm2 info onai-academy-backend"

# Мониторинг ресурсов
ssh onai-backend "pm2 monit"
```

### Git на сервере

```bash
# Проверить текущую ветку
ssh onai-backend "cd /root/onai-academy-backend && git branch"

# Pull последних изменений
ssh onai-backend "cd /root/onai-academy-backend && git pull origin main"

# Статус
ssh onai-backend "cd /root/onai-academy-backend && git status"
```

### Системные команды

```bash
# Свободная память
ssh onai-backend "free -h"

# Использование диска
ssh onai-backend "df -h"

# Запущенные процессы Node.js
ssh onai-backend "ps aux | grep node"

# Открытые порты
ssh onai-backend "netstat -tulpn | grep LISTEN"
```

---

## 🐛 Troubleshooting

### Проблема: SSH Permission Denied

```bash
# Проверить права доступа
ls -la ~/.ssh/id_rsa
# Должно быть: -rw------- (600)

# Исправить права
chmod 600 ~/.ssh/id_rsa

# Повторить setup
./scripts/setup-ssh-key.sh
```

### Проблема: PM2 процесс не запускается

```bash
# Посмотреть логи ошибок
ssh onai-backend "pm2 logs onai-academy-backend --err --lines 50"

# Остановить и запустить заново
ssh onai-backend "pm2 delete onai-academy-backend && pm2 start /root/onai-academy-backend/dist/server.js --name onai-academy-backend"
```

### Проблема: Build fails

```bash
# Проверить версию Node.js на сервере
ssh onai-backend "node --version"

# Обновить зависимости
ssh onai-backend "cd /root/onai-academy-backend && rm -rf node_modules && npm install"
```

### Проблема: Deployment script hangs

```bash
# Проверить SSH соединение
ssh -v onai-backend

# Проверить SSH config
cat ~/.ssh/config

# Тест с таймаутом
ssh -o ConnectTimeout=5 onai-backend "echo OK"
```

---

## 📊 Мониторинг

### Backend Health Check

```bash
# API endpoint
curl -I https://api.onai.academy/health

# Через SSH
ssh onai-backend "curl -I localhost:5050/health"
```

### Logs Location

**На сервере:**
- PM2 logs: `~/.pm2/logs/`
- Application logs: `/root/onai-academy-backend/logs/`

**Просмотр:**
```bash
# PM2 логи
ssh onai-backend "ls -lh ~/.pm2/logs/ | grep onai-academy"

# Скачать логи локально
scp onai-backend:~/.pm2/logs/onai-academy-backend-out.log ./logs/
scp onai-backend:~/.pm2/logs/onai-academy-backend-error.log ./logs/
```

---

## 🔄 CI/CD Integration

### GitHub Actions (будущее)

Можно настроить автоматический деплой через GitHub Actions:

```yaml
name: Deploy Backend

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup SSH
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.SSH_PRIVATE_KEY }}" > ~/.ssh/id_rsa
          chmod 600 ~/.ssh/id_rsa
          
      - name: Deploy
        run: ./scripts/deploy-backend.sh
```

**Секрет для добавления:**
- `SSH_PRIVATE_KEY` - приватный ключ `~/.ssh/id_rsa` (содержимое файла)

---

## 📝 Changelog

### 2025-12-10
- ✅ Создана SSH конфигурация с алиасом `onai-backend`
- ✅ Создан скрипт `setup-ssh-key.sh` для первоначальной настройки
- ✅ Создан скрипт `deploy-backend.sh` для автоматического деплоя
- ✅ Добавлена документация

---

## 🆘 Support

**Проблемы с SSH:**
- Проверьте `~/.ssh/config`
- Убедитесь что `~/.ssh/id_rsa` существует и имеет права 600
- Запустите `./scripts/setup-ssh-key.sh` еще раз

**Проблемы с deployment:**
- Проверьте логи: `ssh onai-backend "pm2 logs"`
- Проверьте статус: `ssh onai-backend "pm2 list"`
- Рестарт: `ssh onai-backend "pm2 restart onai-academy-backend"`

**В крайнем случае:**
```bash
# Зайти на сервер вручную
ssh onai-backend

# Перезапустить все вручную
cd /root/onai-academy-backend
git pull
npm install
npm run build
pm2 restart onai-academy-backend
```

---

**Последнее обновление**: 10 декабря 2025  
**Автор**: AI Assistant  
**Сервер**: Digital Ocean Droplet (207.154.231.30)
