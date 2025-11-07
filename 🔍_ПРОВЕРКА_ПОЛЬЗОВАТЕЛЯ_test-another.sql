-- 🔍 ПОЛНАЯ ПРОВЕРКА ПОЛЬЗОВАТЕЛЯ test-another@gmail.com
-- Проверяем синхронизацию всех баз данных и обнуление данных

-- ============================================
-- 1. ПРОВЕРКА auth.users (Supabase Auth)
-- ============================================
SELECT 
  '=== AUTH.USERS ===' as section,
  id,
  email,
  email_confirmed_at,
  created_at,
  updated_at,
  last_sign_in_at,
  raw_user_meta_data
FROM auth.users
WHERE email = 'test-another@gmail.com';

-- ============================================
-- 2. ПРОВЕРКА public.users (Профиль пользователя)
-- ============================================
SELECT 
  '=== PUBLIC.USERS ===' as section,
  id,
  email,
  full_name,
  role,
  is_ceo,
  total_xp,
  level,
  avatar_url,
  created_at,
  updated_at,
  last_login_at
FROM public.users
WHERE email = 'test-another@gmail.com';

-- ============================================
-- 3. ПРОВЕРКА user_stats (Статистика пользователя)
-- ============================================
SELECT 
  '=== USER_STATS ===' as section,
  user_id,
  lessons_completed,
  total_study_time_minutes,
  current_streak,
  longest_streak,
  courses_completed,
  modules_completed,
  achievements_unlocked,
  messages_sent_to_ai,
  last_activity_at,
  created_at,
  updated_at
FROM public.user_stats
WHERE user_id = (
  SELECT id FROM public.users WHERE email = 'test-another@gmail.com'
);

-- ============================================
-- 4. ПРОВЕРКА user_progress (Прогресс по курсам)
-- ============================================
SELECT 
  '=== USER_PROGRESS ===' as section,
  user_id,
  course_id,
  module_id,
  lesson_id,
  status,
  progress_percent,
  started_at,
  completed_at,
  last_accessed_at,
  time_spent_minutes
FROM public.user_progress
WHERE user_id = (
  SELECT id FROM public.users WHERE email = 'test-another@gmail.com'
);

-- ============================================
-- 5. ПРОВЕРКА user_achievements (Достижения пользователя)
-- ============================================
SELECT 
  '=== USER_ACHIEVEMENTS ===' as section,
  ua.user_id,
  ua.achievement_id,
  a.title,
  a.description,
  ua.unlocked_at,
  ua.progress_current,
  ua.progress_required
FROM public.user_achievements ua
LEFT JOIN public.achievements a ON ua.achievement_id = a.id
WHERE ua.user_id = (
  SELECT id FROM public.users WHERE email = 'test-another@gmail.com'
);

-- ============================================
-- 6. ПРОВЕРКА СУММАРНАЯ (Все метрики в одном месте)
-- ============================================
SELECT 
  '=== SUMMARY ===' as section,
  u.email,
  u.full_name,
  u.role,
  u.total_xp as "XP (должно быть 0)",
  u.level as "Уровень (должно быть 1)",
  COALESCE(us.lessons_completed, 0) as "Уроков пройдено (должно быть 0)",
  COALESCE(us.total_study_time_minutes, 0) as "Время обучения (должно быть 0)",
  COALESCE(us.current_streak, 0) as "Текущая серия (должно быть 0)",
  COALESCE(us.courses_completed, 0) as "Курсов завершено (должно быть 0)",
  COALESCE(us.achievements_unlocked, 0) as "Достижений (должно быть 0)",
  COUNT(DISTINCT up.lesson_id) as "Прогресс уроков (должно быть 0)",
  COUNT(DISTINCT ua.achievement_id) as "Разблокировано достижений (должно быть 0)",
  u.created_at as "Дата создания",
  u.last_login_at as "Последний вход"
FROM public.users u
LEFT JOIN public.user_stats us ON u.id = us.user_id
LEFT JOIN public.user_progress up ON u.id = up.user_id
LEFT JOIN public.user_achievements ua ON u.id = ua.user_id
WHERE u.email = 'test-another@gmail.com'
GROUP BY u.id, u.email, u.full_name, u.role, u.total_xp, u.level, 
         us.lessons_completed, us.total_study_time_minutes, us.current_streak,
         us.courses_completed, us.achievements_unlocked, u.created_at, u.last_login_at;

-- ============================================
-- 7. ПРОВЕРКА НА MOCK ДАННЫЕ
-- ============================================
-- Проверяем что нет "подозрительных" значений которые могли быть из mock данных
SELECT 
  '=== ПРОВЕРКА НА MOCK ===' as section,
  CASE 
    WHEN u.total_xp > 0 THEN '❌ НАЙДЕНЫ MOCK: total_xp не обнулён'
    WHEN u.level > 1 THEN '❌ НАЙДЕНЫ MOCK: level не обнулён'
    WHEN us.lessons_completed > 0 THEN '❌ НАЙДЕНЫ MOCK: lessons_completed не обнулён'
    WHEN us.current_streak > 0 THEN '❌ НАЙДЕНЫ MOCK: current_streak не обнулён'
    WHEN COUNT(ua.achievement_id) > 0 THEN '❌ НАЙДЕНЫ MOCK: есть достижения'
    ELSE '✅ ВСЁ ЧИСТО: Нет mock данных'
  END as status,
  u.total_xp,
  u.level,
  COALESCE(us.lessons_completed, 0) as lessons_completed,
  COALESCE(us.current_streak, 0) as current_streak,
  COUNT(ua.achievement_id) as achievements_count
FROM public.users u
LEFT JOIN public.user_stats us ON u.id = us.user_id
LEFT JOIN public.user_achievements ua ON u.id = ua.user_id
WHERE u.email = 'test-another@gmail.com'
GROUP BY u.id, u.total_xp, u.level, us.lessons_completed, us.current_streak;

-- ============================================
-- 8. ПРОВЕРКА ВСЕХ ТАБЛИЦ (существуют ли они)
-- ============================================
SELECT 
  '=== ПРОВЕРКА ТАБЛИЦ ===' as section,
  table_name,
  CASE 
    WHEN table_name IN ('users', 'user_stats', 'user_progress', 'user_achievements', 'achievements') 
    THEN '✅ Таблица существует'
    ELSE '⚠️ Неожиданная таблица'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name IN ('users', 'user_stats', 'user_progress', 'user_achievements', 'achievements')
ORDER BY table_name;

-- ============================================
-- 9. ПРОВЕРКА RLS ПОЛИТИК
-- ============================================
SELECT 
  '=== RLS ПОЛИТИКИ ===' as section,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('users', 'user_stats', 'user_progress', 'user_achievements')
ORDER BY tablename, policyname;

-- ============================================
-- ИТОГОВЫЙ ВЕРДИКТ
-- ============================================
SELECT 
  '=== ИТОГОВЫЙ ВЕРДИКТ ===' as section,
  CASE 
    WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'test-another@gmail.com') 
    THEN '✅ Пользователь создан в public.users'
    ELSE '❌ Пользователь НЕ НАЙДЕН в public.users'
  END as users_status,
  
  CASE 
    WHEN EXISTS (SELECT 1 FROM public.user_stats WHERE user_id = (SELECT id FROM public.users WHERE email = 'test-another@gmail.com'))
    THEN '✅ Запись в user_stats создана'
    ELSE '❌ Запись в user_stats НЕ СОЗДАНА'
  END as stats_status,
  
  CASE 
    WHEN (SELECT total_xp FROM public.users WHERE email = 'test-another@gmail.com') = 0
    THEN '✅ total_xp обнулён'
    ELSE '❌ total_xp НЕ ОБНУЛЁН'
  END as xp_status,
  
  CASE 
    WHEN (SELECT level FROM public.users WHERE email = 'test-another@gmail.com') = 1
    THEN '✅ level = 1 (начальный)'
    ELSE '❌ level НЕ ПРАВИЛЬНЫЙ'
  END as level_status,
  
  CASE 
    WHEN COALESCE((SELECT lessons_completed FROM public.user_stats WHERE user_id = (SELECT id FROM public.users WHERE email = 'test-another@gmail.com')), 0) = 0
    THEN '✅ lessons_completed = 0'
    ELSE '❌ lessons_completed НЕ ОБНУЛЁН'
  END as lessons_status;

