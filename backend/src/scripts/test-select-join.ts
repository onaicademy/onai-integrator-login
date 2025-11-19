import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { adminSupabase } from '../config/supabase';

async function testSelectJoin() {
  console.log('🧪 Testing SELECT with JOIN (same as backend code)...\n');
  
  // Exact same query as GET /api/lessons
  const { data: lessons, error } = await adminSupabase
    .from('lessons')
    .select(`
      *,
      video_content (*),
      lesson_materials (*)
    `)
    .eq('module_id', 2)
    .eq('is_archived', false)
    .order('order_index', { ascending: true });
  
  if (error) {
    console.error('❌ SELECT failed:', error);
    return;
  }
  
  console.log('✅ SELECT success');
  console.log('Lessons count:', lessons?.length);
  console.log('');
  
  // Check lesson 39
  const lesson39 = lessons?.find(l => l.id === 39);
  
  if (lesson39) {
    console.log('Lesson 39:');
    console.log('  title:', lesson39.title);
    console.log('  duration_minutes:', lesson39.duration_minutes);
    console.log('  video_content:', lesson39.video_content);
    console.log('  video_content type:', Array.isArray(lesson39.video_content) ? 'array' : typeof lesson39.video_content);
    console.log('  video_content length:', lesson39.video_content?.length);
    
    if (lesson39.video_content && lesson39.video_content.length > 0) {
      console.log('\n✅ VIDEO_CONTENT FOUND!');
      console.log('  duration_seconds:', lesson39.video_content[0].duration_seconds);
      console.log('  filename:', lesson39.video_content[0].filename);
    } else {
      console.log('\n❌ VIDEO_CONTENT EMPTY OR NULL!');
      console.log('This is the problem!');
    }
  } else {
    console.log('Lesson 39 not found');
  }
}

testSelectJoin();

