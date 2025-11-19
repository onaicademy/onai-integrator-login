/**
 * RLS Diagnostic Script
 * 
 * Tests Supabase RLS bypass with service_role_key
 * Run: npx tsx backend/src/scripts/test-rls.ts
 */

import { adminSupabase } from '../config/supabase';
import * as dotenv from 'dotenv';

dotenv.config({ path: 'backend/.env' });

async function testRLS() {
  console.log('\n🔍 Testing Supabase RLS bypass...\n');
  
  // Test 1: Check client configuration
  console.log('Test 1: Client Configuration');
  console.log('✅ SUPABASE_URL:', process.env.SUPABASE_URL);
  console.log('✅ SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) + '...');
  console.log('✅ Admin client initialized with Authorization header\n');
  
  // Test 2: Try SELECT
  console.log('Test 2: SELECT query');
  const { data: lessons, error: selectError } = await adminSupabase
    .from('lessons')
    .select('id, title, duration_minutes, video_url')
    .limit(3);
  
  if (selectError) {
    console.error('❌ SELECT failed:', selectError);
  } else {
    console.log('✅ SELECT works:', lessons?.length, 'rows');
    console.log('   Lessons:', lessons?.map(l => `#${l.id} - ${l.title} (${l.duration_minutes}min)`).join('\n            '));
  }
  
  // Test 3: Try UPDATE (safe test - just update timestamp)
  console.log('\nTest 3: UPDATE query');
  const testLessonId = lessons?.[0]?.id;
  
  if (testLessonId) {
    console.log('   Updating lesson ID:', testLessonId);
    
    const { data: updated, error: updateError } = await adminSupabase
      .from('lessons')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', testLessonId)
      .select();
    
    if (updateError) {
      console.error('❌ UPDATE failed:', updateError);
      console.error('   This indicates RLS is blocking the update!');
    } else if (!updated || updated.length === 0) {
      console.error('❌ UPDATE returned empty array (RLS silently blocked!)');
      console.error('   This is the classic symptom: no error, but no rows updated');
    } else {
      console.log('✅ UPDATE works:', updated);
    }
  }
  
  // Test 4: Test duration update (the actual problem)
  console.log('\nTest 4: Duration update');
  if (testLessonId) {
    const { data: durationUpdate, error: durationError } = await adminSupabase
      .from('lessons')
      .update({ duration_minutes: 5 })  // Test value
      .eq('id', testLessonId)
      .select();
    
    if (durationError) {
      console.error('❌ Duration update failed:', durationError);
    } else if (!durationUpdate || durationUpdate.length === 0) {
      console.error('❌ Duration update blocked by RLS!');
    } else {
      console.log('✅ Duration update works:', durationUpdate[0].duration_minutes, 'minutes');
    }
  }
  
  // Test 5: Test video_content table
  console.log('\nTest 5: video_content table');
  const { data: videoContent, error: videoError } = await adminSupabase
    .from('video_content')
    .select('*')
    .limit(3);
  
  if (videoError) {
    console.error('❌ video_content SELECT failed:', videoError);
  } else {
    console.log('✅ video_content SELECT works:', videoContent?.length, 'rows');
  }
  
  // Test 6: Check RLS policies
  console.log('\nTest 6: RLS Policies');
  const { data: policies, error: policiesError } = await adminSupabase
    .from('pg_policies')
    .select('*')
    .in('tablename', ['lessons', 'video_content']);
  
  if (policiesError) {
    console.warn('⚠️ Could not fetch policies:', policiesError.message);
  } else if (policies && policies.length > 0) {
    console.log('✅ RLS Policies found:', policies.length);
    policies.forEach(p => {
      console.log(`   - ${p.tablename}.${p.policyname} (${p.cmd})`);
    });
  } else {
    console.log('⚠️ No RLS policies found (might need to query differently)');
  }
  
  console.log('\n===========================================');
  console.log('Test complete. Check results above.');
  console.log('===========================================\n');
}

testRLS()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });

