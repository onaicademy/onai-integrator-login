# 🎯 TRIPWIRE AI COSTS - ОТДЕЛЬНАЯ СИСТЕМА ТРЕКИНГА

## 📊 ОБЗОР

Создана **отдельная таблица `tripwire_ai_costs`** для трекинга затрат на AI для Tripwire **С НУЛЯ**.

### ❌ ЧТО БЫЛО:
- Затраты брались из общей таблицы `ai_token_usage`
- Смешивались с платформой onAI Academy
- Невозможно отделить затраты Tripwire

### ✅ ЧТО СТАЛО:
- Отдельная таблица `tripwire_ai_costs`
- Трекинг **только** для Tripwire
- Трекинг **с нуля** (старые данные не учитываются)
- 3 категории затрат:
  1. **Curator Chat** - GPT-4o в чате AI куратора
  2. **Curator Whisper** - Транскрибация голосовых сообщений в кураторе
  3. **Lesson Transcription** - Транскрибация видео уроков

---

## 🗄️ СТРУКТУРА ТАБЛИЦЫ `tripwire_ai_costs`

```sql
CREATE TABLE tripwire_ai_costs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cost_type VARCHAR(50) NOT NULL, -- 'curator_chat' | 'curator_whisper' | 'lesson_transcription'
  service VARCHAR(100) NOT NULL,  -- 'openai' | 'groq'
  model VARCHAR(100) NOT NULL,    -- 'gpt-4o' | 'whisper-1' | 'whisper-large-v3'
  tokens_used INTEGER DEFAULT 0,
  cost_usd DECIMAL(10, 6) NOT NULL,
  metadata JSONB DEFAULT '{}',    -- { video_id, lesson_id, message, etc }
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 🔑 ПОЛЯ:

| Поле | Тип | Описание |
|------|-----|----------|
| `cost_type` | VARCHAR(50) | Тип затрат: `curator_chat`, `curator_whisper`, `lesson_transcription` |
| `service` | VARCHAR(100) | Провайдер AI: `openai`, `groq` |
| `model` | VARCHAR(100) | Модель AI: `gpt-4o`, `whisper-1`, `whisper-large-v3` |
| `tokens_used` | INTEGER | Количество использованных токенов |
| `cost_usd` | DECIMAL(10, 6) | Стоимость в USD (до 6 знаков после запятой) |
| `metadata` | JSONB | Дополнительные данные (video_id, lesson_id, текст сообщения) |

---

## 📡 API ENDPOINTS

### GET `/api/tripwire/admin/costs`

Получить все затраты на AI для Tripwire.

**Headers:**
```
Authorization: Bearer <supabase_token>
```

**Response:**
```json
{
  "costs": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "cost_type": "curator_chat",
      "service": "openai",
      "model": "gpt-4o",
      "tokens_used": 1234,
      "cost_usd": 0.123456,
      "metadata": { "message": "..." },
      "created_at": "2025-01-01T12:00:00Z"
    }
  ],
  "by_cost_type": {
    "curator_chat": { "total": 1.234, "count": 10 },
    "curator_whisper": { "total": 0.567, "count": 5 },
    "lesson_transcription": { "total": 2.890, "count": 3 }
  },
  "by_service": {
    "openai": { "total": 3.456, "count": 15 },
    "groq": { "total": 1.235, "count": 3 }
  },
  "by_model": {
    "gpt-4o": { "total": 1.234, "count": 10 },
    "whisper-1": { "total": 0.567, "count": 5 },
    "whisper-large-v3": { "total": 2.890, "count": 3 }
  },
  "total": 4.691,
  "total_students": 5
}
```

---

## 🎨 FRONTEND

**Файл:** `src/pages/tripwire/admin/Costs.tsx`

### Отображает:

1. **Общая сумма затрат** - суммарные расходы для всех студентов Tripwire
2. **По типу AI-сервиса** (3 карточки):
   - 💬 **AI Куратор (чат)** - GPT-4o в чате
   - 🎤 **Whisper (голосовые)** - транскрибация голосовых в кураторе
   - 🎬 **Транскрибации уроков** - транскрибация видео

3. **По провайдеру** (OpenAI, Groq)
4. **По модели** (gpt-4o, whisper-1, whisper-large-v3)
5. **История транзакций** - таблица с деталями

### Цветовая схема:

| Тип | Цвет |
|-----|------|
| Curator Chat | `#00FF94` (зелёный) |
| Curator Whisper | `#3B82F6` (синий) |
| Lesson Transcription | `#F59E0B` (оранжевый) |

---

## 🔧 КАК ИСПОЛЬЗОВАТЬ

### Запись затрат в backend:

```typescript
import supabase from './config/supabase';

// Пример: запись затрат на GPT-4o в чате куратора
await supabase
  .from('tripwire_ai_costs')
  .insert({
    user_id: 'uuid-of-user',
    cost_type: 'curator_chat',
    service: 'openai',
    model: 'gpt-4o',
    tokens_used: 1234,
    cost_usd: 0.123456,
    metadata: { message: 'User message content' }
  });

// Пример: запись затрат на Whisper голосовых
await supabase
  .from('tripwire_ai_costs')
  .insert({
    user_id: 'uuid-of-user',
    cost_type: 'curator_whisper',
    service: 'openai',
    model: 'whisper-1',
    tokens_used: 0, // Whisper не возвращает токены
    cost_usd: 0.006, // $0.006 за минуту
    metadata: { audio_duration: 60 }
  });

// Пример: запись затрат на транскрибацию урока
await supabase
  .from('tripwire_ai_costs')
  .insert({
    user_id: 'system', // или admin UUID
    cost_type: 'lesson_transcription',
    service: 'groq',
    model: 'whisper-large-v3',
    tokens_used: 0,
    cost_usd: 0.111, // Groq Whisper бесплатен, но для трекинга можно указать стоимость
    metadata: { 
      video_id: 'bunny-video-id',
      lesson_id: 123,
      duration: 600 // 10 минут
    }
  });
```

---

## 📈 МОНИТОРИНГ

### В админке Tripwire (`/tripwire/admin/costs`):

1. Смотрим **общую сумму затрат** - всего потрачено на AI
2. Смотрим **по типу** - на что больше всего тратим (чат, голосовые, транскрибации)
3. Смотрим **по провайдеру** - OpenAI vs Groq
4. Смотрим **историю** - детали каждой транзакции

### Важно:

- ✅ Затраты **только для Tripwire** (отдельная таблица)
- ✅ Трекинг **с нуля** (старые данные не учитываются)
- ✅ Real-time обновление (каждые 30 секунд)
- ✅ Детализация до 6 знаков после запятой ($0.000001)

---

## 🚀 TODO: Интеграция с существующими сервисами

### 1. AI Curator (Chat)
**Файл:** `backend/src/services/openai.ts` (или где обрабатывается чат куратора)

Добавить после каждого запроса к GPT-4o:
```typescript
await supabase.from('tripwire_ai_costs').insert({
  user_id: userId,
  cost_type: 'curator_chat',
  service: 'openai',
  model: 'gpt-4o',
  tokens_used: completion.usage.total_tokens,
  cost_usd: (completion.usage.total_tokens / 1000) * 0.03, // $0.03 per 1K tokens
  metadata: { message: userMessage.substring(0, 100) }
});
```

### 2. Whisper (голосовые в кураторе)
**Файл:** где обрабатываются голосовые сообщения

Добавить после транскрибации:
```typescript
await supabase.from('tripwire_ai_costs').insert({
  user_id: userId,
  cost_type: 'curator_whisper',
  service: 'openai',
  model: 'whisper-1',
  tokens_used: 0,
  cost_usd: (audioDuration / 60) * 0.006, // $0.006 per minute
  metadata: { audio_duration: audioDuration }
});
```

### 3. Lesson Transcriptions
**Файл:** `backend/src/routes/tripwire/transcriptions.ts`

Добавить после успешной транскрибации:
```typescript
await supabase.from('tripwire_ai_costs').insert({
  user_id: 'system', // или admin UUID
  cost_type: 'lesson_transcription',
  service: 'groq',
  model: 'whisper-large-v3',
  tokens_used: 0,
  cost_usd: 0, // Groq Whisper бесплатен
  metadata: { 
    video_id: videoId,
    lesson_id: lessonId,
    duration: videoDuration
  }
});
```

---

## 📝 МИГРАЦИЯ

**Файл:** `backend/supabase/migrations/YYYYMMDDHHMMSS_create_tripwire_ai_costs.sql`

Миграция уже применена через MCP Supabase инструменты.

**Проверка:**
```sql
SELECT * FROM tripwire_ai_costs LIMIT 10;
```

**Итого:**
- ✅ Таблица создана
- ✅ RLS политики настроены
- ✅ Индексы добавлены
- ✅ API готов
- ✅ Frontend обновлён
- ⏳ Нужно интегрировать с существующими сервисами (AI куратор, Whisper, транскрибации)

---

## 🎉 ИТОГ

Теперь у Tripwire **отдельная система трекинга затрат на AI**:
- Трекинг **с нуля** (обнулены старые данные)
- 3 категории: чат куратора, голосовые, транскрибации уроков
- Детальная аналитика по провайдерам и моделям
- История всех транзакций

**Следующий шаг:** интегрировать запись затрат в существующие сервисы AI (куратор, Whisper, транскрибации).

