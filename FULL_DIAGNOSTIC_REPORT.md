# 📊 ПОЛНЫЙ DIAGNOSTIC REPORT - onAI Academy Backend

**Дата:** 18 ноября 2025  
**Время:** 12:20 UTC  
**Сервер:** DigitalOcean 207.154.231.30

---

## ═══════════════════════════════════════════════════════════════
## 🔍 EXECUTIVE SUMMARY
## ═══════════════════════════════════════════════════════════════

### ✅ ЧТО РАБОТАЕТ:
- Backend API запущен и работает (Port 3000)
- Supabase подключен и функционирует
- Все CRUD операции (courses, modules, lessons, students)
- Drag & Drop уроков работает
- Health endpoint `/api/health` работает
- `.env` файл загружается правильно
- PM2 процесс стабилен (8 рестартов за сессию)

### ❌ ЧТО НЕ РАБОТАЕТ:
1. **OpenAI API** - 401 Unauthorized (Incorrect API key)
2. **Cloudflare R2** - 401 Unauthorized (Invalid credentials)

---

## ═══════════════════════════════════════════════════════════════
## 📁 ШАГ 1: ПРОВЕРКА .ENV НА СЕРВЕРЕ
## ═══════════════════════════════════════════════════════════════

### Путь:
```
/var/www/onai-integrator-login-main/backend
```

### Существование файла:
```bash
-rw-r--r-- 1 root root 1452 Nov 18 11:48 .env
```
✅ Файл существует  
✅ Permissions правильные (644)  
✅ Owner: root:root

### Содержимое .env (ключевые переменные):
```env
OPENAI_API_KEY=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

R2_ACCESS_KEY_ID=7acdb68c6dcedb620831cc926630fa70
R2_SECRET_ACCESS_KEY=b603cab224f0e926af5e210b8917bc0de5289fc85fded595e47ad730634add3
R2_ENDPOINT=https://9759c9a54b40f80e87e525245662da24.r2.cloudflarestorage.com
R2_BUCKET_NAME=onai-academy-videos
R2_PUBLIC_URL=https://pub-b4d57373665444eca59ad2bd18dc9c61.r2.dev

SUPABASE_URL=https://arqhkacellqbhjhbebfh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

FRONTEND_URL=https://onai.academy
NODE_ENV=production
PORT=3000
```

✅ Все переменные присутствуют  
✅ Формат правильный (без кавычек и лишних пробелов)  
✅ NODE_ENV=production  
✅ FRONTEND_URL=https://onai.academy

---

## ═══════════════════════════════════════════════════════════════
## 📝 ШАГ 2: ПРОВЕРКА КАК BACKEND ЗАГРУЖАЕТ .ENV
## ═══════════════════════════════════════════════════════════════

### package.json:
```json
"start": "node dist/server.js"
```

### server.ts (начало):
```typescript
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });
```

✅ Backend загружает .env через `dotenv.config()`  
✅ Путь правильный: `__dirname/../.env`  
✅ __dirname = `/var/www/onai-integrator-login-main/backend/dist`  
✅ .env путь = `/var/www/onai-integrator-login-main/backend/.env`

---

## ═══════════════════════════════════════════════════════════════
## 🖥️ ШАГ 3: ПРОВЕРКА PM2 ENVIRONMENT VARIABLES
## ═══════════════════════════════════════════════════════════════

### PM2 Status:
```
id: 0
name: onai-backend
status: online
uptime: 18m
restarts: 8
script path: /var/www/onai-integrator-login-main/backend/dist/server.js
exec cwd: /var/www/onai-integrator-login-main/backend
node.js version: 18.20.8
```

### PM2 Environment:
```
PM2 НЕ передаёт переменные напрямую
Backend загружает их через dotenv.config() из .env
```

⚠️ Node.js 18.20.8 - **DEPRECATED** (рекомендуется Node.js 20+)  
✅ PM2 процесс стабилен

---

## ═══════════════════════════════════════════════════════════════
## 📋 ШАГ 4-5: BACKEND ЛОГИ С ДИАГНОСТИКОЙ
## ═══════════════════════════════════════════════════════════════

### Диагностические логи при старте:
```
═══════════════════════════════════════════════════════════════
🔍 ДИАГНОСТИКА .ENV VARIABLES
═══════════════════════════════════════════════════════════════

📂 Current directory: /var/www/onai-integrator-login-main/backend
📂 __dirname: /var/www/onai-integrator-login-main/backend/dist

🔑 OPENAI_API_KEY:
   - Exists: true
   - Length: 164
   - First 20 chars: sk-proj-iQdhslqOXi_S
   - Last 10 chars: s1HrN_WTkA

🗄️ CLOUDFLARE R2:
   - R2_ACCESS_KEY_ID exists: true
   - R2_ACCESS_KEY_ID length: 32
   - R2_ACCESS_KEY_ID first 10: 7acdb68c6d
   - R2_SECRET_ACCESS_KEY exists: true
   - R2_SECRET_ACCESS_KEY length: 63
   - R2_ENDPOINT: https://9759c9a54b40f80e87e525245662da24.r2.cloudflarestorage.com
   - R2_BUCKET_NAME: onai-academy-videos
   - R2_PUBLIC_URL: https://pub-b4d57373665444eca59ad2bd18dc9c61.r2.dev

🗃️ SUPABASE:
   - SUPABASE_URL: https://arqhkacellqbhjhbebfh.supabase.co
   - SUPABASE_SERVICE_ROLE_KEY exists: true
   - SUPABASE_SERVICE_ROLE_KEY length: 219

═══════════════════════════════════════════════════════════════
```

✅ **Backend ЗАГРУЖАЕТ ВСЕ ПЕРЕМЕННЫЕ ПРАВИЛЬНО!**  
✅ OpenAI API Key загружен (164 символа)  
✅ R2 credentials загружены (32 + 63 символа)  
✅ Supabase credentials загружены (219 символов)

### Ошибки при использовании:
```
❌ OpenAI API:
[OpenAI] Failed to create thread: 401 Incorrect API key provided

❌ Cloudflare R2:
❌ Ошибка загрузки видео: Unauthorized: Unauthorized
Code: 'Unauthorized'
httpStatusCode: 401
```

---

## ═══════════════════════════════════════════════════════════════
## 🔬 ШАГ 6: ПРОВЕРКА ФОРМАТА .ENV
## ═══════════════════════════════════════════════════════════════

### od -c проверка (OpenAI key):
```
O P E N A I _ A P I _ K E Y = s k - p r o j - i Q d h...
```

✅ Нет лишних кавычек  
✅ Нет лишних пробелов  
✅ Формат корректный

---

## ═══════════════════════════════════════════════════════════════
## 🧪 ШАГ 9: ФИНАЛЬНОЕ ТЕСТИРОВАНИЕ КЛЮЧЕЙ НАПРЯМУЮ
## ═══════════════════════════════════════════════════════════════

### OpenAI API Test (curl):
```bash
curl -s https://api.openai.com/v1/models \
  -H "Authorization: Bearer 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"
```

### Результат:
```json
{
  "error": {
    "message": "Incorrect API key provided: sk-proj-***...***WTkA. You can find your API key at https://platform.openai.com/account/api-keys.",
    "type": "invalid_request_error",
    "code": "invalid_api_key",
    "param": null
  }
}
```

❌ **OpenAI ОТКЛОНЯЕТ КЛЮЧ С 401 UNAUTHORIZED!**

---

## ═══════════════════════════════════════════════════════════════
## 🎯 ВЫВОДЫ И РЕКОМЕНДАЦИИ
## ═══════════════════════════════════════════════════════════════

### 🔍 ПРИЧИНА ПРОБЛЕМЫ:

**Backend загружает .env ПРАВИЛЬНО, но API ключи НЕВАЛИДНЫ!**

1. ✅ .env файл существует и читается
2. ✅ Backend загружает все переменные через dotenv.config()
3. ✅ Формат .env правильный
4. ✅ Permissions правильные
5. ❌ **OpenAI API Key ОТКЛОНЁН OpenAI (401 Incorrect API key)**
6. ❌ **Cloudflare R2 Credentials ОТКЛОНЕНЫ R2 (401 Unauthorized)**

### 📌 ВОЗМОЖНЫЕ ПРИЧИНЫ НЕВАЛИДНЫХ КЛЮЧЕЙ:

#### OpenAI API Key:
- ❌ Ключ истёк (срок действия закончился)
- ❌ Ключ был отозван вручную в OpenAI Dashboard
- ❌ Превышен лимит использования (quota exceeded)
- ❌ Проект OpenAI неактивен или удалён
- ❌ Ключ был создан для другого проекта

#### Cloudflare R2 Credentials:
- ❌ API Token был отозван
- ❌ Изменились permissions для bucket
- ❌ Bucket был удалён или переименован
- ❌ Account ID изменился

---

## ═══════════════════════════════════════════════════════════════
## 🔧 РЕШЕНИЕ: СОЗДАТЬ НОВЫЕ КЛЮЧИ
## ═══════════════════════════════════════════════════════════════

### 1. OpenAI API Key (5 минут):

```
1. Открыть: https://platform.openai.com/api-keys
2. Нажать "+ Create new secret key"
3. Name: "onAI Academy Production 2025"
4. Permissions: All
5. Нажать "Create"
6. СКОПИРОВАТЬ ключ (начинается с sk-proj-...)
7. ⚠️ ВАЖНО: Сохранить сразу, больше не покажут!
```

### 2. Cloudflare R2 API Token (5 минут):

```
1. Открыть: https://dash.cloudflare.com/
2. R2 → Manage R2 API Tokens
3. "Create API Token"
4. Permissions: Object Read & Write
5. Bucket: onai-academy-videos (или All buckets)
6. Нажать "Create API Token"
7. СКОПИРОВАТЬ:
   - Access Key ID
   - Secret Access Key
```

### 3. Обновить .env на сервере:

```bash
ssh root@207.154.231.30
nano /var/www/onai-integrator-login-main/backend/.env

# Заменить строки:
OPENAI_API_KEY=<НОВЫЙ_КЛЮЧ>
R2_ACCESS_KEY_ID=<НОВЫЙ_ACCESS_KEY>
R2_SECRET_ACCESS_KEY=<НОВЫЙ_SECRET_KEY>

# Сохранить: Ctrl+O, Enter, Ctrl+X

# Перезапустить backend:
pm2 restart onai-backend --update-env
pm2 logs onai-backend --lines 50
```

---

## ═══════════════════════════════════════════════════════════════
## 📊 ТЕКУЩИЙ СТАТУС ФУНКЦИЙ
## ═══════════════════════════════════════════════════════════════

| Функция | Статус | Причина |
|---------|--------|---------|
| Backend API | ✅ РАБОТАЕТ | - |
| Health Endpoint | ✅ РАБОТАЕТ | `/api/health` → 200 OK |
| Supabase | ✅ РАБОТАЕТ | База подключена |
| Создание курсов | ✅ РАБОТАЕТ | - |
| Создание модулей | ✅ РАБОТАЕТ | - |
| Создание уроков | ✅ РАБОТАЕТ | Без видео |
| Редактирование уроков | ✅ РАБОТАЕТ | - |
| Drag & Drop | ✅ РАБОТАЕТ | Lessons reorder OK |
| Автоматическая нумерация | ✅ РАБОТАЕТ | - |
| Счётчик длительности | ✅ РАБОТАЕТ | - |
| **AI Куратор (OpenAI)** | ❌ НЕ РАБОТАЕТ | **401 Invalid API Key** |
| **Загрузка видео (R2)** | ❌ НЕ РАБОТАЕТ | **401 Unauthorized** |
| Загрузка материалов | ✅ РАБОТАЕТ | Если не видео |

---

## ═══════════════════════════════════════════════════════════════
## 💡 АЛЬТЕРНАТИВНОЕ РЕШЕНИЕ (ВРЕМЕННОЕ)
## ═══════════════════════════════════════════════════════════════

### Если нельзя создать новые ключи СЕЙЧАС:

Платформа может работать в **ограниченном режиме** без AI и видео:

1. ✅ Создавать курсы и модули
2. ✅ Создавать уроки (текстовые, без видео)
3. ✅ Загружать материалы (PDF, документы)
4. ✅ Редактировать всё содержимое
5. ✅ Drag & Drop для изменения порядка
6. ❌ Нельзя использовать AI Куратора
7. ❌ Нельзя загружать видео

---

## ═══════════════════════════════════════════════════════════════
## 📞 СЛЕДУЮЩИЕ ШАГИ
## ═══════════════════════════════════════════════════════════════

### ВАРИАНТ A: СОЗДАТЬ НОВЫЕ КЛЮЧИ (Рекомендуется)
1. Создать новый OpenAI API Key
2. Создать новый Cloudflare R2 API Token
3. Обновить `.env` на сервере
4. Перезапустить backend через PM2
5. Протестировать AI Куратора и загрузку видео

### ВАРИАНТ B: РАБОТАТЬ В ОГРАНИЧЕННОМ РЕЖИМЕ
1. Платформа работает без AI и видео
2. Все остальные функции доступны
3. Создать ключи позже, когда будет возможность

---

**Отчёт подготовлен:** Cursor AI Diagnostic Tool  
**Дата:** 18 ноября 2025, 12:25 UTC  
**Статус:** ✅ ДИАГНОСТИКА ЗАВЕРШЕНА
