import { Router } from 'express';
import multer from 'multer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
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

// ✅ Cloudflare R2 клиент (ИСПРАВЛЕНО: endpoint уже содержит https:// в .env)
const s3 = new S3Client({
  region: 'auto', // ✅ Обязательно для Cloudflare R2
  endpoint: process.env.R2_ENDPOINT!, // ✅ ИСПРАВЛЕНО: НЕ добавляем https://, он уже в .env!
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  // ✅ forcePathStyle для совместимости с R2
  forcePathStyle: false // R2 использует virtual-hosted-style
});

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

// POST /api/videos/upload/:lessonId - Загрузить видео
router.post('/upload/:lessonId', upload.single('video'), async (req, res) => {
  console.log('===========================================');
  console.log('📥 VIDEO UPLOAD - REQUEST RECEIVED');
  console.log('===========================================');
  console.log('1️⃣ req.headers:', JSON.stringify(req.headers, null, 2));
  console.log('2️⃣ req.params:', req.params);
  console.log('3️⃣ req.body:', req.body);
  console.log('4️⃣ req.file:', req.file);
  console.log('5️⃣ req.file exists?', !!req.file);
  console.log('===========================================');
  
  try {
    console.log('='.repeat(80));
    console.log('=== VIDEO UPLOAD REQUEST ===');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', req.body);
    console.log('File:', req.file ? {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      encoding: req.file.encoding,
      mimetype: req.file.mimetype,
      size: req.file.size,
      bufferLength: req.file.buffer?.length
    } : 'NO FILE');
    console.log('Params:', req.params);
    console.log('='.repeat(80));
    
    const file = req.file;
    const { lessonId } = req.params;

    if (!file) {
      console.error('❌ Файл не предоставлен - req.file = undefined');
      return res.status(400).json({ error: 'Файл не предоставлен' });
    }

    console.log('✅ 1. File received:', file.originalname);
    console.log('📹 Загрузка видео для урока:', lessonId);
    console.log('📦 Размер файла:', (file.size / 1024 / 1024).toFixed(2), 'MB');

    // Проверка размера (макс 3GB)
    if (file.size > 3 * 1024 * 1024 * 1024) {
      return res.status(400).json({ error: 'Файл слишком большой (макс 3GB)' });
    }

    // Генерация ключа для R2
    const ext = mime.extension(file.mimetype) || 'mp4';
    const key = `lessons/${lessonId}/video_${Date.now()}.${ext}`;

    console.log('✅ 2. Starting R2 upload...');
    console.log('☁️ Bucket:', process.env.R2_BUCKET_NAME);
    console.log('☁️ Key:', key);
    console.log('☁️ Endpoint:', process.env.R2_ENDPOINT);

    // Загрузка на Cloudflare R2
    const r2Command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });
    
    const r2Result = await s3.send(r2Command);
    console.log('✅ 3. R2 upload success:', r2Result);

    // Public URL
    const videoUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

    console.log('🔗 URL видео:', videoUrl);

    // Сохранить video_url в таблицу lessons
    console.log('✅ 4. Saving video_url to lessons table...');
    const { data: lesson, error } = await supabase
      .from('lessons')
      .update({
        video_url: videoUrl,
      })
      .eq('id', parseInt(lessonId))
      .select()
      .single();

    if (error) {
      console.error('❌ Ошибка сохранения в БД:', error);
      console.error('DB Error details:', JSON.stringify(error, null, 2));
      throw error;
    }

    console.log('✅ 5. DB save success:', lesson);
    console.log('✅ Видео успешно загружено');
    
    // ✅ ВСЕГДА возвращаем стандартную структуру
    const response = {
      success: true,
      video: {
        id: lesson.id,
        lesson_id: lesson.id,
        video_url: lesson.video_url,
        duration_seconds: lesson.duration || 0,
        file_size_bytes: file.size
      }
    };
    
    console.log('✅ Sending response:', response);
    console.log('='.repeat(80));
    
    res.json(response);
  } catch (error: any) {
    console.error('❌ Ошибка загрузки видео:', error);
    console.error('❌ Error type:', typeof error);
    console.error('❌ Error keys:', Object.keys(error || {}));
    console.error('❌ Stack:', error?.stack);
    console.error('❌ Message:', error?.message);
    console.error('❌ Name:', error?.name);
    console.error('❌ Full error:', JSON.stringify(error, null, 2));
    
    res.status(500).json({ 
      success: false,
      error: 'Ошибка загрузки видео',
      details: error?.message || error?.toString() || 'Unknown error'
    });
  }
});

export default router;
