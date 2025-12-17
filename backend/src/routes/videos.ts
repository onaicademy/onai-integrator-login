import express, { Request, Response } from 'express';
import { adminSupabase } from '../config/supabase';
import axios from 'axios';

const router = express.Router();

const BUNNY_API_KEY = process.env.BUNNY_STREAM_API_KEY || '';
const BUNNY_LIBRARY_ID = process.env.BUNNY_STREAM_LIBRARY_ID || '';

/**
 * 🎬 GET /api/videos/lesson/:lessonId
 * Get video data for a lesson from video_content table
 * Used by LessonEditDialog after upload to fetch video info
 */
router.get('/lesson/:lessonId', async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.params;
    
    console.log(`🔍 [GET VIDEO] Fetching video for lesson: ${lessonId}`);

    // Получаем видео из таблицы video_content
    const { data: video, error } = await adminSupabase
      .from('video_content')
      .select('*')
      .eq('lesson_id', parseInt(lessonId))
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !video) {
      console.log(`⚠️ [GET VIDEO] Video not found for lesson ${lessonId}`);
      return res.status(404).json({ 
        success: false, 
        error: 'Video not found for this lesson' 
      });
    }

    console.log(`✅ [GET VIDEO] Video found for lesson ${lessonId}:`, {
      id: video.id,
      bunny_video_id: video.bunny_video_id,
      public_url: video.public_url
    });

    // Возвращаем данные видео
    return res.json({
      success: true,
      video: {
        id: video.id,
        lesson_id: video.lesson_id,
        bunny_video_id: video.bunny_video_id,
        public_url: video.public_url,
        r2_url: video.public_url, // Для обратной совместимости
        video_url: video.public_url, // Для обратной совместимости
        filename: video.filename,
        duration_seconds: video.duration_seconds,
        file_size_bytes: video.file_size_bytes,
        upload_status: video.upload_status,
        transcoding_status: video.transcoding_status,
        created_at: video.created_at,
        updated_at: video.updated_at
      }
    });

  } catch (error: any) {
    console.error('❌ [GET VIDEO] Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch video',
      details: error.message 
    });
  }
});

/**
 * 🎬 GET /api/videos/bunny-status/:videoId
 * Check transcoding status from Bunny CDN API
 * Returns: processing progress (0-100%) and status
 */
router.get('/bunny-status/:videoId', async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;
    
    console.log(`🔍 [BUNNY STATUS] Checking status for video: ${videoId}`);

    // ✅ Check if Bunny CDN is configured
    if (!BUNNY_API_KEY || BUNNY_API_KEY === 'placeholder_key') {
      console.warn('⚠️ [BUNNY STATUS] Bunny CDN not configured, returning default status');
      return res.json({
        success: true,
        status: 'ready',  // ✅ 'ready' вместо 'finished'
        progress: 100,
        bunnyStatus: 4,   // ✅ Добавляем bunnyStatus для совместимости
        availableResolutions: '1080p,720p,480p,360p',  // ✅ Дефолтные разрешения
        message: 'Video ready (Bunny CDN not configured)'
      });
    }

    // Запрашиваем статус из Bunny Stream API
    const bunnyResponse = await axios.get(
      `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${videoId}`,
      {
        headers: {
          'AccessKey': BUNNY_API_KEY
        }
      }
    );

    const videoData = bunnyResponse.data;
    
    console.log(`✅ [BUNNY STATUS] Response:`, {
      status: videoData.status,
      availableResolutions: videoData.availableResolutions,
      encodeProgress: videoData.encodeProgress
    });

    // Определяем статус транскодинга
    // Bunny CDN статусы:
    // 0 = Created (queued)
    // 1 = Uploaded
    // 2 = Processing
    // 3 = Encoding (В ПРОЦЕССЕ! НЕ ОШИБКА!)
    // 4 = Finished ✅
    // 5 = Failed ❌
    
    let transcodingStatus = 'processing';
    let progress = 0;
    
    if (videoData.status === 0 || videoData.status === 1) {
      // Queued / Uploaded
      transcodingStatus = 'processing';
      progress = videoData.encodeProgress || 0;
    } else if (videoData.status === 2 || videoData.status === 3) {
      // Processing / Encoding
      transcodingStatus = 'processing';
      progress = videoData.encodeProgress || 0;
    } else if (videoData.status === 4) {
      // Finished
      transcodingStatus = 'ready';
      progress = 100;
    } else if (videoData.status === 5) {
      // Failed
      transcodingStatus = 'failed';
      progress = 0;
    }

    // Обновляем статус в БД
    await adminSupabase
      .from('video_content')
      .update({ 
        transcoding_status: transcodingStatus,
        updated_at: new Date().toISOString()
      })
      .eq('bunny_video_id', videoId);

    return res.json({
      success: true,
      status: transcodingStatus,
      progress: progress,
      bunnyStatus: videoData.status,
      availableResolutions: videoData.availableResolutions || '',
      duration: videoData.length || 0
    });

  } catch (error: any) {
    console.error('❌ [BUNNY STATUS] Error:', error.response?.data || error.message);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to check video status',
      details: error.response?.data || error.message 
    });
  }
});

/**
 * 🎯 POST /api/videos/update-duration/:videoId
 * Обновляет video_duration в таблице lessons из BunnyCDN
 */
router.post('/update-duration/:videoId', async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;
    const lessonId = req.query.lesson_id as string;

    if (!lessonId) {
      return res.status(400).json({ error: 'lesson_id is required' });
    }

    console.log(`🔄 [UPDATE DURATION] Updating duration for video ${videoId}, lesson ${lessonId}`);

    // Получаем данные видео из BunnyCDN
    const response = await axios.get(
      `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${videoId}`,
      {
        headers: {
          'AccessKey': BUNNY_API_KEY
        }
      }
    );

    const videoData = response.data;
    const duration = videoData.length || 0; // Duration in seconds

    console.log(`📊 [UPDATE DURATION] Video duration: ${duration}s (${Math.round(duration / 60)} min)`);

    // Обновляем таблицу lessons в Tripwire DB
    const { error: updateError } = await adminSupabase
      .from('lessons')
      .update({ video_duration: duration })
      .eq('id', parseInt(lessonId));

    if (updateError) {
      console.error('❌ [UPDATE DURATION] Failed to update lessons table:', updateError);
      throw updateError;
    }

    console.log(`✅ [UPDATE DURATION] Successfully updated lesson ${lessonId} with duration ${duration}s`);

    return res.json({
      success: true,
      duration,
      durationMinutes: Math.round(duration / 60)
    });

  } catch (error: any) {
    console.error('❌ [UPDATE DURATION] Error:', error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to update video duration',
      details: error.response?.data || error.message
    });
  }
});

export default router;

