# 🧪 ПЛАН ТЕСТИРОВАНИЯ: Видео-трекинг и AI Mentor

## 📋 Цель тестирования
Проверить что видео-трекинг **полностью работает** и AI Mentor **автоматически создает задачи** при проблемах студента.

---

## ✅ ЧТО МЫ ВНЕДРИЛИ

### Frontend (`src/pages/Lesson.tsx`)
- ✅ `seeksCount` - счетчик перемоток видео
- ✅ `pausesCount` - счетчик пауз
- ✅ `maxSecondReached` - максимальная позиция просмотра
- ✅ Отправка метрик в Backend при закрытии страницы
- ✅ Отправка метрик через `navigator.sendBeacon`

### Backend (`backend/src/routes/analytics.ts`)
- ✅ Endpoint: `POST /api/analytics/video-session/end`
- ✅ Принимает: `seeks_count`, `pauses_count`, `max_second_reached`
- ✅ Сохраняет в `video_watch_sessions`

### Database (Supabase)
- ✅ Триггер `on_video_struggle` → срабатывает при INSERT/UPDATE в `video_watch_sessions`
- ✅ Функция `detect_video_struggle()` → проверяет `seeks_count >= 5`
- ✅ Функция `create_mentor_task_from_video_struggle()` → создает задачу в `ai_mentor_tasks`

---

## 🎯 ТЕСТ 1: Базовый видео-трекинг (15 минут)

### Шаги:
1. **Запустить localhost:**
   ```bash
   npm run dev
   ```

2. **Открыть браузер:**
   - URL: `http://localhost:8080`
   - Login: `saint@onaiacademy.kz`

3. **Перейти на урок с видео:**
   - Открыть любой курс → модуль → урок с видео
   - Например: `/course/1/module/1/lesson/1`

4. **Действия с видео (ВАЖНО!):**
   - ▶️ Нажать Play (начать просмотр)
   - ⏸️ Нажать Pause (пауза) - **3 раза**
   - ⏩ Перемотать вперед (drag progress bar) - **6 раз**
   - ⏪ Перемотать назад - **2 раза**
   - Посмотреть минимум **30 секунд**

5. **Закрыть страницу** (или перейти на другую страницу)

6. **Проверить в консоли браузера:**
   ```
   📡 sendBeacon: Метрики отправлены { seeksCount: 8, pausesCount: 3 }
   ```

### ✅ Ожидаемый результат:
- В консоли видно отправку метрик
- Нет ошибок в консоли

---

## 🎯 ТЕСТ 2: Проверка данных в БД (5 минут)

### Выполнить SQL запрос в Supabase:

```sql
-- Смотрим последнюю сессию просмотра
SELECT 
  vws.id,
  vws.user_id,
  vws.lesson_id,
  vws.seeks_count,      -- ✅ Должно быть 8
  vws.pauses_count,     -- ✅ Должно быть 3
  vws.max_second_reached,
  vws.duration_seconds,
  vws.playback_speed,
  vws.created_at,
  l.title as lesson_title
FROM video_watch_sessions vws
JOIN lessons l ON l.id = vws.lesson_id
ORDER BY vws.created_at DESC
LIMIT 1;
```

### ✅ Ожидаемый результат:
- **1 новая запись** в таблице
- `seeks_count` = **8** (6 вперед + 2 назад)
- `pauses_count` = **3**
- `max_second_reached` > 0
- `duration_seconds` > 0

### ❌ Если НЕ работает:
- Проверить Backend логи (PM2 или terminal)
- Проверить Network tab в браузере (есть ли POST запрос?)
- Проверить CORS настройки

---

## 🎯 ТЕСТ 3: AI Mentor - Автоматическое создание задач (5 минут)

### Условие срабатывания триггера:
**`seeks_count >= 5`** → AI Mentor создает задачу "Студент испытывает трудности"

### Выполнить SQL запрос:

```sql
-- Проверяем создание AI Mentor задачи
SELECT 
  amt.id,
  amt.task_type,
  amt.description,
  amt.priority,
  amt.status,
  amt.context_data,
  amt.created_at,
  u.email as student_email
FROM ai_mentor_tasks amt
JOIN users u ON u.id = amt.student_id
WHERE amt.triggered_by = 'video_struggle'
ORDER BY amt.created_at DESC
LIMIT 1;
```

### ✅ Ожидаемый результат:
```json
{
  "task_type": "offer_help",
  "description": "Студент пересмотрел урок \"Название урока\" 8 раз(а). Возможно, нужна помощь.",
  "priority": "high",  // потому что seeks_count >= 5
  "status": "pending",
  "context_data": {
    "lesson_id": 1,
    "lesson_title": "...",
    "rewatch_count": 8,
    "struggling_at_second": 30
  }
}
```

### ❌ Если задача НЕ создана:
1. Проверить что `seeks_count >= 5` в `video_watch_sessions`
2. Проверить триггер:
   ```sql
   SELECT trigger_name, event_manipulation, action_statement
   FROM information_schema.triggers
   WHERE event_object_table = 'video_watch_sessions'
   AND trigger_name = 'on_video_struggle';
   ```
3. Проверить функцию `detect_video_struggle()` существует

---

## 🎯 ТЕСТ 4: Логирование вопросов (5 минут)

### Шаги:
1. Открыть `/neurohub`
2. Написать в чат: **"Как настроить вебхук в n8n?"**
3. Дождаться ответа AI
4. Проверить БД

### SQL запрос:
```sql
SELECT 
  sql.id,
  sql.question_text,
  LEFT(sql.ai_response, 100) as ai_response_preview,
  sql.ai_model_used,
  sql.response_time_ms,
  sql.created_at,
  u.email
FROM student_questions_log sql
JOIN users u ON u.id = sql.user_id
ORDER BY sql.created_at DESC
LIMIT 1;
```

### ✅ Ожидаемый результат:
- Новая запись с вопросом и ответом
- `ai_model_used` = "gpt-4o"
- `response_time_ms` > 0

---

## 🎯 ТЕСТ 5: Проверка RLS безопасности (5 минут)

### SQL запросы:

```sql
-- 1. Проверяем что RLS включен
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'student_profiles', 'user_statistics')
ORDER BY tablename;
```

**Ожидаемый результат:** Все 3 таблицы с `rls_enabled = true`

```sql
-- 2. Проверяем политики для user_statistics
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'user_statistics'
ORDER BY policyname;
```

**Ожидаемый результат:** Минимум 4-5 политик

---

## 📊 ИТОГОВАЯ CHECKLIST

### Тестирование:
- [ ] Тест 1: Видео-трекинг (seeks, pauses) - данные в консоли
- [ ] Тест 2: Данные в `video_watch_sessions` - проверка БД
- [ ] Тест 3: AI Mentor задача создана автоматически
- [ ] Тест 4: Вопросы логируются в `student_questions_log`
- [ ] Тест 5: RLS включен на всех критичных таблицах

### Функционал:
- [x] Видео-трекинг: seeks_count ✅
- [x] Видео-трекинг: pauses_count ✅
- [x] Видео-трекинг: max_second_reached ✅
- [x] Скорость видео работает ✅
- [ ] Качество видео (требует разные URL от Cloudflare)

---

## 🚀 СЛЕДУЮЩИЕ ШАГИ

### После успешного тестирования:
1. ✅ Убедиться что всё работает
2. 📝 Создать отчет о проделанной работе
3. 🎤 (Опционально) Добавить голосовой ввод
4. 🔐 Включить leaked password protection в Supabase Dashboard

### Если найдены проблемы:
1. Проверить Backend логи
2. Проверить Network tab в браузере
3. Проверить триггеры в БД
4. Исправить и повторить тесты

---

## 🎬 ГОТОВ К ТЕСТИРОВАНИЮ!

Запускай localhost и выполняй тесты по порядку! 💪


