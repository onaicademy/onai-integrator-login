import express, { Request, Response } from 'express';
import multer from 'multer';
import fetch from 'node-fetch';
import { adminSupabase } from '../config/supabase';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// ✅ EXPLICIT CORS для /upload endpoint (preflight OPTIONS)
router.options('/upload', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Max-Age', '86400'); // 24 hours
  res.sendStatus(200);
});

// 📦 Multer для временного хранения файла (МАКСИМАЛЬНЫЕ ЛИМИТЫ)
const upload = multer({
  dest: 'uploads/temp/',
  limits: {
    fileSize: 10 * 1024 * 1024 * 1024, // 10GB max для массовой загрузки
    files: 10, // Максимум 10 файлов одновременно
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/webm'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only video files are allowed.'));
    }
  },
});

// 🐰 BunnyCDN Stream API config
const BUNNY_STREAM_API_KEY = process.env.BUNNY_STREAM_API_KEY || '';
const BUNNY_STREAM_LIBRARY_ID = process.env.BUNNY_STREAM_LIBRARY_ID || '';
const BUNNY_STREAM_CDN_HOSTNAME = process.env.BUNNY_STREAM_CDN_HOSTNAME || 'video.onai.academy';

// 🔍 ДИАГНОСТИКА при старте сервера
console.log('\n🐰 ===== BUNNY STREAM CONFIGURATION =====');
console.log('   BUNNY_STREAM_API_KEY:', BUNNY_STREAM_API_KEY ? `SET (${BUNNY_STREAM_API_KEY.substring(0, 10)}...)` : '❌ NOT SET');
console.log('   BUNNY_STREAM_LIBRARY_ID:', BUNNY_STREAM_LIBRARY_ID ? `SET (${BUNNY_STREAM_LIBRARY_ID})` : '❌ NOT SET');
console.log('   BUNNY_STREAM_CDN_HOSTNAME:', BUNNY_STREAM_CDN_HOSTNAME);
console.log('=========================================\n');

/**
 * 🎯 ОЖИДАНИЕ ГОТОВНОСТИ ВИДЕО И АВТОЗАПУСК ТРАНСКРИБАЦИИ
 * 
 * ⚠️ FALLBACK MECHANISM: Используется если BunnyCDN webhook не настроен
 * 
 * Recommended approach: Configure BunnyCDN webhook instead!
 * Webhook URL: https://api.onai.academy/api/webhooks/bunnycdn
 * Events: VideoEncoded (status 4)
 * 
 * 1. Ждет пока Bunny завершит транскодинг (status = 4)
 * 2. Запускает Groq Whisper транскрибацию
 * 3. Автоматически генерирует описание и советы
 */
async function waitForVideoReadyAndTranscribe(videoId: string): Promise<void> {
  const MAX_ATTEMPTS = 60; // Максимум 10 минут (60 * 10 сек)
  const CHECK_INTERVAL = 10000; // Проверка каждые 10 секунд
  
  console.log(`⏳ [Auto-Pipeline] Waiting for video ${videoId} to finish transcoding...`);
  console.log(`💡 [Auto-Pipeline] TIP: Configure BunnyCDN webhook for faster processing!`);
  
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      // Проверяем статус в Bunny
      const response = await fetch(
        `https://video.bunnycdn.com/library/${BUNNY_STREAM_LIBRARY_ID}/videos/${videoId}`,
        {
          method: 'GET',
          headers: {
            'AccessKey': BUNNY_STREAM_API_KEY,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Bunny API error: ${response.status}`);
      }

      const videoData: any = await response.json();
      const bunnyStatus = videoData.status;
      const encodeProgress = videoData.encodeProgress || 0;

      console.log(`🔍 [Auto-Pipeline] Attempt ${attempt}/${MAX_ATTEMPTS} - Status: ${bunnyStatus}, Progress: ${encodeProgress}%`);

      // Статусы Bunny (ПРАВИЛЬНЫЕ):
      // 0 = Created (queued)
      // 1 = Uploaded  
      // 2 = Processing
      // 3 = Encoding (В ПРОЦЕССЕ! НЕ ОШИБКА!)
      // 4 = Finished ✅
      // 5 = Failed ❌

      if (bunnyStatus === 4) {
        // ✅ Видео готово! Запускаем транскрибацию
        console.log(`✅ [Auto-Pipeline] Video ${videoId} is ready! Starting transcription...`);
        
        const videoUrl = `https://${BUNNY_STREAM_CDN_HOSTNAME}/${videoId}/playlist.m3u8`;
        const { generateTranscription } = require('../services/transcriptionService');
        
        // Обновляем статус в БД
        await adminSupabase
          .from('video_content')
          .update({ 
            transcoding_status: 'ready',
            updated_at: new Date().toISOString()
          })
          .eq('bunny_video_id', videoId);
        
        await generateTranscription(videoId, videoUrl);
        console.log(`✅ [Auto-Pipeline] Transcription completed for ${videoId}`);
        
        return; // Готово!
      } else if (bunnyStatus === 5) {
        // ❌ Транскодинг упал
        console.error(`❌ [Auto-Pipeline] Video ${videoId} transcoding FAILED`);
        
        // Обновляем статус в БД
        await adminSupabase
          .from('video_content')
          .update({ 
            transcoding_status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('bunny_video_id', videoId);
        
        throw new Error('Video transcoding failed in Bunny CDN');
      }

      // Обновляем прогресс в БД
      await adminSupabase
        .from('video_content')
        .update({ 
          transcoding_status: 'processing',
          updated_at: new Date().toISOString()
        })
        .eq('bunny_video_id', videoId);

      // Ждем перед следующей проверкой
      await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
      
    } catch (error: any) {
      console.error(`⚠️ [Auto-Pipeline] Error checking video status (attempt ${attempt}):`, error.message);
      
      if (attempt === MAX_ATTEMPTS) {
        throw new Error(`Timeout waiting for video transcoding after ${MAX_ATTEMPTS} attempts`);
      }
      
      // Ждем и пробуем снова
      await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
    }
  }
  
  throw new Error('Maximum attempts reached while waiting for video transcoding');
}

/**
 * 🚀 POST /api/stream/get-upload-url
 * Creates video in Bunny CDN and returns direct upload URL
 * 
 * НОВЫЙ МЕТОД: Direct Upload (без загрузки через сервер)
 * 
 * Flow:
 * 1. Frontend запрашивает upload URL
 * 2. Backend создает видео в Bunny, возвращает URL
 * 3. Frontend загружает напрямую в Bunny CDN
 * 4. Frontend уведомляет backend о завершении
 */
router.post('/get-upload-url', async (req: Request, res: Response) => {
  try {
    if (!BUNNY_STREAM_API_KEY || !BUNNY_STREAM_LIBRARY_ID) {
      return res.status(500).json({ 
        success: false, 
        error: 'BunnyCDN Stream not configured' 
      });
    }

    const { lessonId, title, fileName } = req.body;
    
    if (!lessonId) {
      return res.status(400).json({ success: false, error: 'lessonId is required' });
    }

    const videoTitle = title || fileName || `Lesson ${lessonId} Video`;
    console.log(`🎬 Creating video in BunnyCDN for direct upload: ${videoTitle} (Lesson ID: ${lessonId})`);

    // Создаём видео в BunnyCDN Stream
    const createVideoResponse = await fetch(
      `https://video.bunnycdn.com/library/${BUNNY_STREAM_LIBRARY_ID}/videos`,
      {
        method: 'POST',
        headers: {
          'AccessKey': BUNNY_STREAM_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: videoTitle,
        }),
      }
    );

    if (!createVideoResponse.ok) {
      const errorText = await createVideoResponse.text();
      console.error('❌ BunnyCDN Create Video Error:', errorText);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to create video in BunnyCDN',
        details: errorText
      });
    }

    const videoData: any = await createVideoResponse.json();
    const videoId = videoData.guid;

    console.log(`✅ Video created in BunnyCDN. ID: ${videoId}`);

    // Формируем URL для прямой загрузки
    const uploadUrl = `https://video.bunnycdn.com/library/${BUNNY_STREAM_LIBRARY_ID}/videos/${videoId}`;

    // Возвращаем URL и credentials
    return res.json({
      success: true,
      videoId: videoId,
      uploadUrl: uploadUrl,
      apiKey: BUNNY_STREAM_API_KEY,
      lessonId: lessonId,
      title: videoTitle,
      message: 'Ready for direct upload. Use PUT request to uploadUrl with video file.'
    });

  } catch (error: any) {
    console.error('❌ Error creating upload URL:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * ✅ POST /api/stream/complete-upload
 * Confirms upload completion and updates database
 */
router.post('/complete-upload', async (req: Request, res: Response) => {
  try {
    const { videoId, lessonId, duration_seconds, fileName, fileSize } = req.body;
    
    if (!videoId || !lessonId) {
      return res.status(400).json({ 
        success: false, 
        error: 'videoId and lessonId are required' 
      });
    }

    console.log(`✅ Completing upload for video ${videoId}, lesson ${lessonId}`);

    // Обновляем lessons.bunny_video_id
    const { error: lessonUpdateError } = await adminSupabase
      .from('lessons')
      .update({
        bunny_video_id: videoId,
        updated_at: new Date().toISOString()
      })
      .eq('id', parseInt(lessonId));

    if (lessonUpdateError) {
      console.error('❌ Error updating lesson:', lessonUpdateError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to update lesson',
        details: lessonUpdateError.message 
      });
    }

    // Обновляем/создаем video_content
    const durationSeconds = parseInt(duration_seconds || '0');
    
    const { error: videoError } = await adminSupabase
      .from('video_content')
      .upsert({
        lesson_id: parseInt(lessonId),
        r2_object_key: videoId,
        r2_bucket_name: BUNNY_STREAM_LIBRARY_ID,
        bunny_video_id: videoId,
        filename: fileName || 'uploaded_video.mp4',
        public_url: `https://${BUNNY_STREAM_CDN_HOSTNAME}/${videoId}/playlist.m3u8`,
        file_size_bytes: fileSize || 0,
        duration_seconds: durationSeconds,
        upload_status: 'completed',
        transcoding_status: 'processing',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'lesson_id'
      });

    if (videoError) {
      console.error('❌ Error saving video metadata:', videoError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to save video metadata',
        details: videoError.message 
      });
    }

    // Update lesson duration
    if (durationSeconds > 0) {
      const durationMinutes = Math.round(durationSeconds / 60);
      await adminSupabase
        .from('lessons')
        .update({ duration_minutes: durationMinutes })
        .eq('id', lessonId);
    }

    // Запускаем автотранскрибацию в фоне
    console.log(`🎙️ [Auto-Transcribe] Scheduling transcription for video ${videoId}...`);
    waitForVideoReadyAndTranscribe(videoId)
      .then(() => console.log(`✅ [Auto-Transcribe] Completed for ${videoId}`))
      .catch((error: Error) => console.error(`❌ [Auto-Transcribe] Failed:`, error.message));

    return res.json({
      success: true,
      videoId: videoId,
      hlsUrl: `https://${BUNNY_STREAM_CDN_HOSTNAME}/${videoId}/playlist.m3u8`,
      thumbnailUrl: `https://${BUNNY_STREAM_CDN_HOSTNAME}/${videoId}/thumbnail.jpg`,
      message: 'Upload completed successfully. Video is processing.'
    });

  } catch (error: any) {
    console.error('❌ Error completing upload:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * 🎬 POST /api/stream/upload
 * Uploads video to BunnyCDN Stream and saves metadata to database
 * 
 * СТАРЫЙ МЕТОД: Загрузка через сервер (для совместимости)
 */
router.post('/upload', upload.single('video'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No video file provided' });
    }

    if (!BUNNY_STREAM_API_KEY || !BUNNY_STREAM_LIBRARY_ID) {
      return res.status(500).json({ 
        success: false, 
        error: 'BunnyCDN Stream not configured. Please set BUNNY_STREAM_API_KEY and BUNNY_STREAM_LIBRARY_ID in .env' 
      });
    }

    const { lessonId, title, duration_seconds } = req.body;
    
    if (!lessonId) {
      // Удаляем временный файл
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ success: false, error: 'lessonId is required' });
    }

    const videoTitle = title || req.file.originalname;
    console.log(`📤 Uploading video to BunnyCDN Stream: ${videoTitle} (Lesson ID: ${lessonId})`);

    // ШАГ 1: Создаём видео в BunnyCDN Stream
    const createVideoResponse = await fetch(
      `https://video.bunnycdn.com/library/${BUNNY_STREAM_LIBRARY_ID}/videos`,
      {
        method: 'POST',
        headers: {
          'AccessKey': BUNNY_STREAM_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: videoTitle,
        }),
      }
    );

    if (!createVideoResponse.ok) {
      const errorText = await createVideoResponse.text();
      console.error('❌ BunnyCDN Create Video Error:');
      console.error('   Status:', createVideoResponse.status);
      console.error('   Response:', errorText);
      console.error('   API Key:', BUNNY_STREAM_API_KEY ? 'SET' : 'NOT SET');
      console.error('   Library ID:', BUNNY_STREAM_LIBRARY_ID ? 'SET' : 'NOT SET');
      
      // Удаляем временный файл
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to create video in BunnyCDN',
        details: errorText,
        status: createVideoResponse.status
      });
    }

    const videoData: any = await createVideoResponse.json();
    const videoId = videoData.guid;

    console.log(`✅ Video created in BunnyCDN. ID: ${videoId}`);

    // ШАГ 2: Загружаем файл
    const uploadUrl = `https://video.bunnycdn.com/library/${BUNNY_STREAM_LIBRARY_ID}/videos/${videoId}`;
    
    const fileStream = fs.createReadStream(req.file.path);
    const fileStats = fs.statSync(req.file.path);

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'AccessKey': BUNNY_STREAM_API_KEY,
        'Content-Type': 'application/octet-stream',
        'Content-Length': fileStats.size.toString(),
      },
      body: fileStream,
    });

    // Удаляем временный файл
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('❌ BunnyCDN Upload Error:', errorText);
      
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to upload video to BunnyCDN',
        details: errorText 
      });
    }

    const uploadResult: any = await uploadResponse.json();

    console.log(`🎉 Video uploaded successfully!`);
    console.log(`   Video ID: ${videoId}`);
    console.log(`   Status: ${uploadResult.status || 'processing'}`);

    // ШАГ 3: Обновляем запись в базе данных
    // Обновляем lessons.bunny_video_id
    const { error: lessonUpdateError } = await adminSupabase
      .from('lessons')
      .update({
        bunny_video_id: videoId,
        updated_at: new Date().toISOString()
      })
      .eq('id', parseInt(lessonId));

    if (lessonUpdateError) {
      console.error('❌ Error updating lesson bunny_video_id:', lessonUpdateError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to update lesson with video ID',
        details: lessonUpdateError.message 
      });
    }

    // ✅ АВТОТРАНСКРИБАЦИЯ: Ждём готовности видео и запускаем транскрибацию
    console.log(`🎙️ [Auto-Transcribe] Scheduling transcription for video ${videoId}...`);
    
    // Запускаем асинхронную проверку и транскрибацию
    waitForVideoReadyAndTranscribe(videoId)
      .then(() => {
        console.log(`✅ [Auto-Transcribe] Pipeline completed for video ${videoId}`);
      })
      .catch((error: Error) => {
        console.error(`❌ [Auto-Transcribe] Pipeline failed for video ${videoId}:`, error.message);
      });

    // Обновляем или создаем запись в video_content
    const durationSeconds = parseInt(duration_seconds || '0');
    
    const { data: video, error: videoError } = await adminSupabase
      .from('video_content')
      .upsert({
        lesson_id: parseInt(lessonId),
        r2_object_key: videoId,  // Используем videoId как ключ
        r2_bucket_name: BUNNY_STREAM_LIBRARY_ID,
        bunny_video_id: videoId,  // ✅ CRITICAL: Save bunny_video_id for iframe player!
        filename: req.file.originalname,
        public_url: `https://${BUNNY_STREAM_CDN_HOSTNAME}/${videoId}/playlist.m3u8`,
        file_size_bytes: req.file.size,
        duration_seconds: durationSeconds,
        upload_status: 'completed',
        transcoding_status: 'processing',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'lesson_id'
      })
      .select()
      .single();

    if (videoError) {
      console.error('❌ Error saving video to DB:', videoError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to save video metadata',
        details: videoError.message 
      });
    }

    // Update lesson duration
    if (durationSeconds > 0) {
      const durationMinutes = Math.round(durationSeconds / 60);
      await adminSupabase
        .from('lessons')
        .update({ duration_minutes: durationMinutes })
        .eq('id', lessonId);

      console.log(`✅ Lesson duration updated: ${durationMinutes} min`);
    }

    console.log('✅ Database updated successfully');

    // Возвращаем результат
    return res.json({
      success: true,
      videoId: videoId,
      title: videoTitle,
      status: uploadResult.status || 'processing',
      hlsUrl: `https://${BUNNY_STREAM_CDN_HOSTNAME}/${videoId}/playlist.m3u8`,
      thumbnailUrl: `https://${BUNNY_STREAM_CDN_HOSTNAME}/${videoId}/thumbnail.jpg`,
      message: 'Video uploaded successfully. It may take a few minutes to process.',
    });

  } catch (error: any) {
    console.error('❌ Upload Error:', error);
    
    // Удаляем временный файл в случае ошибки
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error during video upload',
      details: error.message 
    });
  }
});

/**
 * 🔍 GET /api/stream/status/:videoId
 * Checks video processing status in BunnyCDN (detailed response)
 */
router.get('/status/:videoId', async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;

    if (!BUNNY_STREAM_API_KEY || !BUNNY_STREAM_LIBRARY_ID) {
      return res.status(500).json({ 
        success: false, 
        error: 'BunnyCDN Stream not configured' 
      });
    }

    const response = await fetch(
      `https://video.bunnycdn.com/library/${BUNNY_STREAM_LIBRARY_ID}/videos/${videoId}`,
      {
        method: 'GET',
        headers: {
          'AccessKey': BUNNY_STREAM_API_KEY,
        },
      }
    );

    if (!response.ok) {
      return res.status(404).json({ 
        success: false, 
        error: 'Video not found' 
      });
    }

    const videoData: any = await response.json();

    return res.json({
      success: true,
      videoId: videoData.guid,
      title: videoData.title,
      status: videoData.status, // 0 = queued, 1 = processing, 2 = encoding, 3 = finished, 4 = error
      duration: videoData.length,
      views: videoData.views,
      hlsUrl: `https://${BUNNY_STREAM_CDN_HOSTNAME}/${videoData.guid}/playlist.m3u8`,
      thumbnailUrl: `https://${BUNNY_STREAM_CDN_HOSTNAME}/${videoData.guid}/thumbnail.jpg`,
    });

  } catch (error: any) {
    console.error('❌ Status Check Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to check video status',
      details: error.message 
    });
  }
});

/**
 * 🎬 GET /api/stream/video/:videoId/status
 * Smart status endpoint for VideoPlayer polling
 * Returns simplified status: 'processing' | 'finished' | 'error'
 */
router.get('/video/:videoId/status', async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;

    console.log(`🔍 [POLLING] Checking status for video: ${videoId}`);

    if (!BUNNY_STREAM_API_KEY || !BUNNY_STREAM_LIBRARY_ID) {
      return res.status(500).json({ 
        status: 'error',
        encodeProgress: 0,
        message: 'BunnyCDN Stream not configured' 
      });
    }

    const response = await fetch(
      `https://video.bunnycdn.com/library/${BUNNY_STREAM_LIBRARY_ID}/videos/${videoId}`,
      {
        method: 'GET',
        headers: {
          'AccessKey': BUNNY_STREAM_API_KEY,
        },
      }
    );

    if (!response.ok) {
      console.log(`⚠️ [POLLING] Video not found: ${videoId}`);
      return res.status(404).json({ 
        status: 'error',
        encodeProgress: 0,
        message: 'Video not found in Bunny Stream' 
      });
    }

    const videoData: any = await response.json();
    
    // Bunny Stream status codes:
    // 0 = queued, 1 = processing, 2 = encoding, 3 = finished, 4 = error
    // BUT: Sometimes status 4 appears even when video is fully encoded (Bunny bug)
    // So we check encodeProgress as the source of truth
    const bunnyStatus = videoData.status;
    const encodeProgress = videoData.encodeProgress || 0;
    const hasResolutions = videoData.availableResolutions && videoData.availableResolutions.length > 0;

    let status: 'checking' | 'processing' | 'finished' | 'error';
    let progress = 0;

    // ✅ If encodeProgress is 100% and resolutions exist, video is ready (regardless of status)
    if (encodeProgress === 100 && hasResolutions) {
      status = 'finished';
      progress = 100;
      console.log(`✅ [POLLING] Video ${videoId} is finished! (encodeProgress: 100%, resolutions: ${videoData.availableResolutions})`);
    } else if (bunnyStatus === 0 || bunnyStatus === 1 || bunnyStatus === 2) {
      // Queued, Processing, or Encoding
      status = 'processing';
      progress = encodeProgress;
      console.log(`⏳ [POLLING] Video ${videoId} is processing: ${progress}%`);
    } else if (bunnyStatus === 3) {
      // Finished
      status = 'finished';
      progress = 100;
      console.log(`✅ [POLLING] Video ${videoId} is finished!`);
    } else {
      // Error (status 4 with no progress)
      status = 'error';
      progress = 0;
      console.log(`❌ [POLLING] Video ${videoId} has error status: ${bunnyStatus}, progress: ${encodeProgress}%`);
    }

    return res.json({
      status,
      encodeProgress: progress,
      videoId: videoData.guid,
      title: videoData.title,
      duration: videoData.length,
      hlsUrl: `https://${BUNNY_STREAM_CDN_HOSTNAME}/${videoData.guid}/playlist.m3u8`,
      thumbnailUrl: `https://${BUNNY_STREAM_CDN_HOSTNAME}/${videoData.guid}/thumbnail.jpg`,
    });

  } catch (error: any) {
    console.error('❌ [POLLING] Status Check Error:', error);
    return res.status(500).json({ 
      status: 'error',
      encodeProgress: 0,
      message: 'Failed to check video status',
      details: error.message 
    });
  }
});

/**
 * 🗑️ DELETE /api/stream/video/:videoId
 * Deletes video from BunnyCDN Stream (by videoId directly)
 */
router.delete('/video/:videoId', async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;

    if (!BUNNY_STREAM_API_KEY || !BUNNY_STREAM_LIBRARY_ID) {
      return res.status(500).json({ 
        success: false, 
        error: 'BunnyCDN Stream not configured' 
      });
    }

    const response = await fetch(
      `https://video.bunnycdn.com/library/${BUNNY_STREAM_LIBRARY_ID}/videos/${videoId}`,
      {
        method: 'DELETE',
        headers: {
          'AccessKey': BUNNY_STREAM_API_KEY,
        },
      }
    );

    if (!response.ok) {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to delete video from BunnyCDN' 
      });
    }

    return res.json({
      success: true,
      message: 'Video deleted successfully',
    });

  } catch (error: any) {
    console.error('❌ Delete Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to delete video',
      details: error.message 
    });
  }
});

/**
 * 🗑️ DELETE /api/stream/lesson/:lessonId
 * Deletes video associated with a lesson
 * 1. Fetches bunny_video_id from lessons table
 * 2. Deletes video from Bunny Stream
 * 3. Clears bunny_video_id from lessons table
 * 4. Removes record from video_content table
 */
router.delete('/lesson/:lessonId', async (req: Request, res: Response) => {
  const { lessonId } = req.params;

  try {
    console.log(`🗑️ [DELETE] Removing video for lesson ${lessonId}`);

    // 1. Get bunny_video_id from DB
    const { data: lesson, error: fetchError } = await adminSupabase
      .from('lessons')
      .select('bunny_video_id')
      .eq('id', lessonId)
      .single();

    if (fetchError) {
      console.log('⚠️ Error fetching lesson:', fetchError);
      return res.status(500).json({ error: 'Database error', details: fetchError.message });
    }

    if (!lesson?.bunny_video_id) {
      console.log('⚠️ No video found for this lesson (bunny_video_id is null)');
      // Clean up video_content just in case
      await adminSupabase
        .from('video_content')
        .delete()
        .eq('lesson_id', lessonId);
      
      return res.status(404).json({ error: 'No video found for this lesson' });
    }

    const videoId = lesson.bunny_video_id;
    console.log(`🎬 Found video ID: ${videoId}`);

    // 2. Delete from Bunny Stream
    if (BUNNY_STREAM_API_KEY && BUNNY_STREAM_LIBRARY_ID) {
      try {
        const deleteResponse = await fetch(
          `https://video.bunnycdn.com/library/${BUNNY_STREAM_LIBRARY_ID}/videos/${videoId}`,
          {
            method: 'DELETE',
            headers: {
              'AccessKey': BUNNY_STREAM_API_KEY,
            },
          }
        );

        if (deleteResponse.ok) {
          console.log('✅ Video deleted from Bunny Stream');
        } else {
          const errorText = await deleteResponse.text();
          console.error('⚠️ Failed to delete from Bunny Stream (might already be gone):', errorText);
          // Continue to clean up DB even if Bunny fails
        }
      } catch (bunnyError: any) {
        console.error('⚠️ Bunny delete error:', bunnyError.message);
        // Continue to clean up DB
      }
    }

    // 3. Remove bunny_video_id from lessons table
    const { error: updateError } = await adminSupabase
      .from('lessons')
      .update({ bunny_video_id: null })
      .eq('id', lessonId);

    if (updateError) {
      console.error('❌ Error clearing bunny_video_id:', updateError);
      return res.status(500).json({ error: 'Failed to update lesson', details: updateError.message });
    }

    console.log('✅ Cleared bunny_video_id from lessons table');

    // 4. Remove record from video_content table
    const { error: deleteContentError } = await adminSupabase
      .from('video_content')
      .delete()
      .eq('lesson_id', lessonId);

    if (deleteContentError) {
      console.error('⚠️ Error deleting from video_content:', deleteContentError);
      // Not critical, continue
    } else {
      console.log('✅ Deleted record from video_content table');
    }

    res.json({ success: true, message: 'Video deleted successfully' });
  } catch (error: any) {
    console.error('❌ [DELETE] Error:', error.message);
    res.status(500).json({ error: 'Failed to delete video', details: error.message });
  }
});

export default router;

