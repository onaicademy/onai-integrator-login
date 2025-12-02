/**
 * Test Script: video_content RLS Policies (FIXED for correct table structure)
 * 
 * Uses ACTUAL table structure:
 * - public_url (not video_url)
 * - r2_object_key (required)
 * - r2_bucket_name (required)
 * 
 * Run: npx ts-node src/scripts/test-video-content-rls-fixed.ts
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from backend/.env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

console.log('🔧 Environment loaded from backend/.env');
console.log('   SUPABASE_URL:', process.env.SUPABASE_URL ? '✅' : '❌');
console.log('   SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌');
console.log('');

import { adminSupabase } from '../config/supabase';

async function testVideoContentRLS() {
  console.log('🧪 Testing video_content RLS policies...\n');
  
  // ==========================================
  // Test 0: Create test lesson first (for foreign key)
  // ==========================================
  console.log('Test 0: Creating test lesson...');
  const { data: testLesson, error: lessonError } = await adminSupabase
    .from('lessons')
    .insert({
      module_id: 2, // Use existing module "Введение в профессию"
      title: 'RLS Test Lesson',
      description: 'Test lesson for RLS verification',
      order_index: 9999,
      is_archived: false,
      created_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (lessonError || !testLesson) {
    console.error('❌ Could not create test lesson:', lessonError);
    return;
  }
  
  const testLessonId = testLesson.id;
  console.log('✅ Test lesson created (ID:', testLessonId, ')');
  console.log('');
  
  // ==========================================
  // Test 1: INSERT
  // ==========================================
  console.log('Test 1: INSERT');
  const { data: inserted, error: insertError } = await adminSupabase
    .from('video_content')
    .insert({
      lesson_id: testLessonId,  // ✅ Now uses real lesson_id
      public_url: 'https://test.cdn.net/test.mp4',  // ✅ Correct column name
      r2_object_key: 'test-video-key',  // ✅ Required field
      r2_bucket_name: 'test-bucket',  // ✅ Required field
      filename: 'test.mp4',
      file_size_bytes: 1024000,
      duration_seconds: 180,
      upload_status: 'completed',
      created_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (insertError) {
    console.error('❌ INSERT failed:', insertError);
    console.error('\n🚨 RLS policies are blocking INSERT!');
    return;
  }
  
  console.log('✅ INSERT works:', inserted);
  
  // ==========================================
  // Test 2: UPDATE
  // ==========================================
  console.log('\nTest 2: UPDATE');
  const { data: updated, error: updateError } = await adminSupabase
    .from('video_content')
    .update({ duration_seconds: 240 })
    .eq('lesson_id', testLessonId)
    .select()
    .single();
  
  if (updateError) {
    console.error('❌ UPDATE failed:', updateError);
    console.error('\n🚨 RLS policies are blocking UPDATE!');
    return;
  }
  
  console.log('✅ UPDATE works:', updated);
  
  // ==========================================
  // Test 3: UPSERT (the actual operation used in videos.ts)
  // ==========================================
  console.log('\nTest 3: UPSERT (with onConflict)');
  const { data: upserted, error: upsertError } = await adminSupabase
    .from('video_content')
    .upsert({
      lesson_id: testLessonId,
      public_url: 'https://test.cdn.net/updated.mp4',  // ✅ Correct column
      r2_object_key: 'updated-video-key',  // ✅ Required
      r2_bucket_name: 'test-bucket',  // ✅ Required
      filename: 'updated.mp4',
      file_size_bytes: 2048000,
      duration_seconds: 300,
      upload_status: 'completed'
    }, {
      onConflict: 'lesson_id'
    })
    .select()
    .single();
  
  if (upsertError) {
    console.error('❌ UPSERT failed:', upsertError);
    console.error('\n🚨 RLS policies are blocking UPSERT!');
    return;
  }
  
  console.log('✅ UPSERT works:', upserted);
  
  // ==========================================
  // Test 4: SELECT
  // ==========================================
  console.log('\nTest 4: SELECT');
  const { data: selected, error: selectError } = await adminSupabase
    .from('video_content')
    .select('*')
    .eq('lesson_id', testLessonId)
    .single();
  
  if (selectError) {
    console.error('❌ SELECT failed:', selectError);
    return;
  }
  
  console.log('✅ SELECT works:', selected);
  
  // ==========================================
  // Test 5: SELECT with JOIN (like in lessons.ts)
  // ==========================================
  console.log('\nTest 5: SELECT with JOIN (lessons + video_content)');
  
  // Use the same test lesson we created earlier
  // Test JOIN query (same as GET /api/lessons)
  const { data: joinResult, error: joinError } = await adminSupabase
    .from('lessons')
    .select(`
      *,
      video_content (*)
    `)
    .eq('id', testLessonId)
    .single();
  
  if (joinError) {
    console.error('❌ SELECT with JOIN failed:', joinError);
    return;
  }
  
  console.log('✅ SELECT with JOIN works:', {
    lesson_id: joinResult.id,
    lesson_title: joinResult.title,
    video_content_count: joinResult.video_content?.length || 0,
    video_content: joinResult.video_content
  });
  
  if (!joinResult.video_content || joinResult.video_content.length === 0) {
    console.error('❌ JOIN returned empty video_content array!');
    console.error('RLS might be blocking SELECT on video_content.');
    return;
  }
  
  // ==========================================
  // Cleanup
  // ==========================================
  console.log('\nCleaning up test data...');
  
  // Delete video_content first (foreign key constraint)
  await adminSupabase
    .from('video_content')
    .delete()
    .eq('lesson_id', testLessonId);
  
  // Then delete lesson
  await adminSupabase
    .from('lessons')
    .delete()
    .eq('id', testLessonId);
  
  console.log('✅ Test data cleaned up');
  
  // ==========================================
  // Final verdict
  // ==========================================
  console.log('\n' + '='.repeat(50));
  console.log('✅ ALL TESTS PASSED!');
  console.log('='.repeat(50));
  console.log('\n📋 RLS policies are working correctly:');
  console.log('   ✅ service_role_key can INSERT');
  console.log('   ✅ service_role_key can UPDATE');
  console.log('   ✅ service_role_key can UPSERT');
  console.log('   ✅ service_role_key can SELECT');
  console.log('   ✅ JOIN queries return video_content');
  console.log('\n🎯 Next steps:');
  console.log('   1. Re-upload videos in admin panel');
  console.log('   2. Check that duration appears in UI');
  console.log('   3. Verify backend logs show "Video_content saved"');
  console.log('\n');
}

testVideoContentRLS().catch((error) => {
  console.error('\n🚨 Test script failed with error:', error);
  process.exit(1);
});

