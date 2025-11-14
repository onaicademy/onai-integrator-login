# 🔥 ПРОБЛЕМА: Загрузка файлов не работает (500 Internal Server Error)

## 📋 КРАТКОЕ ОПИСАНИЕ

При попытке загрузить файл (PDF, DOCX, изображение) через AI-Куратор возникает ошибка **500 Internal Server Error** на эндпоинте `/api/files/process`.

---

## 🚨 ТЕКУЩИЕ ОШИБКИ (из скриншота)

### Frontend Console:
```
POST http://localhost:3000/api/files/process 500 (Internal Server Error)
❌ API Error: Failed to process file
❌ Ошибка обработки файла: Failed to process file
```

### Frontend Stack Trace:
```
at apiRequest (apiClient.ts:70:13)
at async processFile (openai-assistant.ts:97:22)
at async sendMessageToAI (openai-assistant.ts:144:31)
at async AIChatDialog.tsx:338:26
```

---

## 🛠️ ЧТО МЫ УЖЕ ИСПРАВИЛИ

### 1. FormData + multipart/form-data Boundary

**Проблема:** Frontend вручную устанавливал `Content-Type: multipart/form-data` БЕЗ `boundary`, что ломало парсинг.

**Исправление:**
- ✅ Убрали ручную установку `Content-Type` в `openai-assistant.ts`
- ✅ Добавили проверку `isFormData` в `apiClient.ts`
- ✅ Браузер теперь автоматически добавляет `boundary`

**Файлы:**
- `src/lib/openai-assistant.ts` (строка 97)
- `src/utils/apiClient.ts` (строки 27-53)

### 2. Multer Middleware

**Проблема:** Middleware `uploadMiddleware` не был правильно подключён к роуту.

**Исправление:**
- ✅ Добавили `fileController.uploadMiddleware` в `backend/src/routes/files.ts`
- ✅ Экспортировали `upload.single('file')` из `fileController.ts`

**Файлы:**
- `backend/src/routes/files.ts` (строка 15)
- `backend/src/controllers/fileController.ts` (строка 85)

### 3. Подробное логирование

**Исправление:**
- ✅ Добавили детальные логи в `fileController.processFile()`
- ✅ Логируем `req.file`, `req.body`, `buffer.length`, `mimetype`

**Файлы:**
- `backend/src/controllers/fileController.ts` (строки 24-56)

---

## 🔍 ЧТО НУЖНО ПРОВЕРИТЬ СЕЙЧАС

### ШАГ 1: Проверить Backend консоль

Когда ты загружаешь файл, **Backend должен выводить логи:**

```
[FileController] 🔍 Начало обработки файла...
[FileController] req.file: true
[FileController] req.body: { userQuestion: '...' }
[FileController] ✅ Файл получен: {
  filename: 'Квитанция.pdf',
  mimetype: 'application/pdf',
  size: 85904,
  bufferLength: 85904,
  userQuestion: 'N/A'
}
[FileController] 📎 Вызываем fileProcessingService.processFile...
[FileProcessing] Извлекаем текст из PDF...
```

**Если НЕТ логов** → файл не доходит до Backend  
**Если ЕСТЬ логи + ошибка** → проблема в обработке файла

### ШАГ 2: Проверить Backend .env

Проверь, что в `backend/.env` есть:

```env
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://arqhkacellqbhjhbebfh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

### ШАГ 3: Проверить установленные пакеты

```bash
cd backend
npm list pdf-parse mammoth multer
```

**Должно быть:**
```
├── pdf-parse@2.4.5
├── mammoth@1.11.0
└── multer@2.0.2
```

---

## 📝 ВОЗМОЖНЫЕ ПРИЧИНЫ 500 ОШИБКИ

### 1. PDF-парсер не работает
**Проблема:** `pdf-parse` требует специального импорта  
**Проверка:** Смотрим Backend консоль на ошибку `Cannot find module 'pdf-parse'`

### 2. Файл не доходит до Backend
**Проблема:** `req.file` === `undefined`  
**Проверка:** Backend логи `[FileController] req.file: false`

### 3. Буфер пустой
**Проблема:** `file.buffer` пустой или `undefined`  
**Проверка:** Backend логи `bufferLength: 0`

### 4. OpenAI API ключ не работает
**Проблема:** Vision API возвращает ошибку аутентификации  
**Проверка:** Backend логи с ошибкой от OpenAI

### 5. Недостаточно памяти для большого файла
**Проблема:** Multer limit = 10MB, файл больше  
**Проверка:** Backend логи `File too large`

---

## 🧪 КАК ПРОТЕСТИРОВАТЬ

### Тест 1: Загрузка МАЛЕНЬКОГО текстового файла

1. Создай файл `test.txt` с текстом `Hello World`
2. Открой AI-Куратор
3. Прикрепи `test.txt`
4. Отправь сообщение
5. **Смотри Backend консоль**

**Ожидаемое поведение:**
- ✅ Backend логи `[FileController] ✅ Файл получен`
- ❌ Ошибка `Unsupported file type` (нормально, .txt не поддерживается)

### Тест 2: Загрузка изображения PNG

1. Создай простое изображение (screenshot)
2. Открой AI-Куратор
3. Прикрепи изображение
4. Отправь сообщение
5. **Смотри Backend консоль**

**Ожидаемое поведение:**
- ✅ Backend логи `[FileController] Image detected, analyzing with Vision API...`
- ✅ Вызов OpenAI Vision API
- ✅ Ответ от AI с описанием картинки

### Тест 3: Загрузка PDF

1. Возьми любой PDF файл (маленький, 1-2 страницы)
2. Открой AI-Куратор
3. Прикрепи PDF
4. Отправь сообщение
5. **Смотри Backend консоль**

**Ожидаемое поведение:**
- ✅ Backend логи `[FileProcessing] Извлекаем текст из PDF...`
- ✅ Backend логи `[FileProcessing] ✅ Извлечено N символов из PDF`
- ✅ Текст PDF добавлен к сообщению

---

## 🔧 ЧТО ДЕЛАТЬ ДАЛЬШЕ

### 1. Открой Backend консоль (где запущен `npm run dev`)
### 2. Попробуй загрузить ЛЮБОЙ файл
### 3. Скопируй ВСЮ ОШИБКУ из Backend консоли
### 4. Скинь мне:
   - ✅ Backend логи (начиная с `[FileController]`)
   - ✅ Полный стек ошибки
   - ✅ Тип файла, который ты загружаешь

---

## 📦 ФАЙЛЫ, КОТОРЫЕ МЫ ИЗМЕНИЛИ

1. `src/lib/openai-assistant.ts` — убрали `Content-Type: multipart/form-data`
2. `src/utils/apiClient.ts` — добавили проверку `isFormData`
3. `backend/src/routes/files.ts` — добавили `uploadMiddleware`
4. `backend/src/controllers/fileController.ts` — добавили подробные логи
5. `backend/src/services/fileProcessingService.ts` — парсинг PDF/DOCX

---

## 🎯 СЛЕДУЮЩИЕ ШАГИ

**ТЕБЕ НУЖНО:**
1. Открыть Backend консоль (где запущен `npm run dev` в папке `backend`)
2. Попробовать загрузить файл
3. Скопировать **ВСЕ ЛОГИ** из Backend консоли
4. Прислать мне эти логи

**МНЕ НУЖНО УВИДЕТЬ:**
```
[FileController] 🔍 Начало обработки файла...
[FileController] req.file: ???
[FileController] req.body: ???
[FileController] ❌ КРИТИЧЕСКАЯ ОШИБКА обработки файла:
[FileController] Тип ошибки: ???
[FileController] Сообщение: ???
[FileController] Стек: ???
```

---

## 💡 HINT

Если Backend **НЕ ПОКАЗЫВАЕТ ЛОГИ** вообще (даже `[FileController] 🔍 Начало обработки файла...`), значит:
- ❌ Запрос не доходит до Backend
- ❌ Роут `/api/files/process` не зарегистрирован
- ❌ JWT токен не валидный (401 ошибка)

Если Backend **ПОКАЗЫВАЕТ ЛОГИ**, но падает с ошибкой, значит:
- ❌ Проблема в парсинге файла (`pdf-parse`, `mammoth`)
- ❌ Проблема с OpenAI API (Vision API)
- ❌ Проблема с буфером файла

---

## 🚀 КОММИТЫ

```
1. fix: FormData multipart boundary & token logging with correct assistantType
2. debug: add detailed logging for token stats & file processing
3. feat: dynamic token stats in admin dashboard card
4. feat: dynamic student stats in admin dashboard card
```

---

**ДАТА:** 2025-11-14  
**СТАТУС:** 🔴 ОШИБКА 500 - Нужны Backend логи для диагностики

