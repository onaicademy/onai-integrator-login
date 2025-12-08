/**
 * АВТОНОМНЫЙ СКРИПТ: Копирование транскрипций
 * Работает независимо от backend
 */

require('dotenv').config({ path: '../backend/.env' });
const { createClient } = require('@supabase/supabase-js');

// Main Platform
const mainSupabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Tripwire
const tripwireSupabase = createClient(
  'https://pjmvxecykysfrzppdcto.supabase.co',
  process.env.TRIPWIRE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Маппинг
const VIDEOS = {
  '9d9fe01c-e060-4182-b382-65ddc52b67ed': { lesson: 67, module: 16 },
  'b61fdae2-8c0b-48a0-b4bf-4037ee2f5c67': { lesson: 68, module: 17 },
  '9e3e25ad-fe5f-4e11-b797-de749f33631c': { lesson: 69, module: 18 }
};

async function migrate() {
  console.log('\n🚀 Начинаем копирование транскрипций...\n');

  for (const [videoId, info] of Object.entries(VIDEOS)) {
    console.log(`📹 Video: ${videoId}`);
    console.log(`   Lesson: ${info.lesson}, Module: ${info.module}`);

    // Fetch from Main
    const { data: trans, error: fetchErr } = await mainSupabase
      .from('video_transcriptions')
      .select('*')
      .eq('video_id', videoId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchErr) {
      console.error(`   ❌ Ошибка:`, fetchErr.message);
      continue;
    }

    console.log(`   ✅ Получено из Main Platform`);
    console.log(`   📊 VTT: ${trans.transcript_vtt?.length || 0} bytes`);

    // Insert to Tripwire
    const { error: insertErr } = await tripwireSupabase
      .from('video_transcriptions')
      .insert({
        video_id: videoId,
        lesson_id: info.lesson,
        module_id: info.module,
        transcript_text: trans.transcript_text,
        transcript_srt: trans.transcript_srt,
        transcript_vtt: trans.transcript_vtt,
        language: trans.language || 'ru',
        generated_by: trans.generated_by || 'groq-whisper',
        status: 'completed',
        generated_at: trans.generated_at || new Date().toISOString()
      });

    if (insertErr) {
      console.error(`   ❌ Ошибка вставки:`, insertErr.message);
      continue;
    }

    console.log(`   ✅ Вставлено в Tripwire DB\n`);
  }

  console.log('🎉 Миграция завершена!\n');
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Ошибка:', err);
    process.exit(1);
  });
