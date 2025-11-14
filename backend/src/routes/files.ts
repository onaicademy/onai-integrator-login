import { Router, Request, Response, NextFunction } from 'express';
import { authenticateJWT } from '../middleware/auth';
import * as fileController from '../controllers/fileController';
import multer from 'multer';

const router = Router();

/**
 * Обработчик ошибок Multer (большой файл, неверный тип и т.д.)
 */
function handleMulterError(err: any, req: Request, res: Response, next: NextFunction) {
  if (err instanceof multer.MulterError) {
    console.error('[Multer Error] Тип:', err.code);
    console.error('[Multer Error] Сообщение:', err.message);
    console.error('[Multer Error] Поле:', err.field);
    
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: 'File too large',
        message: 'Файл слишком большой. Максимальный размер: 10MB',
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
  
  // Если не Multer ошибка - передаём дальше
  next(err);
}

/**
 * POST /api/files/process
 * Обработать файл (PDF, DOCX, изображение)
 * 
 * multipart/form-data:
 * - file: файл для обработки
 * - userQuestion?: вопрос пользователя (опционально)
 */
router.post(
  '/process',
  authenticateJWT,
  fileController.uploadMiddleware,
  handleMulterError, // ✅ Обработчик ошибок Multer
  fileController.processFile
);

export default router;

