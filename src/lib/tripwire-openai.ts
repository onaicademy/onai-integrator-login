import { api, getAuthToken } from '@/utils/apiClient';
import { logTokenUsage, logWhisperUsage } from './token-tracker';
import {
  getChatHistory as getSupabaseChatHistory,
  saveMessagePair,
  type ChatMessage as SupabaseChatMessage,
} from './tripwire-chat';
import { detectConflicts } from './conflict-detector';
import { tripwireSupabase } from './supabase-tripwire'; // 🔥 НОВЫЙ КЛИЕНТ

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

    // Обработка файлов (пока placeholder, TODO: добавить в Phase 3+)
    let finalMessage = message;
    if (attachments && attachments.length > 0) {
      console.log(`📎 Обработка ${attachments.length} файлов...`);
      // TODO Phase 3+: Обработать файлы через Vision API
      finalMessage += `\n\n[Прикреплено файлов: ${attachments.length}]`;
    }

    // ✅ НОВЫЙ ENDPOINT: /api/tripwire/ai/chat
    const response = await api.post<{
      success: boolean;
      data: {
        message: string;
        timestamp: string;
      };
    }>('/api/tripwire/ai/chat', {
      user_id: finalUserId,
      message: finalMessage,
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
 * Транскрипция аудио через Whisper (Generic Backend API)
 */
export async function transcribeAudioToText(audioBlob: Blob, userId?: string, threadId?: string): Promise<string> {
    // Reuse the same backend endpoint for Whisper as it's stateless regarding DB
    // Copied logic from openai-assistant.ts for convenience
    try {
        const formData = new FormData();
        formData.append('audio', audioBlob);
        formData.append('language', 'ru');
        formData.append('prompt', 'Это голосовое сообщение студента на русском языке для AI-куратора.');
        
        const token = getAuthToken();
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

        const response = await fetch(`${baseUrl}/api/openai/audio/transcriptions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: formData,
        });

        if (!response.ok) throw new Error('Whisper API error');
        const result = await response.json();
        
        if (result.text) {
             try {
                // Log Whisper usage with 'tripwire' context if possible, or generic
                await logWhisperUsage(10, { userId, threadId }); // Approx duration
            } catch (e) {}
            return result.text;
        }
        throw new Error('Empty transcription');
    } catch (error) {
        console.error("Whisper Error:", error);
        throw error;
    }
}

