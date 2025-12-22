-- ========================================
-- FIX TRIPWIRE LESSONS - CONNECT MODULES TO LESSONS
-- ========================================
-- Database: Tripwire (pjmvxecykysfrzppdcto)
-- Date: 2025-12-15
-- ========================================

-- ✅ STEP 1: Check current state
SELECT 
  '📊 Current Lessons Status' as info,
  id,
  title,
  module_id,
  bunny_video_id,
  is_archived
FROM lessons
WHERE module_id IN (16, 17, 18)
ORDER BY module_id, order_index;

-- ========================================
-- ✅ STEP 2: Create/Update Lessons
-- ========================================

-- Module 16 (Вводный модуль) - REAL LESSON with video
INSERT INTO lessons (
  id,
  title,
  description,
  tip,
  module_id,
  bunny_video_id,
  video_duration,
  order_index,
  is_archived,
  created_at,
  updated_at
) VALUES (
  67,
  'ВВОДНЫЙ МОДУЛЬ',
  'Базовое погружение в нейросети. Разбор основных инструментов и выбор специализации для заработка.',
  'Определите ваше направление в AI!',
  16,
  '9d9fe01c-e060-4182-b382-65ddc52b67ed', -- ✅ REAL Bunny video ID
  540, -- 9 minutes in seconds
  1,
  false,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  tip = EXCLUDED.tip,
  module_id = EXCLUDED.module_id,
  bunny_video_id = EXCLUDED.bunny_video_id,
  video_duration = EXCLUDED.video_duration,
  is_archived = false,
  updated_at = NOW();

-- Module 17 (GPT-бот) - PLACEHOLDER (no video yet)
INSERT INTO lessons (
  id,
  title,
  description,
  tip,
  module_id,
  bunny_video_id,
  video_duration,
  order_index,
  is_archived,
  created_at,
  updated_at
) VALUES (
  68,
  'Создание GPT-бота',
  'Практический модуль по созданию умных ассистентов. Подключение к соцсетям и автоматизация общения.',
  'Создайте своего AI-ассистента для Instagram и WhatsApp',
  17,
  NULL, -- ❌ No video yet (placeholder)
  840, -- 14 minutes (estimated)
  1,
  false,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  tip = EXCLUDED.tip,
  module_id = EXCLUDED.module_id,
  video_duration = EXCLUDED.video_duration,
  is_archived = false,
  updated_at = NOW();

-- Module 18 (Reels) - PLACEHOLDER (no video yet)
INSERT INTO lessons (
  id,
  title,
  description,
  tip,
  module_id,
  bunny_video_id,
  video_duration,
  order_index,
  is_archived,
  created_at,
  updated_at
) VALUES (
  69,
  'Создание вирусных Reels',
  'Генерация контента с помощью AI. Создание сценариев, цифровых аватаров и автоматический монтаж.',
  'Научитесь создавать контент, который наберет 100,000 просмотров!',
  18,
  NULL, -- ❌ No video yet (placeholder)
  60, -- 1 minute (estimated)
  1,
  false,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  tip = EXCLUDED.tip,
  module_id = EXCLUDED.module_id,
  video_duration = EXCLUDED.video_duration,
  is_archived = false,
  updated_at = NOW();

-- ========================================
-- ✅ STEP 3: Verify Results
-- ========================================

SELECT 
  '✅ Lessons after fix' as status,
  id,
  title,
  module_id,
  CASE 
    WHEN bunny_video_id IS NOT NULL THEN '🎥 HAS VIDEO'
    ELSE '📝 PLACEHOLDER'
  END as video_status,
  is_archived
FROM lessons
WHERE module_id IN (16, 17, 18)
ORDER BY module_id, order_index;

-- ========================================
-- ✅ STEP 4: Grant RLS permissions (if needed)
-- ========================================

-- Ensure RLS policies allow read access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'lessons' 
    AND policyname = 'Allow authenticated read lessons'
  ) THEN
    CREATE POLICY "Allow authenticated read lessons"
    ON lessons
    FOR SELECT
    TO authenticated
    USING (true);
    
    RAISE NOTICE '✅ Created RLS policy for lessons';
  ELSE
    RAISE NOTICE '✅ RLS policy already exists';
  END IF;
END $$;

-- ========================================
-- ✅ DONE!
-- ========================================

SELECT '🎉 TRIPWIRE LESSONS FIX COMPLETE!' as status;
