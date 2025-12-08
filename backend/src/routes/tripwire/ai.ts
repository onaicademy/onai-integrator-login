/**
 * Tripwire AI Curator Routes
 * API для AI-куратора (ИЗОЛИРОВАННАЯ БД)
 */

import express from 'express';
import multer from 'multer';
import * as tripwireAiController from '../../controllers/tripwire/tripwireAiController';

const router = express.Router();

// ✅ Multer для загрузки файлов (в память, не на диск)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB макс
  },
  fileFilter: (req, file, cb) => {
    // Разрешённые типы файлов
    const allowedMimes = [
      'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm', 'audio/ogg', // Аудио
      'application/octet-stream', // ✅ WebM аудио из браузера может иметь этот MIME
      'image/jpeg', 'image/png', 'image/webp', 'image/gif', // Изображения
      'application/pdf', // PDF
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
      'text/plain', 'text/markdown', // Текст
    ];
    
    // ✅ Также разрешаем по расширению файла (для WebM)
    const allowedExtensions = ['.webm', '.mp3', '.wav', '.ogg', '.m4a', '.pdf', '.docx', '.jpg', '.jpeg', '.png', '.gif'];
    const fileExt = file.originalname.toLowerCase().match(/\.[^.]+$/)?.[0];
    
    if (allowedMimes.includes(file.mimetype) || (fileExt && allowedExtensions.includes(fileExt))) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype} (${file.originalname})`));
    }
  }
});

/**
 * POST /api/tripwire/ai/chat
 * Отправить текстовое сообщение AI-куратору
 */
router.post('/chat', tripwireAiController.chat);

/**
 * GET /api/tripwire/ai/history
 * Получить историю чата
 */
router.get('/history', tripwireAiController.history);

/**
 * POST /api/tripwire/ai/transcribe
 * ✅ НОВЫЙ: Только транскрипция аудио → текст (Groq Whisper)
 * Response: { transcription: string }
 */
router.post('/transcribe', upload.single('audio'), tripwireAiController.transcribe);

/**
 * POST /api/tripwire/ai/voice
 * ❌ DEPRECATED: Используй /transcribe + /chat вместо этого
 * Отправить голосовое сообщение (Whisper API)
 */
router.post('/voice', upload.single('audio'), tripwireAiController.voice);

/**
 * POST /api/tripwire/ai/file
 * Загрузить файл для анализа (Vision/OCR API)
 */
router.post('/file', upload.single('file'), tripwireAiController.file);

export default router;

