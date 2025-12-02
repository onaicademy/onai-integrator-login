-- ============================================
-- SQL ДИАГНОСТИКА: Проверка создания пользователя
-- 
-- ИНСТРУКЦИЯ:
-- 1. Создай тестового пользователя на localhost
-- 2. Запомни его email (например: test@example.com)
-- 3. Скопируй этот SQL в Supabase SQL Editor
-- 4. Замени 'test@example.com' на реальный email
-- 5. Выполни запрос
-- ============================================

-- 🔍 ЗАМЕНИ НА РЕАЛЬНЫЙ EMAIL ТЕСТОВОГО ПОЛЬЗОВАТЕЛЯ:
\set test_email 'test@example.com'

-- ============================================
-- 1️⃣ ПРОВЕРКА: Пользователь в auth.users
-- ============================================
SELECT 
  '🔐 AUTH.USERS' AS check_name,
  id,
  email,
  email_confirmed_at,
  created_at,
  (user_metadata->>'full_name') AS metadata_full_name,
  (user_metadata->>'role') AS metadata_role
FROM auth.users 
WHERE email = :'test_email';

-- Ожидаемый результат:
-- ✅ id: UUID пользователя
-- ✅ email: test@example.com
-- ✅ email_confirmed_at: НЕ NULL (автоматически подтверждён)
-- ✅ metadata_full_name: Тестовый Пользователь
-- ✅ metadata_role: student

-- ============================================
-- 2️⃣ ПРОВЕРКА: Профиль в profiles
-- ============================================
SELECT 
  '👤 PROFILES' AS check_name,
  id,
  email,
  full_name,
  role,
  is_active,
  account_expires_at,
  deactivation_reason,
  deleted_at,
  created_at,
  -- Вычисляем сколько дней до истечения
  CASE 
    WHEN account_expires_at IS NULL THEN 'Нет срока'
    ELSE CONCAT(
      EXTRACT(DAY FROM (account_expires_at - NOW())),
      ' дней до истечения'
    )
  END AS days_until_expiration
FROM profiles 
WHERE email = :'test_email';

-- Ожидаемый результат:
-- ✅ id: UUID (совпадает с auth.users)
-- ✅ email: test@example.com
-- ✅ full_name: Тестовый Пользователь
-- ✅ role: student
-- ✅ is_active: true
-- ✅ account_expires_at: ~90 дней в будущем (если выбрал 3 месяца)
-- ✅ deactivation_reason: NULL
-- ✅ deleted_at: NULL

-- ============================================
-- 3️⃣ ПРОВЕРКА: Данные студента в student_profiles
-- ============================================
SELECT 
  '🎓 STUDENT_PROFILES' AS check_name,
  sp.id,
  sp.user_id,
  sp.full_name,
  sp.phone,  -- ← НОВОЕ ПОЛЕ!
  sp.total_xp,
  sp.streak_days,
  sp.is_active,
  sp.created_at
FROM student_profiles sp
WHERE sp.user_id = (SELECT id FROM profiles WHERE email = :'test_email');

-- Ожидаемый результат:
-- ✅ user_id: UUID (совпадает с profiles.id)
-- ✅ full_name: Тестовый Пользователь
-- ✅ phone: +7 777 123 4567 (то что ввели в форме)
-- ✅ total_xp: 0
-- ✅ streak_days: 0
-- ✅ is_active: true

-- ============================================
-- 4️⃣ ПОЛНАЯ ДИАГНОСТИКА: Все данные в одной строке
-- ============================================
SELECT 
  '📊 ПОЛНАЯ ПРОВЕРКА' AS check_name,
  au.id AS auth_user_id,
  au.email AS auth_email,
  au.email_confirmed_at AS email_confirmed,
  p.id AS profile_id,
  p.full_name AS profile_name,
  p.role AS profile_role,
  p.is_active AS profile_active,
  p.account_expires_at AS profile_expires_at,
  sp.phone AS student_phone,
  sp.total_xp AS student_xp,
  CASE 
    WHEN p.account_expires_at IS NULL THEN 'Нет срока'
    WHEN p.account_expires_at > NOW() THEN CONCAT('Активен (', EXTRACT(DAY FROM (p.account_expires_at - NOW())), ' дней)')
    ELSE 'Истёк!'
  END AS expiration_status
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
LEFT JOIN student_profiles sp ON sp.user_id = p.id
WHERE au.email = :'test_email';

-- Ожидаемый результат:
-- ✅ Все поля заполнены (НЕТ NULL где не должно быть)
-- ✅ auth_user_id = profile_id
-- ✅ email_confirmed НЕ NULL
-- ✅ profile_active = true
-- ✅ student_phone заполнен
-- ✅ expiration_status = "Активен (90 дней)" или около того

-- ============================================
-- 5️⃣ СТАТИСТИКА: Все студенты с сроками действия
-- ============================================
SELECT 
  '📈 ВСЕ СТУДЕНТЫ' AS check_name,
  p.email,
  p.full_name,
  p.is_active,
  p.account_expires_at,
  CASE 
    WHEN p.account_expires_at IS NULL THEN '∞ Бессрочно'
    WHEN p.account_expires_at > NOW() THEN CONCAT('✅ ', EXTRACT(DAY FROM (p.account_expires_at - NOW())), ' дней')
    ELSE '❌ Истёк'
  END AS status,
  p.created_at
FROM profiles p
WHERE p.role = 'student'
ORDER BY p.created_at DESC
LIMIT 20;

-- Показывает последних 20 студентов с их сроками действия

-- ============================================
-- 6️⃣ ПРОВЕРКА: Срок действия установлен ПРАВИЛЬНО
-- ============================================
-- Если выбрал 3 месяца при создании:
SELECT 
  '⏱️ ПРОВЕРКА СРОКА (3 месяца)' AS check_name,
  email,
  created_at,
  account_expires_at,
  -- Разница в днях между созданием и истечением
  EXTRACT(DAY FROM (account_expires_at - created_at)) AS days_difference,
  -- Должно быть ~90 дней для 3 месяцев
  CASE 
    WHEN EXTRACT(DAY FROM (account_expires_at - created_at)) BETWEEN 85 AND 95 THEN '✅ Правильно (3 месяца)'
    WHEN EXTRACT(DAY FROM (account_expires_at - created_at)) BETWEEN 175 AND 185 THEN '✅ Правильно (6 месяцев)'
    WHEN EXTRACT(DAY FROM (account_expires_at - created_at)) BETWEEN 360 AND 370 THEN '✅ Правильно (12 месяцев)'
    ELSE '❌ Неправильно!'
  END AS validation
FROM profiles
WHERE email = :'test_email';

-- Ожидаемый результат:
-- ✅ days_difference: ~90 (если выбрал 3 месяца)
-- ✅ validation: "✅ Правильно (3 месяца)"

-- ============================================
-- 7️⃣ ПРОВЕРКА: Новые колонки существуют
-- ============================================
SELECT 
  '🗂️ СТРУКТУРА ТАБЛИЦЫ profiles' AS check_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('deleted_at', 'account_expires_at', 'deactivation_reason')
ORDER BY column_name;

-- Ожидаемый результат:
-- ✅ account_expires_at: timestamp with time zone
-- ✅ deactivation_reason: text
-- ✅ deleted_at: timestamp with time zone
-- Все 3 колонки присутствуют

-- ============================================
-- 8️⃣ ИТОГОВАЯ ПРОВЕРКА
-- ============================================
DO $$
DECLARE
  test_email TEXT := 'test@example.com'; -- ЗАМЕНИ!
  auth_exists BOOLEAN;
  profile_exists BOOLEAN;
  student_exists BOOLEAN;
  has_phone BOOLEAN;
  has_expiration BOOLEAN;
  is_active BOOLEAN;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '🧪 ИТОГОВАЯ ПРОВЕРКА СОЗДАНИЯ ПОЛЬЗОВАТЕЛЯ';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE 'Email: %', test_email;
  RAISE NOTICE '';
  
  -- Проверяем auth.users
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = test_email) INTO auth_exists;
  RAISE NOTICE '1️⃣ Auth.users: %', CASE WHEN auth_exists THEN '✅ Найден' ELSE '❌ НЕ НАЙДЕН' END;
  
  -- Проверяем profiles
  SELECT EXISTS(SELECT 1 FROM profiles WHERE email = test_email) INTO profile_exists;
  RAISE NOTICE '2️⃣ Profiles: %', CASE WHEN profile_exists THEN '✅ Найден' ELSE '❌ НЕ НАЙДЕН' END;
  
  -- Проверяем student_profiles
  SELECT EXISTS(
    SELECT 1 FROM student_profiles WHERE user_id = (SELECT id FROM profiles WHERE email = test_email)
  ) INTO student_exists;
  RAISE NOTICE '3️⃣ Student_profiles: %', CASE WHEN student_exists THEN '✅ Найден' ELSE '❌ НЕ НАЙДЕН' END;
  
  -- Проверяем phone
  SELECT EXISTS(
    SELECT 1 FROM student_profiles WHERE user_id = (SELECT id FROM profiles WHERE email = test_email) AND phone IS NOT NULL
  ) INTO has_phone;
  RAISE NOTICE '4️⃣ Телефон заполнен: %', CASE WHEN has_phone THEN '✅ Да' ELSE '❌ НЕТ' END;
  
  -- Проверяем account_expires_at
  SELECT EXISTS(
    SELECT 1 FROM profiles WHERE email = test_email AND account_expires_at IS NOT NULL
  ) INTO has_expiration;
  RAISE NOTICE '5️⃣ Срок действия установлен: %', CASE WHEN has_expiration THEN '✅ Да' ELSE '❌ НЕТ' END;
  
  -- Проверяем is_active
  SELECT COALESCE((SELECT is_active FROM profiles WHERE email = test_email), false) INTO is_active;
  RAISE NOTICE '6️⃣ Аккаунт активен: %', CASE WHEN is_active THEN '✅ Да' ELSE '❌ НЕТ' END;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  IF auth_exists AND profile_exists AND student_exists AND has_phone AND has_expiration AND is_active THEN
    RAISE NOTICE '🎉 ВСЁ ОТЛИЧНО! Пользователь создан правильно!';
  ELSE
    RAISE NOTICE '⚠️ ЕСТЬ ПРОБЛЕМЫ! Проверь детали выше.';
  END IF;
  RAISE NOTICE '═══════════════════════════════════════════════════';
END $$;

-- ============================================
-- ГОТОВО! ✅
-- 
-- Скопируй этот файл в Supabase SQL Editor и выполни
-- Обязательно замени 'test@example.com' на реальный email!
-- ============================================

