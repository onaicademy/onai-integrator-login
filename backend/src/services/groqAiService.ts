/**
 * Unified Groq AI Service
 * Все AI операции через Groq API (кроме Assistants)
 * ✅ Chat - Llama 3.3 70B (93% дешевле OpenAI)
 * ✅ Vision - Llama 4 Scout (96% дешевле OpenAI)
 * ✅ Whisper - уже используем (97% дешевле OpenAI)
 */

import OpenAI from 'openai';
import { toFile } from 'openai/uploads';
import sharp from 'sharp';

// ✅ Groq client (OpenAI-совместимый)
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || '',
  baseURL: 'https://api.groq.com/openai/v1'
});

// ✅ Fallback OpenAI (только для Assistants)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
});

interface ChatResponse {
  message: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    cost_usd: number;
  };
}

interface VisionResponse {
  analysis: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    cost_usd: number;
  };
}

/**
 * ═══════════════════════════════════════════════════════════
 * CHAT OPERATIONS (Groq Llama 3.3 70B)
 * ═══════════════════════════════════════════════════════════
 */

export async function processChat(
  message: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  systemPrompt?: string
): Promise<ChatResponse> {
  try {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: systemPrompt || `Ты AI-куратор образовательной платформы. 
Помогай студентам с обучением, отвечай на вопросы, предлагай ресурсы.
Будь дружелюбным, информативным и поддерживающим на русском языке.`
      },
      ...(conversationHistory || []),
      { role: 'user', content: message }
    ];

    console.log('💬 [Groq Chat] Отправка запроса...');
    
    const response = await groq.chat.completions.create({
      model: 'meta-llama/llama-3.3-70b-versatile', // Лучшая модель для русского
      messages,
      max_tokens: 1500,
      temperature: 0.7,
    });

    const content = response.choices[0].message.content || '';
    
    // Рассчёт стоимости
    const usage = response.usage ? {
      input_tokens: response.usage.prompt_tokens,
      output_tokens: response.usage.completion_tokens,
      cost_usd: calculateCost('chat', response.usage.prompt_tokens, response.usage.completion_tokens)
    } : undefined;

    console.log(`✅ [Groq Chat] Ответ получен: ${content.length} символов`);
    if (usage) {
      console.log(`💰 [Groq Chat] Стоимость: $${usage.cost_usd.toFixed(6)} (${usage.input_tokens}+${usage.output_tokens} токенов)`);
    }

    return { message: content, usage };
  } catch (error: any) {
    console.error('❌ [Groq Chat] Ошибка:', error.message);
    throw new Error(`Groq Chat failed: ${error.message}`);
  }
}

/**
 * ═══════════════════════════════════════════════════════════
 * VISION OPERATIONS (Groq Llama 4 Scout)
 * ═══════════════════════════════════════════════════════════
 */

export async function analyzeImage(
  imageBuffer: Buffer,
  question: string,
  imageMimeType: string = 'image/png'
): Promise<VisionResponse> {
  try {
    console.log('🖼️ [Groq Vision] Анализ изображения...');
    
    // Оптимизация изображения (Groq лимит: 4MB base64)
    const optimizedImage = await optimizeImageForVision(imageBuffer);
    const base64Image = optimizedImage.toString('base64');

    const response = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct', // Быстрая и дешёвая
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: question },
          {
            type: 'image_url',
            image_url: { url: `data:${imageMimeType};base64,${base64Image}` }
          }
        ]
      }],
      max_tokens: 1500,
    });

    const content = response.choices[0].message.content || '';
    
    const usage = response.usage ? {
      input_tokens: response.usage.prompt_tokens,
      output_tokens: response.usage.completion_tokens,
      cost_usd: calculateCost('vision', response.usage.prompt_tokens, response.usage.completion_tokens)
    } : undefined;

    console.log(`✅ [Groq Vision] Анализ завершён: ${content.length} символов`);
    if (usage) {
      console.log(`💰 [Groq Vision] Стоимость: $${usage.cost_usd.toFixed(6)}`);
    }

    return { analysis: content, usage };
  } catch (error: any) {
    console.error('❌ [Groq Vision] Ошибка:', error.message);
    throw new Error(`Groq Vision failed: ${error.message}`);
  }
}

/**
 * ═══════════════════════════════════════════════════════════
 * PDF OPERATIONS (Pure JS via pdf-to-img)
 * ═══════════════════════════════════════════════════════════
 */

/**
 * Анализ PDF через конвертацию в изображение
 * ✅ Pure JavaScript - NO native dependencies!
 */
export async function analyzePDF(
  pdfBuffer: Buffer,
  question: string,
  options: { page?: number } = {}
): Promise<VisionResponse> {
  try {
    console.log('📄 [Groq PDF] Конвертация PDF → изображение (Pure JS)...');
    
    // Импортируем динамически
    const { convertPdfPageToImage } = await import('./pdfToImageService');
    
    // Конвертируем PDF страницу в изображение
    const imageBuffer = await convertPdfPageToImage(pdfBuffer, {
      pageNumber: (options.page || 0) + 1, // pdf-to-img uses 1-based indexing
      scale: 2,
      format: 'jpg',
    });
    
    console.log('📄 [Groq PDF] Анализ изображения через Vision...');
    
    // Анализируем изображение
    return await analyzeImage(imageBuffer, question, 'image/jpeg');
  } catch (error: any) {
    console.error('❌ [Groq PDF] Ошибка:', error.message);
    throw new Error(`Groq PDF analysis failed: ${error.message}`);
  }
}

/**
 * ═══════════════════════════════════════════════════════════
 * WHISPER OPERATIONS (Groq Whisper Large v3 Turbo)
 * ═══════════════════════════════════════════════════════════
 */

export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string = 'recording.webm',
  mimeType: string = 'audio/webm'
): Promise<{ transcription: string; cost_usd: number }> {
  try {
    console.log('🎤 [Groq Whisper] Транскрибация аудио...');
    
    const audioFile = await toFile(audioBuffer, filename, { type: mimeType });

    const response = await groq.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3-turbo', // Быстрее и дешевле чем v3
      language: 'ru',
      response_format: 'json',
      temperature: 0.0,
    });

    // Groq Whisper: $0.04 per час аудио
    const audioSeconds = audioBuffer.length / (16000 * 2); // Приблизительно
    const audioHours = audioSeconds / 3600;
    const cost_usd = audioHours * 0.04;

    console.log(`✅ [Groq Whisper] Транскрипция: "${response.text}"`);
    console.log(`💰 [Groq Whisper] Стоимость: $${cost_usd.toFixed(6)}`);

    return {
      transcription: response.text,
      cost_usd
    };
  } catch (error: any) {
    console.error('❌ [Groq Whisper] Ошибка:', error.message);
    throw new Error(`Groq Whisper failed: ${error.message}`);
  }
}

/**
 * ═══════════════════════════════════════════════════════════
 * UTILITY FUNCTIONS
 * ═══════════════════════════════════════════════════════════
 */

/**
 * Оптимизация изображения для Vision API
 * Groq лимиты: 4MB base64, 20MB URL, 33 megapixels
 */
async function optimizeImageForVision(imageBuffer: Buffer): Promise<Buffer> {
  try {
    const MAX_BASE64_SIZE = 4 * 1024 * 1024; // 4MB
    const metadata = await sharp(imageBuffer).metadata();

    console.log(`📊 [Image Optimize] Исходное изображение: ${(imageBuffer.length / 1024).toFixed(2)}KB, ${metadata.width}x${metadata.height}px`);

    // Если уже маленькое, возвращаем как есть
    if (imageBuffer.length < MAX_BASE64_SIZE * 0.8) {
      console.log('✅ [Image Optimize] Изображение уже оптимизировано');
      return imageBuffer;
    }

    let optimized = sharp(imageBuffer);

    // Уменьшаем размер если слишком большое
    if (metadata.width! > 2048 || metadata.height! > 2048) {
      optimized = optimized.resize(2048, 2048, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    // Конвертируем в JPEG с компрессией
    const compressed = await optimized
      .jpeg({ quality: 85, progressive: true })
      .toBuffer();

    console.log(`✅ [Image Optimize] Оптимизировано: ${(compressed.length / 1024).toFixed(2)}KB`);

    if (compressed.length > MAX_BASE64_SIZE) {
      throw new Error(`Image too large after optimization: ${(compressed.length / 1024).toFixed(2)}KB`);
    }

    return compressed;
  } catch (error: any) {
    console.error('❌ [Image Optimize] Ошибка:', error.message);
    throw error;
  }
}

/**
 * Расчёт стоимости операций
 */
function calculateCost(
  operation: 'chat' | 'vision',
  inputTokens: number,
  outputTokens: number
): number {
  const PRICES = {
    chat: {
      // meta-llama/llama-3.3-70b-versatile
      input: 0.59,  // $ per 1M tokens
      output: 0.79
    },
    vision: {
      // meta-llama/llama-4-scout-17b-16e-instruct
      input: 0.11,
      output: 0.34
    }
  };

  const prices = PRICES[operation];
  const inputCost = (inputTokens / 1_000_000) * prices.input;
  const outputCost = (outputTokens / 1_000_000) * prices.output;

  return inputCost + outputCost;
}

/**
 * ═══════════════════════════════════════════════════════════
 * МЕТРИКИ И ТРЕКИНГ
 * ═══════════════════════════════════════════════════════════
 */

interface AIMetrics {
  operation_type: 'chat' | 'vision' | 'whisper';
  platform: 'main' | 'tripwire';
  provider: 'groq';
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  user_id?: string;
  function_name: string;
  duration_ms: number;
}

/**
 * Сохранение метрик операций AI
 * TODO: Интегрировать с вашей БД
 */
export async function trackAIMetrics(metrics: AIMetrics): Promise<void> {
  try {
    console.log('📊 [Metrics]', {
      operation: metrics.operation_type,
      cost: `$${metrics.cost_usd.toFixed(6)}`,
      tokens: `${metrics.input_tokens}+${metrics.output_tokens}`,
      duration: `${metrics.duration_ms}ms`
    });
    
    // TODO: Сохранить в БД
    // await db.query('INSERT INTO ai_operations_metrics ...');
  } catch (error) {
    console.error('❌ [Metrics] Ошибка сохранения метрик:', error);
    // Не бросаем ошибку - метрики не должны ломать основной функционал
  }
}

export default {
  processChat,
  analyzeImage,
  analyzePDF,
  transcribeAudio,
  trackAIMetrics
};
