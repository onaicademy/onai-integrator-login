import { Request, Response } from 'express';
import * as openaiService from '../services/openaiService';
import * as tokenService from '../services/tokenService'; // ✅ Добавлен импорт
import { getAssistantId, AssistantType } from '../config/assistants';
import multer from 'multer';
import { toFile } from 'openai/uploads'; // ✅ Для создания File объекта в Node.js
import ffmpeg from 'fluent-ffmpeg';
import stream from 'stream';

// Multer для обработки multipart/form-data (загрузка файлов)
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Конвертирует WebM audio buffer в MP3
 * @param webmBuffer - Buffer с WebM данными
 * @returns Promise<Buffer> - Buffer с MP3 данными
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
      .audioChannels(1) // Mono для уменьшения размера
      .audioFrequency(16000) // 16kHz достаточно для речи
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
 * POST /api/openai/threads/:threadId/runs
 * Создание Run для Thread
 * 
 * Body params:
 * - assistant_type: 'curator' | 'mentor' | 'analyst' (REQUIRED)
 * - temperature?: number (optional, default 0.4)
 * - top_p?: number (optional, default 0.8)
 */
export async function createRun(req: Request, res: Response) {
  try {
    const { threadId } = req.params;
    const { assistant_type } = req.body;

    if (!assistant_type) {
      return res.status(400).json({ 
        error: 'Missing assistant_type in request body',
        hint: 'assistant_type must be one of: curator, mentor, analyst'
      });
    }

    // Валидация типа ассистента
    const validTypes: AssistantType[] = ['curator', 'mentor', 'analyst', 'tripwire'];
    if (!validTypes.includes(assistant_type as AssistantType)) {
      return res.status(400).json({
        error: `Invalid assistant_type: ${assistant_type}`,
        hint: 'assistant_type must be one of: curator, mentor, analyst, tripwire'
      });
    }

    // Получаем Assistant ID из конфигурации (environment variables)
    const assistantId = getAssistantId(assistant_type as AssistantType);

    // Определяем тип для rate limiter (tripwire использует curator)
    const rateLimiterType = assistant_type === 'tripwire' ? 'curator' : assistant_type;

    // Создаём run
    const run = await openaiService.createThreadRun(
      threadId,
      assistantId,
      rateLimiterType as 'curator' | 'mentor' | 'analyst',
      'HIGH'
    );

    console.log('✅ Run created:', run.id, 'Status:', run.status);

    // ⏳ POLLING: Ждём завершения run
    let runStatus = await openaiService.getThreadRun(threadId, run.id);
    const maxAttempts = 60; // 60 секунд timeout
    let attempts = 0;

    while (
      (runStatus.status === 'queued' || runStatus.status === 'in_progress') &&
      attempts < maxAttempts
    ) {
      console.log(`⏳ Run status: ${runStatus.status} (${attempts + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      runStatus = await openaiService.getThreadRun(threadId, run.id);
      attempts++;
    }

    console.log('✅ Final run status:', runStatus.status);

    // Обработка финального статуса
    if (runStatus.status === 'completed') {
      // ✅ ЗАПИСЬ ЗАТРАТ ДЛЯ AI КУРАТОРА (для всех пользователей)
      const userId = (req as any).user?.id;
      if (userId && (runStatus as any).usage) {
        try {
          const { adminSupabase } = await import('../config/supabase');
          const usage = (runStatus as any).usage;
          const totalTokens = usage.total_tokens || 0;
          const promptTokens = usage.prompt_tokens || 0;
          const completionTokens = usage.completion_tokens || 0;
          
          // GPT-4o: $2.50 per 1M input tokens, $10 per 1M output tokens
          const promptCost = (promptTokens / 1000000) * 2.5;
          const completionCost = (completionTokens / 1000000) * 10;
          const totalCost = promptCost + completionCost;
          
          // Проверяем, Tripwire ли это пользователь
          const { data: tripwireProfile } = await adminSupabase
            .from('tripwire_user_profile')
            .select('user_id')
            .eq('user_id', userId)
            .single();
          
          if (tripwireProfile) {
            // Tripwire: сохраняем в tripwire_ai_costs
            await adminSupabase.from('tripwire_ai_costs').insert({
              user_id: userId,
              cost_type: 'curator_chat',
              service: 'openai',
              model: 'gpt-4o',
              tokens_used: totalTokens,
              cost_usd: totalCost,
              metadata: { 
                thread_id: threadId,
                run_id: run.id,
                prompt_tokens: promptTokens,
                completion_tokens: completionTokens
              }
            });
            console.log(`[AI Curator] ✅ Tripwire cost: ${totalTokens} tokens, $${totalCost.toFixed(6)}`);
          } else {
            // Main platform: сохраняем в ai_token_usage
            const tokenService = await import('../services/tokenService');
            await tokenService.logTokenUsage({
              userId: userId,
              assistantType: 'curator',
              model: 'gpt-4o',
              promptTokens: promptTokens,
              completionTokens: completionTokens,
              totalTokens: totalTokens,
              openaiThreadId: threadId,
              openaiRunId: run.id,
              requestType: 'chat'
            });
            console.log(`[AI Curator] ✅ Main platform cost: ${totalTokens} tokens, $${totalCost.toFixed(6)}`);
          }
        } catch (logError: any) {
          console.error('[AI Curator] ⚠️ Не удалось записать cost:', logError.message);
        }
      }
      
      // Run завершён успешно - возвращаем run с финальным статусом
      res.json(runStatus);
    } else if (runStatus.status === 'requires_action') {
      return res.status(400).json({
        error: 'Run requires action (function calling not implemented)',
        runStatus: runStatus.status,
        run: runStatus,
      });
    } else if (runStatus.status === 'failed') {
      return res.status(500).json({
        error: `Run failed: ${(runStatus as any).last_error?.message || 'Unknown error'}`,
        runStatus: runStatus.status,
        run: runStatus,
      });
    } else if (runStatus.status === 'expired') {
      return res.status(410).json({
        error: 'Run expired',
        runStatus: runStatus.status,
        run: runStatus,
      });
    } else if (runStatus.status === 'cancelled') {
      return res.status(400).json({
        error: 'Run was cancelled',
        runStatus: runStatus.status,
        run: runStatus,
      });
    } else if (attempts >= maxAttempts) {
      return res.status(408).json({
        error: 'Run timeout exceeded 60 seconds',
        runStatus: runStatus.status,
        run: runStatus,
      });
    } else {
      return res.status(500).json({
        error: `Run ended with unexpected status: ${runStatus.status}`,
        runStatus: runStatus.status,
        run: runStatus,
      });
    }
  } catch (error: any) {
    console.error('❌ Error in createRun:', {
      message: error.message,
      status: error.status,
      code: error.code,
      threadId: req.params.threadId,
      assistantType: req.body.assistant_type,
      stack: error.stack?.split('\n').slice(0, 5).join('\n'),
    });

    // Если это ошибка OpenAI - передаем детали
    const statusCode = error.status || 500;
    res.status(statusCode).json({
      error: 'Failed to create run',
      message: error.message,
      code: error.code,
      details: error.error?.message || null,
    });
  }
}

/**
 * GET /api/openai/threads/:threadId/runs/:runId
 * Получение статуса Run
 */
export async function getRun(req: Request, res: Response) {
  try {
    const { threadId, runId } = req.params;
    
    // Детальное логирование параметров
    console.log(`📥 GET Run request received:`);
    console.log(`   threadId: ${threadId}`);
    console.log(`   runId: ${runId}`);
    console.log(`   Full URL: ${req.originalUrl}`);

    const run = await openaiService.getThreadRun(threadId, runId);

    res.json(run);
  } catch (error: any) {
    console.error('❌ Error in getRun:', {
      message: error.message,
      threadId: req.params.threadId,
      runId: req.params.runId,
      url: req.originalUrl,
    });
    res.status(500).json({ 
      error: 'Failed to retrieve run',
      message: error.message 
    });
  }
}

/**
 * GET /api/openai/threads/:threadId/messages
 * Получение сообщений из Thread
 */
export async function getMessages(req: Request, res: Response) {
  try {
    const { threadId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 1;
    const order = (req.query.order as 'asc' | 'desc') || 'desc';

    const messages = await openaiService.getThreadMessages(threadId, limit, order);

    res.json(messages);
  } catch (error: any) {
    console.error('❌ Error in getMessages:', error.message);
    res.status(500).json({ 
      error: 'Failed to retrieve messages',
      message: error.message 
    });
  }
}

/**
 * POST /api/openai/threads/:threadId/messages
 * Создание сообщения в Thread
 */
export async function createMessage(req: Request, res: Response) {
  try {
    const { threadId } = req.params;
    const { content, role } = req.body;

    if (!content) {
      return res.status(400).json({ 
        error: 'Missing content in request body' 
      });
    }

    const message = await openaiService.createThreadMessage(threadId, content, role);

    res.json(message);
  } catch (error: any) {
    console.error('❌ Error in createMessage:', error.message);
    res.status(500).json({ 
      error: 'Failed to create message',
      message: error.message 
    });
  }
}

/**
 * POST /api/openai/threads
 * Создание нового Thread
 */
export async function createThread(req: Request, res: Response) {
  try {
    const thread = await openaiService.createThread();

    res.json(thread);
  } catch (error: any) {
    console.error('❌ Error in createThread:', error.message);
    res.status(500).json({ 
      error: 'Failed to create thread',
      message: error.message 
    });
  }
}

/**
 * POST /api/openai/audio/transcriptions
 * Транскрипция аудио через Whisper
 */
export async function transcribeAudio(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'Missing audio file in request' 
      });
    }

    const { language, prompt, duration } = req.body;
    const userId = (req as any).user?.id; // Получаем userId из JWT токена

    console.log('[OpenAI Controller] 🎙️ Транскрибируем аудио:', {
      size: req.file.size,
      type: req.file.mimetype,
      duration: duration,
      userId: userId,
    });

    // ✅ Конвертируем WebM в MP3 для совместимости с Groq Whisper
    let audioBuffer = req.file.buffer;
    let mimeType = req.file.mimetype || 'audio/webm';
    let filename = 'recording.mp3';
    
    // Убираем ;codecs=opus из MIME type
    if (mimeType.includes(';')) {
      mimeType = mimeType.split(';')[0];
    }
    
    // Если файл WebM - конвертируем в MP3
    if (mimeType.includes('webm') || mimeType.includes('ogg')) {
      console.log('[OpenAI Controller] 🔄 Converting WebM/OGG to MP3...');
      try {
        audioBuffer = await convertWebmToMp3(req.file.buffer);
        mimeType = 'audio/mp3';
        filename = 'recording.mp3';
        console.log(`[OpenAI Controller] ✅ Converted to MP3, size: ${audioBuffer.length} bytes`);
      } catch (convErr: any) {
        console.error('[OpenAI Controller] ❌ Conversion failed:', convErr.message);
        return res.status(500).json({ 
          error: 'Audio conversion failed',
          details: convErr.message
        });
      }
    }
    
    console.log(`[OpenAI Controller] Creating audio file:`);
    console.log(`  - Filename: ${filename}`);
    console.log(`  - MIME Type: ${mimeType}`);
    console.log(`  - Original MIME: ${req.file.mimetype}`);
    console.log(`  - Size: ${audioBuffer.length} bytes`);
    
    const audioFile = await toFile(audioBuffer, filename, {
      type: mimeType,
    });

    const transcription = await openaiService.transcribeAudio(audioFile, language, prompt);

    // ✅ Логируем использование Whisper
    const audioDurationSeconds = parseFloat(duration) || 0;
    if (audioDurationSeconds > 0 && userId) {
      try {
        await tokenService.logTokenUsage({
          userId: userId,
          assistantType: 'curator', // Whisper используется только в AI-кураторе
          model: 'whisper-1',
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          requestType: 'voice_transcription',
          audioDurationSeconds: audioDurationSeconds,
        });
        console.log(`[OpenAI Controller] ✅ Whisper токены залогированы: ${audioDurationSeconds}s`);
        
        // ✅ TRIPWIRE: Если это Tripwire студент, записываем в tripwire_ai_costs
        const { adminSupabase } = await import('../config/supabase');
        const { data: tripwireProfile } = await adminSupabase
          .from('tripwire_user_profile')
          .select('user_id')
          .eq('user_id', userId)
          .single();
        
        if (tripwireProfile) {
          const costUsd = (audioDurationSeconds / 60) * 0.006; // $0.006 per minute
          await adminSupabase.from('tripwire_ai_costs').insert({
            user_id: userId,
            cost_type: 'curator_whisper',
            service: 'openai',
            model: 'whisper-1',
            tokens_used: 0,
            cost_usd: costUsd,
            metadata: { audio_duration: audioDurationSeconds }
          });
          console.log(`[OpenAI Controller] ✅ Tripwire Whisper cost записан: $${costUsd.toFixed(6)}`);
        }
      } catch (logError: any) {
        console.error('[OpenAI Controller] ⚠️ Не удалось залогировать Whisper:', logError.message);
        // Не прерываем работу, если логирование не удалось
      }
    }

    res.json({ 
      text: transcription,
      duration: audioDurationSeconds,
    });
  } catch (error: any) {
    console.error('❌ Error in transcribeAudio:', error.message);
    res.status(500).json({ 
      error: 'Failed to transcribe audio',
      message: error.message 
    });
  }
}

/**
 * GET /api/openai/assistants
 * Получение списка доступных ассистентов
 */
export async function getAvailableAssistants(req: Request, res: Response) {
  try {
    const assistants: AssistantType[] = ['curator', 'mentor', 'analyst'];
    const result = assistants.map(type => {
      try {
        const assistantId = getAssistantId(type);
        return {
          type,
          id: assistantId,
          available: true,
        };
      } catch (error) {
        return {
          type,
          id: null,
          available: false,
          error: 'Not configured',
        };
      }
    });

    res.json({ assistants: result });
  } catch (error: any) {
    console.error('❌ Error in getAvailableAssistants:', error.message);
    res.status(500).json({ 
      error: 'Failed to get assistants',
      message: error.message 
    });
  }
}

// Экспортируем multer middleware для использования в routes
export { upload };

