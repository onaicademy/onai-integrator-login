# PERPLEXITY RESEARCH REQUEST: Voice + File Attachments Architecture

## КОНТЕКСТ ПРОЕКТА

**Платформа:** React + TypeScript (Frontend) + Node.js/Express (Backend)  
**AI Stack:** Groq API (Whisper Large v3), OpenAI GPT-4o (Chat + Vision)  
**Аудио запись:** MediaRecorder API (WebM format)  
**Цель:** Полноценный AI-куратор с голосовыми сообщениями и файлами (PDF, DOCX, изображения)

---

## ПРОБЛЕМА #1: WHISPER VOICE TRANSCRIPTION FLOW

### Текущая архитектура:

**Frontend (`TripwireAIChatDialog.tsx`):**
```typescript
// Пользователь записывает голос через MediaRecorder API
const handleStopRecording = async () => {
  const audioBlob = await stopRecording(); // WebM blob
  const aiResponse = await transcribeAudioToText(audioBlob, userId);
  
  // Добавляем сообщения в UI
  setMessages([...messages, 
    { role: "user", content: "🎤 Голосовое сообщение" },
    { role: "assistant", content: aiResponse }
  ]);
}

// tripwire-openai.ts
export async function transcribeAudioToText(blob: Blob, userId: string) {
  const formData = new FormData();
  formData.append('audio', blob, 'recording.webm');
  formData.append('user_id', userId);
  
  const response = await fetch(`${API_URL}/api/tripwire/ai/voice`, {
    method: 'POST',
    body: formData,
  });
  
  const data = await response.json();
  return data.data.message; // Возвращаем готовый ответ AI
}
```

**Backend (`tripwireAiController.ts`):**
```typescript
export async function voice(req: Request, res: Response): Promise<void> {
  const audioFile = req.file; // Multer файл
  
  // Конвертируем WebM → MP3 через FFmpeg
  let audioBuffer = audioFile.buffer;
  if (mimeType.includes('webm') || mimeType.includes('ogg')) {
    audioBuffer = await convertWebmToMp3(audioFile.buffer);
  }
  
  // Отправляем в Groq Whisper + GPT-4o
  const response = await processVoiceMessage(user_id, processedAudio);
  res.json({ success: true, data: response });
}

// convertWebmToMp3 - использует fluent-ffmpeg
async function convertWebmToMp3(buffer: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const inputStream = new stream.PassThrough();
    const outputStream = new stream.PassThrough();
    
    ffmpeg(inputStream)
      .inputFormat('webm')
      .audioCodec('libmp3lame')
      .audioBitrate('128k')
      .audioChannels(1)
      .audioFrequency(16000)
      .format('mp3')
      .on('end', () => resolve(Buffer.concat(chunks)))
      .on('error', reject)
      .pipe(outputStream);
    
    outputStream.on('data', (chunk) => chunks.push(chunk));
    inputStream.end(buffer);
  });
}
```

**Backend Service (`tripwireAiService.ts`):**
```typescript
export async function processVoiceMessage(userId: string, audioFile: Express.Multer.File) {
  // Groq Whisper транскрипция
  const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1'
  });
  
  const fileForGroq = await toFile(audioFile.buffer, 'recording.mp3', {
    type: 'audio/mp3'
  });
  
  const transcription = await groq.audio.transcriptions.create({
    file: fileForGroq,
    model: 'whisper-large-v3',
    language: 'ru',
    response_format: 'verbose_json',
    temperature: 0.0,
  });
  
  const transcribedText = transcription.text;
  
  // Сохраняем в БД
  await saveChatMessage(userId, 'user', `🎤 [Голосовое]: ${transcribedText}`);
  
  // Отправляем в GPT-4o для ответа
  return await processChat(userId, transcribedText);
}
```

### СИМПТОМЫ:
1. ✅ Аудио записывается (WebM blob ~61KB, 3.6 сек)
2. ✅ Backend получает файл и конвертирует в MP3
3. ✅ Groq Whisper возвращает транскрипцию
4. ✅ GPT-4o генерирует ответ
5. ❌ **В UI НЕ ПОЯВЛЯЕТСЯ текст транскрипции И ответ AI**
6. ❌ **Вместо этого показывается только "🎤 Голосовое сообщение"**

### ВОПРОСЫ ДЛЯ PERPLEXITY:

**Q1:** Какая правильная архитектура для Whisper voice flow в React + Express приложении? Должен ли frontend получать:
- A) Только транскрипцию текста, затем отправлять её в `/chat`?
- B) Сразу готовый ответ AI (транскрипция + GPT-4o response)?
- C) Два отдельных запроса: `/transcribe` → получить текст → `/chat` с текстом?

**Q2:** Как правильно отображать голосовые сообщения в чате?
- Показывать иконку "🎤" + транскрибированный текст?
- Показывать аудио-плеер для воспроизведения?
- Как хранить связь между Blob URL и транскрипцией?

**Q3:** Есть ли best practices для MediaRecorder → Whisper → Chat UI flow?
- Как избежать проблем с Blob URL revocation?
- Нужно ли показывать промежуточные статусы ("Транскрибирую...", "Отвечаю...")?
- Как обрабатывать ошибки транскрипции без разрыва UX?

**Q4:** Проблемы с WebM → MP3 конвертацией через FFmpeg:
- Правильные параметры для Whisper-оптимизированного аудио?
- Альтернативы FFmpeg для Node.js окружения?
- Может ли Groq Whisper принимать WebM напрямую?

**Q5:** State management для voice messages:
- Как синхронизировать состояние записи (isRecording, duration) с UI?
- Правильная структура данных для хранения голосовых сообщений?
- Нужен ли отдельный тип сообщения `voice` или достаточно `user` + metadata?

---

## ПРОБЛЕМА #2: FILE ATTACHMENTS (PDF, DOCX, IMAGES) FLOW

### Текущая архитектура:

**Frontend (`TripwireAIChatDialog.tsx`):**
```typescript
const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files || []);
  const newAttachments = files.map(file => ({
    id: crypto.randomUUID(),
    file: file,
    name: file.name,
    size: file.size,
    type: file.type,
  }));
  setAttachments([...attachments, ...newAttachments]);
}

const sendMessage = async () => {
  if (attachments.length > 0) {
    // Отправка через sendFileToAI
    const response = await sendFileToAI(input, attachments[0].file!, userId);
    setMessages([...messages, 
      { role: "user", content: input, file_ids: [attachments[0].id] },
      { role: "assistant", content: response.message }
    ]);
  } else {
    // Обычный текстовый чат
    const response = await sendMessageToAI(input, userId);
    // ...
  }
}

// tripwire-openai.ts
export async function sendFileToAI(message: string, file: File, userId: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('user_id', userId);
  formData.append('message', message);
  
  const response = await fetch(`${API_URL}/api/tripwire/ai/file`, {
    method: 'POST',
    body: formData,
  });
  
  return await response.json();
}
```

**Backend (`tripwireAiController.ts`):**
```typescript
export async function file(req: Request, res: Response): Promise<void> {
  const { user_id, message } = req.body;
  const uploadedFile = req.file;
  
  const response = await processFileUpload(user_id, message, uploadedFile);
  res.json({ success: true, data: response });
}
```

**Backend Service (`tripwireAiService.ts`):**
```typescript
export async function processFileUpload(userId: string, message: string, file: Express.Multer.File) {
  let extractedContent = '';
  
  // Обработка по типу файла
  if (file.mimetype.startsWith('image/')) {
    // OpenAI Vision API
    const base64Image = file.buffer.toString('base64');
    const visionResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: message },
          { type: "image_url", image_url: { url: `data:${file.mimetype};base64,${base64Image}` }}
        ]
      }]
    });
    return { message: visionResponse.choices[0].message.content };
  }
  
  if (file.mimetype === 'application/pdf') {
    // pdf-parse
    const pdfData = await pdfParse(file.buffer);
    extractedContent = pdfData.text;
  }
  
  if (file.mimetype.includes('wordprocessingml')) {
    // mammoth для DOCX
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    extractedContent = result.value;
  }
  
  // Отправляем в GPT-4o с контекстом
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "Ты AI-куратор..." },
      { role: "user", content: `Файл: ${file.originalname}\n\nСодержимое:\n${extractedContent}\n\nВопрос: ${message}` }
    ]
  });
  
  return { message: completion.choices[0].message.content };
}
```

### СИМПТОМЫ:
1. ✅ Файлы выбираются через `<input type="file">`
2. ✅ Превью отображается в UI
3. ❌ **При отправке файл НЕ доходит до backend**
4. ❌ **Vision API НЕ анализирует изображения**
5. ❌ **PDF и DOCX НЕ парсятся**

### ВОПРОСЫ ДЛЯ PERPLEXITY:

**Q6:** Правильная архитектура для multi-modal AI chat (text + images + documents)?
- Как структурировать API endpoints: один `/chat` с разными типами или отдельные `/image`, `/document`?
- Нужно ли хранить файлы в S3/Supabase Storage или обрабатывать in-memory?
- Как связывать сообщения с файлами в БД (foreign keys, JSONB metadata)?

**Q7:** OpenAI Vision API best practices:
- Оптимальный размер изображений для Vision (ресайз на frontend или backend)?
- Base64 encoding vs URL vs File Upload - что быстрее?
- Как обрабатывать большие изображения (>10MB)?

**Q8:** PDF и DOCX parsing в Node.js:
- `pdf-parse` vs `pdfjs-dist` vs `pdf2json` - что надёжнее?
- `mammoth` vs `docx` - какая библиотека лучше для DOCX?
- Как извлекать таблицы и изображения из документов?

**Q9:** Frontend file handling:
- React state для множественных файлов (attachments array)?
- Drag-and-drop implementation с `react-dropzone`?
- Превью для разных типов файлов (images, PDF thumbnails, DOCX icons)?

**Q10:** Security и validation:
- MIME type проверка на frontend vs backend?
- Размер файла лимиты (10MB для Vision, 25MB для Whisper)?
- Как защититься от malicious файлов (CSRF, XSS через filename)?

---

## ДОПОЛНИТЕЛЬНЫЙ КОНТЕКСТ

### Database Schema:
```sql
CREATE TABLE tripwire_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  file_ids JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Tech Stack:
- Frontend: React 18, TypeScript, Vite, TailwindCSS
- Backend: Node.js 20, Express, TypeScript
- AI: Groq Whisper Large v3, OpenAI GPT-4o/Vision
- Storage: Supabase PostgreSQL + Storage
- Audio: MediaRecorder API, FFmpeg (fluent-ffmpeg)
- Files: Multer, pdf-parse, mammoth

### Performance Requirements:
- Whisper транскрипция: <5 секунд
- Vision анализ: <10 секунд
- Document parsing: <15 секунд
- UI должен оставаться responsive (не блокироваться)

---

## ЧТО МНЕ НУЖНО ОТ PERPLEXITY:

1. **Правильная end-to-end архитектура** для voice + files в AI chat
2. **Code examples** лучших практик (React + Node.js)
3. **Common pitfalls** и как их избежать
4. **Performance optimization** советы
5. **Production-ready patterns** для масштабирования

Пожалуйста, предоставьте детальный технический анализ с учётом:
- Современных best practices (2024-2025)
- Real-world production опыта
- Конкретных примеров кода
- Архитектурных диаграмм (если возможно)

Спасибо! 🙏
