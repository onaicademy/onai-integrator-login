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
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const file = req.file;
    const userQuestion = req.body.userQuestion || '';

    console.log('[FileController] Processing file:', {
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      userQuestion: userQuestion ? userQuestion.substring(0, 50) : 'N/A',
    });

    // Обрабатываем файл
    const processed = await fileProcessingService.processFile(
      file.buffer,
      file.mimetype,
      file.originalname
    );

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

    res.status(400).json({ error: 'Unsupported file type' });
  } catch (error: any) {
    console.error('[FileController] ❌ Error processing file:', error.message);
    res.status(500).json({
      error: 'Failed to process file',
      message: error.message,
    });
  }
}

// Экспортируем multer middleware
export const uploadMiddleware = upload.single('file');

