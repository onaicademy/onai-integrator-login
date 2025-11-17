# 🎤 Whisper API - Исправление ошибки "File is not defined"

## ❌ ПРОБЛЕМА

При попытке использовать микрофон (голосовые сообщения) на фронтенде возникала ошибка:

```
POST https://api.onai.academy/api/openai/audio/transcriptions 500 (Internal Server Error)
Error: File is not defined
```

**Причина:** Backend пытался использовать `new File()` для создания файла из Buffer, но глобальный конструктор `File` **НЕ СУЩЕСТВУЕТ в Node.js** — это браузерный API!

## 🔍 ДИАГНОСТИКА

### Проблемный код (backend/src/controllers/openaiController.ts:241):

```typescript
// ❌ НЕ РАБОТАЕТ В NODE.JS!
const audioFile = new File([req.file.buffer], req.file.originalname || 'recording.webm', {
  type: req.file.mimetype,
});
```

### Ошибка в логах:

```
❌ Error in transcribeAudio: File is not defined
```

## ✅ РЕШЕНИЕ

OpenAI SDK (`openai@4.28.0`) предоставляет утилиту `toFile()` из пакета `openai/uploads` для создания File-подобных объектов в Node.js.

### Исправленный код:

#### 1. Добавлен импорт (backend/src/controllers/openaiController.ts:6):

```typescript
import { toFile } from 'openai/uploads'; // ✅ Для создания File объекта в Node.js
```

#### 2. Использование toFile() (backend/src/controllers/openaiController.ts:242):

```typescript
// ✅ ПРАВИЛЬНО ДЛЯ NODE.JS!
const audioFile = await toFile(req.file.buffer, req.file.originalname || 'recording.webm', {
  type: req.file.mimetype,
});
```

#### 3. Обновлён тип параметра (backend/src/services/openaiService.ts:214):

```typescript
export async function transcribeAudio(
  audioFile: any, // FileLike из openai/uploads (Buffer в Node.js)
  language: string = 'ru',
  prompt?: string
) {
  // ...
}
```

## 🚀 ДЕПЛОЙ

### 1. Локальная компиляция:
```bash
cd backend && npm run build  # ✅ SUCCESS
```

### 2. Push на GitHub:
```bash
git add backend/src/controllers/openaiController.ts backend/src/services/openaiService.ts
git commit -m "fix: Whisper API - use toFile from openai/uploads for Node.js compatibility"
git push origin main  # ✅ Commit: 066e256
```

### 3. Деплой на сервер (207.154.231.30):
```bash
# Копирование файлов на сервер
scp backend/src/controllers/openaiController.ts root@207.154.231.30:/var/www/onai-integrator-login-main/backend/src/controllers/
scp backend/src/services/openaiService.ts root@207.154.231.30:/var/www/onai-integrator-login-main/backend/src/services/

# Компиляция и рестарт
ssh root@207.154.231.30 "cd /var/www/onai-integrator-login-main/backend && npm run build && pm2 restart onai-backend --update-env"
```

### 4. Обновление OPENAI_API_KEY:
```bash
# Замена API ключа на новый (рабочий)
ssh root@207.154.231.30 "sed -i 's/^OPENAI_API_KEY=.*/OPENAI_API_KEY=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/' /var/www/onai-integrator-login-main/backend/.env"

# Перезапуск Backend с обновлённым ключом
pm2 restart onai-backend --update-env
```

## 📊 РЕЗУЛЬТАТ

### Backend логи (PM2):
```
✅ OpenAI client initialized with Assistants API v2
✅ OPENAI_API_KEY: ✅ SET
🚀 Backend API запущен на http://localhost:3000
```

### API Health Check:
```bash
curl https://api.onai.academy/api/health
# ✅ {"status":"ok","timestamp":"..."}
```

## 🎯 ТЕСТИРОВАНИЕ

### Как протестировать на фронтенде:

1. Откройте https://onai.academy
2. Войдите в AI-куратор / AI-ментор / AI-аналитик
3. Нажмите на иконку микрофона 🎤
4. Говорите на русском языке 1-5 секунд
5. Нажмите ещё раз для остановки
6. **Ожидается:** Whisper распознает речь, текст появится в поле ввода
7. **Раньше было:** `500 Internal Server Error: File is not defined`

### Проверка в консоли браузера:

**До исправления:**
```
POST https://api.onai.academy/api/openai/audio/transcriptions 500 (Internal Server Error)
❌ Ошибка: Error: File is not defined
```

**После исправления:**
```
POST https://api.onai.academy/api/openai/audio/transcriptions 200 OK
✅ Распознанный текст: "Привет, как дела?"
```

## 📝 ТЕХНИЧЕСКИЕ ДЕТАЛИ

### OpenAI SDK v4 и File API

В OpenAI SDK v4 для Node.js:
- Нельзя использовать `new File()` (это браузерный API)
- Используйте `toFile(buffer, filename, options)` из `openai/uploads`
- `toFile()` возвращает `FileLike` объект, совместимый с OpenAI API

### Ссылки на документацию:
- [OpenAI Node.js SDK v4 - File Uploads](https://github.com/openai/openai-node#file-uploads)
- [MDN - File API (Browser only)](https://developer.mozilla.org/en-US/docs/Web/API/File)

## ✅ СТАТУС

- [x] Проблема диагностирована
- [x] Код исправлен локально
- [x] TypeScript компилируется без ошибок
- [x] Изменения запушены на GitHub (commit: 066e256)
- [x] Код задеплоен на сервер DigitalOcean
- [x] OPENAI_API_KEY обновлён на сервере
- [x] Backend перезапущен с новыми переменными
- [x] API health endpoint работает
- [ ] **TODO:** Протестировать микрофон на https://onai.academy

---

**Дата исправления:** 16 ноября 2025  
**Коммит:** `066e256` - "fix: Whisper API - use toFile from openai/uploads for Node.js compatibility"  
**Сервер:** https://api.onai.academy (207.154.231.30)  
**Фронтенд:** https://onai.academy (Vercel)

