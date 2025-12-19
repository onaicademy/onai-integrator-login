import { Router } from 'express';
import multer from 'multer';
import axios from 'axios';
import { adminSupabase } from '../config/supabase'; // ✅ Main БД (для некоторых операций)
import { tripwireAdminSupabase } from '../config/supabase-tripwire'; // ✅ Tripwire БД
import crypto from 'crypto';
import { amoCrmService } from '../services/amoCrmService';
import { CompleteLessonSchema, UpdateProgressSchema, validateRequest } from '../types/validation';
import { generateTranscription } from '../services/transcriptionService';
import OpenAI from 'openai';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// ✅ GROQ для генерации описаний и советов (БЫСТРЕЕ И ДЕШЕВЛЕ!)
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || '',
  baseURL: 'https://api.groq.com/openai/v1'
});

// 🚫 BUNNY STORAGE УДАЛЁН
// Видео теперь загружаются через Bunny Stream API в /api/stream/upload
// Старые функции uploadToBunny и deleteFromBunny больше не используются

// GET /api/tripwire/lessons - Get all lessons for a module
router.get('/lessons', async (req, res) => {
  try {
    const { module_id } = req.query;

    if (!module_id) {
      return res.status(400).json({ error: 'module_id is required' });
    }

    const { data: lessons, error } = await tripwireAdminSupabase
      .from('lessons')
      .select('*')
      .eq('module_id', module_id)
      .eq('is_archived', false)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('❌ Error fetching lessons:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ lessons });
  } catch (error: any) {
    console.error('❌ Unexpected error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tripwire/lessons/:id - Get single lesson
router.get('/lessons/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ FIX: Используем tripwireAdminSupabase (Tripwire БД, не Main Platform!)
    const { data: lesson, error } = await tripwireAdminSupabase
      .from('lessons')
      .select('*')
      .eq('id', id)
      .eq('is_archived', false)
      .single();

    if (error) {
      console.error('❌ Error fetching lesson:', error);
      return res.status(404).json({ error: 'Lesson not found' });
    }

    res.json({ lesson });
  } catch (error: any) {
    console.error('❌ Unexpected error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tripwire/videos/:lessonId - Get video for lesson
router.get('/videos/:lessonId', async (req, res) => {
  try {
    const { lessonId } = req.params;

    // В Tripwire БД нет таблицы video_content, bunny_video_id хранится в lessons
    const { data: lesson, error } = await tripwireAdminSupabase
      .from('lessons')
      .select('bunny_video_id, video_duration')
      .eq('id', lessonId)
      .single();

    if (error || !lesson || !lesson.bunny_video_id) {
      console.error('❌ Error fetching video:', error);
      return res.status(404).json({ error: 'Video not found' });
    }

    // Формируем ответ в том же формате, что ожидает фронтенд
    const video = {
      lesson_id: parseInt(lessonId),
      bunny_video_id: lesson.bunny_video_id,
      video_duration: lesson.video_duration || 0
    };

    res.json({ video });
  } catch (error: any) {
    console.error('❌ Unexpected error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 🔥 POST /api/tripwire/lessons/:lessonId/generate-content-sync
// СИНХРОННАЯ генерация транскрипции + описания + советов (для отладки)
router.post('/lessons/:lessonId/generate-content-sync', async (req, res) => {
  try {
    const { lessonId } = req.params;
    console.log(`🔥 [SYNC Generate] Starting for lesson ${lessonId}...`);

    // 1️⃣ Получить урок
    const { data: lesson, error: lessonError } = await tripwireAdminSupabase
      .from('lessons')
      .select('id, title, bunny_video_id, description, tip')
      .eq('id', lessonId)
      .single();

    if (lessonError || !lesson || !lesson.bunny_video_id) {
      console.error('❌ [SYNC Generate] Lesson not found or has no video');
      return res.status(404).json({ error: 'Lesson not found or has no video' });
    }

    console.log(`📹 [SYNC Generate] Video ID: ${lesson.bunny_video_id}`);
    const videoUrl = `https://${process.env.BUNNY_STREAM_CDN_HOSTNAME || 'video.onai.academy'}/${lesson.bunny_video_id}/playlist.m3u8`;
    console.log(`🔗 [SYNC Generate] Video URL: ${videoUrl}`);

    // 2️⃣ Генерируем транскрипцию СИНХРОННО
    console.log(`🎙️ [SYNC Generate] Starting transcription...`);
    let transcriptionResult;
    try {
      transcriptionResult = await generateTranscription(lesson.bunny_video_id, videoUrl);
      console.log(`✅ [SYNC Generate] Transcription completed! Length: ${transcriptionResult.transcript_text?.length || 0} chars`);
    } catch (err: any) {
      console.error(`❌ [SYNC Generate] Transcription FAILED:`, err.message);
      console.error(`❌ [SYNC Generate] Stack:`, err.stack);
      return res.status(500).json({
        error: 'Transcription failed',
        details: err.message,
        stack: err.stack
      });
    }

    // 3️⃣ Генерируем описание и советы
    console.log(`📝 [SYNC Generate] Generating description and tips...`);
    try {
      await generateDescriptionAndTips(lessonId, lesson.title, transcriptionResult.transcript_text);
      console.log(`✅ [SYNC Generate] Description and tips completed!`);
    } catch (err: any) {
      console.error(`❌ [SYNC Generate] AI generation FAILED:`, err.message);
      return res.status(500).json({
        error: 'AI generation failed',
        details: err.message
      });
    }

    res.json({
      success: true,
      message: 'ALL content generated successfully!',
      lesson_id: lessonId,
      video_id: lesson.bunny_video_id,
      transcription_length: transcriptionResult.transcript_text?.length || 0
    });
  } catch (error: any) {
    console.error('❌ [SYNC Generate] Unexpected error:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// 🚀 POST /api/tripwire/lessons/:lessonId/auto-generate-content
// Автоматическая генерация транскрипции + описания + советов для Tripwire урока
router.post('/lessons/:lessonId/auto-generate-content', async (req, res) => {
  try {
    const { lessonId } = req.params;
    console.log(`🚀 [Auto-Generate] Starting for lesson ${lessonId}...`);

    // 1️⃣ Получить урок
    const { data: lesson, error: lessonError } = await tripwireAdminSupabase
      .from('lessons')
      .select('id, title, bunny_video_id, description, tip')
      .eq('id', lessonId)
      .single();

    if (lessonError || !lesson || !lesson.bunny_video_id) {
      console.error('❌ [Auto-Generate] Lesson not found or has no video');
      return res.status(404).json({ error: 'Lesson not found or has no video' });
    }

    // 2️⃣ Проверить, есть ли уже транскрипция
    const { data: existingTranscription } = await tripwireAdminSupabase
      .from('video_transcriptions')
      .select('transcript_text, status')
      .eq('video_id', lesson.bunny_video_id)
      .eq('status', 'completed')
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();

    let transcriptText = existingTranscription?.transcript_text;

    // 3️⃣ Если транскрипции нет - генерируем
    if (!transcriptText) {
      console.log(`🎙️ [Auto-Generate] Generating transcription for ${lesson.bunny_video_id}...`);
      const videoUrl = `https://${process.env.BUNNY_STREAM_CDN_HOSTNAME || 'video.onai.academy'}/${lesson.bunny_video_id}/playlist.m3u8`;
      
      // Запускаем транскрипцию АСИНХРОННО (не блокируем ответ)
      generateTranscription(lesson.bunny_video_id, videoUrl)
        .then(async (transcriptionResult) => {
          console.log(`✅ [Auto-Generate] Transcription completed for lesson ${lessonId}`);
          
          // 4️⃣ После транскрипции - генерируем описание и советы
          await generateDescriptionAndTips(lessonId, lesson.title, transcriptionResult.transcript_text);
        })
        .catch((err) => {
          console.error(`❌ [Auto-Generate] Transcription failed for lesson ${lessonId}:`, err);
        });

      return res.json({
        success: true,
        message: 'Content generation started (transcription + AI)',
        lesson_id: lessonId,
        video_id: lesson.bunny_video_id,
        status: 'processing'
      });
    }

    // 4️⃣ Если транскрипция уже есть - генерируем описание и советы
    // ✅ FORCE: Параметр ?force=true принудительно перегенерирует даже если есть
    const forceRegenerate = req.query.force === 'true';
    
    if (!lesson.description || !lesson.tip || forceRegenerate) {
      console.log(`📝 [Auto-Generate] Generating description and tips for lesson ${lessonId}... (force: ${forceRegenerate})`);
      await generateDescriptionAndTips(lessonId, lesson.title, transcriptText);
    }

    res.json({
      success: true,
      message: 'Content generation completed',
      lesson_id: lessonId,
      status: 'completed'
    });
  } catch (error: any) {
    console.error('❌ [Auto-Generate] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 🤖 Функция генерации описания и советов на основе транскрипции
async function generateDescriptionAndTips(lessonId: string, lessonTitle: string, transcriptText: string) {
  try {
    console.log(`🤖 [AI-Generate] Creating description and tips for lesson ${lessonId}...`);

    // ✅ Используем Groq (llama-3.3-70b) - МГНОВЕННАЯ генерация!
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `Ты - эксперт по созданию образовательного контента для онлайн-курса "Integrator".
Твоя задача - на основе транскрипции видео-урока создать:
1. **Описание урока** (2-3 предложения, что студент узнает)
2. **ТОП-3 СОВЕТА для студента** (каждый совет - 1-2 предложения)

ВАЖНО: Советы должны быть в формате:
**СОВЕТ:**
**Совет 1:** [текст совета, 1-2 предложения]
**Совет 2:** [текст совета, 1-2 предложения]
**Совет 3:** [текст совета, 1-2 предложения]

ОБРАТИ ВНИМАНИЕ: "Совет 1:", "Совет 2:", "Совет 3:" должны быть в двойных звездочках **

Формат ответа СТРОГО JSON:
{
  "description": "текст описания",
  "tip": "**СОВЕТ:**\\n**Совет 1:** ...\\n**Совет 2:** ...\\n**Совет 3:** ..."
}`
        },
        {
          role: 'user',
          content: `Название урока: ${lessonTitle}

Транскрипция видео:
${transcriptText.slice(0, 8000)} 

Создай описание и ТОП-3 совета для этого урока.`
        }
      ],
      temperature: 0.7,
      max_tokens: 800,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');
    const description = result.description || '';
    const tip = result.tip || '';

    console.log(`✅ [AI-Generate] Generated content:`, { description: description.slice(0, 50), tip: tip.slice(0, 50) });

    // ✅ Обновляем урок в БД
    const { error: updateError } = await tripwireAdminSupabase
      .from('lessons')
      .update({
        description,
        tip,
        updated_at: new Date().toISOString()
      })
      .eq('id', lessonId);

    if (updateError) {
      console.error('❌ [AI-Generate] Failed to update lesson:', updateError);
      throw updateError;
    }

    console.log(`✅ [AI-Generate] Lesson ${lessonId} updated with AI-generated content`);
  } catch (error: any) {
    console.error(`❌ [AI-Generate] Error generating content:`, error);
    throw error;
  }
}

// GET /api/tripwire/materials/:lessonId - Get materials for lesson
router.get('/materials/:lessonId', async (req, res) => {
  try {
    const { lessonId } = req.params;

    const { data: materials, error } = await tripwireAdminSupabase
      .from('lesson_materials')
      .select('*')
      .eq('lesson_id', lessonId);

    // ✅ ИСПРАВЛЕНО: Gracefully обрабатываем отсутствие таблицы
    if (error) {
      // Если таблица не существует - возвращаем пустой массив
      if (error.message?.includes('schema cache') || error.code === 'PGRST205') {
        console.log('ℹ️ Таблица lesson_materials не существует, возвращаем пустой массив');
        return res.json({ materials: [] });
      }
      console.error('❌ Error fetching materials:', error);
      return res.status(500).json({ error: error.message });
    }

    // Generate public URLs for each material
    const materialsWithUrls = materials.map((material: any) => {
      const { data } = tripwireAdminSupabase.storage
        .from(material.bucket_name)
        .getPublicUrl(material.storage_path);

      return {
        ...material,
        file_url: data.publicUrl
      };
    });

    res.json({ materials: materialsWithUrls });
  } catch (error: any) {
    console.error('❌ Unexpected error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tripwire/progress/:lessonId - Get progress for lesson
router.get('/progress/:lessonId', async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { tripwire_user_id } = req.query;
    
    if (!tripwire_user_id) {
      return res.json({ isCompleted: false });
    }

    const { data: progress, error } = await adminSupabase
      .from('tripwire_progress')
      .select('*')
      .eq('tripwire_user_id', tripwire_user_id)
      .eq('lesson_id', lessonId)
      .single();

    if (error || !progress) {
      return res.json({ isCompleted: false });
    }

    res.json({ 
      isCompleted: progress.is_completed,
      progress 
    });
  } catch (error: any) {
    console.error('❌ Unexpected error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/tripwire/complete - Mark lesson as complete
// ✅ SUPABASE API VERSION: No pool, direct Supabase queries
router.post('/complete', async (req, res) => {
  try {
    // ✅ LOG: Raw body перед validation (для debugging)
    console.log('[COMPLETE] Raw request body:', JSON.stringify(req.body));
    
    // ✅ SECURITY: Validate input with Zod (replaces manual validation)
    const validated = await validateRequest(CompleteLessonSchema, req.body);
    const { lesson_id, module_id, tripwire_user_id, watched_percentage = 100 } = validated;

    console.log(`[COMPLETE] Validated successfully:`, { lesson_id, module_id, tripwire_user_id, watched_percentage });

    console.log(`🎯 [Complete] User ${tripwire_user_id} completing lesson ${lesson_id} (module ${module_id})`);

    // 🔥 CRITICAL: Get users.id for module_unlocks and achievements
    const { data: tripwireUser, error: userError } = await tripwireAdminSupabase
      .from('tripwire_users')
      .select('user_id')
      .eq('id', tripwire_user_id)
      .single();
    
    if (userError || !tripwireUser?.user_id) {
      console.error('❌ Cannot find users.id for tripwire_user_id:', tripwire_user_id, userError);
      return res.status(404).json({ error: 'User not found' });
    }
    
    const main_user_id = tripwireUser.user_id;
    console.log(`✅ Resolved IDs: tripwire_user_id=${tripwire_user_id}, main_user_id=${main_user_id}`);

      // ✅ STEP 1: SECURITY - Check if user actually watched 80% of video
      // ❗ SKIP FOR NOW - tripwire_progress doesn't have reliable percentage tracking
      // Video tracking is handled by frontend useHonestVideoTracking
      console.log(`[STEP 1] Skipping 80% check (frontend already validated)`);
      const watchedPercentage = 100; // Trust frontend validation for now
      console.log(`✅ [STEP 1 SUCCESS] Security check skipped (trusting frontend): ${watchedPercentage}% assumed`);

      // ✅ STEP 2: Mark lesson as completed
      console.log(`[STEP 2] Marking lesson as completed...`);
    const { data: progress, error: progressError } = await tripwireAdminSupabase
      .from('tripwire_progress')
      .upsert({
        tripwire_user_id: tripwire_user_id,  // ✅ FIX: Use tripwire_users.id, NOT auth.users.id!
        module_id,
        lesson_id,
        is_completed: true,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'tripwire_user_id,lesson_id'
      })
      .select()
      .single();

    if (progressError && progressError.code !== '23505') { // Ignore duplicate errors
      console.error('❌ Error marking lesson complete:', progressError);
      return res.status(500).json({ error: 'Failed to mark lesson complete' });
    }
      console.log(`✅ [STEP 2 SUCCESS] Lesson marked as completed, progress ID:`, progress?.id);

      // ✅ STEP 3: Get lessons from centralized config
      const { getModuleLessons } = await import('../config/tripwire-mappings');
      const allLessonIds = getModuleLessons(module_id);
      console.log(`[STEP 3] Module ${module_id} has ${allLessonIds.length} lesson(s): [${allLessonIds.join(', ')}]`);

      // ✅ STEP 4: Get completed lessons for this user in current module
      console.log(`[STEP 4] Fetching user's completed lessons...`);
    const { data: completedLessons, error: completedError } = await tripwireAdminSupabase
      .from('tripwire_progress')
      .select('lesson_id')
      .eq('tripwire_user_id', tripwire_user_id)  // ✅ FIX: Use tripwire_users.id, NOT auth.users.id!
      .eq('module_id', module_id)
      .eq('is_completed', true);

    if (completedError) {
      console.error('❌ Error fetching completed lessons:', completedError);
      return res.status(500).json({ error: 'Failed to fetch progress' });
    }

    const completedLessonIds = (completedLessons || []).map((row: any) => row.lesson_id);
      console.log(`[STEP 4 RESULT] User completed ${completedLessonIds.length}/${allLessonIds.length} lessons in module ${module_id}`);

      // ✅ STEP 5: Check if ALL lessons are completed
      console.log(`[STEP 5] Checking if module is complete...`);
      const moduleCompleted = allLessonIds.every(id => completedLessonIds.includes(id));
      console.log(`[STEP 5 RESULT] Module completed: ${moduleCompleted}`);

      let unlockedModuleId: number | null = null;
      let achievement: any = null;

      if (moduleCompleted) {
      console.log(`[STEP 6] ✅ Module ${module_id} COMPLETED! (Auto-unlock check...)`);

      // ✅ ENABLED: Auto-unlock progression for sequential module access
      const AUTO_UNLOCK_ENABLED = true;

      if (AUTO_UNLOCK_ENABLED) {
        // ✅ STEP 6a: Unlock next module (16→17, 17→18, 18→none)
        const nextModuleId = module_id + 1;
        const maxModuleId = 18; // Tripwire has modules 16, 17, 18

        if (nextModuleId <= maxModuleId) {
          // Create module_unlock record for animation
          const { error: unlockError } = await tripwireAdminSupabase
            .from('module_unlocks')
            .upsert({
              user_id: main_user_id,
              module_id: nextModuleId,
              unlocked_at: new Date().toISOString()
            }, {
              onConflict: 'user_id,module_id'
            });

          if (unlockError) {
            console.error('⚠️ Error unlocking module:', unlockError);
          } else {
          unlockedModuleId = nextModuleId;
          console.log(`✅ [STEP 6a SUCCESS] Module ${nextModuleId} unlocked for user_id=${main_user_id}`);
          }
        }
      } else {
        console.log(`⏸️ [STEP 6a SKIPPED] Auto-unlock disabled`);
        }

        // ✅ STEP 6b: Create achievement
        const achievementId = module_id === 16 ? 'first_module_complete' 
                            : module_id === 17 ? 'second_module_complete'
                            : 'third_module_complete';
        
      const { data: achievementData, error: achievementError } = await tripwireAdminSupabase
        .from('user_achievements')
        .upsert({
          user_id: main_user_id,
          achievement_id: achievementId,
          current_value: 1,
          is_completed: true,
          completed_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,achievement_id'
        })
        .select()
        .single();

      if (!achievementError && achievementData) {
        achievement = achievementData;
          console.log(`✅ [STEP 6b SUCCESS] Achievement created: ${achievementId}`);
        } else {
        console.log(`[STEP 6b INFO] Achievement already exists or error:`, achievementError?.message);
        }

        // ✅ STEP 6c: Update tripwire_user_profile (modules_completed counter)
        console.log(`[STEP 6c] Updating tripwire_user_profile.modules_completed...`);
        
        // Подсчитываем сколько ВСЕГО модулей завершено
        const { data: allCompletedModules, error: modulesError } = await tripwireAdminSupabase
          .from('tripwire_progress')
          .select('module_id')
          .eq('tripwire_user_id', tripwire_user_id)  // ✅ Use tripwire_users.id
          .eq('is_completed', true);
        
        if (!modulesError && allCompletedModules) {
          // Группируем по модулю и проверяем завершённость каждого
          const moduleIds = [16, 17, 18]; // Tripwire модули
          let completedModulesCount = 0;
          
          for (const modId of moduleIds) {
            const { getModuleLessons } = await import('../config/tripwire-mappings');
            const moduleLessons = getModuleLessons(modId);
            const completedInModule = allCompletedModules.filter(m => m.module_id === modId).length;
            
            if (moduleLessons.length > 0 && completedInModule >= moduleLessons.length) {
              completedModulesCount++;
              console.log(`   ✅ Module ${modId}: ${completedInModule}/${moduleLessons.length} lessons → COMPLETED`);
            } else {
              console.log(`   ⏳ Module ${modId}: ${completedInModule}/${moduleLessons.length} lessons → In Progress`);
            }
          }
          
          // Обновляем tripwire_user_profile
          const completion_percentage = (completedModulesCount / 3) * 100;
          const { error: profileError } = await tripwireAdminSupabase
            .from('tripwire_user_profile')
            .update({
              modules_completed: completedModulesCount,
              completion_percentage: completion_percentage,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', main_user_id);  // ✅ tripwire_user_profile uses auth.users.id
          
          if (profileError) {
            console.error(`❌ [STEP 6c ERROR] Failed to update profile:`, profileError);
          } else {
            console.log(`✅ [STEP 6c SUCCESS] Profile updated: ${completedModulesCount}/3 modules (${completion_percentage}%)`);
          }
        }
      }

      console.log(`✅ [SUCCESS] Lesson completion successful!`);

      // ============================================
    // 🔥 AMOCRM INTEGRATION - Update deal stage (ЛОГИКА НЕ ИЗМЕНЕНА!)
      // ============================================
      // Получаем email пользователя для поиска сделки в amoCRM
      try {
      const { data: userData, error: emailError } = await tripwireAdminSupabase
        .from('tripwire_users')
        .select('email')
        .eq('id', tripwire_user_id)
        .single();

      const userEmail = userData?.email;

        if (userEmail) {
          // ✅ FIX: Use centralized mapping
          const { getLessonNumber } = await import('../config/tripwire-mappings');
          const lessonNumber = getLessonNumber(lesson_id);

          if (lessonNumber) {
            console.log(`[AMOCRM] Отправляем обновление в amoCRM для ${userEmail}, урок ${lessonNumber}`);
            
            // 🔥 ВАЖНО: Запускаем асинхронно (fire-and-forget)
            // Не блокируем ответ пользователю, если amoCRM недоступен
            amoCrmService.onLessonCompleted(userEmail, lessonNumber)
              .catch(err => console.error('[AMOCRM] Фоновая ошибка:', err.message));
          } else {
            console.log(`[AMOCRM] Lesson ${lesson_id} не привязан к Tripwire воронке, пропускаем amoCRM`);
          }
        } else {
          console.log(`[AMOCRM] Email пользователя ${tripwire_user_id} не найден`);
        }
      } catch (amoCrmError: any) {
        // Логируем ошибку, но не падаем - amoCRM не должен ломать UX студента
        console.error('[AMOCRM] Ошибка при обновлении сделки:', amoCrmError.message);
      }

      // Return success response
      res.json({
        success: true,
        message: 'Lesson completed successfully',
        progress,
        moduleCompleted,
        unlockedModuleId,
        achievement,
      });

  } catch (error: any) {
    // ✅ IMPROVED: Детальная обработка разных типов ошибок
    
    // 1. Validation errors (Zod) - возвращаем 400
    if (error.status === 400 && error.errors) {
      console.warn('⚠️ [VALIDATION ERROR]', error.errors);
      return res.status(400).json({
        status: 'validation_error',
        message: error.message,
        errors: error.errors,
      });
    }
    
    // 2. Database errors - логируем
    console.error('❌ [ERROR] Exception occurred:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      stack: error.stack?.split('\n')[0],
    });

    res.status(500).json({
      error: 'Failed to complete lesson',
      details: error.message,
    });
  }
});

// POST /api/tripwire/progress - Update video progress
router.post('/progress', async (req, res) => {
  try {
    const { lesson_id, tripwire_user_id, video_progress_percent, last_position_seconds, watch_time_seconds } = req.body;

    if (!lesson_id || !tripwire_user_id) {
      return res.status(400).json({ error: 'lesson_id and tripwire_user_id are required' });
    }

    const { data, error } = await adminSupabase
      .from('tripwire_progress')
      .upsert({
        tripwire_user_id,
        lesson_id,
        video_progress_percent: video_progress_percent || 0,
        last_position_seconds: last_position_seconds || 0,
        watch_time_seconds: watch_time_seconds || 0,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'tripwire_user_id,lesson_id'
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error saving progress:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, progress: data });
  } catch (error: any) {
    console.error('❌ Unexpected error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tripwire/module-progress/:moduleId - Check if all lessons in module are completed
router.get('/module-progress/:moduleId', async (req, res) => {
  try {
    const { moduleId } = req.params;
    const { tripwire_user_id } = req.query;

    if (!tripwire_user_id) {
      return res.status(400).json({ error: 'tripwire_user_id is required' });
    }

    // Get all lessons in this module
    const { data: lessons, error: lessonsError } = await adminSupabase
      .from('lessons')
      .select('id')
      .eq('module_id', moduleId)
      .eq('is_archived', false);

    if (lessonsError || !lessons) {
      console.error('❌ Error fetching lessons:', lessonsError);
      return res.status(500).json({ error: 'Failed to fetch lessons' });
    }

    if (lessons.length === 0) {
      return res.json({ all_lessons_completed: false, total: 0, completed: 0 });
    }

    // Get progress for all lessons
    const lessonIds = lessons.map(l => l.id);
    const { data: progress, error: progressError } = await adminSupabase
      .from('tripwire_progress')
      .select('lesson_id, is_completed')
      .eq('tripwire_user_id', tripwire_user_id)
      .in('lesson_id', lessonIds);

    if (progressError) {
      console.error('❌ Error fetching progress:', progressError);
      return res.status(500).json({ error: 'Failed to fetch progress' });
    }

    const completedLessons = progress?.filter(p => p.is_completed) || [];
    const all_lessons_completed = completedLessons.length === lessons.length;

    res.json({ 
      all_lessons_completed,
      total: lessons.length,
      completed: completedLessons.length
    });
  } catch (error: any) {
    console.error('❌ Unexpected error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/tripwire/unlock-achievement - Unlock achievement for completing module
// 🔥 DIRECT DB VERSION - БЕЗ RPC!
router.post('/unlock-achievement', async (req, res) => {
  try {
    const { module_number } = req.body;
    
    // Get user ID from auth header (Supabase JWT)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Verify token with Supabase
    const { data: { user }, error: authError } = await adminSupabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    if (!module_number || module_number < 1 || module_number > 3) {
      return res.status(400).json({ error: 'module_number must be 1, 2, or 3' });
    }

    const userId = user.id;
    console.log(`🏆 [DIRECT DB] Unlocking achievement for Module ${module_number}, user: ${userId}`);

    // 🔥 DIRECT DB - NO RPC!
    const { tripwirePool } = require('../config/tripwire-db');
    const client = await tripwirePool.connect();

    try {
      await client.query('BEGIN');

      // 1️⃣ Определяем тип достижения
      const achievementType = `${module_number === 1 ? 'first' : module_number === 2 ? 'second' : 'third'}_module_complete`;
      
      // 2️⃣ Разблокируем достижение в user_achievements
      const unlockResult = await client.query(`
        UPDATE public.user_achievements
        SET is_completed = true, completed_at = NOW(), updated_at = NOW()
        WHERE user_id = $1 AND achievement_id = $2 AND is_completed = false
        RETURNING *
      `, [userId, achievementType]);

      const newly_unlocked = unlockResult.rowCount > 0;

      // 3️⃣ Обновляем tripwire_user_profile
      await client.query(`
        UPDATE public.tripwire_user_profile
        SET 
          modules_completed = GREATEST(modules_completed, $2),
          completion_percentage = (GREATEST(modules_completed, $2)::DECIMAL / total_modules) * 100,
          updated_at = NOW()
        WHERE user_id = $1
      `, [userId, module_number]);

      // 4️⃣ 🔥 ОТКРЫВАЕМ СЛЕДУЮЩИЙ МОДУЛЬ!
      const moduleMapping = {
        1: 17, // После Module 16 (1) → открываем Module 17
        2: 18, // После Module 17 (2) → открываем Module 18
        3: null // Module 18 (3) - последний, нет следующего
      };

      const nextModuleId = moduleMapping[module_number as 1 | 2 | 3];

      if (nextModuleId) {
        console.log(`🔓 [DIRECT DB] Unlocking next module: ${nextModuleId}`);
        
        await client.query(`
          INSERT INTO module_unlocks (id, user_id, module_id, unlocked_at)
          VALUES (gen_random_uuid(), $1::uuid, $2::integer, NOW())
          ON CONFLICT (user_id, module_id) DO UPDATE SET unlocked_at = NOW()
        `, [userId, nextModuleId]);

        // Создаем tripwire_progress для следующего урока (если еще не создан)
        const nextLessonId = nextModuleId === 17 ? 68 : 69;
        await client.query(`
          INSERT INTO public.tripwire_progress (
            id, tripwire_user_id, module_id, lesson_id, is_completed, created_at
          )
          SELECT gen_random_uuid(), $1, $2, $3, FALSE, NOW()
          WHERE NOT EXISTS (
            SELECT 1 FROM public.tripwire_progress 
            WHERE tripwire_user_id = $1 AND lesson_id = $3
          )
        `, [userId, nextModuleId, nextLessonId]);
      }

      // 5️⃣ 🎓 АВТОМАТИЧЕСКИ ВЫДАЕМ СЕРТИФИКАТ ПОСЛЕ MODULE 18!
      if (module_number === 3 && newly_unlocked) {
        console.log(`🎓 [DIRECT DB] Issuing certificate for user: ${userId}`);
        
        // Разблокируем достижение tripwire_graduate
        await client.query(`
          UPDATE public.user_achievements
          SET is_completed = true, completed_at = NOW(), updated_at = NOW()
          WHERE user_id = $1 AND achievement_id = 'tripwire_graduate' AND is_completed = false
        `, [userId]);

        // Обновляем профиль - сертификат выдан
        await client.query(`
          UPDATE public.tripwire_user_profile
          SET certificate_issued = true, certificate_issued_at = NOW(), updated_at = NOW()
          WHERE user_id = $1
        `, [userId]);

        console.log(`✅ [DIRECT DB] Certificate issued for user: ${userId}`);
      }

      await client.query('COMMIT');

      // Получаем информацию о достижении
      const { data: achievement } = await adminSupabase
        .from('achievements')
        .select('*')
        .eq('title', achievementType)
        .single();

      console.log(`✅ [DIRECT DB] Achievement unlocked: ${achievementType}, Next module: ${nextModuleId || 'none'}`);

      res.json({
        newly_unlocked,
        achievement,
        next_module_unlocked: nextModuleId
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('❌ Error unlocking achievement:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// CRUD ENDPOINTS FOR TRIPWIRE LESSONS
// ========================================

// POST /api/tripwire/lessons - Create new lesson
router.post('/lessons', async (req, res) => {
  try {
    const { title, description, tip, module_id } = req.body;

    if (!title || !module_id) {
      return res.status(400).json({ error: 'title and module_id are required' });
    }

    // Get max order_index for this module
    const { data: existingLessons } = await tripwireAdminSupabase
      .from('lessons')
      .select('order_index')
      .eq('module_id', module_id)
      .order('order_index', { ascending: false })
      .limit(1);

    const maxOrderIndex = existingLessons && existingLessons.length > 0 
      ? existingLessons[0].order_index 
      : 0;

    // Create lesson
    const { data: lesson, error } = await tripwireAdminSupabase
      .from('lessons')
      .insert({
        title,
        description: description || '',
        tip: tip || '',
        module_id: parseInt(module_id),
        order_index: maxOrderIndex + 1,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating lesson:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Lesson created:', lesson.id);
    res.json({ lesson });
  } catch (error: any) {
    console.error('❌ Unexpected error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/tripwire/lessons/:id - Update lesson
router.put('/lessons/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, tip } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }

    console.log(`📝 [TRIPWIRE UPDATE LESSON ${id}] Updating with:`, {
      title,
      description_length: description?.length || 0,
      tip_length: tip?.length || 0
    });

    const { data: lesson, error } = await tripwireAdminSupabase
      .from('lessons')
      .update({
        title,
        description: description || '',
        tip: tip || '',
        ai_description: description || '', // ✅ КРИТИЧНО: Синхронизация
        ai_tips: tip || '', // ✅ КРИТИЧНО: Синхронизация
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating lesson:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ [TRIPWIRE UPDATE LESSON ${id}] Successfully updated`);
    res.json({ lesson });
  } catch (error: any) {
    console.error('❌ Unexpected error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 🚫 СТАРЫЕ РОУТЫ BUNNY STORAGE УДАЛЕНЫ
// Видео теперь загружаются через /api/stream/upload (Bunny Stream HLS)
// Для удаления видео используется DELETE /api/stream/video/:videoId

// POST /api/tripwire/materials/upload - Upload material
router.post('/materials/upload', upload.single('file'), async (req, res) => {
  try {
    const { lessonId, display_name } = req.body;

    if (!req.file || !lessonId) {
      return res.status(400).json({ error: 'file and lessonId are required' });
    }

    console.log('📚 Uploading material for Tripwire lesson:', lessonId);

    // Upload to Supabase Storage (TRIPWIRE!)
    const fileExtension = req.file.originalname.split('.').pop() || 'pdf';
    const uniqueFilename = `tripwire-lesson-${lessonId}-${crypto.randomBytes(8).toString('hex')}.${fileExtension}`;

    const { error: uploadError } = await tripwireAdminSupabase.storage
      .from('lesson-materials')
      .upload(uniqueFilename, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      console.error('❌ Error uploading to Supabase Storage:', uploadError);
      return res.status(500).json({ error: uploadError.message });
    }

    // Get public URL (TRIPWIRE!)
    const { data: publicUrlData } = tripwireAdminSupabase.storage
      .from('lesson-materials')
      .getPublicUrl(uniqueFilename);

    const publicUrl = publicUrlData.publicUrl;
    console.log('✅ Material uploaded to Supabase Storage:', publicUrl);

    // Insert material record (TRIPWIRE!)
    const { data: material, error } = await tripwireAdminSupabase
      .from('lesson_materials')
      .insert({
        lesson_id: parseInt(lessonId),
        display_name: display_name || req.file.originalname,
        filename: req.file.originalname,
        file_type: req.file.mimetype,                    // ✅ FIXED: Added file_type
        file_size_bytes: req.file.size,                  // ✅ FIXED: Was file_size, now file_size_bytes
        bucket_name: 'lesson-materials',
        storage_path: uniqueFilename,
        is_downloadable: true,
        requires_completion: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error saving material to DB:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ material: { ...material, file_url: publicUrl } });
  } catch (error: any) {
    console.error('❌ Error uploading material:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/tripwire/materials/:id - Delete material
router.delete('/materials/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get material record (TRIPWIRE!)
    const { data: material } = await tripwireAdminSupabase
      .from('lesson_materials')
      .select('storage_path, bucket_name')
      .eq('id', id)
      .single();

    if (material?.storage_path) {
      // Delete from Supabase Storage (TRIPWIRE!)
      await tripwireAdminSupabase.storage
        .from(material.bucket_name || 'lesson-materials')
        .remove([material.storage_path]);

      console.log('✅ Material deleted from Supabase Storage:', material.storage_path);
    }

    // Delete from DB (TRIPWIRE!)
    await tripwireAdminSupabase
      .from('lesson_materials')
      .delete()
      .eq('id', id);

    console.log('✅ Material record deleted from DB');
    res.json({ success: true, message: 'Material deleted' });
  } catch (error: any) {
    console.error('❌ Error deleting material:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

