import { api, getAuthToken } from '@/utils/apiClient';
import { logTokenUsage, logWhisperUsage } from './token-tracker';
import {
  getChatHistory as getSupabaseChatHistory,
  saveMessagePair,
  type ChatMessage as SupabaseChatMessage,
} from './tripwire-chat';
import { detectConflicts } from './conflict-detector';
import { tripwireSupabase } from './supabase-tripwire'; // 🔥 НОВЫЙ КЛИЕНТ
import { getApiBaseUrl } from '@/lib/runtime-config';

// Локальное хранилище для ID Thread (Tripwire specific)
const THREAD_ID_KEY = "tripwire_openai_thread_id";

// Интерфейсы
export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  file_ids?: string[];
}

export type AssistantType = 'curator' | 'mentor' | 'analyst' | 'tripwire';

/**
 * Получить или создать Thread для разговора (Tripwire context)
 */
export async function getOrCreateThread(): Promise<string> {
  try {
    // Проверяем сохранённый ID thread
    const savedThreadId = localStorage.getItem(THREAD_ID_KEY);

    if (savedThreadId) {
      console.log("✅ Используем существующий Thread (Tripwire):", savedThreadId);
      return savedThreadId;
    }

    // Создаём новый thread через Backend API
    console.log("🔄 Создаём новый Thread через Backend (Tripwire)...");
    const response = await api.post<{ id: string }>('/api/openai/threads', {});
    
    const threadId = response.id;
    localStorage.setItem(THREAD_ID_KEY, threadId);
    console.log("✅ Создан новый Thread (Tripwire):", threadId);

    return threadId;
  } catch (error) {
    console.error("❌ Ошибка при создании Thread:", error);
    throw error;
  }
}

/**
 * Обработать файл через Backend API
 */
export async function processFile(
  file: File,
  userQuestion?: string,
  userId?: string,
  threadId?: string
): Promise<{
  type: 'image' | 'text';
  content: string;
  analysis?: string;
  fileUrl?: string;
  fileId?: number;
}> {
  try {
    // Проверка файла
    if (!file || file.size === 0) {
      throw new Error(`Файл ${file?.name || 'Unknown'} пустой или поврежден!`);
    }

    // Получаем userId если не передан
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        userId = user.id;
      } else {
        throw new Error('Не удалось получить userId. Авторизуйтесь заново.');
      }
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);
    
    if (threadId) {
      formData.append('threadId', threadId);
    }
    
    if (userQuestion) {
      formData.append('userQuestion', userQuestion);
    }

    // Используем существующий endpoint для обработки файлов
    // TODO: Если нужно сохранять файлы в отдельную таблицу (tripwire_ai_attachments),
    // то нужно будет либо модифицировать backend, либо обрабатывать ответ здесь и пересохранять.
    // Пока используем стандартный, так как он возвращает контент для AI.
    const response = await api.post('/api/files/process', formData);

    if (response.success && response.file) {
      const { fileUrl, extractedText, fileId, fileType } = response.file;
      const isImage = fileType?.startsWith('image/');
      
      return {
        type: isImage ? 'image' : 'text',
        content: extractedText || '',
        analysis: isImage ? extractedText : undefined,
        fileUrl: fileUrl,
        fileId: fileId,
      };
    }

    // Fallback
    if (response.type === 'image') {
      return {
        type: 'image',
        content: response.analysis || '',
        analysis: response.analysis,
      };
    } else {
      return {
        type: 'text',
        content: response.content || '',
      };
    }
  } catch (error: any) {
    console.error('❌ Ошибка обработки файла:', error.message);
    throw new Error(`Не удалось обработать файл: ${error.message}`);
  }
}

/**
 * Отправить сообщение AI-ассистенту (Tripwire версия)
 * ✅ PHASE 3: Использует новый /api/tripwire/ai/chat endpoint
 */
export async function sendMessageToAI(
  message: string,
  attachments?: Array<{ file?: File; name: string; type: string }>,
  userId?: string,
  assistantType: AssistantType = 'curator'
): Promise<string> {
  try {
    console.log(`🤖 [Phase 3] Отправляем сообщение в Tripwire AI Chat`);
    
    // Получаем userId если не передан
    let finalUserId = userId;
    if (!finalUserId) {
      const { data: { user } } = await tripwireSupabase.auth.getUser();
      if (user?.id) {
        finalUserId = user.id;
      } else {
        throw new Error('Не удалось получить userId');
      }
    }

    // ✅ Обработка файлов через Vision/OCR API (ПОСЛЕДОВАТЕЛЬНО!)
    if (attachments && attachments.length > 0) {
      console.log(`📎 Обработка ${attachments.length} файлов последовательно...`);

      const fileResults: string[] = [];

      // Обрабатываем каждый файл по очереди
      for (let i = 0; i < attachments.length; i++) {
        const attachment = attachments[i];
        
        if (!attachment.file) {
          console.warn(`⚠️ Файл #${i + 1} (${attachment.name}) пропущен - нет file объекта`);
          continue;
        }

        console.log(`📄 [${i + 1}/${attachments.length}] Обработка: ${attachment.name} (${(attachment.size / 1024).toFixed(2)}KB)`);
        
        try {
          const fileResponse = await sendFileToAI(attachment.file, finalUserId, message);
          fileResults.push(`**📎 Файл: ${attachment.name}**\n\n${fileResponse}`);
          console.log(`✅ [${i + 1}/${attachments.length}] Файл обработан`);
        } catch (error: any) {
          console.error(`❌ [${i + 1}/${attachments.length}] Ошибка обработки файла:`, error);
          fileResults.push(`**❌ Файл: ${attachment.name}**\n\nОшибка: ${error.message}`);
        }
      }

      // Объединяем все результаты
      const combinedResponse = fileResults.join('\n\n---\n\n');
      console.log(`✅ Обработано ${fileResults.length} из ${attachments.length} файлов`);
      
      return combinedResponse;
    }

    // ✅ Обычное текстовое сообщение: /api/tripwire/ai/chat
    const response = await api.post<{
      success: boolean;
      data: {
        message: string;
        timestamp: string;
      };
    }>('/api/tripwire/ai/chat', {
      user_id: finalUserId,
      message: message,
    });

    if (!response.success || !response.data?.message) {
      throw new Error('Не получен ответ от AI');
    }

    console.log("✅ Получен ответ от Tripwire AI");
    return response.data.message;

  } catch (error: any) {
    console.error("❌ Ошибка при отправке сообщения (Tripwire Phase 3):", error);
    throw error;
  }
}

/**
 * Получить историю сообщений из Supabase (Tripwire)
 * ✅ PHASE 3: Использует новый /api/tripwire/ai/history endpoint
 */
export async function getChatHistory(userId?: string): Promise<ChatMessage[]> {
  try {
    if (!userId) {
      return [];
    }

    console.log(`📚 [Phase 3] Загружаем историю чата из Tripwire DB`);
    
    // ✅ НОВЫЙ ENDPOINT: /api/tripwire/ai/history
    const response = await api.get<{
      success: boolean;
      data: Array<{
        role: 'user' | 'assistant' | 'system';
        content: string;
        created_at: string;
      }>;
    }>(`/api/tripwire/ai/history?user_id=${userId}&limit=100`);

    if (!response.success || !response.data) {
      return [];
    }
    
    const chatMessages: ChatMessage[] = response.data.map((msg) => ({
      role: msg.role,
      content: msg.content,
      file_ids: [],
    }));

    console.log(`✅ Загружено ${chatMessages.length} сообщений из истории`);
    return chatMessages;
  } catch (error) {
    console.error("❌ Ошибка при получении истории (Phase 3):", error);
    return [];
  }
}

/**
 * Начать новую беседу (очистить Thread)
 */
export async function startNewConversation(): Promise<void> {
  try {
    localStorage.removeItem(THREAD_ID_KEY);
    console.log("🔄 Начата новая беседа (Tripwire)");
  } catch (error) {
    console.error("❌ Ошибка при начале новой беседы:", error);
    throw error;
  }
}

/**
 * ✅ НОВАЯ ЛОГИКА: Транскрипция аудио через Whisper (Tripwire /transcribe)
 * Response: string (только транскрипция текста, БЕЗ AI ответа)
 */
export async function transcribeAudioToText(audioBlob: Blob, userId?: string): Promise<string> {
    try {
        console.log('🎤 [Tripwire Transcribe] Отправка аудио для транскрипции...');
        
        const formData = new FormData();
        formData.append('audio', audioBlob, 'voice-message.webm');
        formData.append('user_id', userId || 'unknown');
        
        const token = getAuthToken();
        const baseUrl = getApiBaseUrl() || 'http://localhost:3000';

        // ✅ НОВЫЙ ENDPOINT: /transcribe (ТОЛЬКО транскрипция)
        const response = await fetch(`${baseUrl}/api/tripwire/ai/transcribe`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Whisper transcription failed');
        }
        
        const result = await response.json();
        console.log('✅ [Tripwire Transcribe] Транскрипция получена');
        
        if (result.success && result.transcription) {
            return result.transcription; // ✅ ТОЛЬКО ТЕКСТ!
        }
        
        throw new Error('Empty transcription');
    } catch (error) {
        console.error("❌ [Tripwire Transcribe] Error:", error);
        throw error;
    }
}

/**
 * Отправить файл для анализа AI (Tripwire endpoint)
 */
export async function sendFileToAI(file: File, userId: string, question?: string): Promise<string> {
    try {
        console.log('📎 [Tripwire OpenAI] Отправка файла для анализа...');
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('user_id', userId);
        if (question) {
            formData.append('question', question);
        }
        
        const token = getAuthToken();
        const baseUrl = getApiBaseUrl() || 'http://localhost:3000';

        const response = await fetch(`${baseUrl}/api/tripwire/ai/file`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'File analysis error');
        }
        
        const result = await response.json();
        console.log('✅ [Tripwire OpenAI] Файл проанализирован');
        
        if (result.success && result.data?.message) {
            return result.data.message; // ✅ Ответ от GPT-4o с анализом файла
        }
        
        throw new Error('Empty file analysis');
    } catch (error) {
        console.error("❌ [Tripwire OpenAI] File Error:", error);
        throw error;
    }
}

