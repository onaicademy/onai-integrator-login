-- Update Lesson 67 with correct Bunny video ID
UPDATE lessons 
SET bunny_video_id = '62a18d70-0ac8-4894-bdaf-5e69445d34c8',
    updated_at = NOW()
WHERE id = 67;

-- Verify
SELECT id, title, bunny_video_id, duration_minutes 
FROM lessons 
WHERE id = 67;
