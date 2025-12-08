/**
 * Tripwire AI Curator Controller
 * HTTP Controller для AI-куратора
 * ИЗОЛИРОВАННЫЙ для Tripwire DB
 */

import { Request, Response } from 'express';
import { processChat, getChatHistory, processVoiceMessage, processFileUpload } from '../../services/tripwire/tripwireAiService';
import ffmpeg from 'fluent-ffmpeg';
import stream from 'stream';

/**
 * Конвертирует WebM audio buffer в MP3
 * ✅ СКОПИРОВАНО С МЕЙН-ПЛАТФОРМЫ
 */
async function convertWebmToMp3(webmBuffer: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const bufferStream = new stream.PassThrough();
    bufferStream.end(webmBuffer);

    const chunks: Buffer[] = [];
    const outputStream = new stream.PassThrough();

    outputStream.on('data', (chunk) => chunks.push(chunk));
    outputStream.on('end', () => resolve(Buffer.concat(chunks)));
    outputStream.on('error', reject);

    ffmpeg(bufferStream)
      .toFormat('mp3')
      .audioBitrate('128k')
      .audioChannels(1)
      .audioFrequency(16000)
      .on('error', (err) => {
        console.error('[FFmpeg] ❌ Conversion error:', err.message);
        reject(new Error(`FFmpeg conversion failed: ${err.message}`));
      })
      .on('end', () => {
        console.log('[FFmpeg] ✅ Conversion completed');
      })
      .pipe(outputStream);
  });
}

/**
 * POST /api/tripwire/ai/chat
 * Отправить сообщение AI-куратору
 */
export async function chat(req: Request, res: Response): Promise<void> {
  try {
    const { user_id, message } = req.body;
    
    if (!user_id || !message) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: user_id, message'
      });
      return;
    }
    
    console.log('🤖 [Tripwire AiController] Чат-запрос от:', user_id);
    
    const response = await processChat(user_id, message);
    
    res.json({
      success: true,
      data: response
    });
  } catch (error: any) {
    console.error('❌ [Tripwire AiController] Ошибка chat:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process chat message'
    });
  }
}

/**
 * GET /api/tripwire/ai/history
 * Получить историю чата
 */
export async function history(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.query.user_id as string;
    const limit = parseInt(req.query.limit as string) || 50;
    
    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'Missing required query parameter: user_id'
      });
      return;
    }
    
    console.log('🤖 [Tripwire AiController] Запрос истории для:', userId);
    
    const messages = await getChatHistory(userId, limit);
    
    res.json({
      success: true,
      data: messages,
      count: messages.length
    });
  } catch (error: any) {
    console.error('❌ [Tripwire AiController] Ошибка history:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch chat history'
    });
  }
}

/**
 * POST /api/tripwire/ai/transcribe
 * ✅ НОВЫЙ ENDPOINT: Только транскрипция аудио → текст
 * Response: { transcription: string }
 */
export async function transcribe(req: Request, res: Response): Promise<void> {
  try {
    const { user_id } = req.body;
    if (!req.file) {
      res.status(400).json({ success: false, error: 'Missing audio file' });
      return;
    }
    
    const audioFile = req.file;
    console.log('🎤 [Tripwire Transcribe] Аудио от:', user_id);
    console.log('📊 Size:', audioFile.size, 'bytes, MIME:', audioFile.mimetype);
    
    // ✅ КОНВЕРТАЦИЯ WebM → MP3
    let audioBuffer = audioFile.buffer;
    let mimeType = (audioFile.mimetype || 'audio/webm').split(';')[0];
    let filename = audioFile.originalname || 'recording.webm';
    
    if (mimeType.includes('webm') || mimeType.includes('ogg')) {
      console.log('[Transcribe] 🔄 Converting WebM/OGG → MP3...');
      try {
        audioBuffer = await convertWebmToMp3(audioFile.buffer);
        mimeType = 'audio/mp3';
        filename = 'recording.mp3';
        console.log(`[Transcribe] ✅ Converted: ${audioBuffer.length} bytes`);
      } catch (err: any) {
        console.error('[Transcribe] ❌ Conversion failed:', err.message);
        res.status(500).json({ success: false, error: 'Audio conversion failed' });
        return;
      }
    }
    
    // ✅ GROQ WHISPER TRANSCRIPTION (импортируем функцию из service)
    const { transcribeAudioOnly } = await import('../../services/tripwire/tripwireAiService');
    const processedAudio = { buffer: audioBuffer, originalname: filename, mimetype: mimeType, size: audioBuffer.length } as Express.Multer.File;
    
    const transcription = await transcribeAudioOnly(processedAudio);
    
    console.log(`[Transcribe] ✅ Результат: "${transcription}"`);
    
    res.json({ 
      success: true, 
      transcription // ✅ ТОЛЬКО ТЕКСТ, БЕЗ AI ОТВЕТА!
    });
  } catch (error: any) {
    console.error('❌ [Tripwire Transcribe] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/tripwire/ai/voice
 * ❌ DEPRECATED: Используй /transcribe + /chat
 * Отправить голосовое сообщение (Whisper API)
 */
export async function voice(req: Request, res: Response): Promise<void> {
  try {
    const { user_id, duration } = req.body;
    if (!req.file) {
      res.status(400).json({ success: false, error: 'Missing audio file' });
      return;
    }
    
    const audioFile = req.file;
    console.log('🎤 [Tripwire] Голос от:', user_id);
    console.log('📊 Original:', audioFile.size, 'bytes,', audioFile.mimetype);
    
    // ✅ КОНВЕРТАЦИЯ WebM → MP3 (КАК НА МЕЙН-ПЛАТФОРМЕ!)
    let audioBuffer = audioFile.buffer;
    let mimeType = (audioFile.mimetype || 'audio/webm').split(';')[0];
    let filename = audioFile.originalname || 'recording.webm';
    
    if (mimeType.includes('webm') || mimeType.includes('ogg')) {
      console.log('[Tripwire] 🔄 Converting to MP3...');
      try {
        audioBuffer = await convertWebmToMp3(audioFile.buffer);
        mimeType = 'audio/mp3';
        filename = 'recording.mp3';
        console.log(`[Tripwire] ✅ Converted: ${audioBuffer.length} bytes`);
      } catch (err: any) {
        console.error('[Tripwire] ❌ Conversion failed:', err.message);
        res.status(500).json({ success: false, error: 'Conversion failed' });
        return;
      }
    }
    
    const processedAudio = { buffer: audioBuffer, originalname: filename, mimetype: mimeType, size: audioBuffer.length } as Express.Multer.File;
    const response = await processVoiceMessage(user_id, processedAudio);
    
    res.json({ success: true, data: response, message: 'Transcribed' });
  } catch (error: any) {
    console.error('❌ [Tripwire] Voice error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/tripwire/ai/file
 * Загрузить файл для анализа (Vision/OCR/PDF API)
 */
export async function file(req: Request, res: Response): Promise<void> {
  try {
    const { user_id, question } = req.body;
    const uploadedFile = req.file; // Multer file
    
    if (!user_id || !uploadedFile) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: user_id, file'
      });
      return;
    }
    
    console.log('📎 [Tripwire AiController] Файл от:', user_id);
    console.log('📊 [Tripwire AiController] File:', uploadedFile.originalname, uploadedFile.mimetype, uploadedFile.size, 'bytes');
    console.log('💬 [Tripwire AiController] Вопрос:', question);
    
    const response = await processFileUpload(user_id, uploadedFile, question);
    
    res.json({
      success: true,
      data: response,
      message: 'File analyzed successfully'
    });
  } catch (error: any) {
    console.error('❌ [Tripwire AiController] Ошибка file:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process file'
    });
  }
}

