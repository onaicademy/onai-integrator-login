/**
 * Test Script: video_content RLS Policies
 * 
 * Tests that the fixed RLS policies allow service_role_key to:
 * - INSERT new records
 * - UPDATE existing records
 * - UPSERT (with onConflict)
 * - SELECT records
 * 
 * Run: npx ts-node src/scripts/test-video-content-rls.ts
 */

import { adminSupabase } from '../config/supabase';

async function testVideoContentRLS() {
  console.log('🧪 Testing video_content RLS policies...\n');
  
  const testLessonId = 99999; // Use non-existent ID for test
  
  // ==========================================
  // Test 1: INSERT
  // ==========================================
  console.log('Test 1: INSERT');
  const { data: inserted, error: insertError } = await adminSupabase
    .from('video_content')
    .insert({
      lesson_id: testLessonId,
      video_url: 'https://test.cdn.net/test.mp4',
      filename: 'test.mp4',
      file_size_bytes: 1024000,
      duration_seconds: 180,
      created_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (insertError) {
    console.error('❌ INSERT failed:', insertError);
    console.error('\n🚨 RLS policies are still blocking INSERT!');
    console.error('Make sure you applied the SQL fix in Supabase Dashboard.');
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
      video_url: 'https://test.cdn.net/updated.mp4',
      filename: 'updated.mp4',
      duration_seconds: 300
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
  
  // First create a test lesson
  const { data: testLesson } = await adminSupabase
    .from('lessons')
    .insert({
      module_id: 1, // Use existing module
      title: 'RLS Test Lesson',
      description: 'Test lesson for RLS verification',
      order_index: 9999,
      is_archived: false,
      created_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (!testLesson) {
    console.error('❌ Could not create test lesson');
    return;
  }
  
  // Create video_content for test lesson (same structure as real upload)
  await adminSupabase
    .from('video_content')
    .insert({
      lesson_id: testLesson.id,
      video_url: 'https://test.cdn.net/join-test.mp4',  // Same as backend code
      filename: 'join-test.mp4',
      file_size_bytes: 3072000,
      duration_seconds: 360,
      created_at: new Date().toISOString()
    });
  
  // Test JOIN query (same as GET /api/lessons)
  const { data: joinResult, error: joinError } = await adminSupabase
    .from('lessons')
    .select(`
      *,
      video_content (*)
    `)
    .eq('id', testLesson.id)
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
  
  await adminSupabase
    .from('video_content')
    .delete()
    .eq('lesson_id', testLessonId);
  
  await adminSupabase
    .from('video_content')
    .delete()
    .eq('lesson_id', testLesson.id);
  
  await adminSupabase
    .from('lessons')
    .delete()
    .eq('id', testLesson.id);
  
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

