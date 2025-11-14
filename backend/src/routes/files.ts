import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import * as fileController from '../controllers/fileController';

const router = Router();

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
  fileController.processFile
);

export default router;

