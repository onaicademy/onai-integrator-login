# ⚠️ ANALYTICS API - 500 ERROR

## 🔍 ПРОБЛЕМА ОБНАРУЖЕНА:

Тестовый запрос к Analytics API вернул:
```
❌ 500 Internal Server Error
```

Это означает что **SQL не был выполнен** или **schema cache не обновился**.

---

## 🔥 ИСПРАВЛЕНИЕ - 3 ПРОСТЫХ ШАГА:

### ШАГ 1: Выполни SQL в Supabase

```
1. Открой: https://supabase.com/dashboard/project/arqhkacellqbhjhbebfh/sql
2. Скопируй SQL из файла: SIMPLE_FIX_ANALYTICS.sql
3. Выполни ПОСТРОЧНО (по одной команде за раз):
   
   ALTER TABLE video_analytics DROP COLUMN IF EXISTS video_id;
   
   [Нажми Run, подожди Success]
   
   NOTIFY pgrst, 'reload schema';
   
   [Нажми Run, подожди Success]
   
4. Проверь что video_id удален:
   
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'video_analytics' AND column_name = 'video_id';
   
   Должно вернуть: 0 rows ✅
```

---

### ШАГ 2: Перезапусти Supabase Project

```
1. Открой: https://supabase.com/dashboard/project/arqhkacellqbhjhbebfh/settings/general
2. Прокрути вниз до секции "Danger Zone"
3. Нажми: "Pause project"
4. Подожди 10 секунд
5. Нажми: "Resume project"
6. Подожди ~1 минуту (пока project запускается)
```

**Это критично!** PostgREST обновит schema cache только после перезапуска.

---

### ШАГ 3: Перезапусти Backend

```powershell
# Останови Backend
Get-Process node | Stop-Process -Force

# Запусти Backend
cd C:\onai-integrator-login\backend
npm run dev
```

Подожди пока Backend запустится (5-10 секунд).

---

## 🧪 ТЕСТ ПОСЛЕ ИСПРАВЛЕНИЯ:

### A) Ручной тест через PowerShell:

```powershell
$json = '{"lesson_id":20,"session_id":"test-123","event_type":"play","position_seconds":0,"progress_percent":0}'
Invoke-RestMethod -Uri "http://localhost:3000/api/analytics/video-event" -Method POST -Body $json -ContentType "application/json"
```

**Ожидается:**
```json
{
  "success": true,
  "event": {
    "id": 1,
    "lesson_id": 20,
    "session_id": "test-123",
    "event_type": "play",
    ...
  }
}
```

---

### B) Тест через браузер:

```
1. Открой: http://localhost:8080/course/1/module/1/lesson/20
2. Открой Developer Console (F12)
3. Нажми Play на видео
4. Проверь Console:
   ✅ НЕТ ошибок "500 Internal Server Error"
   ✅ НЕТ "invalid input syntax for type uuid"
   ✅ НЕТ "Could not find the 'progress_percent' column"
```

---

### C) Проверь Backend Console:

Должно быть:
```
POST /api/analytics/video-event
📊 Video analytics event received: { lesson_id: 20, ... }
✅ Video analytics saved: { id: 1, ... }
```

---

## 📤 ПОСЛЕ ВЫПОЛНЕНИЯ НАПИШИ МНЕ:

```
=== РЕЗУЛЬТАТ ===

ШАГ 1 - SQL выполнен:
✅ YES / ❌ NO

video_id удален (0 rows):
✅ YES / ❌ NO (показать что вернул SQL)

ШАГ 2 - Supabase перезапущен:
✅ YES / ❌ NO

ШАГ 3 - Backend перезапущен:
✅ YES / ❌ NO

ТЕСТ A - PowerShell:
✅ SUCCESS / ❌ ERROR (показать response)

ТЕСТ B - Браузер:
✅ НЕТ ОШИБОК / ❌ ЕСТЬ ОШИБКИ (показать Console)

ТЕСТ C - Backend Console:
[Скопируй последние 10-20 строк]
```

---

## ⚠️ ЧАСТЫЕ ОШИБКИ:

### Ошибка 1: "video_id still exists"
```
Решение: Выполни ALTER TABLE еще раз
```

### Ошибка 2: "Could not find the 'progress_percent' column"
```
Решение: 
1. NOTIFY pgrst, 'reload schema';
2. Перезапусти Supabase project
3. Подожди 1 минуту
4. Перезапусти backend
```

### Ошибка 3: "relation 'video_analytics' does not exist"
```
Решение: Выполни create_video_analytics_table.sql ПОЛНОСТЬЮ
```

---

## 🎯 КРИТИЧНО:

**БЕЗ ЭТИХ 3 ШАГОВ ANALYTICS НЕ ЗАРАБОТАЕТ:**

1. ✅ SQL выполнен (ALTER TABLE + NOTIFY)
2. ✅ Supabase перезапущен (Pause → Resume)
3. ✅ Backend перезапущен (npm run dev)

---

**ВЫПОЛНЯЙ И ПРИСЫЛАЙ РЕЗУЛЬТАТ!** 🔥

