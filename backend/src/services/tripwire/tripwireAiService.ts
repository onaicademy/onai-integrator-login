/**
 * Tripwire AI Curator Service
 * Сервис для обработки чат-запросов к AI-куратору
 * ИЗОЛИРОВАННЫЙ для Tripwire DB
 * 
 * ✅ PHASE 3: OpenAI GPT-4o Integration
 */

import { tripwireAdminSupabase as supabase } from '../../config/supabase-tripwire';
import OpenAI from 'openai';
import * as groqService from '../groqAiService';

// ✅ Groq для всех операций (кроме Assistants)
// OpenAI оставляем только для fallback
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ChatMessage {
  id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

interface ChatResponse {
  message: string;
  timestamp: string;
}

/**
 * System Prompt для AI Curator (Tripwire)
 */
const SYSTEM_PROMPT = `Ты - AI-Куратор курса "Integrator: 0 to $1000" на платформе onAI Academy.

**Твоя роль:**
- Помогать студентам разобраться в материалах курса
- Отвечать на вопросы по урокам (Основы AI, GPT-боты, Viral Reels)
- Мотивировать студентов завершить курс
- Давать практические советы по применению AI

**Структура курса Tripwire:**
Модуль 1: "Основы AI" - Введение в нейросети (9 мин)
Модуль 2: "Создание GPT-бота" - Instagram/WhatsApp интеграции (14 мин)
Модуль 3: "Создание вирусных Reels" - Сценарий, видео, монтаж с AI (50 мин)

**Твой стиль общения:**
- Дружелюбный и поддерживающий
- Конкретный и практичный
- На русском языке
- Используй эмодзи для наглядности (но не переборщи)
- Отвечай кратко, но информативно

**Важно:**
- Если студент спрашивает не по теме курса - вежливо напомни, что ты помогаешь только с материалами Tripwire
- Если студент застрял - предложи пересмотреть урок или обратиться к материалам
- Мотивируй завершить курс для получения сертификата

Ты готов помогать! 🚀`;

/**
 * Обработать сообщение пользователя через Groq Llama 3.3 70B
 * ✅ GROQ API - 93% дешевле чем OpenAI GPT-4o
 */
export async function processChat(userId: string, userMessage: string): Promise<ChatResponse> {
  try {
    console.log('🤖 [Tripwire AiService] Получено сообщение от:', userId);
    console.log('💬 [Tripwire AiService] Сообщение:', userMessage);
    
    // 1. Сохраняем сообщение пользователя
    await saveChatMessage(userId, 'user', userMessage);
    
    // 2. Получаем историю чата (последние 10 сообщений для контекста)
    const history = await getChatHistory(userId, 10);
    
    // 3. Формируем историю для Groq
    const conversationHistory = history.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    }));
    
    console.log('🧠 [Tripwire AiService] Отправляем запрос в Groq Llama 3.3...');
    
    // 4. ✅ Используем Groq вместо OpenAI (93% экономия!)
    const { message: aiResponse, usage } = await groqService.processChat(
      userMessage,
      conversationHistory,
      SYSTEM_PROMPT
    );
    
    console.log('✅ [Tripwire AiService] Ответ от Groq получен');
    console.log('💬 [Tripwire AiService] Ответ:', aiResponse.substring(0, 100) + '...');
    if (usage) {
      console.log(`💰 [Tripwire AiService] Экономия vs OpenAI: ~93% ($${usage.cost_usd.toFixed(6)})`);
    }
    
    // 5. Сохраняем ответ AI
    await saveChatMessage(userId, 'assistant', aiResponse);
    
    return {
      message: aiResponse,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error('❌ [Tripwire AiService] Ошибка processChat:', error);
    
    return {
      message: '⚠️ Произошла ошибка. Попробуй ещё раз или обратись к поддержке.',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Сохранить сообщение в истории чата
 */
async function saveChatMessage(userId: string, role: 'user' | 'assistant' | 'system', content: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('tripwire_chat_messages')
      .insert({
        user_id: userId,
        role: role,
        content: content,
      });
    
    if (error) {
      console.error('❌ [Tripwire AiService] Ошибка сохранения сообщения:', error);
    } else {
      console.log('💾 [Tripwire AiService] Сообщение сохранено:', role);
    }
  } catch (error: any) {
    console.error('❌ [Tripwire AiService] Ошибка saveChatMessage:', error);
  }
}

/**
 * Получить историю чата пользователя
 */
export async function getChatHistory(userId: string, limit: number = 50): Promise<ChatMessage[]> {
  try {
    console.log('🤖 [Tripwire AiService] Запрос истории чата для:', userId);
    
    const { data, error } = await supabase
      .from('tripwire_chat_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }) // От старых к новым (для OpenAI context)
      .limit(limit);
    
    if (error) {
      console.error('❌ [Tripwire AiService] Ошибка получения истории:', error);
      return [];
    }
    
    console.log(`✅ [Tripwire AiService] Загружено сообщений: ${data?.length || 0}`);
    return (data || []) as ChatMessage[];
  } catch (error: any) {
    console.error('❌ [Tripwire AiService] Ошибка getChatHistory:', error);
    return [];
  }
}

/**
 * Обработать голосовое сообщение (Groq Whisper - БЕСПЛАТНО!)
 * ✅ СКОПИРОВАНО С МЕЙН-ПЛАТФОРМЫ
 */
export async function processVoiceMessage(userId: string, audioFile: Express.Multer.File): Promise<ChatResponse> {
  try {
    console.log('🎤 [Tripwire AiService] Получено голосовое сообщение от:', userId);
    console.log('📊 [Tripwire AiService] Audio file:', {
      originalname: audioFile.originalname,
      mimetype: audioFile.mimetype,
      size: audioFile.size,
    });
    
    // ✅ GROQ WHISPER (как на мейн-платформе!)
    const groq = new OpenAI({
      apiKey: process.env.GROQ_API_KEY || '',
      baseURL: 'https://api.groq.com/openai/v1'
    });
    
    console.log(`[Groq Whisper] === НАЧАЛО ТРАНСКРИПЦИИ ===`);
    console.log(`[Groq Whisper] File: ${audioFile.originalname}, size: ${audioFile.size}, mime: ${audioFile.mimetype}`);
    
    // ✅ Создаём File-like объект для Groq (toFile из OpenAI SDK)
    const { toFile } = await import('openai/uploads');
    const fileForGroq = await toFile(audioFile.buffer, audioFile.originalname, {
      type: audioFile.mimetype
    });
    
    console.log(`[Groq Whisper] Отправляем в Groq API...`);
    
    const transcription = await groq.audio.transcriptions.create({
      file: fileForGroq,
      model: 'whisper-large-v3', // Groq использует whisper-large-v3
      language: 'ru',
      response_format: 'verbose_json',
      prompt: 'Это голосовое сообщение студента на русском языке для AI-куратора образовательной платформы. Транскрибируй текст с правильной пунктуацией и заглавными буквами.',
      temperature: 0.0,
    });
    
    const transcribedText = (transcription as any).text as string;
    
    console.log(`✅ [Groq Whisper] Транскрипция успешна: ${transcribedText.length} символов`);
    
    // Сохраняем транскрипцию как сообщение пользователя
    await saveChatMessage(userId, 'user', `🎤 [Голосовое]: ${transcribedText}`);
    
    // Обрабатываем транскрипцию через GPT-4o
    return processChat(userId, transcribedText);
  } catch (error: any) {
    console.error('❌ [Tripwire AiService] Ошибка Groq Whisper:', error);
    
    return {
      message: '⚠️ Не удалось распознать голос. Попробуйте ещё раз или напишите текстом.',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Обработать файл (Vision/PDF/DOCX Analysis)
 * ✅ СКОПИРОВАНО С МЕЙН-ПЛАТФОРМЫ
 */
export async function processFileUpload(userId: string, file: Express.Multer.File, userQuestion?: string): Promise<ChatResponse> {
  try {
    console.log('📎 [Tripwire AiService] Получен файл от:', userId);
    console.log('📊 [Tripwire AiService] File:', file.originalname, file.mimetype, file.size, 'bytes');
    
    const analysisPrompt = userQuestion || 'Проанализируй этот файл и расскажи о чём он.';
    let aiResponse = '';
    
    // ✅ ИЗОБРАЖЕНИЯ: Groq Vision API (Llama 4 Scout - 96% дешевле!)
    if (file.mimetype.startsWith('image/')) {
      console.log('🖼️ [Tripwire AiService] Groq Vision API...');
      
      const { analysis, usage } = await groqService.analyzeImage(
        file.buffer,
        analysisPrompt,
        file.mimetype
      );
      
      aiResponse = analysis;
      console.log(`✅ [Tripwire AiService] Vision ответ: ${aiResponse.length} символов`);
      if (usage) {
        console.log(`💰 [Tripwire AiService] Экономия vs OpenAI Vision: ~96% ($${usage.cost_usd.toFixed(6)})`);
      }
    }
    
    // ✅ PDF: Groq Vision API (автоматическая конвертация PDF → Image)
    else if (file.mimetype === 'application/pdf' || file.originalname.endsWith('.pdf')) {
      console.log('📄 [Tripwire AiService] PDF анализ через Groq Vision...');
      console.log(`📊 [Tripwire AiService] PDF size: ${file.size} bytes`);
      
      // Сначала пробуем извлечь текст
      const pdfParse = require('pdf-parse');
      
      try {
        const pdfData = await pdfParse(file.buffer, { max: 0 });
        
        console.log(`📄 [Tripwire AiService] PDF info:`, {
          pages: pdfData.numpages,
          textLength: pdfData.text.length,
        });
        
        // Если текста мало (отсканированный PDF), используем Groq Vision
        if (!pdfData.text || pdfData.text.trim().length < 50) {
          console.log('🔄 [Tripwire AiService] PDF содержит изображения → используем Groq Vision (Pure JS)');
          
          const { analysis, usage } = await groqService.analyzePDF(
            file.buffer,
            analysisPrompt,
            { page: 0 } // Первая страница
          );
          
          aiResponse = analysis;
          console.log(`✅ [Tripwire AiService] PDF проанализирован через Vision`);
          if (usage) {
            console.log(`💰 [Tripwire AiService] Стоимость: $${usage.cost_usd.toFixed(6)} (96% дешевле OpenAI)`);
          }
        } else {
          // Если текст есть, используем Groq Chat
          console.log('📝 [Tripwire AiService] PDF содержит текст → используем Groq Chat');
          
          const { message, usage } = await groqService.processChat(
            `PDF документ:\n\n${pdfData.text.substring(0, 20000)}\n\nВопрос: ${analysisPrompt}`,
            [],
            SYSTEM_PROMPT
          );
          
          aiResponse = message;
          if (usage) {
            console.log(`💰 [Tripwire AiService] Стоимость: $${usage.cost_usd.toFixed(6)}`);
          }
        }
      } catch (pdfError: any) {
        console.error('❌ [Tripwire AiService] PDF error:', pdfError.message);
        aiResponse = `❌ Не удалось прочитать PDF: ${pdfError.message}`;
      }
    }
    
    // ✅ DOCX: Извлечение текста + GPT-4o
    else if (
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.originalname.endsWith('.docx')
    ) {
      console.log('📝 [Tripwire AiService] DOCX parsing...');
      
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      
      console.log(`✅ [Tripwire AiService] DOCX извлечён: ${result.value.length} символов`);
      
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { 
            role: 'user', 
            content: `Вот содержимое DOCX документа:\n\n${result.value.substring(0, 10000)}\n\nВопрос студента: ${analysisPrompt}` 
          }
        ],
        max_tokens: 1000,
      });
      
      aiResponse = response.choices[0].message.content || 'Не удалось проанализировать DOCX';
    }
    
    // ✅ ТЕКСТ: TXT, MD (через Groq Chat)
    else if (file.mimetype.startsWith('text/')) {
      console.log('📄 [Tripwire AiService] Text file...');
      
      const textContent = file.buffer.toString('utf-8');
      
      const { message, usage } = await groqService.processChat(
        `Вот содержимое файла:\n\n${textContent.substring(0, 20000)}\n\nВопрос: ${analysisPrompt}`,
        [],
        SYSTEM_PROMPT
      );
      
      aiResponse = message;
      if (usage) {
        console.log(`💰 [Tripwire AiService] Стоимость: $${usage.cost_usd.toFixed(6)}`);
      }
    }
    
    // ❌ Неподдерживаемый тип
    else {
      return {
        message: `⚠️ Файлы типа ${file.mimetype} не поддерживаются. Попробуйте изображение, PDF или DOCX.`,
        timestamp: new Date().toISOString(),
      };
    }
    
    // Сохраняем в БД
    await saveChatMessage(userId, 'user', `📎 Прикреплён файл: ${file.originalname}`);
    await saveChatMessage(userId, 'assistant', aiResponse);
    
    return {
      message: aiResponse,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error('❌ [Tripwire AiService] Ошибка processFileUpload:', error);
    
    return {
      message: '⚠️ Не удалось обработать файл. Попробуйте другой формат или опишите вопрос текстом.',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Очистить историю чата пользователя (для админов)
 */
export async function clearChatHistory(userId: string): Promise<void> {
  try {
    console.log('🗑️ [Tripwire AiService] Очистка истории чата для:', userId);
    
    const { error } = await supabase
      .from('tripwire_chat_messages')
      .delete()
      .eq('user_id', userId);
    
    if (error) {
      console.error('❌ [Tripwire AiService] Ошибка очистки истории:', error);
      throw new Error(`Failed to clear chat history: ${error.message}`);
    }
    
    console.log('✅ [Tripwire AiService] История чата очищена');
  } catch (error: any) {
    console.error('❌ [Tripwire AiService] Ошибка clearChatHistory:', error);
    throw error;
  }
}

/**
 * ✅ НОВАЯ ФУНКЦИЯ: Только транскрипция аудио → текст (через Groq Whisper Turbo)
 * Response: string (только текст)
 */
export async function transcribeAudioOnly(audioFile: Express.Multer.File): Promise<string> {
  try {
    console.log('🎤 [Groq Whisper Turbo] Транскрибирую аудио...');
    console.log('📊 [Groq Whisper Turbo] Audio:', audioFile.originalname, audioFile.mimetype, audioFile.size, 'bytes');
    
    // ✅ Используем unified Groq service
    const { transcription, cost_usd } = await groqService.transcribeAudio(
      audioFile.buffer,
      audioFile.originalname,
      audioFile.mimetype
    );
    
    console.log(`✅ [Groq Whisper Turbo] Транскрипция: "${transcription}"`);
    console.log(`💰 [Groq Whisper Turbo] Стоимость: $${cost_usd.toFixed(6)}`);
    
    return transcription;
  } catch (error: any) {
    console.error('❌ [Groq Whisper Turbo] Ошибка:', error);
    throw new Error(`Whisper transcription failed: ${error.message}`);
  }
}
