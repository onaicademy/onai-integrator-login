# Groq API Capabilities & Pricing Research

## ЦЕЛЬ:
Перевести ВСЕ операции AI (кроме OpenAI Assistants) на Groq API для снижения затрат и единого учёта метрик.

---

## ВОПРОСЫ ДЛЯ PERPLEXITY:

### 1. ПОДДЕРЖКА VISION API
**Q1:** Поддерживает ли Groq API анализ изображений (Vision API) как OpenAI GPT-4o?
- Есть ли модель аналогичная GPT-4o Vision?
- Может ли Groq читать текст из изображений?
- Может ли Groq анализировать скриншоты PDF?

**Q2:** Если Groq НЕ поддерживает Vision, какие альтернативы для чтения текста из изображений?
- OCR через Groq?
- Другие API совместимые с Groq?

### 2. ДОСТУПНЫЕ МОДЕЛИ
**Q3:** Какие модели доступны в Groq API (декабрь 2024 - январь 2025)?
- Llama 3.x?
- Mixtral?
- Gemma?
- Другие?

**Q4:** Какие модели лучше для:
- Чат с пользователями (AI-куратор)
- Анализ документов
- Генерация ответов на русском языке

### 3. ЦЕНООБРАЗОВАНИЕ (АКТУАЛЬНОЕ)
**Q5:** Текущие цены Groq API (2024-2025):

| Операция | Модель | Цена за 1M токенов (input) | Цена за 1M токенов (output) |
|----------|--------|----------------------------|------------------------------|
| Chat | ? | ? | ? |
| Whisper (audio transcription) | whisper-large-v3 | ? | ? |
| Vision (если есть) | ? | ? | ? |

**Q6:** Сравнение с OpenAI:

| Операция | OpenAI GPT-4o | Groq (лучшая модель) | Экономия |
|----------|---------------|----------------------|----------|
| Chat | $2.50 / 1M input | ? | ? |
| Whisper | $0.006 / мин | $0.00005 / сек = $0.003 / мин | ~50% |
| Vision | $2.50 / 1M input | ? | ? |

### 4. API СОВМЕСТИМОСТЬ
**Q7:** Groq API совместим с OpenAI SDK?
```typescript
// OpenAI:
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Groq:
const groq = new OpenAI({ 
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1' 
});
```

**Q8:** Какие endpoints доступны в Groq API?
- `/chat/completions` ✅
- `/audio/transcriptions` ✅ (Whisper)
- `/images/generations` ❓
- `/embeddings` ❓

### 5. ЛИМИТЫ И ОГРАНИЧЕНИЯ
**Q9:** Rate limits в Groq API:
- Запросов в минуту?
- Токенов в минуту?
- Размер контекста (context window)?

**Q10:** Размер файлов:
- Максимальный размер аудио для Whisper?
- Максимальный размер изображения (если Vision есть)?

### 6. КАЧЕСТВО И ПРОИЗВОДИТЕЛЬНОСТЬ
**Q11:** Скорость ответа Groq vs OpenAI:
- Latency (задержка первого токена)?
- Throughput (токенов в секунду)?

**Q12:** Качество ответов на русском языке:
- Какая модель Groq лучше для русского?
- Сравнение с GPT-4o?

---

## ТЕКУЩИЙ TECH STACK:

### ЧТО УЖЕ ИСПОЛЬЗУЕМ:
- ✅ **Groq Whisper** (whisper-large-v3) - транскрипция аудио
- ❌ **OpenAI GPT-4o** - чат, Vision
- ❌ **OpenAI Assistants API** - AI-наставник, AI-аналитик (ОСТАВИТЬ!)

### ЧТО ХОТИМ ПЕРЕВЕСТИ НА GROQ:
- 🔄 **Chat** (AI-куратор, ответы студентам)
- 🔄 **Vision** (чтение PDF, анализ изображений)
- 🔄 **Document Analysis** (анализ документов)

---

## АРХИТЕКТУРА УЧЁТА ЗАТРАТ:

### ТРЕБОВАНИЯ:
```typescript
interface AIOperationMetrics {
  operation_type: 'chat' | 'whisper' | 'vision' | 'assistant';
  platform: 'main' | 'tripwire';
  model: string; // 'whisper-large-v3', 'gpt-4o', 'llama-3-70b', etc.
  
  // Token usage
  input_tokens: number;
  output_tokens: number;
  
  // Cost calculation
  cost_usd: number;
  
  // Metadata
  user_id: string;
  timestamp: Date;
  function_name: string; // 'processVoiceMessage', 'processFileUpload', etc.
  duration_ms: number;
  
  // Provider
  provider: 'openai' | 'groq';
}
```

### БАЗА ДАННЫХ:
```sql
CREATE TABLE ai_operations_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type TEXT NOT NULL,
  platform TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_usd DECIMAL(10, 6),
  
  user_id UUID,
  function_name TEXT,
  duration_ms INTEGER,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_metrics_platform ON ai_operations_metrics(platform, created_at);
CREATE INDEX idx_metrics_function ON ai_operations_metrics(function_name, created_at);
```

---

## ПРИМЕР ИСПОЛЬЗОВАНИЯ:

```typescript
// Вместо OpenAI:
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Привет!' }]
});

// Используем Groq:
const response = await groq.chat.completions.create({
  model: 'llama-3-70b-8192', // Или другая модель
  messages: [{ role: 'user', content: 'Привет!' }]
});

// Фиксируем затраты:
await trackAIOperation({
  operation_type: 'chat',
  platform: 'tripwire',
  provider: 'groq',
  model: 'llama-3-70b-8192',
  input_tokens: response.usage.prompt_tokens,
  output_tokens: response.usage.completion_tokens,
  cost_usd: calculateCost('groq', 'llama-3-70b-8192', response.usage),
  function_name: 'processChat',
  user_id: userId,
});
```

---

## ЧТО НУЖНО ОТ PERPLEXITY:

1. ✅ **Актуальные цены Groq API** (2024-2025)
2. ✅ **Поддержка Vision** или альтернативы
3. ✅ **Лучшие модели** для русского языка
4. ✅ **Сравнение с OpenAI** (цена, качество, скорость)
5. ✅ **Rate limits и ограничения**
6. ✅ **Примеры кода** для Vision (если есть)

Спасибо! 🙏
