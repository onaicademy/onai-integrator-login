import { Router } from 'express';
import multer from 'multer';
import axios from 'axios';
import mime from 'mime-types';
import { adminSupabase } from '../config/supabase';  // ✅ Use admin client with Authorization header

const router = Router();

// 🔥 КРИТИЧНО: Используем multer.fields() для явного парсинга файла И полей
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 * 1024 } // 3GB
}).fields([
  { name: 'video', maxCount: 1 },
  { name: 'duration_seconds', maxCount: 1 }  // Явно указываем поле
]);

// Bunny CDN Configuration
const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE || 'onai-course-videos';
const BUNNY_STORAGE_PASSWORD = process.env.BUNNY_STORAGE_PASSWORD!;
const BUNNY_STORAGE_HOSTNAME = process.env.BUNNY_STORAGE_HOSTNAME || 'storage.bunnycdn.com';
const BUNNY_CDN_URL = process.env.BUNNY_CDN_URL || 'https://onai-videos.b-cdn.net';

console.log('🐰 Bunny CDN Configuration:');
console.log('   Storage Zone:', BUNNY_STORAGE_ZONE);
console.log('   Hostname:', BUNNY_STORAGE_HOSTNAME);
console.log('   CDN URL:', BUNNY_CDN_URL);
console.log('   Password:', BUNNY_STORAGE_PASSWORD ? '***' + BUNNY_STORAGE_PASSWORD.slice(-4) : 'NOT SET');

/**
 * Upload file to Bunny Storage
 */
async function uploadToBunny(fileBuffer: Buffer, filename: string, contentType: string): Promise<string> {
  const storageUrl = `https://${BUNNY_STORAGE_HOSTNAME}/${BUNNY_STORAGE_ZONE}/videos/${filename}`;
  
  console.log('🐰 Bunny Upload:');
  console.log('   URL:', storageUrl);
  console.log('   Size:', (fileBuffer.length / 1024 / 1024).toFixed(2), 'MB');
  console.log('   Content-Type:', contentType);

  try {
    const response = await axios.put(storageUrl, fileBuffer, {
      headers: {
        'AccessKey': BUNNY_STORAGE_PASSWORD,
        'Content-Type': contentType,
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 300000, // 5 minutes timeout
    });

    console.log('✅ Bunny upload success:', response.status, response.statusText);

    // Return CDN URL for playback
    const cdnUrl = `${BUNNY_CDN_URL}/videos/${filename}`;
    console.log('🔗 CDN URL:', cdnUrl);

    return cdnUrl;
  } catch (error: any) {
    console.error('❌ Bunny upload error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    throw new Error(`Bunny upload failed: ${error.message}`);
  }
}

/**
 * Delete file from Bunny Storage
 */
async function deleteFromBunny(filename: string): Promise<void> {
  const storageUrl = `https://${BUNNY_STORAGE_HOSTNAME}/${BUNNY_STORAGE_ZONE}/videos/${filename}`;
  
  console.log('🗑️ Bunny Delete:', storageUrl);

  try {
    const response = await axios.delete(storageUrl, {
      headers: {
        'AccessKey': BUNNY_STORAGE_PASSWORD,
      },
    });

    console.log('✅ Bunny delete success:', response.status);
  } catch (error: any) {
    console.error('⚠️ Bunny delete error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    // Don't throw - file might already be deleted
  }
}

// GET /api/videos/lesson/:lessonId - Получить видео урока
router.get('/lesson/:lessonId', async (req, res) => {
  try {
    const { lessonId } = req.params;

    const { data: lesson, error } = await adminSupabase
      .from('lessons')
      .select('id, title, video_url')
      .eq('id', parseInt(lessonId))
      .single();

    if (error || !lesson || !lesson.video_url) {
      return res.status(404).json({ error: 'Видео не найдено' });
    }

    res.json({ 
      video: {
        id: lesson.id,
        lesson_id: lesson.id,
        video_url: lesson.video_url
      }
    });
  } catch (error) {
    console.error('❌ Ошибка получения видео:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/videos/upload/:lessonId - Загрузить видео на Bunny CDN
router.post('/upload/:lessonId', upload, async (req, res) => {
  console.log('===========================================');
  console.log('📥 VIDEO UPLOAD - REQUEST RECEIVED');
  console.log('===========================================');
  console.log('1️⃣ Lesson ID:', req.params.lessonId);
  console.log('2️⃣ req.files:', req.files);
  console.log('3️⃣ req.body:', req.body);
  
  try {
    const { lessonId } = req.params;
    
    // 🔥 КРИТИЧНО: С multer.fields() используем req.files, не req.file
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const videoFile = files['video']?.[0];

    if (!videoFile) {
      console.error('❌ Файл не предоставлен');
      return res.status(400).json({ 
        success: false,
        error: 'Файл не предоставлен' 
      });
    }

    console.log('✅ File received:', videoFile.originalname);
    console.log('📦 Size:', (videoFile.size / 1024 / 1024).toFixed(2), 'MB');
    console.log('📝 MIME:', videoFile.mimetype);

    // Проверка размера (макс 3GB)
    if (videoFile.size > 3 * 1024 * 1024 * 1024) {
      return res.status(400).json({ 
        success: false,
        error: 'Файл слишком большой (макс 3GB)' 
      });
    }

    // ✅ Получаем длительность из req.body (благодаря правильному порядку FormData)
    const durationSeconds = req.body.duration_seconds ? parseInt(req.body.duration_seconds) : null;
    const durationMinutes = durationSeconds ? Math.round(durationSeconds / 60) : null;
    
    console.log('⏱️ Duration from request:', {
      duration_seconds: durationSeconds,
      duration_minutes: durationMinutes
    });

    // Генерация имени файла
    const ext = mime.extension(videoFile.mimetype) || 'mp4';
    const filename = `lesson-${lessonId}-${Date.now()}.${ext}`;
    
    console.log('📹 Generated filename:', filename);

    // Загрузка на Bunny CDN
    console.log('☁️ Uploading to Bunny CDN...');
    const cdnUrl = await uploadToBunny(videoFile.buffer, filename, videoFile.mimetype);

    // ✅ ШАГ 1: Обновляем lessons.duration_minutes
    console.log('💾 Step 1: Updating lessons table...');
    const updateData: any = { 
      video_url: cdnUrl,
      updated_at: new Date().toISOString()
    };
    if (durationMinutes && durationMinutes > 0) {
      updateData.duration_minutes = durationMinutes;
      console.log(`✅ Saving duration_minutes: ${durationMinutes} минут (${durationSeconds} секунд)`);
    }
    
    const { data: lesson, error: lessonError } = await adminSupabase
      .from('lessons')
      .update(updateData)
      .eq('id', parseInt(lessonId))
      .select()
      .single();

    if (lessonError) {
      console.error('❌ Lesson update error:', lessonError);
      throw lessonError;
    }

    console.log('✅ Lesson updated:', lesson);
    
    // ✅ ШАГ 2: Сохраняем в video_content (для fallback)
    console.log('💾 Step 2: Saving to video_content table...');
    const { data: videoContent, error: videoError } = await adminSupabase
      .from('video_content')
      .upsert({
        lesson_id: parseInt(lessonId),
        public_url: cdnUrl,  // ✅ FIXED: Правильное название колонки!
        r2_object_key: filename,  // ✅ Обязательное поле (используем filename)
        r2_bucket_name: BUNNY_STORAGE_ZONE,  // ✅ Обязательное поле
        filename: videoFile.originalname,
        file_size_bytes: videoFile.size,
        duration_seconds: durationSeconds,
        upload_status: 'completed',  // Статус загрузки
        created_at: new Date().toISOString()
      }, {
        onConflict: 'lesson_id'
      })
      .select()
      .single();

    if (videoError) {
      console.error('⚠️ Video_content save warning:', videoError);
      // Не бросаем ошибку - это не критично
    } else {
      console.log('✅ Video_content saved:', videoContent);
    }

    console.log('✅ Video uploaded successfully');
    console.log('✅ Lesson duration_minutes:', lesson.duration_minutes);
    
    const response = {
      success: true,
      video: {
        id: lesson.id,
        lesson_id: lesson.id,
        video_url: lesson.video_url,
        duration_seconds: lesson.duration_minutes ? lesson.duration_minutes * 60 : (durationSeconds || 0),
        duration_minutes: lesson.duration_minutes || durationMinutes || 0,
        file_size_bytes: videoFile.size
      }
    };
    
    console.log('📤 Response:', response);
    console.log('===========================================');
    
    res.json(response);
  } catch (error: any) {
    console.error('❌ Upload error:', error);
    console.error('❌ Stack:', error?.stack);
    
    res.status(500).json({ 
      success: false,
      error: 'Ошибка загрузки видео',
      details: error?.message || 'Unknown error'
    });
  }
});

// DELETE /api/videos/lesson/:lessonId - Удалить видео урока
router.delete('/lesson/:lessonId', async (req, res) => {
  try {
    const { lessonId } = req.params;
    
    console.log('===========================================');
    console.log('🗑️ VIDEO DELETE REQUEST');
    console.log('Lesson ID:', lessonId);
    console.log('===========================================');

    // Получить текущий video_url из БД
    const { data: lesson, error: fetchError } = await adminSupabase
      .from('lessons')
      .select('id, video_url')
      .eq('id', parseInt(lessonId))
      .single();

    if (fetchError || !lesson) {
      console.error('❌ Урок не найден:', fetchError);
      return res.status(404).json({ error: 'Урок не найден' });
    }

    if (!lesson.video_url) {
      console.log('ℹ️ У урока нет видео');
      return res.json({ success: true, message: 'У урока нет видео для удаления' });
    }

    console.log('📹 Current video_url:', lesson.video_url);

    // Извлечь имя файла из CDN URL
    // Например: https://onai-videos.b-cdn.net/videos/lesson-18-1234567890.mp4
    // -> lesson-18-1234567890.mp4
    const filename = lesson.video_url.split('/videos/').pop();
    
    if (filename) {
      console.log('🔑 Filename to delete:', filename);
      await deleteFromBunny(filename);
    }

    // Очистить video_url в таблице lessons
    const { error: updateError } = await adminSupabase
      .from('lessons')
      .update({ video_url: null })
      .eq('id', parseInt(lessonId));

    if (updateError) {
      console.error('❌ Database update error:', updateError);
      throw updateError;
    }

    console.log('✅ Video deleted successfully');
    console.log('===========================================');

    res.json({ 
      success: true, 
      message: 'Видео успешно удалено' 
    });
  } catch (error: any) {
    console.error('❌ Delete error:', error);
    res.status(500).json({ 
      error: 'Ошибка удаления видео',
      details: error?.message 
    });
  }
});

export default router;
