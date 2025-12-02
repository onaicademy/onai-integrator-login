-- ===========================================
-- FIX: Add UNIQUE constraint on lesson_id
-- ===========================================
-- Problem: UPSERT fails because no UNIQUE constraint exists
-- Solution: Add UNIQUE constraint to lesson_id column

-- Step 1: Check if constraint exists
SELECT 
  conname as constraint_name,
  contype as constraint_type
FROM pg_constraint
WHERE conrelid = 'video_content'::regclass
  AND contype IN ('u', 'p');  -- u=unique, p=primary key

-- Expected: Should show primary key on 'id' but NO unique on 'lesson_id'

-- Step 2: Add UNIQUE constraint
ALTER TABLE video_content
ADD CONSTRAINT video_content_lesson_id_unique 
UNIQUE (lesson_id);

-- Step 3: Verify constraint added
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'video_content'::regclass
ORDER BY conname;

-- Expected: Should show 'video_content_lesson_id_unique' with UNIQUE(lesson_id)

-- ===========================================
-- After applying this fix:
-- ===========================================
-- 1. Backend UPSERT will work
-- 2. video_content will save correctly
-- 3. Duration will appear in frontend

