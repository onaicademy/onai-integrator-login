# 🔄 ПЕРЕЗАПУСК SUPABASE POSTGREST

## ❌ ПРОБЛЕМА:
```
Could not find the 'playback_rate' column of 'video_analytics' in the schema cache
```

Это означает что Supabase PostgREST не обновил schema cache после создания новой таблицы.

---

## ✅ РЕШЕНИЕ 1 (БЫСТРОЕ) - Перезапустить PostgREST:

### Шаг 1: Открой Supabase Dashboard
```
https://supabase.com/dashboard/project/arqhkacellqbhjhbebfh/settings/general
```

### Шаг 2: Найди секцию "Configuration"
- Прокрути вниз до "Connection Pooling" или "General Settings"

### Шаг 3: Нажми "Restart Project"
- Это перезапустит PostgREST и обновит schema cache
- Займет ~30-60 секунд

---

## ✅ РЕШЕНИЕ 2 (АЛЬТЕРНАТИВА) - Вызвать NOTIFY:

Выполни в Supabase SQL Editor:

```sql
-- Это заставит PostgREST обновить schema cache
NOTIFY pgrst, 'reload schema';
```

---

## ✅ РЕШЕНИЕ 3 (ЕСЛИ НЕ РАБОТАЕТ) - Проверить таблицу:

Выполни в Supabase SQL Editor:

```sql
-- Проверить что таблица существует
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'video_analytics';

-- Проверить все колонки
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'video_analytics'
ORDER BY ordinal_position;
```

**Должно вернуть:**
```
id               | bigint
user_id          | uuid
lesson_id        | bigint
session_id       | text
event_type       | text
position_seconds | numeric
playback_rate    | numeric  ← ВАЖНО!
progress_percent | numeric
created_at       | timestamp with time zone
```

Если **playback_rate** отсутствует - значит SQL не выполнился полностью!

---

## 🔥 ПОСЛЕ ПЕРЕЗАПУСКА:

Проверь что все работает:

```powershell
# Тестовый запрос
$body = @{
    lesson_id = 1
    session_id = "test-123"
    event_type = "play"
    position_seconds = 0
} | ConvertTo-Json

Invoke-RestMethod `
    -Uri "http://localhost:3000/api/analytics/video-event" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"
```

**Ожидается:**
```json
{
  "success": true,
  "event": {
    "id": 1,
    "lesson_id": 1,
    "session_id": "test-123",
    "event_type": "play",
    ...
  }
}
```

---

## 📤 НАПИШИ МНЕ:

После перезапуска Supabase:

```
✅ Supabase перезапущен: YES/NO
✅ Analytics POST работает: YES/NO
✅ Frontend работает: http://localhost:8080
✅ Backend работает: http://localhost:3000
```

