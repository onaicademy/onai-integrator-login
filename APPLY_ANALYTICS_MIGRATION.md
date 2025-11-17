# 🎯 Как применить миграцию аналитики

## 📋 ШАГ 1: Откройте файл миграции

Файл находится здесь:
```
supabase/migrations/20251116_analytics_system_FIXED.sql
```

## 📋 ШАГ 2: Скопируйте SQL код

1. Откройте файл `20251116_analytics_system_FIXED.sql`
2. Выделите **весь** SQL код (Ctrl+A)
3. Скопируйте (Ctrl+C)

## 📋 ШАГ 3: Откройте Supabase Dashboard

1. Перейдите на https://supabase.com/dashboard
2. Выберите проект: **arqhkacellqbhjhbebfh** (onAI Academy)
3. В левом меню найдите **"SQL Editor"**
4. Нажмите кнопку **"New Query"**

## 📋 ШАГ 4: Вставьте и выполните SQL

1. Вставьте скопированный SQL код в редактор (Ctrl+V)
2. Нажмите кнопку **"Run"** (или Ctrl+Enter)
3. Дождитесь завершения выполнения

## ✅ ЧТО СОЗДАСТСЯ:

### 📊 Таблицы (5 штук):

1. **`video_events`** - детальные события видео
   - play, pause, seek, speed_change, complete
   - video_timestamp, playback_speed, quality
   
2. **`video_heatmap`** - тепловая карта просмотров
   - Сегменты по 5 секунд
   - Статистика: views, pauses, seeks
   - Индикаторы: hot_zone, skip_zone
   
3. **`learning_sessions`** - сессии обучения
   - Время начала/конца
   - Lessons viewed/completed
   - Engagement score, focus score
   
4. **`navigation_events`** - навигация по платформе
   - page_view, course_open, lesson_open
   - search queries
   - Time spent на странице
   
5. **`interaction_events`** - взаимодействия с UI
   - button_click, link_click, file_download
   - Element details (id, class, text)
   - Metadata (JSONB)

### 📈 VIEW для AI-агентов:

**`student_analytics_summary`** - сводная аналитика:
- Total sessions, learning time
- Lessons started/completed
- Videos watched
- AI messages sent
- Churn risk level

### 🔧 Функции:

**`get_student_detailed_analytics(user_id, days_back)`**
- Возвращает JSONB с детальной аналитикой
- Sessions, video stats, navigation, engagement
- Используется AI-агентами для анализа

### 🔒 RLS Политики:

- Студенты видят только свои данные
- Студенты могут создавать свои события
- Админы видят всё
- video_heatmap доступен всем (публичная статистика)

### ⚙️ Триггеры:

- Автоматический расчёт `duration_seconds` для сессий

---

## ✅ ИСПРАВЛЕНИЕ В ЭТОЙ ВЕРСИИ:

❌ **Было:** `lesson_id UUID`  
✅ **Стало:** `lesson_id INTEGER`

Это соответствует текущей структуре таблицы `lessons`:
```sql
CREATE TABLE lessons (
  id INTEGER PRIMARY KEY, -- ✅ INTEGER, не UUID!
  ...
);
```

---

## 🧪 ПРОВЕРКА ПОСЛЕ ПРИМЕНЕНИЯ:

Выполните этот SQL в Supabase SQL Editor:

```sql
-- Проверяем что все таблицы созданы
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'video_events',
    'video_heatmap',
    'learning_sessions',
    'navigation_events',
    'interaction_events'
  )
ORDER BY table_name;

-- Проверяем VIEW
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name = 'student_analytics_summary';

-- Проверяем функцию
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'get_student_detailed_analytics';

-- Проверяем типы lesson_id (должно быть INTEGER)
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'lesson_id'
  AND table_name IN ('video_events', 'video_heatmap', 'navigation_events', 'interaction_events')
ORDER BY table_name;
```

**Ожидаемый результат:**
- 5 таблиц найдено ✅
- 1 VIEW найден ✅
- 1 функция найдена ✅
- Все `lesson_id` имеют тип `integer` ✅

---

## 🚀 СЛЕДУЮЩИЙ ШАГ:

После применения миграции можно приступать к:
1. **Frontend интеграции** - отправка событий на Backend
2. **Backend API** - эндпоинты для сохранения аналитики
3. **AI-агенты** - использование `student_analytics_summary` VIEW
4. **Дашборд аналитики** - визуализация данных для админов

---

## ❓ ВОЗМОЖНЫЕ ОШИБКИ:

### Ошибка: `relation "lessons" does not exist`
**Решение:** Убедитесь, что таблица `lessons` существует:
```sql
SELECT * FROM information_schema.tables WHERE table_name = 'lessons';
```

### Ошибка: `policy already exists`
**Решение:** Миграция уже применена. Проверьте таблицы:
```sql
SELECT * FROM video_events LIMIT 1;
```

### Ошибка: `foreign key constraint fails`
**Решение:** Проверьте, что все связанные таблицы существуют:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('lessons', 'courses', 'modules', 'video_content')
ORDER BY table_name;
```

---

**Готово! Теперь применяй миграцию в Supabase Dashboard! 🚀**

