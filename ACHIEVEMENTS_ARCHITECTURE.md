# 🏆 АРХИТЕКТУРА СИСТЕМЫ ДОСТИЖЕНИЙ

## 📋 ОПИСАНИЕ СИСТЕМЫ

**Что это:** Автоматическая система отслеживания прогресса пользователей и начисления достижений (badges) за выполнение определенных действий на платформе.

**Зачем нужно:** Мотивировать студентов к регулярному обучению, визуализировать их прогресс и создавать игровой элемент (геймификация).

**Как влияет на прогресс:** Каждое достижение дает XP (опыт), повышает уровень пользователя и открывает доступ к новым возможностям платформы.

---

## 🗂️ СТРУКТУРА БАЗЫ ДАННЫХ

### 1. `achievements` - Справочник всех достижений
**Что это:** Мастер-таблица со всеми возможными достижениями платформы (69 штук).  
**Зачем:** Централизованное хранение требований для получения каждого достижения.  
**Влияние:** Определяет какие награды получит пользователь за свои действия.

```sql
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,                    -- Название достижения
  description TEXT NOT NULL,              -- Описание что нужно сделать
  icon TEXT NOT NULL,                     -- Эмодзи иконка
  rarity TEXT CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  xp_requirement INTEGER DEFAULT 0,       -- Сколько XP нужно для получения
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE achievements IS 'Справочник всех достижений платформы. Это шаблоны наград, которые пользователи могут разблокировать.';
COMMENT ON COLUMN achievements.rarity IS 'Редкость достижения влияет на количество получаемого XP и визуальное оформление.';
```

### 2. `user_achievements` - Прогресс пользователей по достижениям
**Что это:** Таблица связи между пользователями и достижениями с отслеживанием прогресса.  
**Зачем:** Хранить индивидуальный прогресс каждого студента по каждому достижению.  
**Влияние:** Показывает сколько осталось до получения награды и когда она была разблокирована.

```sql
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,           -- ID из конфига (achievements-config.ts)
  current_value INTEGER DEFAULT 0,        -- Текущий прогресс (например 5 уроков из 10)
  required_value INTEGER NOT NULL,        -- Требуемое значение для завершения
  is_completed BOOLEAN DEFAULT FALSE,     -- Достижение получено?
  started_at TIMESTAMPTZ DEFAULT NOW(),   -- Когда начали прогресс
  completed_at TIMESTAMPTZ,               -- Когда завершили
  unlocked_at TIMESTAMPTZ,                -- Когда разблокировали (может быть позже completed_at)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, achievement_id)         -- Одно достижение один раз
);

CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_completed ON user_achievements(user_id, is_completed);

COMMENT ON TABLE user_achievements IS 'Прогресс каждого пользователя по достижениям. Автоматически обновляется через триггеры при действиях пользователя.';
COMMENT ON COLUMN user_achievements.current_value IS 'Текущий прогресс. Например: уроков завершено, дней streak, заработано XP.';
COMMENT ON COLUMN user_achievements.is_completed IS 'TRUE когда current_value >= required_value. Триггер автоматически обновляет это поле.';
```

### 3. `achievement_history` - История получения достижений
**Что это:** Журнал всех полученных достижений с датами и заработанным XP.  
**Зачем:** Для отображения timeline прогресса и аналитики по достижениям.  
**Влияние:** Не влияет на игровую механику, только на статистику и историю.

```sql
CREATE TABLE achievement_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  xp_earned INTEGER NOT NULL,             -- Сколько XP получил пользователь
  notification_seen BOOLEAN DEFAULT FALSE, -- Показали ли уведомление?
  unlocked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_achievement_history_user ON achievement_history(user_id, unlocked_at DESC);

COMMENT ON TABLE achievement_history IS 'Хронология получения достижений. Используется для уведомлений и отображения истории прогресса.';
COMMENT ON COLUMN achievement_history.notification_seen IS 'FALSE пока пользователь не увидел popup с поздравлением.';
```

### 4. `user_stats` - Агрегированная статистика пользователя
**Что это:** Счетчики всех действий пользователя на платформе (уроки, сообщения, streak).  
**Зачем:** Быстрый доступ к метрикам без сложных JOIN запросов.  
**Влияние:** Эти значения триггерят получение достижений и повышение уровня.

```sql
CREATE TABLE user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  
  -- Обучение
  lessons_completed INTEGER DEFAULT 0,          -- Завершенных уроков
  modules_completed INTEGER DEFAULT 0,          -- Завершенных модулей
  courses_completed INTEGER DEFAULT 0,          -- Завершенных курсов
  total_study_time_minutes INTEGER DEFAULT 0,   -- Общее время обучения
  
  -- Активность
  current_streak INTEGER DEFAULT 0,             -- Текущая серия дней подряд
  longest_streak INTEGER DEFAULT 0,             -- Рекорд серии дней
  last_activity_at TIMESTAMPTZ,                 -- Последняя активность
  
  -- Достижения и прогресс
  achievements_unlocked INTEGER DEFAULT 0,      -- Количество достижений
  messages_sent_to_ai INTEGER DEFAULT 0,        -- Сообщений AI наставнику
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_stats_user_id ON user_stats(user_id);

COMMENT ON TABLE user_stats IS 'Агрегированная статистика действий пользователя. Обновляется через триггеры при каждом событии (завершение урока, отправка сообщения и т.д.).';
COMMENT ON COLUMN user_stats.current_streak IS 'Дней подряд с активностью. Сбрасывается в 0 если пропущен день.';
COMMENT ON COLUMN user_stats.achievements_unlocked IS 'Счетчик разблокированных достижений для быстрого доступа.';
```

### 5. `profiles` - Профиль пользователя с XP и уровнем
**Что это:** Основная таблица профиля с системой уровней и опыта.  
**Зачем:** Хранить игровую прогрессию пользователя (level, XP, streak).  
**Влияние:** Уровень определяет доступ к функциям, XP мотивирует к обучению.

```sql
-- Уже существует, добавляем комментарии
COMMENT ON TABLE profiles IS 'Основной профиль пользователя. Содержит игровую прогрессию (level, XP) и личные данные. Синхронизируется с auth.users.';
COMMENT ON COLUMN profiles.xp IS 'Очки опыта. Начисляются за: завершение уроков (+50), получение достижений (+10-200), выполнение миссий (+50-100).';
COMMENT ON COLUMN profiles.level IS 'Уровень пользователя. Рассчитывается по формуле: level = floor(sqrt(xp / 100)). Каждый уровень открывает новые возможности.';
COMMENT ON COLUMN profiles.current_streak IS 'Серия дней подряд с активностью. Обновляется автоматически каждый день через CRON job.';
```

### 6. `student_progress` - Детальный прогресс по урокам
**Что это:** Прогресс прохождения каждого урока (процент просмотра видео, статус).  
**Зачем:** Отслеживать где пользователь остановился и что уже завершил.  
**Влияние:** При is_completed=true начисляется XP и обновляются счетчики достижений.

```sql
COMMENT ON TABLE student_progress IS 'Детальный прогресс по каждому уроку. Когда is_completed меняется на TRUE, триггер автоматически начисляет XP и обновляет user_stats.lessons_completed.';
COMMENT ON COLUMN student_progress.is_completed IS 'TRUE когда пользователь завершил урок (досмотрел видео >80% или выполнил задание). Триггер начислит XP.';
COMMENT ON COLUMN student_progress.xp_earned IS 'Сколько XP получено за этот урок. По умолчанию 50 XP за урок.';
```

---

## ⚙️ МЕХАНИЗМ РАБОТЫ СИСТЕМЫ

### Как отслеживаются действия пользователей?

#### 1. **Через DATABASE TRIGGERS (PostgreSQL)**
**Где:** Supabase PostgreSQL триггеры  
**Когда:** Автоматически при INSERT/UPDATE в таблицах

```sql
-- Пример: Триггер на завершение урока
CREATE OR REPLACE FUNCTION update_achievements_on_lesson_complete()
RETURNS TRIGGER AS $$
BEGIN
  -- Если урок только что завершен
  IF NEW.is_completed = TRUE AND (OLD.is_completed IS NULL OR OLD.is_completed = FALSE) THEN
    
    -- 1. Начислить XP
    UPDATE profiles 
    SET xp = xp + 50 
    WHERE id = NEW.user_id;
    
    -- 2. Обновить счетчик уроков
    UPDATE user_stats 
    SET 
      lessons_completed = lessons_completed + 1,
      updated_at = NOW()
    WHERE user_id = NEW.user_id;
    
    -- 3. Обновить прогресс достижений "X уроков завершено"
    UPDATE user_achievements
    SET 
      current_value = current_value + 1,
      is_completed = CASE WHEN current_value + 1 >= required_value THEN TRUE ELSE FALSE END,
      completed_at = CASE WHEN current_value + 1 >= required_value THEN NOW() ELSE NULL END,
      updated_at = NOW()
    WHERE user_id = NEW.user_id 
      AND achievement_id IN ('first_step', 'student_5', 'expert_20', 'master_50');
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_lesson_complete
  AFTER UPDATE ON student_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_achievements_on_lesson_complete();
```

#### 2. **Через BACKEND API (Node.js)**
**Где:** `backend/src/services/achievementsService.ts`  
**Когда:** После выполнения сложных действий (например, отправка сообщения AI)

```typescript
// Пример: Обновление достижений после отправки сообщения
export async function trackAIMessage(userId: string) {
  // 1. Обновить статистику
  await supabase
    .from('user_stats')
    .update({ 
      messages_sent_to_ai: supabase.raw('messages_sent_to_ai + 1') 
    })
    .eq('user_id', userId);
  
  // 2. Проверить достижения "X сообщений AI"
  await checkAndUnlockAchievements(userId, 'messages_sent');
}
```

#### 3. **Через SCHEDULED JOBS (CRON)**
**Где:** Supabase pg_cron или backend scheduler  
**Когда:** Ежедневно в 00:00 UTC

```sql
-- Пример: Обновление streak каждый день
CREATE OR REPLACE FUNCTION update_daily_streaks()
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET 
    current_streak = CASE 
      WHEN last_activity_at >= CURRENT_DATE - INTERVAL '1 day' THEN current_streak + 1
      ELSE 0
    END,
    longest_streak = GREATEST(longest_streak, current_streak + 1)
  WHERE last_activity_at >= CURRENT_DATE - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql;
```

---

## 📊 ТИПЫ ДОСТИЖЕНИЙ И ИХ ТРЕБОВАНИЯ

### 1. **Обучение** (14 достижений)
- Первый урок завершен
- 5 уроков завершено
- 10 уроков завершено
- 20 уроков завершено
- 50 уроков завершено
- Первый модуль завершен
- 3 модуля завершено
- Первый курс завершен
- 100% курса завершено
- Просмотр 10 видео
- Просмотр 20 видео
- 10 часов обучения
- 50 часов обучения
- Скорость просмотра 1.5x

### 2. **Постоянство** (8 достижений)
- Streak 3 дня
- Streak 7 дней
- Streak 14 дней
- Streak 30 дней
- Streak 100 дней
- Активность 5 дней в неделю
- Активность каждый день недели
- Ранняя пташка (активность до 9:00)

### 3. **Мастерство** (8 достижений)
- Достиг 5 уровня
- Достиг 10 уровня
- Достиг 25 уровня
- Заработал 1000 XP
- Заработал 5000 XP
- Заработал 10000 XP
- 100% выполнение модуля
- Идеальная оценка за тест

### 4. **Социальные** (8 достижений)
- Первое сообщение AI
- 10 сообщений AI
- 50 сообщений AI
- Поделился 1 уроком
- Поделился 10 уроками
- Пригласил 1 друга
- Пригласил 5 друзей
- Написал отзыв

### 5. **Специальные** (31 достижение)
- Завершил урок в выходные
- Завершил модуль за выходные
- Ночной совенок (активность после 23:00)
- Перфекционист (все задания на 100%)
- Исследователь (изучил доп. материалы)
- Скоростной бегун (урок за 10 мин)
- Марафонец (5 уроков за день)
- И другие...

---

## 🔄 ЖИЗНЕННЫЙ ЦИКЛ ДОСТИЖЕНИЯ

```
1. ИНИЦИАЛИЗАЦИЯ
   ├─ При регистрации пользователя создаются записи в user_achievements
   ├─ current_value = 0, is_completed = FALSE
   └─ Все достижения в статусе "заблокировано"

2. ОТСЛЕЖИВАНИЕ ПРОГРЕССА
   ├─ Пользователь выполняет действие (завершает урок)
   ├─ Триггер обновляет user_stats.lessons_completed++
   ├─ Триггер обновляет user_achievements.current_value++
   └─ Если current_value >= required_value → is_completed = TRUE

3. РАЗБЛОКИРОВКА
   ├─ Триггер добавляет запись в achievement_history
   ├─ Начисляет XP на profiles.xp
   ├─ Обновляет user_stats.achievements_unlocked++
   └─ Frontend показывает popup с поздравлением

4. ОТОБРАЖЕНИЕ
   ├─ Страница /achievements запрашивает user_achievements
   ├─ Показывает прогресс (5/10 уроков)
   ├─ Разблокированные достижения подсвечены
   └─ Заблокированные показаны серыми с прогресс-баром
```

---

## 🛠️ ПЛАН РЕАЛИЗАЦИИ

### Этап 1: Подготовка базы данных ✅
- [x] Таблицы созданы (achievements, user_achievements, achievement_history, user_stats)
- [x] Индексы настроены
- [ ] Добавить комментарии ко всем таблицам и колонкам
- [ ] Создать триггеры для автоматического обновления

### Этап 2: Залить контент (ЖДЕМ)
- [ ] Залить все уроки в lessons
- [ ] Залить все модули в modules  
- [ ] Залить все курсы в courses
- [ ] Определить XP за каждый урок

### Этап 3: Настроить систему достижений (ПОСЛЕ КОНТЕНТА)
- [ ] Создать все 69 достижений в achievements
- [ ] Привязать достижения к реальным урокам/модулям
- [ ] Настроить правила начисления XP
- [ ] Создать триггеры для автоматического отслеживания

### Этап 4: API и Frontend
- [ ] Создать `GET /api/achievements/:userId`
- [ ] Создать `POST /api/achievements/unlock`
- [ ] Убрать MOCK данные из Achievements.tsx
- [ ] Добавить уведомления о новых достижениях

### Этап 5: Тестирование
- [ ] Пройти 1 урок → проверить начисление XP
- [ ] Пройти 5 уроков → проверить разблокировку "Ученик"
- [ ] Проверить streak обновление
- [ ] Проверить уведомления

---

## 📝 SQL СКРИПТЫ ДЛЯ ПОДГОТОВКИ

### 1. Добавить комментарии к существующим таблицам

```sql
-- Выполнить ПОСЛЕ залива всего контента
COMMENT ON TABLE achievements IS 'Справочник всех достижений платформы (badges). Это шаблоны наград.';
COMMENT ON TABLE user_achievements IS 'Прогресс пользователей по достижениям. Обновляется через триггеры.';
COMMENT ON TABLE achievement_history IS 'История получения достижений. Для уведомлений и аналитики.';
COMMENT ON TABLE user_stats IS 'Агрегированная статистика действий пользователя.';
COMMENT ON TABLE profiles IS 'Основной профиль с игровой прогрессией (level, XP, streak).';
COMMENT ON TABLE student_progress IS 'Детальный прогресс по урокам. При завершении начисляется XP.';
COMMENT ON TABLE lessons IS 'Уроки курсов. При is_archived=FALSE урок доступен студентам.';
COMMENT ON TABLE modules IS 'Модули курсов. Группируют уроки по темам.';
COMMENT ON TABLE courses IS 'Курсы платформы. is_published=TRUE для публичного доступа.';
COMMENT ON TABLE goals IS 'Kanban задачи пользователей. С Telegram напоминаниями.';
COMMENT ON TABLE user_missions IS 'Ежедневные миссии для геймификации.';
```

### 2. Создать функцию начисления XP

```sql
CREATE OR REPLACE FUNCTION award_xp_for_lesson(p_user_id UUID, p_lesson_id INTEGER)
RETURNS void AS $$
DECLARE
  v_xp_amount INTEGER := 50; -- По умолчанию 50 XP за урок
BEGIN
  -- Начислить XP в профиль
  UPDATE profiles 
  SET 
    xp = xp + v_xp_amount,
    last_activity_at = NOW()
  WHERE id = p_user_id;
  
  -- Обновить статистику
  UPDATE user_stats
  SET 
    lessons_completed = lessons_completed + 1,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Обновить прогресс достижений (все связанные с уроками)
  UPDATE user_achievements
  SET 
    current_value = (SELECT lessons_completed FROM user_stats WHERE user_id = p_user_id),
    is_completed = current_value >= required_value,
    completed_at = CASE WHEN current_value >= required_value AND completed_at IS NULL THEN NOW() ELSE completed_at END,
    updated_at = NOW()
  WHERE user_id = p_user_id 
    AND achievement_id LIKE '%lesson%';
    
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION award_xp_for_lesson IS 'Начисляет XP за завершение урока и обновляет все связанные достижения.';
```

---

## 📖 ДЛЯ ДРУГИХ АССИСТЕНТОВ

Если ты читаешь это, знай:

1. **НЕ ТРОГАЙ** систему достижений пока не залиты ВСЕ уроки
2. **ИСПОЛЬЗУЙ** функцию `award_xp_for_lesson()` для начисления XP
3. **НЕ МЕНЯЙ** логику в `user_stats` напрямую - только через триггеры
4. **ЧИТАЙ** комментарии в базе данных перед изменениями:
   ```sql
   SELECT 
     col_description('achievements'::regclass, ordinal_position) 
   FROM information_schema.columns 
   WHERE table_name = 'achievements';
   ```

5. **ТЕСТИРУЙ** любые изменения в системе достижений на тестовом пользователе

---

## 🎯 ИТОГО

**Статус системы:** База готова, логика частично реализована, ждем контент  
**Что работает:** Хранение достижений, отображение прогресса на frontend  
**Что НЕ работает:** Автоматическое начисление (нет триггеров), нет API endpoint  
**Когда будет готово:** После залива всех уроков + 2-3 дня на настройку триггеров

**Главное правило:** Система достижений должна работать **ПОЛНОСТЬЮ АВТОМАТИЧЕСКИ**. Пользователь завершает урок → сразу получает XP и прогресс по достижениям. Никакой ручной работы!




