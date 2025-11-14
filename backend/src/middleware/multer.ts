/**
 * Multer Middleware
 * Обработка multipart/form-data для загрузки файлов
 */

import multer from 'multer';

// Используем memoryStorage для работы с buffer (не сохраняем файлы на диск)
const storage = multer.memoryStorage();

// Разрешённые MIME types
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
];

// Максимальный размер файла: 20 MB
const MAX_FILE_SIZE = 20 * 1024 * 1024;

/**
 * Multer configuration
 */
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1, // Максимум 1 файл за раз
  },
  fileFilter: (req, file, cb) => {
    console.log('[Multer] 📝 Проверяем файл:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });

    // Проверка MIME type
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      console.log('[Multer] ✅ MIME type разрешён');
      cb(null, true);
    } else {
      console.error('[Multer] ❌ MIME type не поддерживается:', file.mimetype);
      cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: PDF, DOCX, PNG, JPG, WEBP`));
    }
  },
});

/**
 * Error handler для Multer
 * Используется в routes для обработки ошибок загрузки
 */
export function handleMulterError(err: any, req: any, res: any, next: any) {
  if (err instanceof multer.MulterError) {
    console.error('[Multer Error]', err.code, err.message);

    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: 'File too large',
        message: `Максимальный размер файла: ${MAX_FILE_SIZE / 1024 / 1024} MB`,
        code: err.code,
      });
    }

    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Too many files',
        message: 'Можно загрузить только 1 файл за раз',
        code: err.code,
      });
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        error: 'Unexpected field',
        message: 'Неверное имя поля. Ожидается "file"',
        code: err.code,
      });
    }

    return res.status(400).json({
      error: 'Multer error',
      message: err.message,
      code: err.code,
    });
  }

  // Если ошибка не от Multer - передаём дальше
  if (err) {
    console.error('[Multer] ❌ Неизвестная ошибка:', err.message);
    return res.status(400).json({
      error: 'File upload error',
      message: err.message,
    });
  }

  next();
}

/**
 * Middleware для логирования информации о файле
 */
export function logFileInfo(req: any, res: any, next: any) {
  if (req.file) {
    console.log('[Multer] ✅ Файл успешно загружен:', {
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      bufferLength: req.file.buffer?.length || 0,
    });
  } else {
    console.log('[Multer] ⚠️ Файл не найден в запросе');
  }
  next();
}

