# ✅ ИСПРАВЛЕНО: Логирование затрат на транскрипцию Whisper

## 🎤 ПРОБЛЕМА
Когда пользователь записывал аудио с микрофона для транскрипции через Whisper API, токены (затраты) **НЕ ЛОГИРОВАЛИСЬ** в раздел `/admin/token-usage`.

Ошибка в консоли:
```
POST https://arqhkacellqbhjhbebfh.supabase.co/rest/v1/rpc/log_token_usage 400 (Bad Request)
{code: '42703', message: 'column "agent_type" of relation "ai_token_usage" does not exist'}
```

---

## 🔧 ЧТО БЫЛО ИСПРАВЛЕНО

### 1. ✅ Frontend: Миграция с Supabase RPC на Backend API

**Файл:** `src/lib/token-tracker.ts`

**Было:**
```typescript
// ❌ Прямой вызов Supabase RPC функции (которая не работала)
const { data, error } = await supabase.rpc('log_token_usage', { ... });
```

**Стало:**
```typescript
// ✅ Используем Backend API
import { api } from '@/utils/apiClient';

const response = await api.post('/api/tokens/log', {
  userId: params.userId,
  assistantType: params.agentType,
  model: params.model,
  promptTokens: params.promptTokens,
  completionTokens: params.completionTokens,
  totalTokens: params.promptTokens + params.completionTokens,
  requestType: params.operationType || 'chat',
  audioDurationSeconds: params.audioDurationSeconds,
});
```

**Изменения:**
- Заменили `supabase.rpc()` на `api.post('/api/tokens/log')`
- Исправили типы: `'ai_curator'` → `'curator'`, `'ai_mentor'` → `'mentor'`, `'ai_analyst'` → `'analyst'`
- Добавлены детальные логи для отладки

---

### 2. ✅ Frontend: Передача userId и threadId при транскрипции

**Файл:** `src/components/profile/v2/AIChatDialog.tsx`

**Было:**
```typescript
// ❌ Не передавали userId и threadId
const transcription = await transcribeAudioToText(audioBlob);
```

**Стало:**
```typescript
// ✅ Получаем userId из Supabase Auth
let userId = 'user-1'; // Fallback
try {
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.id) {
    userId = user.id;
    console.log('✅ Транскрибируем аудио для userId:', userId);
  }
} catch (authError) {
  console.warn('⚠️  Не удалось получить userId, используем fallback');
}

// Получаем threadId для логирования
const threadId = localStorage.getItem('openai_thread_id') || undefined;

const transcription = await transcribeAudioToText(audioBlob, userId, threadId);
```

**Изменения:**
- Добавлена проверка авторизации через `supabase.auth.getUser()`
- Передаём `userId` и `threadId` в `transcribeAudioToText()`
- Добавлено логирование для отладки

---

### 3. ✅ Backend: Логирование Whisper в контроллере

**Файл:** `backend/src/controllers/openaiController.ts`

**Было:**
```typescript
// ❌ Транскрипция без логирования токенов
const transcription = await openaiService.transcribeAudio(audioFile, language, prompt);

res.json({ 
  text: transcription,
  duration: req.body.duration || null,
});
```

**Стало:**
```typescript
// ✅ Транскрипция + логирование токенов
const transcription = await openaiService.transcribeAudio(audioFile, language, prompt);

// Логируем использование Whisper
const audioDurationSeconds = parseFloat(duration) || 0;
if (audioDurationSeconds > 0 && userId) {
  try {
    await tokenService.logTokenUsage({
      userId: userId,
      assistantType: 'curator', // Whisper используется только в AI-кураторе
      model: 'whisper-1',
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      requestType: 'voice_transcription',
      audioDurationSeconds: audioDurationSeconds,
    });
    console.log(`[OpenAI Controller] ✅ Whisper токены залогированы: ${audioDurationSeconds}s`);
  } catch (logError: any) {
    console.error('[OpenAI Controller] ⚠️ Не удалось залогировать Whisper:', logError.message);
  }
}

res.json({ 
  text: transcription,
  duration: audioDurationSeconds,
});
```

**Изменения:**
- Добавлен импорт `tokenService`
- Добавлен вызов `tokenService.logTokenUsage()` после успешной транскрипции
- Логируем длительность аудио (`audioDurationSeconds`)
- Извлекаем `userId` из JWT токена (`req.user.id`)
- Добавлено логирование для отладки

---

## 🎯 КАК ТЕСТИРОВАТЬ

1. Открой `http://localhost:8080`
2. Перейди в профиль → AI-Куратор
3. Нажми кнопку микрофона 🎤 и запиши голосовое сообщение (минимум 1 секунда)
4. Отправь сообщение

### ✅ Ожидаемый результат в консоли:

**Frontend:**
```
✅ Транскрибируем аудио для userId: a1b2c3d4-5678-90ef-ghij-klmnopqrstuv
🎙️ === НАЧАЛО ТРАНСКРИПЦИИ ===
📊 Размер аудио: 54257 байт
⏱️ Длительность аудио: 3.296 секунд
[TokenTracker] 🎙️ Логируем Whisper транскрипцию: { duration: 3.296, userId: "a1b2..." }
[TokenTracker] 📊 Логируем токены: { agent: 'curator', model: 'whisper-1', operation: 'voice_transcription', audioDuration: 3.296 }
✅ Токены залогированы: curator - 0 tokens
✅ === ТРАНСКРИПЦИЯ УСПЕШНА ===
```

**Backend:**
```
[OpenAI Controller] 🎙️ Транскрибируем аудио: { size: 54257, type: 'audio/webm', duration: '3.296', userId: 'a1b2...' }
[TokenService] Logging token usage: { user: 'a1b2...', assistant: 'curator', model: 'whisper-1', tokens: 0 }
[TokenService] ✅ Token usage logged: abc123-def456-ghi789
[OpenAI Controller] ✅ Whisper токены залогированы: 3.296s
```

### ✅ Проверка в админ-панели:

1. Перейди в `/admin/token-usage`
2. В таблице "Последние запросы" должна появиться запись:
   - **Агент:** AI-Куратор (curator)
   - **Модель:** whisper-1
   - **Тип:** voice_transcription
   - **Аудио:** 3.3s (например)
   - **Стоимость:** $0.0003 (3.3s * $0.006/minute)
   - **Стоимость (KZT):** 0.14₸

3. В карточках должна обновиться статистика:
   - **Общие затраты** (увеличится на стоимость Whisper)
   - **Всего запросов** (увеличится на +1)
   - **По агентам:** AI-Куратор (увеличится на 1 запрос)
   - **По моделям:** whisper-1 (новая строка)

---

## 💰 СТОИМОСТЬ WHISPER

| Модель | Цена | Пример |
|--------|------|--------|
| `whisper-1` | **$0.006 / минуту** | 3.3s аудио = $0.0003 (0.14₸) |

**Формула:**
```
Стоимость (USD) = (audioDurationSeconds / 60) * 0.006
Стоимость (KZT) = Стоимость (USD) * 460
```

**Пример:**
- 3.3 секунды = `(3.3 / 60) * 0.006 = $0.00033` ≈ **0.15₸**
- 60 секунд (1 минута) = `(60 / 60) * 0.006 = $0.006` = **2.76₸**

---

## 📋 GIT COMMIT

```bash
git commit -m "feat: добавлено логирование затрат на транскрипцию Whisper через Backend API"
```

**Изменённые файлы:**
- `src/lib/token-tracker.ts` (миграция на Backend API)
- `src/components/profile/v2/AIChatDialog.tsx` (передача userId/threadId)
- `backend/src/controllers/openaiController.ts` (логирование Whisper)

---

## 🚀 СТАТУС

✅ **ГОТОВО!** Теперь все затраты на транскрипцию Whisper корректно логируются в Supabase через Backend API.

---

## 📊 АРХИТЕКТУРА ЛОГИРОВАНИЯ ТОКЕНОВ

```
┌─────────────────┐
│   FRONTEND      │
│  AIChatDialog   │
└────────┬────────┘
         │ 1. Записывает аудио
         ↓
┌─────────────────┐
│   FRONTEND      │
│openai-assistant │ transcribeAudioToText(audioBlob, userId, threadId)
└────────┬────────┘
         │ 2. Отправляет FormData на Backend
         ↓
┌─────────────────┐
│    BACKEND      │
│openaiController │ POST /api/openai/audio/transcriptions
└────────┬────────┘
         │ 3. Вызывает OpenAI Whisper API
         ↓
┌─────────────────┐
│    BACKEND      │
│ openaiService   │ transcribeAudio() → OpenAI API
└────────┬────────┘
         │ 4. Возвращает текст
         ↓
┌─────────────────┐
│    BACKEND      │
│openaiController │ Логирует через tokenService.logTokenUsage()
└────────┬────────┘
         │ 5. Сохраняет в Supabase
         ↓
┌─────────────────┐
│   SUPABASE      │
│ ai_token_usage  │ { model: 'whisper-1', audioDurationSeconds: 3.3, ... }
└─────────────────┘
         │
         ↓
┌─────────────────┐
│   FRONTEND      │
│ /admin/token    │ Отображает статистику
│     -usage      │
└─────────────────┘
```

---

## 🔥 ГОТОВО!

Все затраты на Whisper теперь отслеживаются корректно! 🎉

