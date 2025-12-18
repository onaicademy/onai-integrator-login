# 🚨 СРОЧНО: ПРИМЕНИТЬ МИГРАЦИЮ!

**Проблема**: `Could not find the table 'public.traffic_targetologist_settings' in the schema cache`

**Решение**: Применить SQL миграцию прямо сейчас! (2 минуты)

---

## 🚀 БЫСТРАЯ ИНСТРУКЦИЯ (2 МИН)

### Шаг 1: Открой Supabase Dashboard (30 сек)

1. Открой: https://supabase.com/dashboard
2. Выбери проект: **Tripwire** (`pjmvxecykysfrzppdcto`)
3. Слева выбери: **SQL Editor**

---

### Шаг 2: Скопируй SQL (10 сек)

Открой файл:
```
/Users/miso/onai-integrator-login/supabase/migrations/20251219_create_targetologist_settings.sql
```

Скопируй **ВЕСЬ** файл (Cmd+A → Cmd+C)

---

### Шаг 3: Вставь и выполни (30 сек)

1. В **SQL Editor** → **New Query**
2. Вставь скопированный SQL (Cmd+V)
3. Нажми **Run** (или Cmd+Enter)
4. ✅ Должно выполниться без ошибок

---

### Шаг 4: Проверка (30 сек)

Выполни в SQL Editor:
```sql
SELECT * FROM traffic_targetologist_settings;
```

Должно вернуть пустой результат (это норм, таблица создана но пуста).

---

## 📋 ПОЛНЫЙ SQL (ДЛЯ КОПИПАСТЫ)

```sql
-- 🎯 TRAFFIC TARGETOLOGIST SETTINGS
-- Настройки таргетологов: FB кабинеты, кампании, UTM метки

-- Таблица настроек таргетолога
CREATE TABLE IF NOT EXISTS traffic_targetologist_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES traffic_users(id) ON DELETE CASCADE,
  
  -- Facebook настройки
  fb_ad_accounts JSONB DEFAULT '[]'::jsonb,
  fb_access_token TEXT,
  
  -- Отслеживаемые кампании
  tracked_campaigns JSONB DEFAULT '[]'::jsonb,
  
  -- UTM настройки
  utm_source TEXT DEFAULT 'facebook',
  utm_medium TEXT DEFAULT 'cpc',
  utm_templates JSONB DEFAULT '{}'::jsonb,
  
  -- Настройки отчетности
  notification_email TEXT,
  notification_telegram BIGINT,
  report_frequency TEXT DEFAULT 'daily' CHECK (report_frequency IN ('daily', 'weekly', 'monthly')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Уникальность по пользователю
  UNIQUE(user_id)
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_targetologist_settings_user_id ON traffic_targetologist_settings(user_id);

-- Функция для автообновления updated_at
CREATE OR REPLACE FUNCTION update_targetologist_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер
DROP TRIGGER IF EXISTS trigger_update_targetologist_settings_updated_at ON traffic_targetologist_settings;
CREATE TRIGGER trigger_update_targetologist_settings_updated_at
  BEFORE UPDATE ON traffic_targetologist_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_targetologist_settings_updated_at();

-- View для удобного просмотра настроек с информацией о юзере
CREATE OR REPLACE VIEW traffic_targetologist_settings_view AS
SELECT
  s.*,
  u.email,
  u.full_name,
  u.team_name,
  jsonb_array_length(s.fb_ad_accounts) as ad_accounts_count,
  jsonb_array_length(s.tracked_campaigns) as campaigns_count
FROM traffic_targetologist_settings s
JOIN traffic_users u ON u.id = s.user_id
ORDER BY s.updated_at DESC;

-- Комментарии
COMMENT ON TABLE traffic_targetologist_settings IS 'Настройки таргетологов: FB кабинеты, кампании, UTM';
COMMENT ON COLUMN traffic_targetologist_settings.user_id IS 'ID таргетолога из traffic_users';
COMMENT ON COLUMN traffic_targetologist_settings.fb_ad_accounts IS 'Массив подключенных FB рекламных кабинетов';
COMMENT ON COLUMN traffic_targetologist_settings.tracked_campaigns IS 'Массив отслеживаемых кампаний';
COMMENT ON COLUMN traffic_targetologist_settings.utm_templates IS 'Шаблоны UTM меток с динамическими переменными';
COMMENT ON COLUMN traffic_targetologist_settings.fb_access_token IS 'Персональный FB токен (если есть)';
```

---

## ✅ ПОСЛЕ ПРИМЕНЕНИЯ

### 1. Обнови страницу (F5)
```
http://localhost:8080/traffic/settings
```

### 2. Должно работать!
- ✅ Нет ошибок 500
- ✅ Страница загружается
- ✅ Можно нажать "Загрузить доступные"

---

## 🔥 АЛЬТЕРНАТИВА: ЧЕРЕЗ psql (ДЛЯ ПРО)

Если есть доступ к psql:

```bash
# Подключись к БД
psql "postgresql://postgres:[password]@db.pjmvxecykysfrzppdcto.supabase.co:5432/postgres"

# Выполни миграцию
\i /Users/miso/onai-integrator-login/supabase/migrations/20251219_create_targetologist_settings.sql

# Проверь
SELECT * FROM traffic_targetologist_settings;
```

---

## ❓ ЕСЛИ ОШИБКИ

### "relation traffic_users does not exist"
→ Нужно сначала создать таблицу `traffic_users`

### "permission denied"
→ Используй admin credentials в Supabase Dashboard

### "syntax error"
→ Проверь что скопировал весь файл целиком

---

**ДЕЛАЙ ПРЯМО СЕЙЧАС, 2 МИНУТЫ!** 🚀

1. Supabase Dashboard → SQL Editor
2. Скопируй SQL выше
3. Вставь → Run
4. ✅ Готово!

---

**Дата**: 19 декабря 2025, 07:45 AM  
**Статус**: ⏳ WAITING FOR MIGRATION
