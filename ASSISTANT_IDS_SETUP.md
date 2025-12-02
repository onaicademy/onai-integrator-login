# 🔐 ИНСТРУКЦИЯ: НАСТРОЙКА ASSISTANT IDs

**Дата**: 13 ноября 2025  
**Задача**: Безопасное хранение OpenAI Assistant IDs на Backend

---

## 📋 ЧТО НУЖНО СДЕЛАТЬ

### ✅ ШАГ 1: Откройте Backend `.env` файл

**Путь к файлу**:
```
C:\onai-integrator-login\backend\.env
```

Откройте этот файл в любом текстовом редакторе (Notepad, VS Code и т.д.)

---

### ✅ ШАГ 2: Добавьте Assistant IDs

**ДОБАВЬТЕ ЭТИ СТРОКИ В КОНЕЦ ФАЙЛА**:

```env
# ═══════════════════════════════════════════════════════════════════
# OpenAI Assistants Configuration
# ═══════════════════════════════════════════════════════════════════
# Assistant IDs из вашего OpenAI Dashboard
# https://platform.openai.com/assistants

# AI-Куратор (помощь студентам с обучением)
OPENAI_ASSISTANT_CURATOR_ID=asst_yXgYOFAyVKkuc3XETz2IKxh8

# AI-Наставник (карьерные советы)
OPENAI_ASSISTANT_MENTOR_ID=asst_ВАШ_ID_НАСТАВНИКА_ЗДЕСЬ

# AI-Аналитик (анализ прогресса)
OPENAI_ASSISTANT_ANALYST_ID=asst_ВАШ_ID_АНАЛИТИКА_ЗДЕСЬ
```

---

### ✅ ШАГ 3: Замените placeholder ID на реальные

**ГДЕ ВЗЯТЬ Assistant IDs:**

1. Откройте: https://platform.openai.com/assistants
2. Найдите ваших ассистентов (AI-Куратор, AI-Наставник, AI-Аналитик)
3. Скопируйте ID каждого (формат: `asst_xxxxxxxxxxxxxxxxxxxx`)
4. Вставьте в `.env` файл

**ПРИМЕР (ПОСЛЕ ЗАМЕНЫ)**:

```env
OPENAI_ASSISTANT_CURATOR_ID=asst_yXgYOFAyVKkuc3XETz2IKxh8
OPENAI_ASSISTANT_MENTOR_ID=asst_abc123xyz789example123
OPENAI_ASSISTANT_ANALYST_ID=asst_def456uvw012example456
```

---

### ✅ ШАГ 4: Сохраните файл

**Нажмите `Ctrl+S`** (или File → Save) чтобы сохранить изменения.

---

### ✅ ШАГ 5: Перезапустите Backend

**Откройте PowerShell** и выполните:

```powershell
# Остановить текущий Backend (если запущен)
# В терминале где запущен Backend нажмите Ctrl+C

# Или завершите процесс:
tasklist | findstr node
taskkill /IM node.exe /F

# Запустить Backend заново:
cd C:\onai-integrator-login\backend
npm run dev
```

**Ожидаемый вывод**:
```
✅ OpenAI client initialized
✅ Assistants config module loaded
🚀 Backend API запущен на http://localhost:3000
```

---

## 🧪 ПРОВЕРКА ПРАВИЛЬНОСТИ НАСТРОЙКИ

### Тест 1: Health Check

**Откройте браузер** и перейдите по адресу:
```
http://localhost:3000/api/openai/assistants
```

**Ожидаемый результат** (JSON):
```json
{
  "assistants": [
    {
      "type": "curator",
      "id": "asst_yXgYOFAyVKkuc3XETz2IKxh8",
      "available": true
    },
    {
      "type": "mentor",
      "id": "asst_abc...",
      "available": true
    },
    {
      "type": "analyst",
      "id": "asst_def...",
      "available": true
    }
  ]
}
```

**Если видите `"available": false`**:
- ❌ Assistant ID не настроен в `.env`
- Проверьте что переменная добавлена правильно
- Перезапустите Backend

---

### Тест 2: Проверка логов Backend

**В терминале Backend** должно быть:
```
✅ Assistants config module loaded
```

**Если видите ошибку**:
```
❌ Error: Missing environment variable for assistant: MENTOR
```

**Решение**:
1. Откройте `backend/.env`
2. Убедитесь что переменная `OPENAI_ASSISTANT_MENTOR_ID` присутствует
3. Проверьте что нет опечаток
4. Перезапустите Backend

---

## 📊 АРХИТЕКТУРА БЕЗОПАСНОСТИ

### ✅ Правильно (ТЕКУЩЕЕ):
```
Frontend → "Хочу поговорить с curator"
    ↓
Backend → Читает OPENAI_ASSISTANT_CURATOR_ID из .env
    ↓
OpenAI API → Использует правильный Assistant
```

**Преимущества**:
- 🔒 Assistant IDs НЕ ВИДНЫ в Frontend коде
- 🔒 Нельзя подменить Assistant ID через DevTools
- 🔄 Можно менять IDs без перекомпиляции Frontend
- 🚀 Легко деплоить (переменные в DigitalOcean)

---

### ❌ Неправильно (СТАРОЕ):
```
Frontend → hardcoded "asst_yXgYOFAyVKkuc3XETz2IKxh8"
    ↓
OpenAI API → Напрямую с Frontend
```

**Проблемы**:
- ❌ ID виден всем в исходном коде
- ❌ OpenAI API key тоже был виден
- ❌ Невозможно менять без редеплоя Frontend

---

## 🚀 ИСПОЛЬЗОВАНИЕ В КОДЕ FRONTEND

### Новый синтаксис:

```typescript
import { sendMessageToAI } from '@/lib/openai-assistant';

// AI-Куратор (дефолтный)
const response = await sendMessageToAI("Привет!", [], userId, 'curator');

// AI-Наставник
const response = await sendMessageToAI("Как начать карьеру?", [], userId, 'mentor');

// AI-Аналитик
const response = await sendMessageToAI("Покажи мой прогресс", [], userId, 'analyst');
```

### Параметры:

```typescript
sendMessageToAI(
  message: string,              // Текст сообщения
  attachments?: Array<...>,     // Файлы (пока не реализовано)
  userId?: string,              // ID пользователя
  assistantType?: 'curator' | 'mentor' | 'analyst' // ✅ НОВЫЙ!
)
```

---

## 🌐 НАСТРОЙКА ДЛЯ PRODUCTION (DigitalOcean)

### Когда будете деплоить на сервер:

**В DigitalOcean App Platform → Settings → Environment Variables добавьте**:

```env
OPENAI_ASSISTANT_CURATOR_ID=asst_yXgYOFAyVKkuc3XETz2IKxh8
OPENAI_ASSISTANT_MENTOR_ID=asst_ваш_реальный_id
OPENAI_ASSISTANT_ANALYST_ID=asst_ваш_реальный_id
```

**Это же касается**:
- GitHub Actions secrets (если используете CI/CD)
- Docker environment variables
- Любой другой hosting platform

---

## 🆘 TROUBLESHOOTING

### Проблема: Backend не запускается

**Ошибка**:
```
Error: Missing environment variable for assistant: CURATOR
```

**Решение**:
1. Откройте `backend/.env`
2. Проверьте что есть строка:
   ```
   OPENAI_ASSISTANT_CURATOR_ID=asst_...
   ```
3. Убедитесь что НЕТ пробелов:
   - ❌ `OPENAI_ASSISTANT_CURATOR_ID = asst_...`
   - ✅ `OPENAI_ASSISTANT_CURATOR_ID=asst_...`
4. Перезапустите Backend

---

### Проблема: "Invalid assistant_type"

**Ошибка в Frontend Console**:
```
400 Bad Request: Invalid assistant_type: curators
```

**Причина**: Опечатка в названии типа

**Решение**: Используйте ТОЛЬКО:
- `curator` (не `curators`)
- `mentor` (не `mentors`)
- `analyst` (не `analysts`)

---

### Проблема: Assistant ID не работает в OpenAI

**Ошибка**:
```
404 Not Found: No assistant found with id asst_...
```

**Причина**: Assistant был удалён или ID неправильный

**Решение**:
1. Откройте https://platform.openai.com/assistants
2. Убедитесь что ассистент существует
3. Скопируйте правильный ID
4. Обновите в `backend/.env`
5. Перезапустите Backend

---

## 📝 ИТОГО: ЧЕКЛИСТ

- [ ] Открыл `backend/.env`
- [ ] Добавил 3 переменные:
  - [ ] `OPENAI_ASSISTANT_CURATOR_ID`
  - [ ] `OPENAI_ASSISTANT_MENTOR_ID`
  - [ ] `OPENAI_ASSISTANT_ANALYST_ID`
- [ ] Заменил placeholder ID на реальные
- [ ] Сохранил файл (`Ctrl+S`)
- [ ] Перезапустил Backend (`npm run dev`)
- [ ] Проверил `/api/openai/assistants` → `"available": true`
- [ ] Протестировал AI-Куратора в приложении

**Когда всё ✅ - готов к тестированию!**

---

## 📞 СЛЕДУЮЩИЕ ШАГИ

1. ✅ Настроить Assistant IDs (эта инструкция)
2. 🧪 Протестировать каждого ассистента
3. 🚀 Задеплоить на production (когда всё работает)

---

**Дата**: 13 ноября 2025  
**Автор**: AI Assistant (Cursor)

