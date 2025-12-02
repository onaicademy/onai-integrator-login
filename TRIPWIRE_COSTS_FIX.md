# ✅ ИСПРАВЛЕНИЕ: Затраты ТОЛЬКО по Tripwire студентам

**Дата:** 1 декабря 2025  
**Статус:** ✅ Выполнено и протестировано

---

## 🎯 ПРОБЛЕМА

В админке Tripwire показывались затраты на AI **ВСЕЙ платформы**, а не только Tripwire студентов.

**ДО исправления:**
- `/api/tripwire/admin/stats` → использовал таблицу `usage_costs` (которая пустая)
- `/api/tripwire/admin/costs` → показывал затраты всех студентов платформы
- Невозможно было отследить реальные затраты на Tripwire

---

## ✅ РЕШЕНИЕ

Обновлен файл: **`backend/src/routes/tripwire/admin.ts`**

### 📊 Изменения:

#### 1. **Использована правильная таблица: `ai_token_usage`**

**БЫЛО:**
```typescript
const { data: costsData } = await supabase
  .from('usage_costs')  // ❌ Пустая таблица
  .select('cost');
```

**СТАЛО:**
```typescript
const { data: curatorCostsAll } = await supabase
  .from('ai_token_usage')  // ✅ Правильная таблица
  .select('total_cost_usd')
  .in('user_id', tripwireUserIds);  // ✅ Только Tripwire студенты
```

---

#### 2. **Фильтрация по Tripwire студентам**

```typescript
// Получаем ID всех Tripwire студентов
const { data: tripwireProfiles } = await supabase
  .from('tripwire_user_profile')
  .select('user_id');

const tripwireUserIds = tripwireProfiles?.map(p => p.user_id) || [];

// Затраты ТОЛЬКО для Tripwire студентов
const { data: costs } = await supabase
  .from('ai_token_usage')
  .select('*')
  .in('user_id', tripwireUserIds);  // 🎯 Фильтр по Tripwire
```

---

#### 3. **GET /api/tripwire/admin/stats - Обновлена секция затрат**

**Что считается:**
- ✅ AI Куратор (assistant_type='curator')
- ✅ AI Ментор (assistant_type='mentor')  
- ✅ Только для Tripwire студентов
- ❌ НЕ включены затраты других студентов платформы

**Результат:**
```json
{
  "total_students": 1,
  "monthly_costs": 0.0000,
  "total_costs": 0.3483,  // ✅ Только Tripwire!
  "total_transcriptions": 10
}
```

---

#### 4. **GET /api/tripwire/admin/costs - Полная переделка**

**БЫЛО:**
```typescript
const { data: costs } = await supabase
  .from('usage_costs')
  .select('*');  // ❌ Все студенты

const byService = costs.reduce(...); // ❌ Группировка по service
```

**СТАЛО:**
```typescript
// ✅ Только Tripwire студенты
const { data: costs } = await supabase
  .from('ai_token_usage')
  .select('*')
  .in('user_id', tripwireUserIds)  // 🎯 Фильтр!
  .order('created_at', { ascending: false })
  .limit(100);

// ✅ Группировка по assistant_type и model
const byAssistant = costs.reduce(...);
const byModel = costs.reduce(...);
```

**Результат:**
```json
{
  "total": 0.3483,
  "costs": [/* 64 записи ТОЛЬКО Tripwire */],
  "by_assistant": {
    "curator": { "total": 0.1891, "count": 55 },
    "mentor": { "total": 0.1592, "count": 9 }
  },
  "by_model": {
    "gpt-4o": { "total": 0.3483, "count": 64 }
  }
}
```

---

## 🧪 ТЕСТИРОВАНИЕ

### API Tests:
```bash
✅ GET /api/tripwire/admin/stats
   👥 Студентов Tripwire: 1
   💰 Затраты AI Куратор (всего): $0.3483
   🎥 Транскрибаций: 10

✅ GET /api/tripwire/admin/costs
   💵 Всего: $0.3483 (ТОЛЬКО Tripwire!)
   📝 Записей: 64
   🤖 По ассистентам:
      - curator: $0.1891 (55 запросов)
      - mentor: $0.1592 (9 запросов)
   🧠 По моделям:
      - gpt-4o: $0.3483 (64 запросов)

🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ!
```

---

## 📚 СТРУКТУРА ДАННЫХ

### Таблица: `ai_token_usage`
```sql
CREATE TABLE ai_token_usage (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),  -- ✅ Для фильтрации!
  assistant_type VARCHAR(50),         -- 'curator', 'mentor'
  model VARCHAR(50),                  -- 'gpt-4o', 'gpt-4o-mini'
  request_type TEXT,                  -- 'chat', 'transcription'
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  prompt_cost_usd DECIMAL(10, 6),
  completion_cost_usd DECIMAL(10, 6),
  total_cost_usd DECIMAL(10, 6),     -- ✅ Стоимость!
  audio_duration_seconds INTEGER,
  created_at TIMESTAMPTZ
);
```

### Фильтрация:
1. **Tripwire студенты:** `tripwire_user_profile.user_id`
2. **Затраты AI:** `ai_token_usage WHERE user_id IN (tripwire_user_ids)`
3. **Группировка:**
   - По ассистенту: `assistant_type` ('curator', 'mentor')
   - По модели: `model` ('gpt-4o', 'gpt-4o-mini')

---

## 🚀 ДЕПЛОЙ

### Команда для production:
```bash
ssh root@207.154.231.30 "cd /var/www/onai-integrator-login-main && \
  git pull origin main && \
  cd backend && \
  npm install --production && \
  npm run build && \
  pm2 restart onai-backend && \
  pm2 logs onai-backend --lines 20"
```

### Проверка после деплоя:
```bash
# Проверить статистику
curl -H "Authorization: Bearer $TOKEN" \
  https://api.onai.academy/api/tripwire/admin/stats

# Проверить детальные затраты
curl -H "Authorization: Bearer $TOKEN" \
  https://api.onai.academy/api/tripwire/admin/costs
```

---

## 📝 ЗАМЕТКИ

### Что включено в затраты:
- ✅ AI Куратор (curator) - для Tripwire студентов
- ✅ AI Ментор (mentor) - для Tripwire студентов
- ✅ Модели: gpt-4o, gpt-4o-mini
- ❌ Транскрибации видео - cost НЕ хранится в БД (TODO)

### TODO (если понадобится):
- [ ] Добавить tracking затрат на транскрибации (Whisper API: ~$0.006/min)
- [ ] Добавить поле `transcription_cost_usd` в `video_transcriptions`
- [ ] Добавить дневную/месячную агрегацию для быстрого доступа

---

## 📊 IMPACT

**ДО:**
- Показывались затраты ВСЕЙ платформы (~$X.XX)
- Невозможно было отследить реальные затраты Tripwire
- Смешивались затраты разных проектов

**ПОСЛЕ:**
- Показываются затраты ТОЛЬКО Tripwire студентов ($0.3483)
- Детальная разбивка по ассистентам (curator/mentor)
- Детальная разбивка по моделям (gpt-4o)
- Можно отслеживать ROI Tripwire проекта

---

## ✅ РЕЗУЛЬТАТ

**Задача выполнена!** 

API теперь показывает:
- 🎯 Только студентов Tripwire
- 💰 Только затраты Tripwire студентов на AI
- 📊 Детальную аналитику по ассистентам и моделям
- 🎥 Транскрибации только Tripwire видео

Админка Tripwire теперь показывает **точные метрики** только по этому проекту, без примеси данных основной платформы.

