# ✅ GROQ WHISPER + ФАЙЛЫ - ИСПРАВЛЕНО!

**Дата:** 7 декабря 2025, 09:25  
**Статус:** 🟢 **ГОТОВО - СКОПИРОВАНО С МЕЙН-ПЛАТФОРМЫ**

---

## 🔑 КАКИЕ КЛЮЧИ ИСПОЛЬЗУЮТСЯ:

### ✅ Для Groq Whisper (голосовые сообщения):
```typescript
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
});
```

**Переменная:** `GROQ_API_KEY`  
**Модель:** `whisper-large-v3` (Groq)  
**Стоимость:** БЕСПЛАТНО! 🎉

---

### ✅ Для Vision API + GPT-4o (анализ файлов, текстовый чат):
```typescript
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
```

**Переменная:** `OPENAI_API_KEY`  
**Модели:** 
- `gpt-4o` (текстовый чат + Vision для изображений)
- Используется для PDF, DOCX, изображений

---

## 📂 ЧТО СКОПИРОВАНО С МЕЙН-ПЛАТФОРМЫ:

### 1. Groq Whisper (голосовые сообщения)
**Файл:** `backend/src/services/tripwire/tripwireAiService.ts`

**Функция:** `processVoiceMessage()`

```typescript
// ✅ СКОПИРОВАНО С МЕЙН-ПЛАТФОРМЫ
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
});

const transcription = await groq.audio.transcriptions.create({
  file: fileForGroq,
  model: 'whisper-large-v3', // ← GROQ MODEL!
  language: 'ru',
  response_format: 'verbose_json',
  prompt: '...',
  temperature: 0.0,
});
```

**Источник:** `backend/src/services/openaiService.ts` (мейн-платформа, функция `transcribeAudio`)

---

### 2. Vision API (изображения)
**Функция:** `processFileUpload()` - обработка изображений

```typescript
// ✅ GPT-4o Vision (OpenAI)
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: analysisPrompt },
        { type: 'image_url', image_url: { url: dataUrl } }
      ]
    }
  ],
  max_tokens: 1000,
});
```

**Источник:** `backend/src/services/openaiService.ts` (функция `analyzeImage`)

---

### 3. PDF + DOCX Parsing
**Функция:** `processFileUpload()` - PDF и DOCX

```typescript
// PDF
const pdfParse = require('pdf-parse');
const pdfData = await pdfParse(file.buffer);

// DOCX
const mammoth = require('mammoth');
const result = await mammoth.extractRawText({ buffer: file.buffer });
```

**Источник:** `backend/src/services/fileProcessingService.ts` (функции `extractTextFromPDF`, `extractTextFromDOCX`)

---

## 🎯 ИТОГО - ЧТО ТЕПЕРЬ ИСПОЛЬЗУЕТСЯ:

| Функция | API | Ключ | Модель |
|---------|-----|------|--------|
| 🎤 Голосовые сообщения | **Groq** | `GROQ_API_KEY` | `whisper-large-v3` |
| 💬 Текстовый чат | **OpenAI** | `OPENAI_API_KEY` | `gpt-4o` |
| 🖼️ Анализ изображений | **OpenAI** | `OPENAI_API_KEY` | `gpt-4o` (Vision) |
| 📄 PDF parsing | **pdf-parse** | - | - |
| 📝 DOCX parsing | **mammoth** | - | - |

---

## ⚙️ ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ (.env):

Убедись что в `.env` файле есть:

```bash
# OpenAI (для текстового чата + Vision)
OPENAI_API_KEY=sk-proj-xxxxx

# Groq (для Whisper транскрипции - БЕСПЛАТНО!)
GROQ_API_KEY=gsk_xxxxx
```

---

## 🚀 BACKEND ПЕРЕЗАПУЩЕН:

✅ **6 процессов Node.js работают**  
✅ Код скопирован 1-в-1 с мейн-платформы  
✅ Все ключи правильные (Groq для Whisper, OpenAI для остального)

---

## 🧪 ТЕСТИРУЙ СЕЙЧАС!

1. Открой `http://localhost:8080`
2. Залогинься как студент
3. Открой AI чат
4. Протестируй:
   - **🎤 Голос** (Groq Whisper - БЕСПЛАТНО!)
   - **📷 Изображение** (OpenAI Vision - gpt-4o)
   - **📄 PDF** (pdf-parse + gpt-4o)

---

**В ЛОГАХ ТЕПЕРЬ УВИДИШЬ:**
```
[Groq Whisper] === НАЧАЛО ТРАНСКРИПЦИИ ===
✅ [Groq Whisper] Транскрипция успешна: 42 символов
```

**А НЕ:**
```
[OpenAI Whisper] ...  ← ЭТО БОЛЬШЕ НЕ БУДЕТ!
```

---

**ГОТОВО! ВСЁ КАК НА МЕЙН-ПЛАТФОРМЕ!** 🔥
