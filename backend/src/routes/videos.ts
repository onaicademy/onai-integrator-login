import { Router } from 'express';
import multer from 'multer';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import mime from 'mime-types';

const router = Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 * 1024 } // 3GB
});

// Supabase клиент
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    const { data: lesson, error } = await supabase
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
router.post('/upload/:lessonId', upload.single('video'), async (req, res) => {
  console.log('===========================================');
  console.log('📥 VIDEO UPLOAD - REQUEST RECEIVED');
  console.log('===========================================');
  console.log('1️⃣ Lesson ID:', req.params.lessonId);
  console.log('2️⃣ File exists:', !!req.file);
  
  try {
    const file = req.file;
    const { lessonId } = req.params;

    if (!file) {
      console.error('❌ Файл не предоставлен');
      return res.status(400).json({ error: 'Файл не предоставлен' });
    }

    console.log('✅ File received:', file.originalname);
    console.log('📦 Size:', (file.size / 1024 / 1024).toFixed(2), 'MB');
    console.log('📝 MIME:', file.mimetype);

    // Проверка размера (макс 3GB)
    if (file.size > 3 * 1024 * 1024 * 1024) {
      return res.status(400).json({ error: 'Файл слишком большой (макс 3GB)' });
    }

    // Генерация имени файла
    const ext = mime.extension(file.mimetype) || 'mp4';
    const filename = `lesson-${lessonId}-${Date.now()}.${ext}`;
    
    console.log('📹 Generated filename:', filename);

    // Загрузка на Bunny CDN
    console.log('☁️ Uploading to Bunny CDN...');
    const cdnUrl = await uploadToBunny(file.buffer, filename, file.mimetype);

    // Сохранить video_url в таблицу lessons
    console.log('💾 Saving to database...');
    const { data: lesson, error } = await supabase
      .from('lessons')
      .update({ video_url: cdnUrl })
      .eq('id', parseInt(lessonId))
      .select()
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      throw error;
    }

    console.log('✅ Video uploaded successfully');
    
    const response = {
      success: true,
      video: {
        id: lesson.id,
        lesson_id: lesson.id,
        video_url: lesson.video_url,
        duration_seconds: lesson.duration_minutes ? lesson.duration_minutes * 60 : 0,
        file_size_bytes: file.size
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
    const { data: lesson, error: fetchError } = await supabase
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
    const { error: updateError } = await supabase
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
