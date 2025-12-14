import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load env
const envPath = path.join(__dirname, '..', 'env.env');
dotenv.config({ path: envPath });

const TRIPWIRE_URL = process.env.TRIPWIRE_SUPABASE_URL;
const TRIPWIRE_KEY = process.env.TRIPWIRE_SERVICE_ROLE_KEY;

if (!TRIPWIRE_URL || !TRIPWIRE_KEY) {
  throw new Error('Missing Tripwire credentials');
}

const supabase = createClient(TRIPWIRE_URL, TRIPWIRE_KEY);

async function createLessons() {
  console.log('\n🚀 Creating Tripwire lessons 67, 68, 69...\n');

  // Step 1: Check current state
  const { data: existing } = await supabase
    .from('lessons')
    .select('id, title, module_id')
    .in('id', [67, 68, 69]);

  if (existing && existing.length > 0) {
    console.log('⚠️  Found existing lessons:');
    existing.forEach((l) => console.log(`   - Lesson ${l.id}: ${l.title} (module ${l.module_id})`));
    console.log('\n🔄 Will update them...\n');
  } else {
    console.log('✅ No existing lessons found - will create new ones\n');
  }

  // Step 2: Upsert lessons
  const lessonsToCreate = [
    {
      id: 67,
      title: 'Module 1',
      description: 'Placeholder lesson for Module 1',
      tip: '',
      module_id: 16,
      order_index: 1,
      video_duration: 0,
      is_archived: false,
    },
    {
      id: 68,
      title: 'Module 2',
      description: 'Placeholder lesson for Module 2',
      tip: '',
      module_id: 17,
      order_index: 1,
      video_duration: 0,
      is_archived: false,
    },
    {
      id: 69,
      title: 'Module 3',
      description: 'Placeholder lesson for Module 3',
      tip: '',
      module_id: 18,
      order_index: 1,
      video_duration: 0,
      is_archived: false,
    },
  ];

  const { data, error } = await supabase
    .from('lessons')
    .upsert(lessonsToCreate, { onConflict: 'id' })
    .select();

  if (error) {
    console.error('❌ Error creating lessons:', error);
    return;
  }

  console.log('✅ Lessons created successfully!\n');
  console.log('📊 Created/Updated lessons:');
  data?.forEach((lesson) => {
    console.log(`   - Lesson ${lesson.id}: "${lesson.title}" (module ${lesson.module_id})`);
  });

  // Step 3: Verify
  console.log('\n🔍 Verifying lessons...\n');
  const { data: verify } = await supabase
    .from('lessons')
    .select('id, title, module_id, order_index, is_archived, video_duration')
    .in('id', [67, 68, 69])
    .order('id', { ascending: true });

  console.log('┌──────┬───────────┬────────────┬──────────────┬──────────────┬─────────────────┐');
  console.log('│  ID  │   Title   │ Module ID  │ Order Index  │ Is Archived  │ Video Duration  │');
  console.log('├──────┼───────────┼────────────┼──────────────┼──────────────┼─────────────────┤');
  verify?.forEach((l) => {
    console.log(
      `│ ${String(l.id).padEnd(4)} │ ${String(l.title).padEnd(9)} │ ` +
        `${String(l.module_id).padEnd(10)} │ ${String(l.order_index).padEnd(12)} │ ` +
        `${String(l.is_archived).padEnd(12)} │ ${String(l.video_duration).padEnd(15)} │`
    );
  });
  console.log('└──────┴───────────┴────────────┴──────────────┴──────────────┴─────────────────┘');

  console.log('\n✅ Done! You can now:');
  console.log('   1. Upload videos via admin panel');
  console.log('   2. Update titles if needed');
  console.log('   3. Test in Tripwire product page\n');
}

createLessons().catch(console.error);
