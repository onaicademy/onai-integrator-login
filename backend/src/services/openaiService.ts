/**
 * OpenAI Service
 *
 * Сервис для работы с OpenAI Assistants API.
 * Интегрирован с Rate Limiter для защиты от превышения лимитов.
 *
 * @see ./openai-rate-limiter.ts - Rate limiting
 * @see ./openai-client-pool.ts - Client pool с отдельными API ключами
 */

import OpenAI from 'openai';
import { openai } from '../config/openai';
import * as groqService from './groqAiService';
import { openAIRateLimiter, RateLimitError, Priority } from './openai-rate-limiter';
import { clientPool, AssistantType } from './openai-client-pool';

// Re-export types for convenience
export { RateLimitError, Priority, AssistantType };

// Re-export rate limiter stats
export { openAIRateLimiter };

/**
 * Создание нового Thread
 *
 * @param assistantType - Тип ассистента для rate limiting (default: curator)
 * @param priority - Приоритет запроса (default: HIGH)
 */
export async function createThread(
  assistantType: AssistantType = 'curator',
  priority: Priority = 'HIGH'
) {
  return openAIRateLimiter.enqueue(
    assistantType,
    'createThread',
    async () => {
      console.log('[OpenAI] Creating new thread...');

      const { client } = clientPool.getClient(assistantType);

      const thread = await client.beta.threads.create({}, {
        headers: {
          'OpenAI-Beta': 'assistants=v2',
        },
      });

      console.log(`✅ Thread created: ${thread.id}`);
      return thread;
    },
    priority
  );
}

/**
 * Создание сообщения в Thread
 *
 * @param threadId - ID треда
 * @param content - Содержимое сообщения
 * @param role - Роль (user/assistant)
 * @param assistantType - Тип ассистента для rate limiting
 * @param priority - Приоритет запроса
 */
export async function createThreadMessage(
  threadId: string,
  content: string,
  role: 'user' | 'assistant' = 'user',
  assistantType: AssistantType = 'curator',
  priority: Priority = 'HIGH'
) {
  // Валидация вне rate limiter для быстрого fail
  if (!threadId || !content) {
    throw new Error('threadId and content are required');
  }

  if (!threadId.startsWith('thread_')) {
    throw new Error(`Invalid threadId format. Expected thread_*, got: ${threadId}`);
  }

  return openAIRateLimiter.enqueue(
    assistantType,
    `createMessage:${threadId.substring(0, 20)}`,
    async () => {
      console.log(`[OpenAI] Creating message in thread: ${threadId}`);
      console.log(`[OpenAI] Role: ${role}, Content length: ${content.length}`);

      const { client } = clientPool.getClient(assistantType);

      const message = await client.beta.threads.messages.create(
        threadId,
        {
          role: role as any,
          content,
        },
        {
          headers: {
            'OpenAI-Beta': 'assistants=v2',
          },
        }
      );

      console.log(`✅ Message created: ${message.id}`);
      return message;
    },
    priority
  );
}

/**
 * Получение сообщений из Thread
 *
 * @param threadId - ID треда
 * @param limit - Лимит сообщений
 * @param order - Порядок сортировки
 * @param assistantType - Тип ассистента для rate limiting
 * @param priority - Приоритет запроса
 */
export async function getThreadMessages(
  threadId: string,
  limit?: number,
  order?: 'asc' | 'desc',
  assistantType: AssistantType = 'curator',
  priority: Priority = 'MEDIUM'
) {
  if (!threadId) {
    throw new Error('threadId is required');
  }

  if (!threadId.startsWith('thread_')) {
    throw new Error(`Invalid threadId format. Expected thread_*, got: ${threadId}`);
  }

  return openAIRateLimiter.enqueue(
    assistantType,
    `getMessages:${threadId.substring(0, 20)}`,
    async () => {
      console.log(`[OpenAI] Getting messages from thread: ${threadId}`);

      const { client } = clientPool.getClient(assistantType);

      const messages = await client.beta.threads.messages.list(
        threadId,
        {
          limit: limit || 1,
          order: order || 'desc',
        },
        {
          headers: {
            'OpenAI-Beta': 'assistants=v2',
          },
        }
      );

      console.log(`✅ Retrieved ${messages.data.length} messages`);
      return messages;
    },
    priority
  );
}

/**
 * Создание Run для Thread
 *
 * @param threadId - ID треда
 * @param assistantId - ID ассистента
 * @param assistantType - Тип ассистента для rate limiting
 * @param priority - Приоритет запроса
 */
export async function createThreadRun(
  threadId: string,
  assistantId: string,
  assistantType: AssistantType = 'curator',
  priority: Priority = 'HIGH'
) {
  if (!threadId || !assistantId) {
    throw new Error('threadId and assistantId are required');
  }

  if (!threadId.startsWith('thread_')) {
    throw new Error(`Invalid threadId format. Expected thread_*, got: ${threadId}`);
  }
  if (!assistantId.startsWith('asst_')) {
    throw new Error(`Invalid assistantId format. Expected asst_*, got: ${assistantId}`);
  }

  return openAIRateLimiter.enqueue(
    assistantType,
    `createRun:${threadId.substring(0, 20)}`,
    async () => {
      console.log(`[OpenAI] Creating run: threadId=${threadId}, assistantId=${assistantId}`);

      const { client } = clientPool.getClient(assistantType);

      const run = await client.beta.threads.runs.create(
        threadId,
        {
          assistant_id: assistantId,
        } as any,
        {
          headers: {
            'OpenAI-Beta': 'assistants=v2',
          },
        }
      );

      console.log(`✅ Run created: ${run.id}, status=${run.status}`);
      return run;
    },
    priority
  );
}

/**
 * Получение статуса Run
 *
 * Примечание: Polling операции используют MEDIUM priority чтобы не блокировать
 * более важные операции (создание тредов, сообщений).
 *
 * @param threadId - ID треда
 * @param runId - ID run
 * @param assistantType - Тип ассистента для rate limiting
 * @param priority - Приоритет запроса (default: MEDIUM для polling)
 */
export async function getThreadRun(
  threadId: string,
  runId: string,
  assistantType: AssistantType = 'curator',
  priority: Priority = 'MEDIUM'
) {
  if (!threadId || !runId) {
    throw new Error('threadId and runId are required');
  }

  if (!threadId.startsWith('thread_')) {
    throw new Error(`Invalid threadId format. Expected thread_*, got: ${threadId}`);
  }
  if (!runId.startsWith('run_')) {
    throw new Error(`Invalid runId format. Expected run_*, got: ${runId}`);
  }

  return openAIRateLimiter.enqueue(
    assistantType,
    `getRun:${runId.substring(0, 15)}`,
    async () => {
      console.log(`🔍 [getThreadRun] threadId=${threadId}, runId=${runId}`);

      const { client } = clientPool.getClient(assistantType);

      const run = await client.beta.threads.runs.retrieve(threadId, runId, {
        headers: {
          'OpenAI-Beta': 'assistants=v2',
        },
      });

      console.log(`✅ Run retrieved: ${run.id}, status=${run.status}`);
      return run;
    },
    priority
  );
}

/**
 * Получение статистики Rate Limiter
 */
export function getRateLimiterStats() {
  return openAIRateLimiter.getStats();
}

/**
 * Получение статистики Client Pool
 */
export function getClientPoolStats() {
  return clientPool.getStats();
}

// =========================================================================
// GROQ SERVICES (без rate limiting - у Groq свои лимиты)
// =========================================================================

/**
 * Транскрипция аудио через Groq Whisper (БЕСПЛАТНО!)
 * ✅ Groq Whisper быстрее и бесплатнее OpenAI Whisper
 */
export async function transcribeAudio(
  audioFile: any,
  language: string = 'ru',
  prompt?: string
) {
  try {
    console.log(`[Groq Whisper] === НАЧАЛО ТРАНСКРИПЦИИ ===`);
    console.log(`[Groq Whisper] File name: ${audioFile.name}`);
    console.log(`[Groq Whisper] File type: ${audioFile.type}`);
    console.log(`[Groq Whisper] File size: ${audioFile.size} bytes`);

    const groq = new OpenAI({
      apiKey: process.env.GROQ_API_KEY || '',
      baseURL: 'https://api.groq.com/openai/v1'
    });

    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3',
      language: language,
      response_format: 'verbose_json',
      prompt: prompt || 'Это голосовое сообщение студента на русском языке для AI-куратора образовательной платформы. Транскрибируй текст с правильной пунктуацией и заглавными буквами.',
      temperature: 0.0,
    });

    console.log(`✅ [Groq Whisper] Transcription successful:`);
    console.log(`   - Text length: ${(transcription as any).text?.length || 0} characters`);
    console.log(`   - Duration: ${(transcription as any).duration || 'N/A'} seconds`);
    console.log(`   - Language: ${(transcription as any).language || 'N/A'}`);

    return (transcription as any).text as string;
  } catch (error: any) {
    console.error('[Groq Whisper] ❌ === ОШИБКА ТРАНСКРИПЦИИ ===');
    console.error('[Groq Whisper] Error message:', error.message);
    console.error('[Groq Whisper] Error status:', error.status);

    if (error.status) {
      throw new Error(`${error.status} ${error.message || 'Unknown Groq Whisper error'}`);
    }
    throw new Error(`Failed to transcribe audio: ${error.message}`);
  }
}

/**
 * Анализ изображения через Groq Vision API (Llama 4 Scout)
 * ✅ 96% дешевле чем OpenAI GPT-4o Vision
 */
export async function analyzeImage(
  imageDataUrl: string,
  userQuestion?: string
): Promise<string> {
  try {
    console.log('[Groq Vision] Analyzing image with Llama 4 Scout...');

    // 🔒 SECURITY: Validate image data URL format before parsing
    if (!imageDataUrl || typeof imageDataUrl !== 'string') {
      throw new Error('Invalid image data: imageDataUrl is required');
    }

    const parts = imageDataUrl.split(',');
    if (parts.length < 2 || !parts[1]) {
      throw new Error('Invalid image data URL format. Expected: data:<mime>;base64,<data>');
    }

    const base64Data = parts[1];
    const imageBuffer = Buffer.from(base64Data, 'base64');

    const { analysis, usage } = await groqService.analyzeImage(
      imageBuffer,
      userQuestion || 'Опиши что изображено на картинке подробно.',
      'image/png'
    );

    console.log('[Groq Vision] ✅ Analysis completed');
    if (usage) {
      console.log(`💰 [Groq Vision] Cost: $${usage.cost_usd.toFixed(6)} (96% cheaper than OpenAI)`);
    }

    return analysis;
  } catch (error: any) {
    console.error('[Groq Vision] Failed to analyze image:', error.message);
    throw new Error(`Failed to analyze image: ${error.message}`);
  }
}
