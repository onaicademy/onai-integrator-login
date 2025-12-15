# 🚨 СРОЧНОЕ ИСПРАВЛЕНИЕ СЕРВЕРА

## ❌ ОШИБКА:
```
SyntaxError: Cannot use import statement outside a module
```

---

## ✅ РЕШЕНИЕ:

### **1️⃣ Подключись к серверу:**
```bash
ssh root@your-server
cd /root/onai-integrator-login/backend
```

---

### **2️⃣ Проверь package.json:**
```bash
cat package.json | grep -A 5 '"type"'
```

**Должно быть:**
```json
{
  "type": "module",
  ...
}
```

**Если НЕТ - добавь:**
```bash
# Открой редактор:
nano package.json

# Или используй sed:
sed -i '2i\  "type": "module",' package.json
```

---

### **3️⃣ ИЛИ исправь ecosystem.config.js:**

**Проверь текущую конфигурацию:**
```bash
cat ecosystem.config.js
```

**Должно быть:**
```javascript
module.exports = {
  apps: [
    {
      name: 'onai-backend',
      script: 'src/server.ts',  // ← НЕ dist/server.js!
      interpreter: 'ts-node',   // ← ВАЖНО!
      watch: false,
      env: {
        NODE_ENV: 'production',
        TS_NODE_PROJECT: './tsconfig.json'
      }
    }
  ]
};
```

**Если используется `dist/server.js` - ИСПРАВЬ на `src/server.ts`!**

---

### **4️⃣ Убери папку dist (если есть):**
```bash
cd /root/onai-integrator-login/backend
rm -rf dist
```

**Почему:** 
- `dist` содержит скомпилированный CommonJS код
- Но PM2 должен запускать TypeScript напрямую через `ts-node`

---

### **5️⃣ Установи зависимости (если нужно):**
```bash
npm install
```

**Убедись что есть:**
- `ts-node` (для запуска TypeScript)
- `typescript` (компилятор)
- `@types/node` (типы Node.js)

```bash
npm list ts-node typescript @types/node
```

**Если НЕТ - установи:**
```bash
npm install --save-dev ts-node typescript @types/node
```

---

### **6️⃣ Перезапусти PM2:**
```bash
# Полный рестарт:
pm2 delete onai-backend
pm2 start ecosystem.config.js

# Проверь статус:
pm2 status

# Смотри логи:
pm2 logs onai-backend --lines 50
```

---

### **7️⃣ Если ecosystem.config.js НЕТ - создай:**

```bash
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'onai-backend',
      script: 'src/server.ts',
      interpreter: 'ts-node',
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        TS_NODE_PROJECT: './tsconfig.json',
        TS_NODE_TRANSPILE_ONLY: 'true'
      },
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
EOF
```

---

## 🎯 ПОЛНАЯ ПОСЛЕДОВАТЕЛЬНОСТЬ КОМАНД:

```bash
# На сервере:
ssh root@your-server
cd /root/onai-integrator-login/backend

# Останови PM2:
pm2 stop onai-backend

# Удали dist (если есть):
rm -rf dist

# Проверь ecosystem.config.js:
cat ecosystem.config.js

# Если script: 'dist/server.js' - ИСПРАВЬ:
nano ecosystem.config.js
# Замени на: script: 'src/server.ts', interpreter: 'ts-node'

# Установи зависимости:
npm install

# Перезапусти PM2:
pm2 delete onai-backend
pm2 start ecosystem.config.js

# Проверь:
pm2 status
pm2 logs onai-backend --lines 50
```

---

## ✅ ЧТО ДОЛЖНО БЫТЬ В ЛОГАХ:

```
✅ Server running on port 3000
✅ Sentry initialized for backend monitoring (если DSN настроен)
✅ Database connected
```

---

## ❌ ЕСЛИ ОШИБКА "ts-node: command not found":

```bash
# Установи глобально:
npm install -g ts-node typescript

# ИЛИ используй npx в ecosystem.config.js:
module.exports = {
  apps: [{
    name: 'onai-backend',
    script: 'src/server.ts',
    interpreter: './node_modules/.bin/ts-node',  // ← Локальный ts-node
    ...
  }]
};
```

---

## 🔍 ДИАГНОСТИКА:

### **Проверка 1: Какой файл запускает PM2?**
```bash
pm2 info onai-backend | grep script
```

**Должно быть:** `script: src/server.ts`
**НЕ ДОЛЖНО быть:** `script: dist/server.js`

### **Проверка 2: Используется ли ts-node?**
```bash
pm2 info onai-backend | grep interpreter
```

**Должно быть:** `interpreter: ts-node` ИЛИ `interpreter: ./node_modules/.bin/ts-node`

### **Проверка 3: Есть ли ts-node?**
```bash
which ts-node
# ИЛИ
ls -la node_modules/.bin/ts-node
```

---

## 🎉 ИТОГ:

**ГЛАВНОЕ:**
- ❌ НЕ используй `dist/` на продакшене
- ✅ Используй `ts-node` для запуска TypeScript напрямую
- ✅ Убедись что `ecosystem.config.js` правильный

**ПОСЛЕ ЭТОГО:**
- ✅ Backend запустится БЕЗ ошибок
- ✅ Sentry заработает (если DSN настроен)
- ✅ Короткие ссылки будут создаваться

---

**ВСЁ БУДЕТ РАБОТАТЬ!** 🚀
