-- ========================================
-- ПРОВЕРКА: Какие колонки в profiles?
-- Цель: Найти лишние колонки для удаления
-- ========================================

-- 1. ВСЕ КОЛОНКИ В PROFILES
SELECT 
    '📊 ВСЕ КОЛОНКИ В PROFILES' as info,
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- ========================================
-- 2. АНАЛИЗ: Какие колонки НУЖНЫ?
-- ========================================

/*
НУЖНЫЕ КОЛОНКИ (НЕ УДАЛЯТЬ):
✅ id (UUID) - связь с auth.users
✅ email (text) - email пользователя
✅ full_name (text) - имя
✅ role (text) - роль (admin, student)
✅ is_active (boolean) - активен ли
✅ created_at (timestamp) - дата регистрации
✅ updated_at (timestamp) - дата обновления
✅ deleted_at (timestamp) - мягкое удаление
✅ account_expires_at (timestamp) - срок действия аккаунта
✅ deactivation_reason (text) - причина деактивации

НОВЫЕ КОЛОНКИ ИГРОФИКАЦИИ (НЕ УДАЛЯТЬ):
✅ level (integer) - уровень студента
✅ xp (integer) - опыт
✅ current_streak (integer) - текущий стрик
✅ longest_streak (integer) - рекорд стрика
✅ last_activity_at (timestamp) - последняя активность
✅ avatar_url (text) - URL аватара

ВОЗМОЖНО ЛИШНИЕ КОЛОНКИ:
❌ Любые колонки связанные с "энергией" (energy, energy_percentage)
❌ Любые колонки связанные с "настроением" (mood, sentiment)
❌ Колонки которые дублируют данные из других таблиц
*/

-- ========================================
-- 3. ПОИСК ЛИШНИХ КОЛОНОК
-- ========================================

-- Ищем колонки содержащие "energy", "mood", "sentiment"
SELECT 
    '⚠️ ПОТЕНЦИАЛЬНО ЛИШНИЕ КОЛОНКИ' as warning,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
AND (
    column_name ILIKE '%energy%' 
    OR column_name ILIKE '%mood%' 
    OR column_name ILIKE '%sentiment%'
    OR column_name ILIKE '%total_watch%' -- дублирует student_progress
)
ORDER BY column_name;

-- ========================================
-- 4. РЕКОМЕНДАЦИИ ПО УДАЛЕНИЮ
-- ========================================

/*
ЕСЛИ НАШЛИСЬ ЛИШНИЕ КОЛОНКИ, УДАЛЯЙ ТАК:

-- Пример:
ALTER TABLE public.profiles DROP COLUMN IF EXISTS energy_percentage;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS total_watch_time_seconds;

ПОЧЕМУ УДАЛЯТЬ:
- energy_percentage → субъективная метрика, удаляем
- total_watch_time_seconds → дублирует SUM(watch_time_seconds) из student_progress
*/

-- ========================================
-- ГОТОВО! 🎉
-- ========================================

