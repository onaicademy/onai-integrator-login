# 🎯 АРХИТЕКТУРА СИСТЕМЫ ЦЕЛЕЙ С AI НАСТАВНИКОМ

## 📊 ОБЗОР СИСТЕМЫ

### Цель:
Полноценная система постановки и отслеживания целей студентов с:
- ✅ Сохранением в базе данных
- 🤖 Анализом продуктивности через AI Наставника
- 🏆 Автоматическим начислением XP и достижений
- 📊 Еженедельной оценкой прогресса

---

## 🗄️ БАЗА ДАННЫХ

### 1️⃣ Таблица: `user_goals`

```sql
CREATE TABLE user_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Основные поля
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  
  -- Дедлайн
  due_date DATE,
  
  -- Отслеживание
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Приоритет (опционально)
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')),
  
  -- Категория (опционально)
  category TEXT,
  
  -- Мета-данные для AI
  ai_analyzed BOOLEAN DEFAULT FALSE,
  ai_feedback JSONB,
  
  -- Индексы
  CONSTRAINT user_goals_pkey PRIMARY KEY (id)
);

-- Индексы для быстрого поиска
CREATE INDEX idx_user_goals_user_id ON user_goals(user_id);
CREATE INDEX idx_user_goals_status ON user_goals(status);
CREATE INDEX idx_user_goals_completed_at ON user_goals(completed_at);
CREATE INDEX idx_user_goals_due_date ON user_goals(due_date);

-- Автоматическое обновление updated_at
CREATE TRIGGER update_user_goals_updated_at
  BEFORE UPDATE ON user_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS политики
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;

-- Студенты видят только свои цели
CREATE POLICY "Users can view own goals"
  ON user_goals FOR SELECT
  USING (auth.uid() = user_id);

-- Студенты могут создавать свои цели
CREATE POLICY "Users can create own goals"
  ON user_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Студенты могут обновлять свои цели
CREATE POLICY "Users can update own goals"
  ON user_goals FOR UPDATE
  USING (auth.uid() = user_id);

-- Студенты могут удалять свои цели
CREATE POLICY "Users can delete own goals"
  ON user_goals FOR DELETE
  USING (auth.uid() = user_id);

-- Админы и кураторы видят все цели
CREATE POLICY "Admins can view all goals"
  ON user_goals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'curator')
    )
  );
```

---

### 2️⃣ Таблица: `goal_achievements` (Достижения за цели)

```sql
CREATE TABLE goal_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Базовая информация
  achievement_key TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  
  -- Условия получения
  condition_type TEXT NOT NULL CHECK (
    condition_type IN (
      'goals_completed',     -- Выполнить N целей
      'goals_weekly',        -- N целей за неделю
      'goals_streak',        -- N дней подряд с целями
      'goals_priority_high', -- Выполнить N приоритетных целей
      'goals_before_deadline' -- Выполнить N целей до дедлайна
    )
  ),
  condition_value INTEGER NOT NULL, -- Сколько нужно
  
  -- Награда
  xp_reward INTEGER NOT NULL DEFAULT 0,
  
  -- Редкость
  rarity TEXT CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')) DEFAULT 'common',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Начальные достижения
INSERT INTO goal_achievements (achievement_key, title, description, icon, condition_type, condition_value, xp_reward, rarity) VALUES
  ('goal_first', 'Первая цель', 'Выполните свою первую цель', '🎯', 'goals_completed', 1, 50, 'common'),
  ('goal_5', 'Целеустремленный', 'Выполните 5 целей', '⭐', 'goals_completed', 5, 100, 'common'),
  ('goal_10', 'Мастер целей', 'Выполните 10 целей', '🏆', 'goals_completed', 10, 200, 'rare'),
  ('goal_25', 'Легенда продуктивности', 'Выполните 25 целей', '👑', 'goals_completed', 25, 500, 'epic'),
  ('goal_weekly_3', 'Продуктивная неделя', 'Выполните 3 цели за неделю', '📅', 'goals_weekly', 3, 150, 'rare'),
  ('goal_streak_7', 'Семидневный марафон', 'Выполняйте цели 7 дней подряд', '🔥', 'goals_streak', 7, 300, 'epic'),
  ('goal_priority_5', 'Приоритетный подход', 'Выполните 5 приоритетных целей', '🚀', 'goals_priority_high', 5, 250, 'rare'),
  ('goal_deadline_10', 'Пунктуальный', 'Выполните 10 целей до дедлайна', '⏰', 'goals_before_deadline', 10, 200, 'rare');
```

---

### 3️⃣ Таблица: `weekly_goal_reports` (Еженедельные отчеты)

```sql
CREATE TABLE weekly_goal_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Период отчета
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  
  -- Статистика за неделю
  goals_created INTEGER NOT NULL DEFAULT 0,
  goals_completed INTEGER NOT NULL DEFAULT 0,
  goals_in_progress INTEGER NOT NULL DEFAULT 0,
  goals_overdue INTEGER NOT NULL DEFAULT 0,
  
  -- Начисленные награды
  xp_earned INTEGER NOT NULL DEFAULT 0,
  achievements_unlocked JSONB DEFAULT '[]'::jsonb,
  
  -- AI анализ
  ai_productivity_score DECIMAL(3,2), -- от 0.00 до 1.00
  ai_feedback TEXT,
  ai_recommendations JSONB,
  
  -- Временные метки
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  
  CONSTRAINT weekly_goal_reports_pkey PRIMARY KEY (id),
  CONSTRAINT unique_user_week UNIQUE (user_id, week_start)
);

-- Индекс для быстрого поиска
CREATE INDEX idx_weekly_reports_user_id ON weekly_goal_reports(user_id);
CREATE INDEX idx_weekly_reports_week ON weekly_goal_reports(week_start, week_end);

-- RLS политики
ALTER TABLE weekly_goal_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reports"
  ON weekly_goal_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all reports"
  ON weekly_goal_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'curator')
    )
  );
```

---

## 🔧 BACKEND API

### Эндпоинты: `/api/goals`

```typescript
// GET /api/goals - Получить все цели пользователя
// GET /api/goals/:id - Получить конкретную цель
// POST /api/goals - Создать новую цель
// PUT /api/goals/:id - Обновить цель
// DELETE /api/goals/:id - Удалить цель
// POST /api/goals/:id/complete - Пометить цель как выполненную
// POST /api/goals/:id/uncomplete - Отменить выполнение цели

// GET /api/goals/statistics - Статистика по целям пользователя
// GET /api/goals/weekly-report - Получить еженедельный отчет
```

---

## 🤖 AI НАСТАВНИК ИНТЕГРАЦИЯ

### 1️⃣ Функция: `analyze_user_goals()` (PostgreSQL)

```sql
CREATE OR REPLACE FUNCTION analyze_user_goals(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_total_goals INTEGER;
  v_completed_goals INTEGER;
  v_in_progress_goals INTEGER;
  v_overdue_goals INTEGER;
  v_completion_rate DECIMAL(3,2);
  v_avg_completion_time INTERVAL;
  v_goals_this_week INTEGER;
  v_productivity_score DECIMAL(3,2);
BEGIN
  -- Подсчет всех целей
  SELECT COUNT(*) INTO v_total_goals
  FROM user_goals
  WHERE user_id = p_user_id;
  
  -- Подсчет выполненных
  SELECT COUNT(*) INTO v_completed_goals
  FROM user_goals
  WHERE user_id = p_user_id AND status = 'done';
  
  -- Подсчет в работе
  SELECT COUNT(*) INTO v_in_progress_goals
  FROM user_goals
  WHERE user_id = p_user_id AND status = 'in_progress';
  
  -- Подсчет просроченных
  SELECT COUNT(*) INTO v_overdue_goals
  FROM user_goals
  WHERE user_id = p_user_id 
    AND status != 'done'
    AND due_date < CURRENT_DATE;
  
  -- Процент выполнения
  IF v_total_goals > 0 THEN
    v_completion_rate := v_completed_goals::DECIMAL / v_total_goals;
  ELSE
    v_completion_rate := 0;
  END IF;
  
  -- Среднее время выполнения
  SELECT AVG(completed_at - created_at) INTO v_avg_completion_time
  FROM user_goals
  WHERE user_id = p_user_id AND status = 'done';
  
  -- Целей за эту неделю
  SELECT COUNT(*) INTO v_goals_this_week
  FROM user_goals
  WHERE user_id = p_user_id
    AND status = 'done'
    AND completed_at >= DATE_TRUNC('week', CURRENT_DATE);
  
  -- Индекс продуктивности (0-1)
  v_productivity_score := LEAST(
    (v_completion_rate * 0.4) +
    (LEAST(v_goals_this_week::DECIMAL / 5, 1) * 0.3) +
    ((1 - (v_overdue_goals::DECIMAL / GREATEST(v_total_goals, 1))) * 0.3),
    1.0
  );
  
  -- Возвращаем JSON
  RETURN jsonb_build_object(
    'total_goals', v_total_goals,
    'completed_goals', v_completed_goals,
    'in_progress_goals', v_in_progress_goals,
    'overdue_goals', v_overdue_goals,
    'completion_rate', v_completion_rate,
    'avg_completion_time', EXTRACT(EPOCH FROM v_avg_completion_time),
    'goals_this_week', v_goals_this_week,
    'productivity_score', v_productivity_score
  );
END;
$$ LANGUAGE plpgsql;
```

---

### 2️⃣ Триггер: Автоматическое начисление XP при выполнении цели

```sql
CREATE OR REPLACE FUNCTION award_xp_for_goal_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_xp_amount INTEGER;
  v_is_before_deadline BOOLEAN;
  v_is_high_priority BOOLEAN;
BEGIN
  -- Только при изменении статуса на 'done'
  IF NEW.status = 'done' AND (OLD.status IS NULL OR OLD.status != 'done') THEN
    
    -- Базовый XP за выполнение цели
    v_xp_amount := 20;
    
    -- Бонус за высокий приоритет
    IF NEW.priority = 'high' THEN
      v_xp_amount := v_xp_amount + 10;
      v_is_high_priority := TRUE;
    ELSE
      v_is_high_priority := FALSE;
    END IF;
    
    -- Бонус за выполнение до дедлайна
    IF NEW.due_date IS NOT NULL AND NEW.completed_at <= NEW.due_date THEN
      v_xp_amount := v_xp_amount + 15;
      v_is_before_deadline := TRUE;
    ELSE
      v_is_before_deadline := FALSE;
    END IF;
    
    -- Начисляем XP в профиль
    UPDATE profiles
    SET 
      xp = xp + v_xp_amount,
      level = FLOOR((xp + v_xp_amount) / 100) + 1 -- Каждые 100 XP = новый уровень
    WHERE id = NEW.user_id;
    
    -- Логируем в user_statistics
    UPDATE user_statistics
    SET total_xp = total_xp + v_xp_amount
    WHERE user_id = NEW.user_id;
    
    -- Проверяем достижения
    PERFORM check_goal_achievements(NEW.user_id);
    
    RAISE NOTICE 'XP начислен: +% для пользователя %', v_xp_amount, NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_award_xp_for_goal
  AFTER UPDATE ON user_goals
  FOR EACH ROW
  EXECUTE FUNCTION award_xp_for_goal_completion();
```

---

### 3️⃣ Функция: Проверка и разблокировка достижений за цели

```sql
CREATE OR REPLACE FUNCTION check_goal_achievements(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_achievement RECORD;
  v_user_count INTEGER;
  v_unlocked BOOLEAN;
BEGIN
  FOR v_achievement IN 
    SELECT * FROM goal_achievements
  LOOP
    -- Проверяем, не разблокировано ли уже
    SELECT EXISTS (
      SELECT 1 FROM user_achievements
      WHERE user_id = p_user_id AND achievement_id = v_achievement.achievement_key
    ) INTO v_unlocked;
    
    IF v_unlocked THEN
      CONTINUE;
    END IF;
    
    -- Проверяем условие
    CASE v_achievement.condition_type
      WHEN 'goals_completed' THEN
        SELECT COUNT(*) INTO v_user_count
        FROM user_goals
        WHERE user_id = p_user_id AND status = 'done';
        
      WHEN 'goals_weekly' THEN
        SELECT COUNT(*) INTO v_user_count
        FROM user_goals
        WHERE user_id = p_user_id 
          AND status = 'done'
          AND completed_at >= DATE_TRUNC('week', CURRENT_DATE);
          
      WHEN 'goals_priority_high' THEN
        SELECT COUNT(*) INTO v_user_count
        FROM user_goals
        WHERE user_id = p_user_id 
          AND status = 'done'
          AND priority = 'high';
          
      WHEN 'goals_before_deadline' THEN
        SELECT COUNT(*) INTO v_user_count
        FROM user_goals
        WHERE user_id = p_user_id 
          AND status = 'done'
          AND due_date IS NOT NULL
          AND completed_at <= due_date;
          
      ELSE
        CONTINUE;
    END CASE;
    
    -- Если условие выполнено - разблокируем достижение
    IF v_user_count >= v_achievement.condition_value THEN
      INSERT INTO user_achievements (
        user_id, achievement_id, is_completed, current_value, required_value
      ) VALUES (
        p_user_id, v_achievement.achievement_key, TRUE, v_user_count, v_achievement.condition_value
      )
      ON CONFLICT (user_id, achievement_id) DO UPDATE
      SET is_completed = TRUE, unlocked_at = NOW();
      
      -- Начисляем XP за достижение
      UPDATE profiles
      SET xp = xp + v_achievement.xp_reward
      WHERE id = p_user_id;
      
      RAISE NOTICE 'Достижение разблокировано: % для пользователя %', v_achievement.title, p_user_id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

---

### 4️⃣ Еженедельная функция: Генерация отчетов и начисление XP

```sql
CREATE OR REPLACE FUNCTION generate_weekly_goal_reports()
RETURNS VOID AS $$
DECLARE
  v_user RECORD;
  v_week_start DATE;
  v_week_end DATE;
  v_stats JSONB;
  v_xp_bonus INTEGER;
  v_productivity_score DECIMAL(3,2);
BEGIN
  v_week_start := DATE_TRUNC('week', CURRENT_DATE - INTERVAL '1 week');
  v_week_end := v_week_start + INTERVAL '6 days';
  
  -- Для каждого активного пользователя
  FOR v_user IN 
    SELECT id FROM profiles WHERE is_active = TRUE
  LOOP
    -- Получаем статистику целей
    v_stats := analyze_user_goals(v_user.id);
    
    -- Извлекаем индекс продуктивности
    v_productivity_score := (v_stats->>'productivity_score')::DECIMAL;
    
    -- Рассчитываем бонус XP (0-100 XP в зависимости от продуктивности)
    v_xp_bonus := FLOOR(v_productivity_score * 100);
    
    -- Создаем отчет
    INSERT INTO weekly_goal_reports (
      user_id, week_start, week_end,
      goals_created, goals_completed, goals_in_progress, goals_overdue,
      xp_earned, ai_productivity_score, processed_at
    ) VALUES (
      v_user.id, v_week_start, v_week_end,
      (v_stats->>'total_goals')::INTEGER,
      (v_stats->>'completed_goals')::INTEGER,
      (v_stats->>'in_progress_goals')::INTEGER,
      (v_stats->>'overdue_goals')::INTEGER,
      v_xp_bonus,
      v_productivity_score,
      NOW()
    )
    ON CONFLICT (user_id, week_start) DO UPDATE
    SET 
      xp_earned = v_xp_bonus,
      ai_productivity_score = v_productivity_score,
      processed_at = NOW();
    
    -- Начисляем бонусный XP
    IF v_xp_bonus > 0 THEN
      UPDATE profiles
      SET xp = xp + v_xp_bonus
      WHERE id = v_user.id;
      
      RAISE NOTICE 'Еженедельный бонус +% XP для пользователя %', v_xp_bonus, v_user.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Можно настроить CRON задачу для еженедельного запуска
-- (через pg_cron или внешний планировщик)
```

---

## 📱 FRONTEND

### Изменения в `GoalsTodoSystem.tsx`:

1. ✅ **Сохранение в БД:** При создании/обновлении/удалении → API запрос
2. ✅ **Загрузка из БД:** При монтировании компонента
3. ✅ **Галочка для выполнения:** Клик → статус 'done' → автоматическое начисление XP
4. ✅ **Визуальная обратная связь:** Анимация "+20 XP" при выполнении

---

## 🔄 FLOW ДИАГРАММА

```
Студент создает цель
        ↓
Сохраняется в user_goals (БД)
        ↓
Студент выполняет цель (галочка)
        ↓
Status = 'done', completed_at = NOW()
        ↓
Триггер срабатывает:
  ├─→ Начисляется XP (+20 базовых)
  ├─→ Бонус за приоритет (+10 если high)
  ├─→ Бонус за дедлайн (+15 если вовремя)
  └─→ Проверка достижений
        ↓
AI Наставник анализирует:
  ├─→ Индекс продуктивности (0-1)
  ├─→ Процент выполнения
  ├─→ Среднее время выполнения
  └─→ Рекомендации
        ↓
Каждую неделю:
  ├─→ Генерация отчета
  ├─→ Начисление бонусного XP (0-100)
  └─→ Разблокировка достижений
```

---

## 🎯 ПЛАН РЕАЛИЗАЦИИ (ЭТАПЫ)

### ЭТАП 1: База данных ✅
- Создать таблицу `user_goals`
- Создать таблицу `goal_achievements`
- Создать таблицу `weekly_goal_reports`
- Настроить RLS политики
- Создать индексы

### ЭТАП 2: Backend API ✅
- CRUD эндпоинты для целей
- Эндпоинт для выполнения цели
- Эндпоинт для статистики
- Эндпоинт для еженедельного отчета

### ЭТАП 3: Триггеры и функции ✅
- Функция `analyze_user_goals()`
- Триггер `award_xp_for_goal_completion()`
- Функция `check_goal_achievements()`
- Функция `generate_weekly_goal_reports()`

### ЭТАП 4: Frontend интеграция ✅
- API клиент для целей
- Загрузка целей из БД
- Сохранение целей в БД
- Галочка для выполнения
- Анимация "+XP"

### ЭТАП 5: AI Наставник ✅
- Контекст целей в `get_student_context_for_ai()`
- Рекомендации на основе продуктивности
- Уведомления о просроченных целях

### ЭТАП 6: Тестирование ✅
- Создание целей
- Выполнение целей
- Начисление XP
- Разблокировка достижений
- Еженедельный отчет

---

## 📊 ОЖИДАЕМЫЙ РЕЗУЛЬТАТ

- ✅ Студенты создают цели на платформе
- ✅ Цели сохраняются в БД
- ✅ При выполнении → автоматический XP (+20-45)
- ✅ AI Наставник анализирует продуктивность
- ✅ Раз в неделю → отчет + бонус XP (0-100)
- ✅ Разблокировка 8 новых достижений
- ✅ Мотивация студентов планировать и выполнять задачи

---

## 🚀 НАЧИНАЕМ РЕАЛИЗАЦИЮ!

**Порядок работы:**
1. SQL миграция (БД таблицы)
2. Backend API (CRUD + логика)
3. Frontend интеграция (UI → БД)
4. AI Наставник (анализ + рекомендации)
5. Тестирование

**Поехали! 🎯**



















