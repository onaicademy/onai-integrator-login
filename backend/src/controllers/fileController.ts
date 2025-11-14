import { Request, Response } from 'express';
import multer from 'multer';
import * as fileProcessingService from '../services/fileProcessingService';
import * as openaiService from '../services/openaiService';

// Multer для обработки multipart/form-data
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB макс
  },
});

/**
 * POST /api/files/process
 * Обработать файл (PDF, DOCX, изображение) и вернуть содержимое
 * 
 * Body (multipart/form-data):
 * - file: файл для обработки
 * - userQuestion?: текст вопроса пользователя (опционально)
 */
export async function processFile(req: Request, res: Response) {
  try {
    console.log('[FileController] 🔍 Начало обработки файла...');
    console.log('[FileController] ========== REQUEST DEBUG ==========');
    console.log('[FileController] req.file:', !!req.file);
    console.log('[FileController] req.body:', req.body);
    console.log('[FileController] req.headers:', req.headers);
    console.log('[FileController] Object.keys(req):', Object.keys(req).filter(k => !k.startsWith('_')));
    console.log('[FileController] req.files:', (req as any).files);
    console.log('[FileController] Content-Type:', req.get('Content-Type'));
    console.log('[FileController] ========================================');
    
    if (!req.file) {
      console.error('[FileController] ❌ Файл не найден в запросе');
      console.error('[FileController] ❌ Возможные причины:');
      console.error('[FileController]    1. Multer не смог распарсить multipart/form-data');
      console.error('[FileController]    2. Поле формы называется не "file"');
      console.error('[FileController]    3. Content-Type заголовок неверный');
      console.error('[FileController]    4. Файл больше лимита (10MB)');
      return res.status(400).json({ error: 'No file provided' });
    }

    const file = req.file;
    const userQuestion = req.body.userQuestion || '';

    console.log('[FileController] ✅ Файл получен:', {
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      bufferLength: file.buffer?.length || 0,
      userQuestion: userQuestion ? userQuestion.substring(0, 50) : 'N/A',
    });

    // Обрабатываем файл
    console.log('[FileController] 📎 Вызываем fileProcessingService.processFile...');
    const processed = await fileProcessingService.processFile(
      file.buffer,
      file.mimetype,
      file.originalname
    );
    
    console.log('[FileController] ✅ Файл обработан:', {
      type: processed.type,
      contentLength: processed.content?.length || 0,
      originalName: processed.originalName,
    });

    // Для изображений - анализируем через Vision API
    if (processed.type === 'image') {
      console.log('[FileController] Image detected, analyzing with Vision API...');
      
      const imageAnalysis = await openaiService.analyzeImage(
        processed.content,
        userQuestion || 'Опиши что изображено на картинке подробно.'
      );

      return res.json({
        success: true,
        type: 'image',
        analysis: imageAnalysis,
        originalName: processed.originalName,
      });
    }

    // Для текстовых файлов (PDF, DOCX) - возвращаем извлечённый текст
    if (processed.type === 'text') {
      console.log('[FileController] Text extracted from document');
      
      return res.json({
        success: true,
        type: 'text',
        content: processed.content,
        originalName: processed.originalName,
      });
    }

    console.error('[FileController] ❌ Unsupported file type');
    res.status(400).json({ error: 'Unsupported file type' });
  } catch (error: any) {
    console.error('[FileController] ❌ КРИТИЧЕСКАЯ ОШИБКА обработки файла:');
    console.error('[FileController] Тип ошибки:', error.constructor.name);
    console.error('[FileController] Сообщение:', error.message);
    console.error('[FileController] Стек:', error.stack);
    res.status(500).json({
      error: 'Failed to process file',
      message: error.message,
      type: error.constructor.name,
    });
  }
}

// Экспортируем multer middleware
export const uploadMiddleware = upload.single('file');

