import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import multer from 'multer';
import path from 'path';

const router = Router();

// ✅ Функция транслитерации кириллицы → латиница
function transliterate(text: string): string {
  const cyrillicToLatin: { [key: string]: string } = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh',
    'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
    'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts',
    'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo', 'Ж': 'Zh',
    'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N', 'О': 'O',
    'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F', 'Х': 'H', 'Ц': 'Ts',
    'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sch', 'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya',
  };

  return text.split('').map(char => cyrillicToLatin[char] || char).join('');
}

// ✅ Функция sanitize filename: транслитерация + удаление спецсимволов
function sanitizeFilename(filename: string): string {
  // Разделить на имя и расширение
  const ext = path.extname(filename);
  const baseName = path.basename(filename, ext);
  
  // 1. Транслитерировать кириллицу
  let sanitized = transliterate(baseName);
  
  // 2. Заменить пробелы на подчеркивания
  sanitized = sanitized.replace(/\s+/g, '_');
  
  // 3. Оставить только безопасные символы (a-z, A-Z, 0-9, -, _)
  sanitized = sanitized.replace(/[^a-zA-Z0-9_-]/g, '');
  
  // 4. Удалить множественные подчеркивания
  sanitized = sanitized.replace(/_+/g, '_');
  
  // 5. Убрать подчеркивания в начале и конце
  sanitized = sanitized.replace(/^_+|_+$/g, '');
  
  // 6. Если имя пустое после sanitize - использовать fallback
  if (!sanitized) {
    sanitized = 'file';
  }
  
  // 7. Вернуть с расширением
  return sanitized + ext.toLowerCase();
}

// Multer конфигурация для загрузки файлов
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB лимит
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/zip',
      'text/plain',
      'text/markdown',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Неподдерживаемый тип файла'));
    }
  },
});

// POST /api/materials/upload - загрузка материала
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  console.log('===========================================');
  console.log('📥 MATERIAL UPLOAD - REQUEST RECEIVED');
  console.log('===========================================');
  console.log('1️⃣ req.headers:', JSON.stringify(req.headers, null, 2));
  console.log('2️⃣ req.params:', req.params);
  console.log('3️⃣ req.body:', req.body);
  console.log('4️⃣ req.file:', req.file);
  console.log('5️⃣ req.file exists?', !!req.file);
  console.log('===========================================');
  
  try {
    console.log('='.repeat(80));
    console.log('=== MATERIAL UPLOAD REQUEST ===');
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
    console.log('='.repeat(80));
    
    const file = req.file;
    const { lessonId, display_name } = req.body;

    console.log('📥 Загрузка материала:');
    console.log('  - Файл:', file?.originalname);
    console.log('  - Размер:', file?.size, 'bytes');
    console.log('  - Lesson ID:', lessonId);
    console.log('  - Display name:', display_name);

    if (!file || !lessonId) {
      console.error('❌ Отсутствует файл или lessonId - req.file =', !!req.file);
      return res.status(400).json({ error: 'Файл и lessonId обязательны' });
    }
    
    console.log('✅ 1. File received:', file.originalname);

    // Получаем информацию об уроке для построения пути
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('id, module_id, modules(course_id)')
      .eq('id', lessonId)
      .single();

    if (lessonError || !lesson) {
      return res.status(404).json({ error: 'Урок не найден' });
    }

    // ✅ Генерируем безопасное имя файла (транслитерация кириллицы)
    const timestamp = Date.now();
    const originalFilename = file.originalname;
    const sanitizedFilename = sanitizeFilename(originalFilename);
    const uniqueFileName = `${timestamp}_${sanitizedFilename}`;

    // Формируем путь в Storage
    const courseId = (lesson as any).modules.course_id;
    const moduleId = lesson.module_id;
    const storagePath = `course_${courseId}/module_${moduleId}/lesson_${lessonId}/${uniqueFileName}`;

    console.log('📝 Filename processing:');
    console.log('  - Original:', originalFilename);
    console.log('  - Sanitized:', sanitizedFilename);
    console.log('  - Final:', uniqueFileName);
    console.log('  - Storage path:', storagePath);
    
    // ✅ Проверяем что bucket существует (из research report)
    console.log('✅ 2. Checking if bucket exists...');
    const { data: buckets, error: bucketError } = await supabase
      .storage
      .listBuckets();
    
    if (bucketError) {
      console.error('❌ Error listing buckets:', bucketError);
      throw bucketError;
    }
    
    const bucketExists = buckets.some(b => b.name === 'lesson-materials');
    if (!bucketExists) {
      console.log('⚠️ Bucket "lesson-materials" не существует, создаем...');
      // ✅ Создаем bucket если не существует
      const { error: createError } = await supabase
        .storage
        .createBucket('lesson-materials', {
          public: true,
          fileSizeLimit: 52428800 // 50MB
        });
      
      if (createError) {
        console.error('❌ Error creating bucket:', createError);
        throw createError;
      }
      console.log('✅ Bucket "lesson-materials" создан');
    } else {
      console.log('✅ Bucket "lesson-materials" существует');
    }
    
    console.log('✅ 3. Starting Supabase Storage upload...');

    // Загружаем файл в Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('lesson-materials')
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      console.error('❌ Ошибка загрузки в Storage:', uploadError);
      console.error('Storage Error details:', JSON.stringify(uploadError, null, 2));
      throw uploadError;
    }

    console.log('✅ 4. Storage upload success:', uploadData);
    console.log('✅ Файл загружен в Storage');

    // ✅ Создаем запись в БД (filename = sanitized, display_name = original)
    console.log('✅ 5. Saving to database...');
    const { data: material, error: dbError } = await supabase
      .from('lesson_materials')
      .insert({
        lesson_id: parseInt(lessonId),
        storage_path: storagePath,
        bucket_name: 'lesson-materials',
        filename: uniqueFileName, // Sanitized filename для storage
        file_type: file.mimetype,
        file_size_bytes: file.size,
        display_name: display_name || originalFilename, // Original filename для UI
        is_downloadable: true,
      })
      .select()
      .single();

    if (dbError) {
      console.error('❌ Ошибка сохранения в БД:', dbError);
      console.error('DB Error details:', JSON.stringify(dbError, null, 2));
      // Удаляем файл из Storage если не удалось создать запись в БД
      await supabase.storage.from('lesson-materials').remove([storagePath]);
      throw dbError;
    }
    
    console.log('✅ 6. DB save success:', material);

    // Получаем публичный URL
    const { data: urlData } = supabase.storage
      .from('lesson-materials')
      .getPublicUrl(storagePath);

    console.log('🔗 Public URL:', urlData.publicUrl);
    console.log('✅ Материал сохранен в БД:', material);
    
    // ✅ Стандартный response (из research report)
    const response = {
      success: true,
      material: {
        ...material,
        file_url: urlData.publicUrl,
      }
    };
    
    console.log('✅ Sending response:', response);
    console.log('='.repeat(80));

    res.json(response);
  } catch (error: any) {
    console.error('❌ Ошибка загрузки материала:', error);
    console.error('❌ Stack:', error.stack);
    res.status(500).json({ 
      success: false,
      error: 'Ошибка загрузки материала',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/materials/:lessonId - получить все материалы урока
router.get('/:lessonId', async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.params;

    const { data: materials, error } = await supabase
      .from('lesson_materials')
      .select('*')
      .eq('lesson_id', parseInt(lessonId))
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Get materials error:', error);
      return res.status(500).json({ error: 'Ошибка получения материалов' });
    }

    // Добавляем публичные URL
    const materialsWithUrls = materials.map((material) => {
      const { data: urlData } = supabase.storage
        .from(material.bucket_name)
        .getPublicUrl(material.storage_path);

      return {
        ...material,
        public_url: urlData.publicUrl,
      };
    });

    res.json({ materials: materialsWithUrls });
  } catch (error) {
    console.error('Get materials error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// DELETE /api/materials/:materialId - удалить материал
router.delete('/:materialId', async (req: Request, res: Response) => {
  try {
    const { materialId } = req.params;

    // Получаем информацию о материале
    const { data: material, error: getError } = await supabase
      .from('lesson_materials')
      .select('*')
      .eq('id', materialId)
      .single();

    if (getError || !material) {
      return res.status(404).json({ error: 'Материал не найден' });
    }

    // Удаляем файл из Storage
    const { error: storageError } = await supabase.storage
      .from(material.bucket_name)
      .remove([material.storage_path]);

    if (storageError) {
      console.error('Storage delete error:', storageError);
      // Продолжаем удаление из БД даже если из Storage не удалось
    }

    // Удаляем запись из БД
    const { error: dbError } = await supabase
      .from('lesson_materials')
      .delete()
      .eq('id', materialId);

    if (dbError) {
      console.error('DB delete error:', dbError);
      return res.status(500).json({ error: 'Ошибка удаления материала из БД' });
    }

    console.log('✅ Материал удален:', material.filename);
    res.json({ success: true, message: 'Материал удален' });
  } catch (error) {
    console.error('❌ Ошибка удаления материала:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

export default router;
