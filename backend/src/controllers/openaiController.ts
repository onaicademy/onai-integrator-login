import { Request, Response } from 'express';
import * as openaiService from '../services/openaiService';
import { getAssistantId, AssistantType } from '../config/assistants';
import multer from 'multer';

// Multer для обработки multipart/form-data (загрузка файлов)
const upload = multer({ storage: multer.memoryStorage() });

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
    const { assistant_type, temperature, top_p } = req.body;

    if (!assistant_type) {
      return res.status(400).json({ 
        error: 'Missing assistant_type in request body',
        hint: 'assistant_type must be one of: curator, mentor, analyst'
      });
    }

    // Валидация типа ассистента
    const validTypes: AssistantType[] = ['curator', 'mentor', 'analyst'];
    if (!validTypes.includes(assistant_type as AssistantType)) {
      return res.status(400).json({
        error: `Invalid assistant_type: ${assistant_type}`,
        hint: 'assistant_type must be one of: curator, mentor, analyst'
      });
    }

    // Получаем Assistant ID из конфигурации (environment variables)
    const assistantId = getAssistantId(assistant_type as AssistantType);

    // Создаём run
    const run = await openaiService.createThreadRun(
      threadId,
      assistantId,
      temperature,
      top_p
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
    console.error('❌ Error in createRun:', error.message);
    res.status(500).json({ 
      error: 'Failed to create run',
      message: error.message 
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

    const { language, prompt } = req.body;

    // Создаём File объект из Buffer
    const audioFile = new File([req.file.buffer], req.file.originalname || 'recording.webm', {
      type: req.file.mimetype,
    });

    const transcription = await openaiService.transcribeAudio(audioFile, language, prompt);

    res.json({ 
      text: transcription,
      duration: req.body.duration || null,
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

