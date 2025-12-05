/**
 * Tripwire AI Curator Service
 * Сервис для обработки чат-запросов к AI-куратору
 * ИЗОЛИРОВАННЫЙ для Tripwire DB
 * 
 * ✅ PHASE 3: OpenAI GPT-4o Integration
 */

import { tripwireAdminSupabase as supabase } from '../../config/supabase-tripwire';
import OpenAI from 'openai';

// Инициализация OpenAI client
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
 * Обработать сообщение пользователя с OpenAI GPT-4o
 */
export async function processChat(userId: string, userMessage: string): Promise<ChatResponse> {
  try {
    console.log('🤖 [Tripwire AiService] Получено сообщение от:', userId);
    console.log('💬 [Tripwire AiService] Сообщение:', userMessage);
    
    // 1. Сохраняем сообщение пользователя
    await saveChatMessage(userId, 'user', userMessage);
    
    // 2. Получаем историю чата (последние 10 сообщений для контекста)
    const history = await getChatHistory(userId, 10);
    
    // 3. Формируем messages для OpenAI
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }))
    ];
    
    // 4. Вызываем OpenAI API
    console.log('🧠 [Tripwire AiService] Отправляем запрос в OpenAI...');
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o', // Используем GPT-4o (быстрый и мощный)
      messages: messages,
      temperature: 0.7,
      max_tokens: 500, // Краткие ответы для чата
    });
    
    const aiResponse = completion.choices[0]?.message?.content || 'Извините, не смог сгенерировать ответ.';
    
    console.log('✅ [Tripwire AiService] Ответ от OpenAI получен');
    console.log('💬 [Tripwire AiService] Ответ:', aiResponse.substring(0, 100) + '...');
    
    // 5. Сохраняем ответ AI
    await saveChatMessage(userId, 'assistant', aiResponse);
    
    return {
      message: aiResponse,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error('❌ [Tripwire AiService] Ошибка processChat:', error);
    
    // Если ошибка OpenAI - возвращаем fallback
    if (error.code === 'insufficient_quota' || error.status === 429) {
      return {
        message: 'Извините, AI-куратор временно недоступен. Пожалуйста, попробуйте позже или обратитесь к материалам курса.',
        timestamp: new Date().toISOString(),
      };
    }
    
    throw error;
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
 * Обработать голосовое сообщение (TODO: Whisper API)
 */
export async function processVoiceMessage(userId: string, audioFile: any): Promise<ChatResponse> {
  try {
    console.log('🎤 [Tripwire AiService] Получено голосовое сообщение от:', userId);
    
    // TODO: Интеграция с Whisper API для транскрипции
    // const transcription = await openai.audio.transcriptions.create({
    //   file: audioFile,
    //   model: 'whisper-1',
    // });
    // return processChat(userId, transcription.text);
    
    const placeholderResponse = '[Voice Placeholder] Транскрипция голосовых сообщений будет добавлена позже. Пока используйте текстовые сообщения.';
    
    return {
      message: placeholderResponse,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error('❌ [Tripwire AiService] Ошибка processVoiceMessage:', error);
    throw error;
  }
}

/**
 * Обработать файл (TODO: File Analysis)
 */
export async function processFileUpload(userId: string, file: any): Promise<ChatResponse> {
  try {
    console.log('📎 [Tripwire AiService] Получен файл от:', userId);
    
    // TODO: Анализ файлов через OpenAI Vision/Document Analysis
    const placeholderResponse = '[File Placeholder] Анализ файлов будет добавлен позже. Пока задавайте вопросы текстом.';
    
    return {
      message: placeholderResponse,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error('❌ [Tripwire AiService] Ошибка processFileUpload:', error);
    throw error;
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
