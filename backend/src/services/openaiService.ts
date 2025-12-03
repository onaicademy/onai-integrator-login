import { openai } from '../config/openai';

/**
 * Создание нового Thread
 */
export async function createThread() {
  try {
    console.log('[OpenAI] Creating new thread...');
    console.log('[OpenAI] Sending with header: OpenAI-Beta: assistants=v2');
    
    const thread = await openai.beta.threads.create({}, {
      headers: {
        'OpenAI-Beta': 'assistants=v2',
      },
    });
    
    console.log(`✅ Thread created: ${thread.id}`);
    return thread;
  } catch (error: any) {
    console.error('[OpenAI] Failed to create thread:', error.message);
    console.error('[OpenAI] Full error:', error);
    throw new Error(`Failed to create thread: ${error.message}`);
  }
}

/**
 * Создание сообщения в Thread
 */
export async function createThreadMessage(
  threadId: string,
  content: string,
  role: 'user' | 'assistant' = 'user'
) {
  try {
    if (!threadId || !content) {
      throw new Error('threadId and content are required');
    }
    
    // ✅ ПРОВЕРКА ФОРМАТА: thread_ префикс ОБЯЗАТЕЛЕН!
    if (!threadId.startsWith('thread_')) {
      throw new Error(`Invalid threadId format. Expected thread_*, got: ${threadId}`);
    }
    
    console.log(`[OpenAI] Creating message in thread: ${threadId}`);
    console.log(`[OpenAI] Role: ${role}, Content length: ${content.length}`);
    
    const message = await openai.beta.threads.messages.create(
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
  } catch (error: any) {
    console.error('[OpenAI] Failed to create message:', {
      message: error.message,
      threadId,
      stack: error.stack,
    });
    throw new Error(`Failed to create message: ${error.message}`);
  }
}

/**
 * Получение сообщений из Thread
 */
export async function getThreadMessages(
  threadId: string,
  limit?: number,
  order?: 'asc' | 'desc'
) {
  try {
    if (!threadId) {
      throw new Error('threadId is required');
    }
    
    // ✅ ПРОВЕРКА ФОРМАТА: thread_ префикс ОБЯЗАТЕЛЕН!
    if (!threadId.startsWith('thread_')) {
      throw new Error(`Invalid threadId format. Expected thread_*, got: ${threadId}`);
    }
    
    console.log(`[OpenAI] Getting messages from thread: ${threadId}`);
    
    const messages = await openai.beta.threads.messages.list(
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
  } catch (error: any) {
    console.error('[OpenAI] Failed to get messages:', error.message);
    throw new Error(`Failed to retrieve thread messages: ${error.message}`);
  }
}

/**
 * Создание Run для Thread
 */
export async function createThreadRun(
  threadId: string,
  assistantId: string,
  temperature?: number,
  topP?: number
) {
  try {
    if (!threadId || !assistantId) {
      throw new Error('threadId and assistantId are required');
    }
    
    // ✅ ПРОВЕРКА ФОРМАТА: префиксы ОБЯЗАТЕЛЬНЫ!
    if (!threadId.startsWith('thread_')) {
      throw new Error(`Invalid threadId format. Expected thread_*, got: ${threadId}`);
    }
    if (!assistantId.startsWith('asst_')) {
      throw new Error(`Invalid assistantId format. Expected asst_*, got: ${assistantId}`);
    }
    
    console.log(`[OpenAI] Creating run: threadId=${threadId}, assistantId=${assistantId}`);
    
    const run = await openai.beta.threads.runs.create(
      threadId,
      {
        assistant_id: assistantId,
        // temperature и top_p не поддерживаются в v4
      } as any,
      {
        headers: {
          'OpenAI-Beta': 'assistants=v2',
        },
      }
    );
    
    console.log(`✅ Run created: ${run.id}, status=${run.status}`);
    return run;
  } catch (error: any) {
    console.error('[OpenAI] Failed to create run:', {
      message: error.message,
      threadId,
      assistantId,
      stack: error.stack,
    });
    throw new Error(`Failed to create thread run: ${error.message}`);
  }
}

/**
 * Получение статуса Run
 */
export async function getThreadRun(threadId: string, runId: string) {
  try {
    console.log(`🔍 [getThreadRun] START: threadId=${threadId}, runId=${runId}`);
    
    if (!threadId || !runId) {
      throw new Error('threadId and runId are required');
    }
    
    // ✅ ПРОВЕРКА ФОРМАТА: префиксы ОБЯЗАТЕЛЬНЫ!
    if (!threadId.startsWith('thread_')) {
      console.error(`❌ Invalid threadId format: ${threadId}`);
      throw new Error(`Invalid threadId format. Expected thread_*, got: ${threadId}`);
    }
    if (!runId.startsWith('run_')) {
      console.error(`❌ Invalid runId format: ${runId}`);
      throw new Error(`Invalid runId format. Expected run_*, got: ${runId}`);
    }
    
    console.log(`✅ ID formats validated`);
    console.log(`🔄 Calling OpenAI API...`);
    console.log(`   threadId: "${threadId}"`);
    console.log(`   runId: "${runId}"`);
    
    // OpenAI SDK v4 правильный синтаксис: retrieve(threadId, runId, options)
    const run = await openai.beta.threads.runs.retrieve(threadId, runId, {
      headers: {
        'OpenAI-Beta': 'assistants=v2',
      },
    });
    
    console.log(`✅ Run retrieved successfully: ${run.id}, status=${run.status}`);
    return run;
  } catch (error: any) {
    console.error('❌❌❌ [OpenAI] CRITICAL ERROR in getThreadRun:');
    console.error('   Error message:', error.message);
    console.error('   Error type:', error.constructor.name);
    console.error('   threadId:', threadId);
    console.error('   runId:', runId);
    console.error('   Full error:', error);
    console.error('   Stack trace:', error.stack);
    throw new Error(`Failed to retrieve thread run: ${error.message}`);
  }
}

/**
 * Транскрипция аудио через Groq Whisper (БЕСПЛАТНО!)
 * ✅ Groq Whisper быстрее и бесплатнее OpenAI Whisper
 */
export async function transcribeAudio(
  audioFile: any, // FileLike из openai/uploads (Buffer в Node.js)
  language: string = 'ru',
  prompt?: string
) {
  try {
    console.log(`[Groq Whisper] Transcribing audio via Groq...`);
    
    // ✅ Создаём Groq client для транскрибации
    const groq = new OpenAI({
      apiKey: process.env.GROQ_API_KEY || '',
      baseURL: 'https://api.groq.com/openai/v1'
    });
    
    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3', // Groq использует whisper-large-v3
      language: language,
      response_format: 'text',
      prompt: prompt || 'Это голосовое сообщение студента на русском языке для AI-куратора образовательной платформы.',
      temperature: 0.0, // Для максимальной точности
    });
    
    console.log(`✅ [Groq Whisper] Audio transcribed: ${(transcription as unknown as string).length} characters`);
    return transcription as unknown as string;
  } catch (error: any) {
    console.error('[Groq Whisper] ❌ Failed to transcribe audio:', error.message);
    throw new Error(`Failed to transcribe audio: ${error.message}`);
  }
}

/**
 * Анализ изображения через Vision API (gpt-4o)
 */
export async function analyzeImage(
  imageDataUrl: string,
  userQuestion?: string
): Promise<string> {
  try {
    console.log('[OpenAI] Analyzing image with Vision API...');
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: userQuestion || 'Опиши что изображено на картинке подробно.',
            },
            {
              type: 'image_url',
              image_url: {
                url: imageDataUrl,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
    });

    const description = response.choices[0].message.content || 'Не удалось проанализировать изображение';
    
    console.log(`✅ Image analyzed: ${description.length} characters`);
    console.log(`📊 Tokens used: ${response.usage?.total_tokens || 0}`);
    
    return description;
  } catch (error: any) {
    console.error('[OpenAI] Failed to analyze image:', error.message);
    throw new Error(`Failed to analyze image: ${error.message}`);
  }
}
