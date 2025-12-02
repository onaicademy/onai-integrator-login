import { Router } from 'express';
import { authenticateJWT, requireAdmin } from '../../middleware/auth';
import { supabase } from '../../config/supabase';

const router = Router();

/**
 * 🎯 GET /api/tripwire/admin/transcriptions/lessons
 * Получить список уроков Tripwire с их транскрибациями
 * ONLY for admin role
 */
router.get('/lessons', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    // ✅ ШАГ 1: Получить модули Tripwire
    // Tripwire использует course_id=13
    const { data: modules } = await supabase
      .from('modules')
      .select('id, title')
      .eq('course_id', 13); // ✅ FIXED: Tripwire course ID

    if (!modules || modules.length === 0) {
      return res.json({
        success: true,
        lessons: []
      });
    }

    const moduleIds = modules.map((m: any) => m.id);

    // ✅ ШАГ 2: Получить уроки Tripwire с video ID
    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select(`
        id,
        title,
        bunny_video_id,
        module_id,
        order_index,
        modules (
          id,
          title
        )
      `)
      .in('module_id', moduleIds)
      .not('bunny_video_id', 'is', null)
      .order('module_id', { ascending: true })
      .order('order_index', { ascending: true });

    if (lessonsError) throw lessonsError;

    if (!lessons || lessons.length === 0) {
      return res.json({
        success: true,
        lessons: []
      });
    }

    // ✅ ШАГ 3: Получить транскрибации из video_transcriptions
    const videoIds = lessons.map((l: any) => l.bunny_video_id).filter(Boolean);

    // Для каждого video_id берём ПОСЛЕДНЮЮ completed транскрибацию
    const transcriptionsPromises = videoIds.map(async (videoId: string) => {
      const { data } = await supabase
        .from('video_transcriptions')
        .select('video_id, status, transcript_text, generated_at')
        .eq('video_id', videoId)
        .eq('status', 'completed')
        .order('generated_at', { ascending: false })
        .limit(1)
        .single();
      
      return data;
    });

    const transcriptionsResults = await Promise.all(transcriptionsPromises);
    const transcriptions = transcriptionsResults.filter(Boolean);

    // ✅ ШАГ 4: Объединить данные
    const lessonsWithStatus = lessons.map((lesson: any) => {
      const transcription = transcriptions?.find(
        (t: any) => t && t.video_id === lesson.bunny_video_id
      );

      return {
        id: lesson.id,
        title: lesson.title,
        bunny_video_id: lesson.bunny_video_id,
        module_id: lesson.module_id,
        modules: lesson.modules,
        transcription_status: transcription ? 'completed' : 'not_started',
        transcript_text: transcription?.transcript_text || null,
        transcribed_at: transcription?.generated_at || null
      };
    });

    res.json({
      success: true,
      lessons: lessonsWithStatus
    });
  } catch (error: any) {
    console.error('❌ Error fetching Tripwire transcription lessons:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 🎯 POST /api/tripwire/admin/transcriptions/transcribe-all
 * Запустить транскрибацию всех уроков Tripwire
 * ONLY for admin role
 */
router.post('/transcribe-all', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    // ✅ ШАГ 1: Получить модули Tripwire курса
    const { data: tripwireModules } = await supabase
      .from('modules')
      .select('id')
      .eq('course_id', 13); // Tripwire course ID
    
    const tripwireModuleIds = tripwireModules?.map((m: any) => m.id) || [16, 17, 18];
    
    // ✅ ШАГ 2: Получить уроки Tripwire без транскрибаций
    const { data: lessons } = await supabase
      .from('lessons')
      .select('id, bunny_video_id')
      .in('module_id', tripwireModuleIds) // ✅ Все модули Tripwire
      .not('bunny_video_id', 'is', null);

    if (!lessons || lessons.length === 0) {
      return res.json({
        success: true,
        total_lessons: 0,
        message: 'No lessons found'
      });
    }

    // ✅ ШАГ 3: Получить уже транскрибированные
    const videoIds = lessons.map((l: any) => l.bunny_video_id);
    const { data: existingTranscriptions } = await supabase
      .from('video_transcriptions')
      .select('video_id, status')
      .in('video_id', videoIds);

    // ✅ ШАГ 4: Фильтровать только не начатые
    const existingVideoIds = new Set(
      existingTranscriptions?.filter((t: any) => t.status !== 'failed').map((t: any) => t.video_id) || []
    );

    const lessonsToTranscribe = lessons.filter(
      (l: any) => !existingVideoIds.has(l.bunny_video_id)
    );

    if (lessonsToTranscribe.length === 0) {
      return res.json({
        success: true,
        total_lessons: 0,
        message: 'All lessons already transcribed or in progress'
      });
    }

    // ✅ ШАГ 4: Создать записи в video_transcriptions со статусом 'pending'
    const transcriptionRecords = lessonsToTranscribe.map((lesson: any) => ({
      video_id: lesson.bunny_video_id,
      status: 'pending',
      created_at: new Date().toISOString()
    }));

    const { error: insertError } = await supabase
      .from('video_transcriptions')
      .insert(transcriptionRecords);

    if (insertError) throw insertError;

    // TODO: Здесь должен быть запуск background job для транскрибации
    // Например, через Bull Queue или отдельный worker

    res.json({
      success: true,
      total_lessons: lessonsToTranscribe.length,
      message: `Started transcription for ${lessonsToTranscribe.length} lessons`
    });
  } catch (error: any) {
    console.error('❌ Error starting batch transcription:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

