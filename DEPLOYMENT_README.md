# 🚀 PRODUCTION DEPLOYMENT GUIDE

## 📋 СОДЕРЖАНИЕ

1. [Быстрый старт](#быстрый-старт)
2. [Проблема](#проблема)
3. [Решение](#решение)
4. [Использование](#использование)
5. [Troubleshooting](#troubleshooting)

---

## ⚡ БЫСТРЫЙ СТАРТ

### **ДО (неправильно):**
```bash
ssh root@207.154.231.30
cd /var/www/onai-integrator-login-main
git pull origin main
pm2 restart onai-backend
# ❌ Backend падает с "nodemon: not found"
```

### **ПОСЛЕ (правильно):**
```bash
ssh root@207.154.231.30
cd /var/www/onai-integrator-login-main
./deploy-production.sh
# ✅ Backend работает стабильно
```

Или удаленно:
```bash
ssh -i ~/.ssh/github_actions_key root@207.154.231.30 \
  "cd /var/www/onai-integrator-login-main && ./deploy-production.sh"
```

---

## 🔴 ПРОБЛЕМА

**Полное описание:** См. `DEPLOYMENT_ISSUE_REPORT.md`

**Краткая версия:**
- После `git pull` или `git reset --hard` backend падает
- Ошибка: `sh: 1: nodemon: not found`
- Требуется ручная установка `npm install nodemon --save-dev` каждый раз
- 284+ падений за одну сессию

---

## ✅ РЕШЕНИЕ

### **Deployment script делает:**

1. ✅ `git pull origin main` - получает последний код
2. ✅ `npm install` (root) - устанавливает frontend dependencies
3. ✅ `cd backend && npm install` - устанавливает backend dependencies
4. ✅ Проверяет существование nodemon
5. ✅ Устанавливает nodemon принудительно если нужно
6. ✅ Перезапускает PM2
7. ✅ Проверяет статус backend
8. ✅ Показывает логи

---

## 📖 ИСПОЛЬЗОВАНИЕ

### **Метод 1: SSH + скрипт**

```bash
# 1. Подключиться к серверу
ssh root@207.154.231.30

# 2. Перейти в директорию проекта
cd /var/www/onai-integrator-login-main

# 3. Запустить deployment
./deploy-production.sh
```

### **Метод 2: Удаленный запуск (рекомендуется)**

```bash
ssh -i ~/.ssh/github_actions_key root@207.154.231.30 \
  "cd /var/www/onai-integrator-login-main && ./deploy-production.sh"
```

### **Метод 3: Из Cursor/VS Code**

В Cursor можно создать task:

`.vscode/tasks.json`:
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Deploy to Production",
      "type": "shell",
      "command": "ssh -i ~/.ssh/github_actions_key root@207.154.231.30 'cd /var/www/onai-integrator-login-main && ./deploy-production.sh'",
      "problemMatcher": []
    }
  ]
}
```

Затем: `Cmd+Shift+P` → `Tasks: Run Task` → `Deploy to Production`

---

## 🔧 TROUBLESHOOTING

### **Проблема: "Permission denied" при запуске скрипта**

**Решение:**
```bash
chmod +x /var/www/onai-integrator-login-main/deploy-production.sh
```

### **Проблема: Backend все равно падает после деплоя**

**Диагностика:**
```bash
# 1. Проверить статус
pm2 status onai-backend

# 2. Посмотреть error логи
pm2 logs onai-backend --err --lines 50

# 3. Проверить существование nodemon
cd /var/www/onai-integrator-login-main/backend
ls node_modules/.bin/nodemon

# 4. Ручная установка
npm install nodemon --save-dev
pm2 restart onai-backend
```

### **Проблема: Git конфликты**

**Решение:**
```bash
cd /var/www/onai-integrator-login-main

# Stash локальные изменения
git stash

# Откатить на последний коммит
git reset --hard origin/main

# Запустить деплой
./deploy-production.sh
```

### **Проблема: npm install очень долго выполняется**

**Решение:**
```bash
# Очистить npm cache
npm cache clean --force

# Удалить node_modules
cd /var/www/onai-integrator-login-main
rm -rf node_modules backend/node_modules

# Переустановить
./deploy-production.sh
```

---

## 📊 МОНИТОРИНГ

### **Проверить статус backend:**

```bash
pm2 status onai-backend
```

**Ожидаемый output:**
```
┌────┬──────────────┬──────────┬──────┬───────────┬──────────┬──────────┐
│ id │ name         │ mode     │ ↺    │ status    │ cpu      │ memory   │
├────┼──────────────┼──────────┼──────┼───────────┼──────────┼──────────┤
│ 0  │ onai-backend │ fork     │ 0    │ online    │ 0%       │ 55.9mb   │
└────┴──────────────┴──────────┴──────┴───────────┴──────────┴──────────┘
```

✅ `status: online`, `↺ (restarts): 0` = Хорошо
❌ `status: errored`, `↺ > 10` = Проблема

### **Живые логи:**

```bash
# Все логи
pm2 logs onai-backend

# Только ошибки
pm2 logs onai-backend --err

# Последние 50 строк
pm2 logs onai-backend --lines 50 --nostream
```

### **Тест API:**

```bash
# Проверить что backend отвечает
curl https://api.onai.academy/api/health

# Ожидаемый ответ:
# {"status":"ok","timestamp":"2025-12-12T..."}
```

---

## 🚨 ЕСЛИ ВСЁ СЛОМАЛОСЬ

### **Emergency rollback:**

```bash
ssh root@207.154.231.30
cd /var/www/onai-integrator-login-main

# 1. Откатить на предыдущий коммит
git log --oneline -5  # Найти последний рабочий коммит
git reset --hard <commit-hash>

# 2. Переустановить dependencies
cd backend && npm install && cd ..

# 3. Перезапустить
pm2 restart onai-backend

# 4. Проверить
pm2 status onai-backend
```

### **Nuclear option (полная переустановка):**

```bash
ssh root@207.154.231.30
cd /var/www/onai-integrator-login-main

# 1. Остановить backend
pm2 stop onai-backend

# 2. Очистить всё
git reset --hard origin/main
rm -rf node_modules backend/node_modules
npm cache clean --force

# 3. Переустановить
npm install
cd backend && npm install && cd ..

# 4. Запустить
pm2 restart onai-backend
```

---

## 📞 КОНТАКТЫ

**Если проблема не решается:**

1. Проверь `DEPLOYMENT_ISSUE_REPORT.md` - полное описание проблемы
2. Посмотри логи: `pm2 logs onai-backend --err --lines 100`
3. Покажи AI-архитектору или DevOps

**Важные файлы:**
- `/var/www/onai-integrator-login-main/deploy-production.sh` - deployment script
- `/var/www/onai-integrator-login-main/backend/package.json` - backend dependencies
- `~/.pm2/logs/onai-backend-error.log` - error logs
- `~/.pm2/logs/onai-backend-out.log` - stdout logs

---

## 🎯 TODO (для AI-архитектора)

- [ ] Исследовать почему `npm install` в root не устанавливает backend dependencies
- [ ] Рассмотреть переход на Docker
- [ ] Настроить CI/CD с автоматическим тестированием
- [ ] Добавить staging environment
- [ ] Исследовать использование monorepo tools (lerna, nx, turborepo)
- [ ] Настроить PM2 ecosystem file с правильным `cwd`

---

**Автор:** AI Assistant  
**Дата:** 2025-12-12  
**Версия:** 1.0
