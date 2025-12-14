-- 🎯 CREATE TRIPWIRE LESSONS - Simplified SQL Script
-- Creates placeholder lessons 67, 68, 69 for modules 16, 17, 18
-- No dependencies on modules table (doesn't exist in Tripwire DB)
--
-- USAGE: Copy-paste this SQL into Supabase SQL Editor
-- Dashboard URL: https://supabase.com/dashboard/project/pjmvxecykysfrzppdcto/sql

-- Step 1: Check if lessons already exist
SELECT id, title, module_id, is_archived
FROM lessons 
WHERE id IN (67, 68, 69)
ORDER BY id;

-- Step 2: Create/Update lessons with placeholder titles
INSERT INTO lessons (
  id, title, description, tip, module_id, order_index,
  video_duration, is_archived, created_at, updated_at
)
VALUES 
  (67, 'Module 1', 'Placeholder lesson for Module 1', '', 16, 1, 0, false, NOW(), NOW()),
  (68, 'Module 2', 'Placeholder lesson for Module 2', '', 17, 1, 0, false, NOW(), NOW()),
  (69, 'Module 3', 'Placeholder lesson for Module 3', '', 18, 1, 0, false, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  module_id = EXCLUDED.module_id,
  is_archived = EXCLUDED.is_archived,
  updated_at = NOW();

-- Step 3: Verify creation
SELECT id, title, module_id, order_index, is_archived, video_duration
FROM lessons 
WHERE id IN (67, 68, 69)
ORDER BY id;

-- Expected result:
-- | id | title     | module_id | order_index | is_archived | video_duration |
-- |----|-----------|-----------|-------------|-------------|----------------|
-- | 67 | Module 1  | 16        | 1           | false       | 0              |
-- | 68 | Module 2  | 17        | 1           | false       | 0              |
-- | 69 | Module 3  | 18        | 1           | false       | 0              |

-- ✅ Done! Now you can:
-- 1. Upload videos for each lesson via admin panel
-- 2. Update titles to match actual module names if needed
-- 3. Test lessons in Tripwire product page
