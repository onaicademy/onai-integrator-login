/**
 * Migration Script: Copy transcriptions from Main Platform to Tripwire DB
 * 
 * Копирует транскрипции для Tripwire уроков (modules 16, 17, 18)
 */

import { adminSupabase as mainSupabase } from '../src/config/supabase';
import { tripwireAdminSupabase as tripwireSupabase } from '../src/config/supabase-tripwire';

// Mapping video_id → lesson_id (from Tripwire)
const VIDEO_MAPPING = {
  '9d9fe01c-e060-4182-b382-65ddc52b67ed': { lesson_id: 67, module_id: 16 }, // Module 16
  'b61fdae2-8c0b-48a0-b4bf-4037ee2f5c67': { lesson_id: 68, module_id: 17 }, // Module 17
  '9e3e25ad-fe5f-4e11-b797-de749f33631c': { lesson_id: 69, module_id: 18 }  // Module 18
};

async function migrateTranscriptions() {
  console.log('🚀 Starting transcriptions migration...\n');

  const videoIds = Object.keys(VIDEO_MAPPING);

  for (const videoId of videoIds) {
    const mapping = VIDEO_MAPPING[videoId as keyof typeof VIDEO_MAPPING];
    
    console.log(`📹 Processing video: ${videoId}`);
    console.log(`   → Lesson ID: ${mapping.lesson_id}, Module ID: ${mapping.module_id}`);

    // 1. Fetch from Main Platform
    const { data: transcription, error: fetchError } = await mainSupabase
      .from('video_transcriptions')
      .select('*')
      .eq('video_id', videoId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !transcription) {
      console.error(`   ❌ Error fetching transcription:`, fetchError);
      continue;
    }

    console.log(`   ✅ Fetched from Main Platform`);

    // 2. Insert into Tripwire DB
    const { error: insertError } = await tripwireSupabase
      .from('video_transcriptions')
      .insert({
        video_id: videoId,
        lesson_id: mapping.lesson_id,
        module_id: mapping.module_id,
        transcript_text: transcription.transcript_text,
        transcript_srt: transcription.transcript_srt,
        transcript_vtt: transcription.transcript_vtt,
        language: transcription.language || 'ru',
        generated_by: transcription.generated_by || 'groq-whisper',
        status: 'completed',
        generated_at: transcription.generated_at || new Date().toISOString()
      });

    if (insertError) {
      console.error(`   ❌ Error inserting to Tripwire:`, insertError);
      continue;
    }

    console.log(`   ✅ Inserted to Tripwire DB`);
    console.log(`   📊 VTT size: ${transcription.transcript_vtt?.length || 0} bytes\n`);
  }

  console.log('🎉 Migration complete!\n');
}

// Run migration
migrateTranscriptions()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
