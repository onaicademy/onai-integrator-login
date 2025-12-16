# ⚡ ПРИМЕНИТЬ SQL МИГРАЦИЮ СЕЙЧАС (2 минуты)

## ✅ Проверка показала:

Все таблицы для лендинга УЖЕ в правильной БД (Landing Supabase):

- ✅ **landing_leads** - 157 лидов
- ✅ **journey_stages** - 179 этапов
- ✅ **scheduled_notifications** - 77 уведомлений
- ❌ **telegram_groups** - НУЖНО СОЗДАТЬ (это последний шаг!)

## 🚀 ЧТО ДЕЛАТЬ:

### Шаг 1: Открой Supabase SQL Editor

🔗 **Прямая ссылка:** https://supabase.com/dashboard/project/xikaiavwqinamgolmtcy/sql/new

### Шаг 2: Скопируй SQL (уже готов!)

Открой файл в корне проекта:
```
QUICK_APPLY_THIS.sql
```

Или скопируй отсюда:

```sql
-- ============================================
-- 📱 TELEGRAM GROUPS TABLE
-- Хранит активные группы для отправки уведомлений
-- ============================================

CREATE TABLE IF NOT EXISTS public.telegram_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id TEXT NOT NULL UNIQUE,
  chat_title TEXT,
  group_type TEXT NOT NULL DEFAULT 'leads', -- 'leads', 'admin', 'notifications'
  is_active BOOLEAN DEFAULT true,
  activated_by TEXT, -- Telegram username кто активировал
  activated_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_telegram_groups_chat_id ON public.telegram_groups(chat_id);
CREATE INDEX IF NOT EXISTS idx_telegram_groups_type_active ON public.telegram_groups(group_type, is_active) WHERE is_active = true;

-- Комментарии
COMMENT ON TABLE public.telegram_groups IS 'Хранит активные Telegram группы для уведомлений';
COMMENT ON COLUMN public.telegram_groups.group_type IS 'Тип группы: leads (лиды), admin (админ), notifications (уведомления)';
COMMENT ON COLUMN public.telegram_groups.is_active IS 'Активна ли группа для отправки сообщений';

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION update_telegram_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автообновления updated_at
DROP TRIGGER IF EXISTS trigger_telegram_groups_updated_at ON public.telegram_groups;
CREATE TRIGGER trigger_telegram_groups_updated_at
  BEFORE UPDATE ON public.telegram_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_telegram_groups_updated_at();

-- RLS политики (отключены для service role)
ALTER TABLE public.telegram_groups ENABLE ROW LEVEL SECURITY;

-- Service role имеет полный доступ
CREATE POLICY "Service role has full access to telegram_groups"
  ON public.telegram_groups
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.telegram_groups TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;
```

### Шаг 3: Выполни SQL

1. Вставь SQL в редактор Supabase
2. Нажми **Run** (или Ctrl+Enter)
3. Дождись "Success" сообщения

### Шаг 4: Проверь что таблица создалась

Выполни в SQL Editor:
```sql
SELECT * FROM telegram_groups LIMIT 10;
```

Должна вернуться пустая таблица (это нормально).

## ✅ Готово!

Теперь:

1. **Перезапусти backend:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Активируй группу в Telegram:**
   - Открой группу "Лиды Трипваер"
   - Отправь: `2134`
   - Бот ответит подтверждением ✅

3. **Проверь что работает:**
   ```bash
   curl -X POST http://localhost:3000/api/telegram-leads/test
   ```

**Все лиды теперь будут приходить в твою группу! 🎉**

---

## 📊 Что в Landing БД:

После применения миграции в Landing Supabase будут все нужные таблицы:

| Таблица | Описание | Записей |
|---------|----------|---------|
| `landing_leads` | Основные лиды с лендингов | 157 |
| `journey_stages` | Путь пользователя (этапы воронки) | 179 |
| `scheduled_notifications` | Отложенные email/sms уведомления | 77 |
| `telegram_groups` | Активные группы для Telegram уведомлений | 0 → станет 1+ |

**Все в одной БД (Landing Supabase) как и должно быть!** ✅

---

**Вопросы?** Читай `🚀_СТАРТ_ЗДЕСЬ.md` для полной инструкции.
