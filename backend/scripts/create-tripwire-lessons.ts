/**
 * 🎯 CREATE TRIPWIRE LESSONS - PLACEHOLDER LESSONS FOR MODULES 16, 17, 18
 * 
 * Создает пустые уроки (67, 68, 69) для трех модулей Tripwire продукта
 * Названия уроков будут идентичны названиям модулей
 * 
 * USAGE:
 * npx ts-node backend/scripts/create-tripwire-lessons.ts
 */

// Load environment variables first
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env.env file
const envPath = path.resolve(__dirname, '../env.env');
console.log('📦 Loading environment from:', envPath);
dotenv.config({ path: envPath });

console.log('✅ Environment variables loaded successfully\n');

// Import Tripwire Supabase client (will use env vars loaded above)
import { tripwireAdminSupabase as tripwireSupabase } from '../src/config/supabase-tripwire';

async function createTripwireLessons() {
  try {
    console.log('\n🚀 Starting Tripwire lessons creation...\n');
    
    // 1️⃣ Получаем названия модулей из БД
    console.log('📚 [Step 1] Fetching module titles...');
    const { data: modules, error: modulesError } = await tripwireSupabase
      .from('modules')  // Changed from tripwire_modules to modules
      .select('id, title, description')
      .in('id', [16, 17, 18])
      .order('id', { ascending: true });
    
    if (modulesError) {
      console.error('❌ ERROR fetching modules:', modulesError);
      process.exit(1);
    }
    
    if (!modules || modules.length === 0) {
      console.error('❌ ERROR: Modules 16, 17, 18 not found in database!');
      console.log('   Please create modules first before running this script.');
      process.exit(1);
    }
    
    console.log(`✅ Found ${modules.length} modules:`);
    modules.forEach(m => {
      console.log(`   - Module ${m.id}: "${m.title}"`);
    });
    
    // 2️⃣ Проверяем, существуют ли уже уроки
    console.log('\n🔍 [Step 2] Checking if lessons already exist...');
    const { data: existingLessons } = await tripwireSupabase
      .from('lessons')
      .select('id, module_id, title')
      .in('id', [67, 68, 69])
      .order('id', { ascending: true });
    
    if (existingLessons && existingLessons.length > 0) {
      console.log(`⚠️  WARNING: Found ${existingLessons.length} existing lessons:`);
      existingLessons.forEach(l => {
        console.log(`   - Lesson ${l.id} (Module ${l.module_id}): "${l.title}"`);
      });
      
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise<string>((resolve) => {
        rl.question('\n⚠️  Do you want to OVERWRITE existing lessons? (yes/no): ', (ans: string) => {
          rl.close();
          resolve(ans.toLowerCase());
        });
      });
      
      if (answer !== 'yes' && answer !== 'y') {
        console.log('\n❌ Operation cancelled by user.');
        process.exit(0);
      }
      
      console.log('\n🗑️  Deleting existing lessons...');
      const { error: deleteError } = await tripwireSupabase
        .from('lessons')
        .delete()
        .in('id', [67, 68, 69]);
      
      if (deleteError) {
        console.error('❌ Error deleting existing lessons:', deleteError);
        process.exit(1);
      }
      console.log('✅ Existing lessons deleted.');
    } else {
      console.log('✅ No existing lessons found. Safe to proceed.');
    }
    
    // 3️⃣ Создаем уроки
    console.log('\n📝 [Step 3] Creating placeholder lessons...');
    
    // Маппинг: Module ID → Lesson ID
    const lessonMapping: Record<number, number> = {
      16: 67,
      17: 68,
      18: 69
    };
    
    const lessonsToCreate = modules.map(module => {
      const lessonId = lessonMapping[module.id];
      
      console.log(`\n   Creating Lesson ${lessonId} for Module ${module.id}...`);
      
      return {
        id: lessonId,
        title: module.title, // Lesson title = Module title
        description: module.description || `Placeholder lesson for ${module.title}`,
        tip: '',
        module_id: module.id,
        order_index: 1, // first lesson in module
        duration_seconds: 0, // will be set when video is uploaded
        is_free: false,
        is_archived: false
      };
    });
    
    // Создаем все уроки за один запрос
    const { data: createdLessons, error: createError } = await tripwireSupabase
      .from('lessons')
      .insert(lessonsToCreate)
      .select();
    
    if (createError) {
      console.error('❌ Error creating lessons:', createError);
      process.exit(1);
    }
    
    console.log('\n✅ Lessons created successfully!');
    
    // 4️⃣ Верификация
    console.log('\n✅ [Step 4] Verifying created lessons...\n');
    const { data: verifyLessons } = await tripwireSupabase
      .from('lessons')
      .select(`
        id,
        title,
        module_id,
        modules!inner(title)
      `)
      .in('id', [67, 68, 69])
      .order('id', { ascending: true });
    
    console.log('📊 Created Lessons Summary:');
    console.log('┌────────────┬─────────────┬──────────────────────────┬──────────────────────────┐');
    console.log('│ Lesson ID  │  Module ID  │      Lesson Title        │      Module Title        │');
    console.log('├────────────┼─────────────┼──────────────────────────┼──────────────────────────┤');
    
    verifyLessons?.forEach((row: any) => {
      const moduleTitle = row.modules?.title || 'Unknown';
      console.log(
        `│ ${String(row.id).padEnd(10)} │ ` +
        `${String(row.module_id).padEnd(11)} │ ` +
        `${String(row.title).substring(0, 24).padEnd(24)} │ ` +
        `${String(moduleTitle).substring(0, 24).padEnd(24)} │`
      );
    });
    
    console.log('└────────────┴─────────────┴──────────────────────────┴──────────────────────────┘');
    
    console.log('\n🎉 SUCCESS! Tripwire lessons created successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Upload videos for each lesson via admin panel');
    console.log('   2. Add descriptions and tips if needed');
    console.log('   3. Test lessons in Tripwire product page');
    
  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  }
}

// Запуск
createTripwireLessons();
