import { Router, Request, Response } from 'express';
import { adminSupabase } from '../config/supabase';  // ✅ Use admin client with Authorization header

const router = Router();

// POST /api/analytics/video-event - сохранение события просмотра видео
router.post('/video-event', async (req: Request, res: Response) => {
  try {
    console.log('📊 Video analytics event received:', req.body);

    const {
      user_id,
      lesson_id,
      session_id,
      event_type,
      position_seconds,
      playback_rate,
      progress_percent,
    } = req.body;

    // Валидация обязательных полей
    if (!lesson_id || !session_id || !event_type) {
      return res.status(400).json({
        error: 'Missing required fields: lesson_id, session_id, event_type',
      });
    }

    // Валидация event_type
    const validEventTypes = ['play', 'pause', 'progress', 'complete', 'playback_rate_change', 'volume_change', 'quality_change'];
    if (!validEventTypes.includes(event_type)) {
      return res.status(400).json({
        error: `Invalid event_type. Must be one of: ${validEventTypes.join(', ')}`,
      });
    }

    // Сохранение события в БД (собираем только переданные поля)
    const insertData: any = {
      lesson_id: parseInt(lesson_id),
      session_id,
      event_type,
    };

    // Добавляем опциональные поля только если они переданы
    if (user_id) insertData.user_id = user_id;
    if (position_seconds !== undefined && position_seconds !== null) insertData.position_seconds = position_seconds;
    if (playback_rate !== undefined && playback_rate !== null) insertData.playback_rate = playback_rate;
    if (progress_percent !== undefined && progress_percent !== null) insertData.progress_percent = progress_percent;

    const { data, error } = await adminSupabase
      .from('video_analytics')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('❌ Error saving video analytics:', error);
      
      // Если таблица не существует - вернем понятное сообщение
      if (error.message.includes('relation "video_analytics" does not exist')) {
        return res.status(500).json({
          error: 'Video analytics table does not exist. Please run the migration SQL.',
          details: error.message,
        });
      }
      
      throw error;
    }

    console.log('✅ Video analytics saved:', data);

    res.json({
      success: true,
      event: data,
    });
  } catch (error: any) {
    console.error('❌ Video analytics error:', error);
    res.status(500).json({
      error: 'Ошибка сохранения аналитики',
      message: error.message,
    });
  }
});

// GET /api/analytics/video/:lessonId - получение статистики по видео
router.get('/video/:lessonId', async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.params;

    const { data, error } = await adminSupabase
      .from('video_analytics')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    res.json({
      success: true,
      events: data || [],
    });
  } catch (error: any) {
    console.error('❌ Error fetching video analytics:', error);
    res.status(500).json({
      error: 'Ошибка получения аналитики',
      message: error.message,
    });
  }
});

export default router;
