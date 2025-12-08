/**
 * Tripwire Transcriptions API
 * Получение транскрипций/субтитров для видео
 */

import express from 'express';
import { tripwireAdminSupabase as supabase } from '../../config/supabase-tripwire';

const router = express.Router();

/**
 * GET /api/tripwire/transcriptions/:videoId
 * Получить транскрипцию по video_id
 */
router.get('/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    
    console.log(`📝 [Transcriptions] Fetching for video: ${videoId}`);

    const { data, error } = await supabase
      .from('video_transcriptions')
      .select('video_id, lesson_id, module_id, transcript_vtt, transcript_text, language, status')
      .eq('video_id', videoId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // Если транскрипции нет - это не ошибка
      if (error.code === 'PGRST116') {
        console.log(`ℹ️  [Transcriptions] Not found for video: ${videoId}`);
        return res.json({ 
          success: true, 
          data: null,
          message: 'No transcription found' 
        });
      }
      
      console.error('❌ [Transcriptions] Error:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }

    console.log(`✅ [Transcriptions] Found for lesson ${data.lesson_id}`);
    
    res.json({
      success: true,
      data: {
        videoId: data.video_id,
        lessonId: data.lesson_id,
        moduleId: data.module_id,
        vttContent: data.transcript_vtt,
        textContent: data.transcript_text,
        language: data.language || 'ru'
      }
    });
  } catch (error: any) {
    console.error('❌ [Transcriptions] Unexpected error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/tripwire/transcriptions/lesson/:lessonId
 * Получить транскрипцию по lesson_id
 */
router.get('/lesson/:lessonId', async (req, res) => {
  try {
    const { lessonId } = req.params;
    
    console.log(`📝 [Transcriptions] Fetching for lesson: ${lessonId}`);

    const { data, error } = await supabase
      .from('video_transcriptions')
      .select('*')
      .eq('lesson_id', parseInt(lessonId))
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log(`ℹ️  [Transcriptions] Not found for lesson: ${lessonId}`);
        return res.json({ 
          success: true, 
          data: null,
          message: 'No transcription found' 
        });
      }
      
      console.error('❌ [Transcriptions] Error:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }

    console.log(`✅ [Transcriptions] Found for video ${data.video_id}`);
    
    res.json({
      success: true,
      data: {
        videoId: data.video_id,
        lessonId: data.lesson_id,
        moduleId: data.module_id,
        vttContent: data.transcript_vtt,
        textContent: data.transcript_text,
        language: data.language || 'ru'
      }
    });
  } catch (error: any) {
    console.error('❌ [Transcriptions] Unexpected error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;
