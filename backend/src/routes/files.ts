import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import { upload, handleMulterError as multerErrorHandler, logFileInfo } from '../middleware/multer';
import * as fileController from '../controllers/fileController';

const router = Router();

/**
 * POST /api/files/process
 * 
 * Загрузка и обработка файлов (PDF, DOCX, Images)
 * 
 * НОВАЯ АРХИТЕКТУРА:
 * 1. Multer парсит multipart/form-data → req.file
 * 2. Controller извлекает текст из PDF/DOCX
 * 3. Controller загружает файл в Supabase Storage
 * 4. Controller сохраняет metadata в БД (таблица file_uploads)
 * 5. Controller возвращает fileUrl + extractedText
 * 
 * Body (multipart/form-data):
 * - file: файл для обработки (REQUIRED)
 * - userId: UUID пользователя (REQUIRED)
 * - threadId: OpenAI thread ID (optional)
 * - userQuestion: текст вопроса пользователя (optional)
 * 
 * Middleware chain:
 * - authenticateJWT: проверка JWT токена
 * - upload.single('file'): Multer парсинг файла
 * - logFileInfo: логирование информации о файле
 * - multerErrorHandler: обработка ошибок Multer
 * - fileController.processFile: основная логика обработки
 */
router.post(
  '/process',
  authenticateJWT,
  upload.single('file'),
  logFileInfo,
  multerErrorHandler,
  fileController.processFile
);

export default router;
