# 🚀 PROMPT FOR CURSOR AI - URGENT BACKEND DEPLOY

## 🎯 ЗАДАЧА:
На сервере Digital Ocean (207.154.231.30) нужно обновить backend код и перезапустить PM2 процесс.

---

## 🔑 SSH ДОСТУП:

```
Host: 207.154.231.30
User: root
SSH Key: Указан выше (ssh-rsa AAAA...)
```

---

## ⚡ ЧТО НУЖНО СДЕЛАТЬ (ШАГ ЗА ШАГОМ):

### **1️⃣ Найди Git репозиторий на сервере:**

```bash
# Подключись к серверу
ssh root@207.154.231.30

# Найди где лежит git репозиторий
find / -name "onai-integrator-login" -type d 2>/dev/null | grep -v node_modules

# ИЛИ проверь стандартные места:
ls -la /root/
ls -la /var/www/
ls -la /home/
```

**Возможные варианты:**
- `/root/onai-integrator-login/`
- `/var/www/onai-integrator-login/`
- `/opt/onai-integrator-login/`

---

### **2️⃣ Перейди в папку с Git и подтяни изменения:**

```bash
# Замени [ПУТЬ] на реальный путь найденный выше
cd [ПУТЬ]/onai-integrator-login

# Проверь текущий статус
git status
git log --oneline -5

# Подтяни последние изменения
git pull origin main

# Проверь что коммиты подтянулись
git log --oneline -3
```

**Должны быть коммиты:**
```
0dc4e0f 🚨 URGENT FIX: Make email optional in landing form
f9bf279 Fix: Increase lead limit from 100 to 1000 in admin panel
```

---

### **3️⃣ Перезапусти PM2 backend:**

```bash
# Перейди в папку backend
cd backend

# Перезапусти PM2 процесс
pm2 restart onai-backend

# Проверь логи
pm2 logs onai-backend --lines 50
```

**В логах ДОЛЖНО БЫТЬ:**
```
✅ Server running on port 5000
✅ Sentry initialized
```

**НЕ ДОЛЖНО БЫТЬ:**
```
❌ Error: Email обязателен для заполнения
```

---

### **4️⃣ Проверь статус PM2:**

```bash
pm2 list
pm2 info onai-backend
```

**Память должна быть:** ~512MB (не 65MB!)

---

### **5️⃣ Если есть проблемы с памятью:**

```bash
# Останови процесс
pm2 stop onai-backend

# Удали
pm2 delete onai-backend

# Запусти с большей памятью
pm2 start src/server.ts --name onai-backend --interpreter ts-node --node-args="--max-old-space-size=512"

# Сохрани
pm2 save

# Проверь
pm2 logs onai-backend --lines 30
```

---

## ✅ КРИТЕРИИ УСПЕХА:

1. ✅ Git репозиторий найден
2. ✅ Коммит `0dc4e0f` подтянут
3. ✅ PM2 процесс перезапущен
4. ✅ В логах `Server running on port 5000`
5. ✅ Память ~512MB (не 65MB)
6. ✅ **НЕТ** ошибки "Email обязателен для заполнения"

---

## 🧪 ТЕСТ ПОСЛЕ ДЕПЛОЯ:

```bash
# Протестируй API
curl -X POST https://api.onai.academy/api/landing/submit \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "phone": "+7 (777) 777-77-77",
    "source": "expresscourse",
    "paymentMethod": "kaspi"
  }'
```

**Ожидаемый результат:**
```json
{
  "success": true,
  "message": "Лид успешно создан"
}
```

**НЕ должно быть:**
```json
{
  "success": false,
  "error": "Email обязателен для заполнения"
}
```

---

## 📋 ЧТО ИСПРАВЛЕНО В КОДЕ:

### **Backend (`backend/src/routes/landing.ts`):**

**БЫЛО:**
```typescript
if (!email || !email.trim()) {
  return res.status(400).json({
    success: false,
    error: 'Email обязателен для заполнения'
  });
}
```

**СТАЛО:**
```typescript
// Email опционален - проверяем только если указан
if (email && email.trim()) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      error: 'Неверный формат email адреса'
    });
  }
}
```

### **AmoCRM Integration:**

**БЫЛО:**
```typescript
custom_fields_values: [
  { field_code: 'EMAIL', values: [{ value: lead.email }] },
  { field_code: 'PHONE', values: [{ value: lead.phone }] }
]
```

**СТАЛО:**
```typescript
const customFieldsValues = [
  { field_code: 'PHONE', values: [{ value: lead.phone }] }
];

if (lead.email && lead.email.trim()) {
  customFieldsValues.push({
    field_code: 'EMAIL',
    values: [{ value: lead.email }]
  });
}
```

---

## 🆘 TROUBLESHOOTING:

### Если `git pull` не работает:

```bash
cd [ПУТЬ]/onai-integrator-login
git fetch origin
git reset --hard origin/main
cd backend
pm2 restart onai-backend
```

### Если PM2 процесс не запускается:

```bash
pm2 logs onai-backend --lines 100
# Скопируй ошибку и сообщи пользователю
```

### Если порт 5000 занят:

```bash
lsof -i :5000
# Найди процесс и убей его:
kill -9 [PID]
pm2 restart onai-backend
```

---

## 📞 ВАЖНАЯ ИНФОРМАЦИЯ:

- **Сервер:** 207.154.231.30
- **Backend порт:** 5000
- **PM2 процесс:** onai-backend
- **Git branch:** main
- **Критичные коммиты:** 0dc4e0f, f9bf279

---

## 🎯 ФИНАЛЬНАЯ ПРОВЕРКА:

После выполнения всех команд:

1. ✅ `pm2 list` показывает `onai-backend` online
2. ✅ `pm2 logs` показывает "Server running on port 5000"
3. ✅ curl тест возвращает `success: true`
4. ✅ Память процесса ~512MB

---

**ЕСЛИ ВСЁ ОК - СООБЩИ ПОЛЬЗОВАТЕЛЮ:**

```
✅ Backend успешно обновлён и перезапущен!
✅ Email теперь опционален
✅ Лиды должны сохраняться без email
✅ Можно тестировать форму на https://onai.academy/integrator/expresscourse
```

---

**Создано:** 2025-12-15  
**Приоритет:** 🚨 КРИТИЧНО  
**Статус:** Готово к выполнению
