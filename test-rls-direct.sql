-- ======================================
-- DIRECT RLS TEST (Run in Supabase SQL Editor as service_role)
-- ======================================

-- Test 1: Try INSERT
BEGIN;

INSERT INTO video_content (
  lesson_id,
  public_url,
  r2_object_key,
  r2_bucket_name,
  filename,
  file_size_bytes,
  duration_seconds,
  upload_status,
  created_at
) VALUES (
  33,  -- Use existing lesson
  'https://test.cdn.net/rls-test.mp4',
  'rls-test-key',
  'test-bucket',
  'rls-test.mp4',
  1024000,
  180,
  'completed',
  now()
) RETURNING *;

-- If this works → RLS policies are correct! ✅
-- If this fails → RLS still blocking ❌

ROLLBACK;  -- Don't actually save test data

-- Test 2: Check existing data
SELECT 
  l.id,
  l.title,
  l.video_url,
  vc.id as video_content_id,
  vc.duration_seconds
FROM lessons l
LEFT JOIN video_content vc ON vc.lesson_id = l.id
WHERE l.module_id = 2
ORDER BY l.order_index;

-- Should show:
-- - video_url: not null (Bunny CDN URL)
-- - video_content_id: null (no records yet)
-- - duration_seconds: null (no records yet)

