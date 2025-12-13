# 🔴 КРИТИЧЕСКАЯ ПРОБЛЕМА С DEPLOYMENT

## 📋 КРАТКОЕ ОПИСАНИЕ

**Проблема:** Backend на production (DigitalOcean) постоянно падает после каждого `git pull` или `git reset --hard` с ошибкой `nodemon: not found`.

**Статус:** Backend работает ТОЛЬКО после ручной установки `npm install nodemon --save-dev` в папке `/var/www/onai-integrator-login-main/backend/`, но при следующем git операции проблема возвращается.

**Количество рестартов:** 284+ за последнюю сессию

---

## 🕐 ХРОНОЛОГИЯ СОБЫТИЙ

### **Что работало раньше:**
- Backend деплоился без проблем
- `git pull` → `pm2 restart` → всё работало
- nodemon был установлен и работал стабильно

### **Что произошло сегодня:**

1. **12:00** - Пытались добавить 30s timeout для AmoCRM API
2. **12:15** - Сделали `git reset --hard` для отката изменений
3. **12:16** - Backend упал с ошибкой `nodemon: not found`
4. **12:17** - Установили nodemon вручную → backend заработал
5. **12:30** - Сделали `git pull` с новыми изменениями
6. **12:31** - Backend снова упал с `nodemon: not found`
7. **12:32** - Снова установили nodemon вручную → backend заработал
8. **Повторилось 5+ раз** - каждый раз после git операций nodemon исчезает

---

## 🔍 ДЕТАЛИ ПРОБЛЕМЫ

### **Текущая конфигурация:**

**Server:** DigitalOcean, Ubuntu
**Path:** `/var/www/onai-integrator-login-main/`
**PM2 Command:** `pm2 start npm --name onai-backend -- run dev`
**Package.json script:** `"dev": "nodemon --exec tsx src/server.ts"`

### **package.json devDependencies:**

```json
"devDependencies": {
  "@types/cors": "^2.8.19",
  "@types/express": "^5.0.5",
  "@types/jsonwebtoken": "^9.0.10",
  "@types/mime-types": "^3.0.1",
  "@types/multer": "^2.0.0",
  "@types/node": "^24.10.1",
  "@types/node-cron": "^3.0.11",
  "@types/node-telegram-bot-api": "^0.64.13",
  "@types/pdf-parse": "^1.1.5",
  "@types/uuid": "^10.0.0",
  "nodemon": "^3.1.11",  // ← УЖЕ ЕСТЬ В PACKAGE.JSON!
  "ts-node": "^10.9.2",
  "typescript": "^5.6.3"
}
```

### **Симптомы:**

1. ✅ `nodemon` **ЕСТЬ** в `package.json`
2. ❌ После `git pull/reset`, `node_modules/.bin/nodemon` **НЕ СУЩЕСТВУЕТ**
3. ❌ `npm install` в root directory **НЕ УСТАНАВЛИВАЕТ** nodemon в `backend/node_modules/`
4. ✅ `npm install nodemon --save-dev` в `backend/` directory **РАБОТАЕТ**
5. ❌ Но при следующем git операции проблема возвращается

---

## 🤔 ВОЗМОЖНЫЕ ПРИЧИНЫ

### **Гипотеза 1: npm install запускается не в той папке**
```bash
# Что мы делаем:
cd /var/www/onai-integrator-login-main
git pull
npm install  # ← Это root directory, не backend/!

# Что должно быть:
cd /var/www/onai-integrator-login-main/backend
npm install
```

### **Гипотеза 2: package-lock.json конфликт**
- При `git reset --hard` возможно `package-lock.json` откатывается на старую версию
- Старая версия не содержит nodemon
- `npm install` использует старый lock file

### **Гипотеза 3: node_modules/ в .gitignore**
- `node_modules/` игнорируется git (правильно)
- Но после git операций мы не переустанавливаем зависимости в правильной папке
- nodemon "исчезает" потому что мы не запускаем `npm install` в `backend/`

### **Гипотеза 4: Monorepo структура**
```
/var/www/onai-integrator-login-main/
├── backend/
│   ├── package.json     ← Backend dependencies
│   ├── node_modules/    ← Backend node_modules
│   └── src/
├── package.json         ← Root package.json (frontend?)
├── node_modules/        ← Root node_modules
└── src/
```

При `npm install` в root, не устанавливаются backend dependencies!

---

## 💡 ПРЕДЛОЖЕННЫЕ РЕШЕНИЯ

### **Решение 1: Правильная последовательность деплоя**

```bash
#!/bin/bash
# ПРАВИЛЬНЫЙ DEPLOYMENT SCRIPT

cd /var/www/onai-integrator-login-main

# 1. Pull latest code
git pull origin main

# 2. Install ROOT dependencies (if needed)
npm install

# 3. Install BACKEND dependencies
cd backend
npm install

# 4. Restart backend
cd ..
pm2 restart onai-backend
```

### **Решение 2: Изменить PM2 startup script**

Вместо:
```bash
pm2 start npm --name onai-backend -- run dev
```

Использовать:
```bash
cd /var/www/onai-integrator-login-main/backend
pm2 start "npm run dev" --name onai-backend
```

Или прямой путь к nodemon:
```bash
pm2 start "npx nodemon --exec tsx src/server.ts" --name onai-backend
```

### **Решение 3: Post-deployment hook**

Создать `.github/workflows/deploy-hook.sh`:
```bash
#!/bin/bash
echo "🚀 Running post-deployment setup..."

cd /var/www/onai-integrator-login-main/backend
npm install --production=false

if [ ! -f "node_modules/.bin/nodemon" ]; then
  echo "⚠️ nodemon not found, installing..."
  npm install nodemon --save-dev
fi

echo "✅ Dependencies installed"
```

### **Решение 4: Docker (долгосрочное решение)**

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm install
COPY backend/ ./
CMD ["npm", "run", "dev"]
```

---

## 🧪 ТЕСТЫ ДЛЯ ДИАГНОСТИКИ

### **Тест 1: Проверить где находится nodemon после npm install**

```bash
cd /var/www/onai-integrator-login-main
npm install
find . -name "nodemon" -type f 2>/dev/null

cd backend
npm install
find . -name "nodemon" -type f 2>/dev/null
```

### **Тест 2: Проверить package-lock.json**

```bash
cd /var/www/onai-integrator-login-main/backend
cat package-lock.json | grep -A 5 '"nodemon"'
```

### **Тест 3: Проверить PM2 startup directory**

```bash
pm2 info onai-backend | grep "cwd"
pm2 logs onai-backend --lines 5
```

---

## 📊 СТАТИСТИКА ПРОБЛЕМЫ

| Метрика | Значение |
|---------|----------|
| Количество падений backend | 284+ |
| Время на ручной фикс (каждый раз) | ~2-3 минуты |
| Количество git операций с проблемой | 8+ |
| Успешных автоматических деплоев | 0/8 |

---

## 🎯 НЕМЕДЛЕННЫЕ ДЕЙСТВИЯ

### **Краткосрочное решение (сейчас):**

1. Создать deployment script:
```bash
cat > /var/www/onai-integrator-login-main/deploy.sh << 'EOF'
#!/bin/bash
set -e
echo "🚀 Starting deployment..."
git pull origin main
echo "📦 Installing root dependencies..."
npm install
echo "📦 Installing backend dependencies..."
cd backend && npm install && cd ..
echo "🔄 Restarting backend..."
pm2 restart onai-backend
echo "✅ Deployment complete!"
EOF

chmod +x /var/www/onai-integrator-login-main/deploy.sh
```

2. Использовать вместо `git pull`:
```bash
ssh root@207.154.231.30 "/var/www/onai-integrator-login-main/deploy.sh"
```

### **Среднесрочное решение (эта неделя):**

1. Настроить PM2 ecosystem file с правильным `cwd`
2. Добавить pre/post deployment hooks
3. Документировать процесс

### **Долгосрочное решение (следующий месяц):**

1. Перейти на Docker
2. Настроить CI/CD с автоматическим тестированием перед деплоем
3. Использовать staging environment для проверки изменений

---

## 📝 ЗАМЕТКИ

### **Что точно НЕ работает:**
- ❌ `git pull` → `npm install` (в root) → `pm2 restart`
- ❌ `git reset --hard` → `pm2 restart`
- ❌ Полагаться на package.json для автоматической установки nodemon

### **Что работает:**
- ✅ `cd backend` → `npm install nodemon --save-dev` → `pm2 restart`
- ✅ Ручная установка каждый раз (но это не решение)

### **Вопросы для AI-архитектора:**

1. Почему `npm install` в root не устанавливает dependencies из `backend/package.json`?
2. Должны ли мы использовать monorepo tools (lerna, nx, turborepo)?
3. Правильная ли у нас структура проекта?
4. Как настроить PM2 чтобы он запускался из правильной директории?
5. Нужен ли нам отдельный `package.json` в root или только в `backend/`?

---

## 🔗 СВЯЗАННЫЕ ФАЙЛЫ

- `/var/www/onai-integrator-login-main/backend/package.json`
- `/var/www/onai-integrator-login-main/backend/node_modules/.bin/nodemon`
- PM2 config: `pm2 startup` output
- Git log: последние 10 коммитов
- Error logs: `/var/www/onai-integrator-login-main/backend/logs/error.log`

---

## 🆘 СРОЧНОСТЬ

**Приоритет:** 🔴 КРИТИЧЕСКИЙ

**Причина:** Каждый деплой требует ручного вмешательства, что:
- Замедляет разработку
- Увеличивает риск human error
- Делает невозможным автоматический CI/CD
- Создает downtime при каждом обновлении

**Дедлайн:** Нужно решить до следующего деплоя (сегодня)

---

**Автор:** AI Assistant  
**Дата:** 2025-12-12  
**Версия:** 1.0
