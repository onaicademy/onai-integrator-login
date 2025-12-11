import { Router, Request, Response } from 'express';
import { authenticateJWT } from '../../middleware/auth';
import { createClient } from '@supabase/supabase-js';
import { generateTranscription, getTranscription } from '../../services/transcriptionService';

// Helper to check if user is admin
const requireAdmin = async (req: Request, res: Response, next: Function) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: user, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    next();
  } catch (error: any) {
    console.error('Admin check error:', error);
    return res.status(500).json({ error: error.message });
  }
};

const router = Router();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Получить статистику транскрибаций (для админ-дашборда)
router.get('/stats', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    // ✅ Получить module_id модулей Tripwire (course_id = 13)
    const { data: tripwireModules } = await supabase
      .from('modules')
      .select('id')
      .eq('course_id', 13);
    
    const tripwireModuleIds = tripwireModules?.map((m: any) => m.id) || [];

    // ✅ Получить все уроки основной платформы (ИСКЛЮЧАЯ Tripwire)
    let query = supabase
      .from('lessons')
      .select('id, bunny_video_id', { count: 'exact', head: true })
      .not('bunny_video_id', 'is', null);
    
    if (tripwireModuleIds.length > 0) {
      query = query.not('module_id', 'in', `(${tripwireModuleIds.join(',')})`);
    }
    
    const { count: totalLessons } = await query;

    // ✅ Получить completed транскрипции
    const { data: transcriptions } = await supabase
      .from('video_transcriptions')
      .select('video_id, status')
      .eq('status', 'completed');

    const completedCount = transcriptions?.length || 0;

    res.json({
      success: true,
      stats: {
        total: totalLessons || 0,
        completed: completedCount,
        pending: (totalLessons || 0) - completedCount
      }
    });
  } catch (error: any) {
    console.error('Error fetching transcription stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Получить список всех уроков с транскрибациями (ОСНОВНАЯ ПЛАТФОРМА, НЕ TRIPWIRE)
router.get('/lessons', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    // ✅ ШАГ 1: Получить module_id модулей Tripwire (course_id = 13)
    const { data: tripwireModules } = await supabase
      .from('modules')
      .select('id')
      .eq('course_id', 13); // ✅ FIXED: Tripwire course_id = 13
    
    const tripwireModuleIds = tripwireModules?.map((m: any) => m.id) || [];
    console.log('🎯 [MainPlatform Transcriptions] Excluding Tripwire modules:', tripwireModuleIds);

    // ✅ ШАГ 2: Получить уроки основной платформы (ИСКЛЮЧАЯ Tripwire)
    let query = supabase
      .from('lessons')
      .select(`
        id, 
        title, 
        bunny_video_id, 
        module_id, 
        order_index,
        modules ( 
          id, 
          title,
          course_id
        )
      `)
      .not('bunny_video_id', 'is', null);
    
    // 🎯 ИСКЛЮЧАЕМ все модули Tripwire (course_id = 4)
    if (tripwireModuleIds.length > 0) {
      query = query.not('module_id', 'in', `(${tripwireModuleIds.join(',')})`);
    }
    
    const { data: lessons, error } = await query
      .order('module_id', { ascending: true })
      .order('order_index', { ascending: true });

    if (error) throw error;

    if (!lessons || lessons.length === 0) {
      return res.json({
        success: true,
        lessons: []
      });
    }

    // ✅ Для каждого video_id берём ПОСЛЕДНЮЮ completed транскрибацию
    const videoIds = lessons.map((l: any) => l.bunny_video_id).filter(Boolean);

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

    // ✅ Объединить данные
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
    console.error('Error fetching lessons:', error);
    res.status(500).json({ error: error.message });
  }
});

// Получить транскрибацию конкретного урока
router.get('/lesson/:lessonId', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { lessonId } = req.params;

    // Получить урок
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('id, title, bunny_video_id')
      .eq('id', lessonId)
      .single();

    if (lessonError) throw lessonError;

    if (!lesson.bunny_video_id) {
      return res.status(404).json({ error: 'Lesson has no video' });
    }

    // Получить транскрибацию
    const transcription = await getTranscription(lesson.bunny_video_id);

    if (!transcription) {
      return res.status(404).json({ error: 'Transcription not found' });
    }

    res.json({
      success: true,
      lesson: {
        id: lesson.id,
        title: lesson.title,
        video_id: lesson.bunny_video_id
      },
      transcription: {
        text: transcription.transcript_text,
        srt: transcription.transcript_srt,
        vtt: transcription.transcript_vtt,
        word_count: transcription.word_count,
        status: transcription.status,
        generated_at: transcription.generated_at
      }
    });
  } catch (error: any) {
    console.error('Error fetching transcription:', error);
    res.status(500).json({ error: error.message });
  }
});

// Запустить транскрибацию для урока
router.post('/lesson/:lessonId/transcribe', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { lessonId } = req.params;

    // Получить урок
    const { data: lesson, error } = await supabase
      .from('lessons')
      .select('id, title, bunny_video_id')
      .eq('id', lessonId)
      .single();

    if (error) throw error;

    if (!lesson.bunny_video_id) {
      return res.status(400).json({ error: 'Lesson has no video' });
    }

    // Построить URL видео (HLS playlist для транскрибации)
    const videoUrl = `https://${process.env.BUNNY_STREAM_CDN_HOSTNAME}/${lesson.bunny_video_id}/playlist.m3u8`;

    // Запустить транскрибацию асинхронно
    generateTranscription(lesson.bunny_video_id, videoUrl)
      .then(() => console.log(`✅ Transcription completed for lesson ${lessonId}`))
      .catch(err => console.error(`❌ Transcription failed for lesson ${lessonId}:`, err));

    res.json({
      success: true,
      message: 'Transcription started',
      lesson_id: lessonId,
      video_id: lesson.bunny_video_id
    });
  } catch (error: any) {
    console.error('Error starting transcription:', error);
    res.status(500).json({ error: error.message });
  }
});

// Транскрибировать все уроки без транскрибаций (ОСНОВНАЯ ПЛАТФОРМА, НЕ TRIPWIRE)
router.post('/transcribe-all', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    // ✅ Получить module_id модулей Tripwire (course_id = 13)
    const { data: tripwireModules } = await supabase
      .from('modules')
      .select('id')
      .eq('course_id', 13); // ✅ FIXED: Tripwire course_id = 13
    
    const tripwireModuleIds = tripwireModules?.map((m: any) => m.id) || [];
    
    // ✅ Получить все уроки с видео (ИСКЛЮЧАЯ Tripwire)
    let query = supabase
      .from('lessons')
      .select('id, title, bunny_video_id, module_id')
      .not('bunny_video_id', 'is', null);
    
    // 🎯 ИСКЛЮЧАЕМ все модули Tripwire (course_id = 4)
    if (tripwireModuleIds.length > 0) {
      query = query.not('module_id', 'in', `(${tripwireModuleIds.join(',')})`);
    }
    
    const { data: lessons, error: lessonsError } = await query;

    if (lessonsError) throw lessonsError;

    // Получить уже существующие транскрибации
    const { data: existingTranscriptions } = await supabase
      .from('video_transcriptions')
      .select('video_id')
      .eq('status', 'completed');

    const existingVideoIds = new Set(
      existingTranscriptions?.map(t => t.video_id) || []
    );

    // Отфильтровать уроки без транскрибаций
    const lessonsToTranscribe = lessons.filter(
      lesson => !existingVideoIds.has(lesson.bunny_video_id)
    );

    console.log(`🎙️ Starting batch transcription for ${lessonsToTranscribe.length} lessons`);

    // Запустить транскрибацию для каждого урока (последовательно с задержкой)
    let processed = 0;
    for (const lesson of lessonsToTranscribe) {
      const videoUrl = `https://${process.env.BUNNY_STREAM_CDN_HOSTNAME}/${lesson.bunny_video_id}/playlist.m3u8`;
      
      // Запустить асинхронно
      generateTranscription(lesson.bunny_video_id, videoUrl)
        .then(() => {
          processed++;
          console.log(`✅ [${processed}/${lessonsToTranscribe.length}] Transcription completed for lesson ${lesson.id}`);
        })
        .catch(err => {
          processed++;
          console.error(`❌ [${processed}/${lessonsToTranscribe.length}] Transcription failed for lesson ${lesson.id}:`, err);
        });
      
      // Задержка между запусками (чтобы не перегрузить API)
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    res.json({
      success: true,
      message: 'Batch transcription started',
      total_lessons: lessonsToTranscribe.length
    });
  } catch (error: any) {
    console.error('Error starting batch transcription:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

