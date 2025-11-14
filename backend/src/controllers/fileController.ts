import { Request, Response } from 'express';
import * as fileProcessingService from '../services/fileProcessingService';
import * as openaiService from '../services/openaiService';
import { uploadToStorage } from '../services/supabaseStorageService';
import { saveFileMetadata } from '../services/supabaseDatabaseService';

/**
 * POST /api/files/process
 * 
 * НОВАЯ АРХИТЕКТУРА:
 * 1. Получить файл через Multer (req.file.buffer)
 * 2. Извлечь текст из PDF/DOCX
 * 3. Загрузить файл в Supabase Storage
 * 4. Сохранить metadata в БД (таблица file_uploads)
 * 5. Вернуть URL файла + извлечённый текст
 * 
 * Body (multipart/form-data):
 * - file: файл для обработки (REQUIRED)
 * - userId: UUID пользователя (REQUIRED)
 * - threadId: OpenAI thread ID (optional)
 * - userQuestion: текст вопроса пользователя (optional)
 */
export async function processFile(req: Request, res: Response) {
  try {
    console.log('[FileController] 🔍 Обработка файла (НОВАЯ АРХИТЕКТУРА)...');
    
    // 1. Проверка наличия файла
    if (!req.file) {
      console.error('[FileController] ❌ Файл не найден в запросе');
      return res.status(400).json({ error: 'No file provided' });
    }

    const { buffer, originalname, mimetype, size } = req.file;
    const { userId, threadId, userQuestion } = req.body;

    // 2. Проверка userId
    if (!userId) {
      console.error('[FileController] ❌ userId отсутствует');
      return res.status(400).json({ error: 'userId is required' });
    }

    console.log('[FileController] 📄 Файл получен:', {
      filename: originalname,
      mimetype,
      size,
      userId,
      threadId: threadId || 'N/A',
    });

    // 3. Извлечение текста (для PDF/DOCX)
    let extractedText = '';
    
    if (mimetype === 'application/pdf') {
      console.log('[FileController] 📄 Извлекаем текст из PDF...');
      extractedText = await fileProcessingService.extractTextFromPDF(buffer);
      console.log(`[FileController] ✅ Извлечено ${extractedText.length} символов из PDF`);
    } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      console.log('[FileController] 📄 Извлекаем текст из DOCX...');
      extractedText = await fileProcessingService.extractTextFromDOCX(buffer);
      console.log(`[FileController] ✅ Извлечено ${extractedText.length} символов из DOCX`);
    }

    // 4. Анализ изображений через Vision API
    if (mimetype.startsWith('image/')) {
      console.log('[FileController] 🖼️ Обнаружено изображение, анализируем через Vision API...');
      
      const base64 = buffer.toString('base64');
      const dataUrl = `data:${mimetype};base64,${base64}`;
      
      const imageAnalysis = await openaiService.analyzeImage(
        dataUrl,
        userQuestion || 'Опиши что изображено на картинке подробно.'
      );
      
      extractedText = imageAnalysis; // Сохраняем описание как "извлечённый текст"
      console.log('[FileController] ✅ Изображение проанализировано');
    }

    // 5. Загрузка файла в Supabase Storage
    console.log('[FileController] 📤 Загружаем файл в Supabase Storage...');
    const { path, url } = await uploadToStorage(userId, originalname, buffer, mimetype);
    console.log(`[FileController] ✅ Файл загружен в Storage: ${url}`);

    // 6. Сохранение metadata в БД
    console.log('[FileController] 💾 Сохраняем metadata в БД...');
    const fileRecord = await saveFileMetadata({
      userId,
      threadId,
      filename: originalname,
      filePath: path,
      fileUrl: url,
      fileSize: size,
      fileType: mimetype,
      extractedText,
      processingStatus: 'completed',
    });
    console.log('[FileController] ✅ Metadata сохранена, ID:', fileRecord.id);

    // 7. Возврат результата
    res.json({
      success: true,
      file: {
        id: fileRecord.id,
        filename: originalname,
        fileUrl: url,
        fileSize: size,
        fileType: mimetype,
        extractedText: extractedText ? extractedText.substring(0, 500) : null, // Первые 500 символов
        processingStatus: 'completed',
        createdAt: fileRecord.created_at,
      },
    });

  } catch (error: any) {
    console.error('[FileController] ❌ КРИТИЧЕСКАЯ ОШИБКА:');
    console.error('[FileController] Тип:', error.constructor.name);
    console.error('[FileController] Сообщение:', error.message);
    console.error('[FileController] Стек:', error.stack);
    
    // Пытаемся сохранить ошибку в БД
    if (req.body.userId && req.file) {
      try {
        await saveFileMetadata({
          userId: req.body.userId,
          threadId: req.body.threadId,
          filename: req.file.originalname,
          filePath: '',
          fileUrl: '',
          fileSize: req.file.size,
          fileType: req.file.mimetype,
          processingStatus: 'failed',
          errorMessage: error.message,
        });
        console.log('[FileController] ⚠️ Ошибка сохранена в БД');
      } catch (dbError) {
        console.error('[FileController] ❌ Не удалось сохранить ошибку в БД:', dbError);
      }
    }

    res.status(500).json({
      error: error.message || 'Failed to process file',
      type: error.constructor.name,
    });
  }
}

