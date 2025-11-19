import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { adminSupabase } from '../config/supabase';

async function testInsert() {
  console.log('🧪 Testing INSERT into video_content for lesson 39...\n');
  
  const testData = {
    lesson_id: 39,
    public_url: 'https://onai-videos.b-cdn.net/videos/lesson-39-1763561368755.qt',
    r2_object_key: 'lesson-39-test',
    r2_bucket_name: 'onai-course-videos',
    filename: 'test.mp4',
    file_size_bytes: 1024000,
    duration_seconds: 1800,
    upload_status: 'completed',
    created_at: new Date().toISOString()
  };
  
  console.log('Data to insert:', JSON.stringify(testData, null, 2));
  console.log('');
  
  const { data, error } = await adminSupabase
    .from('video_content')
    .upsert(testData, {
      onConflict: 'lesson_id'
    })
    .select()
    .single();
  
  if (error) {
    console.error('❌ INSERT FAILED!');
    console.error('Error:', JSON.stringify(error, null, 2));
    console.error('');
    console.error('This is why video_content is empty!');
  } else {
    console.log('✅ INSERT SUCCESS!');
    console.log('Data:', data);
  }
}

testInsert();

