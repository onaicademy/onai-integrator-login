import { api } from '@/utils/apiClient';
import { getAuthToken } from '@/utils/apiClient';
import { logTokenUsage, logWhisperUsage } from './token-tracker';
import { getAuthToken } from '@/utils/apiClient';
import {
  getChatHistory as getSupabaseChatHistory,
  saveMessagePair,
  type ChatMessage as SupabaseChatMessage,
} from './tripwire-chat';
import { detectConflicts } from './conflict-detector';
import { supabase } from './supabase';

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
 */
export async function sendMessageToAI(
  message: string,
  attachments?: Array<{ file?: File; name: string; type: string }>,
  userId?: string,
  assistantType: AssistantType = 'curator'
): Promise<string> {
  try {
    const startTime = Date.now();

    // Получаем или создаём Thread
    const threadId = await getOrCreateThread();

    console.log(`🤖 Используем ${assistantType} assistant (Tripwire)`);

    // Обработка файлов
    let finalMessage = message;
    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        if (attachment.file) {
          try {
            const processed = await processFile(attachment.file, message, userId, threadId);
            
            if (processed.type === 'image') {
              finalMessage = message 
                ? `${message}\n\n[Анализ изображения: ${processed.analysis}]`
                : `[Анализ изображения: ${processed.analysis}]`;
            } else {
              finalMessage = message
                ? `${message}\n\n[Содержимое документа "${attachment.name}":\n${processed.content}]`
                : `[Содержимое документа "${attachment.name}":\n${processed.content}]`;
            }
          } catch (error) {
            console.error(`❌ Не удалось обработать файл ${attachment.name}:`, error);
          }
        }
      }
    }

    // Добавляем сообщение в thread через Backend
    await api.post(`/api/openai/threads/${threadId}/messages`, {
      content: finalMessage,
      role: 'user',
    });

    // Запускаем Run через Backend
    const runResponse = await api.post<{ id: string; status: string }>(
      `/api/openai/threads/${threadId}/runs`,
      {
        assistant_type: assistantType,
        temperature: 0.4,
        top_p: 0.8,
      }
    );
    
    const runId = runResponse.id;
    
    // Polling
    let runStatus = runResponse.status;
    let pollCount = 0;
    const maxPolls = 60;
    let tokenUsage: any = null;

    while (runStatus === "queued" || runStatus === "in_progress" || runStatus === "requires_action") {
      if (pollCount >= maxPolls) {
        throw new Error("Превышено время ожидания ответа от AI");
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
      
      const statusResponse = await api.get<{ status: string; usage?: any }>(
        `/api/openai/threads/${threadId}/runs/${runId}`
      );
      
      runStatus = statusResponse.status;
      if (statusResponse.usage) tokenUsage = statusResponse.usage;
      
      pollCount++;
      
      if (runStatus === "requires_action") {
        console.warn("⚠️ Function calling пока не поддерживается через Backend");
        break;
      }
    }

    if (runStatus === "completed") {
      // Получаем финальный Run для usage
      const finalRunResponse = await api.get<{ usage?: any }>(
        `/api/openai/threads/${threadId}/runs/${runId}`
      );
      if (finalRunResponse.usage) tokenUsage = finalRunResponse.usage;

      // Получаем последнее сообщение
      const messagesResponse = await api.get<{ data: any[] }>(
        `/api/openai/threads/${threadId}/messages?limit=1&order=desc`
      );

      const assistantMessage = messagesResponse.data[0];

      if (!assistantMessage || assistantMessage.role !== "assistant") {
        throw new Error("Не получен ответ от Assistant");
      }

      if (
        assistantMessage.content &&
        assistantMessage.content.length > 0 &&
        assistantMessage.content[0].type === "text"
      ) {
        const responseText = assistantMessage.content[0].text.value;
        const responseTime = Date.now() - startTime;
        console.log("✅ Получен ответ от Assistant (Tripwire)");

        // Сохраняем диалог в Supabase (Tripwire tables)
        if (userId) {
          console.log("💾 Сохраняем диалог в Tripwire Tables...");
          try {
            // ИСПОЛЬЗУЕМ tripwire-chat.ts вместо backend API
            await saveMessagePair(
              userId,
              message, // Сохраняем исходное сообщение юзера, не finalMessage
              responseText,
              {
                response_time_ms: responseTime,
                model_used: 'gpt-4o',
                openai_message_id: assistantMessage.id,
                openai_run_id: runId,
              }
            );
            console.log("✅ Диалог сохранён в Tripwire Tables");

            // Логируем токены (аналитика общая, можно использовать тот же endpoint)
            if (tokenUsage) {
               try {
                await api.post('/api/tokens/log', {
                  userId,
                  assistantType: assistantType,
                  promptTokens: tokenUsage.prompt_tokens || 0,
                  completionTokens: tokenUsage.completion_tokens || 0,
                  totalTokens: tokenUsage.total_tokens || 0,
                  modelUsed: 'gpt-4o',
                  openaiThreadId: threadId,
                  openaiMessageId: assistantMessage.id,
                  openaiRunId: runId,
                });
              } catch (tokenError) {
                console.error("⚠️ Не удалось залогировать токены:", tokenError);
              }
            }

            // Конфликты (опционально)
            const conflicts = await detectConflicts({
              userMessage: message,
              aiResponse: responseText,
              threadId,
              userId,
              responseTime,
              tokenCount: undefined,
              model: 'gpt-4o',
            });
            if (conflicts.length > 0) console.warn(`⚠️ Обнаружено конфликтов: ${conflicts.length}`);

          } catch (saveError) {
            console.error("⚠️ Не удалось сохранить в Tripwire Tables:", saveError);
          }
        }

        return responseText;
      } else {
        throw new Error("Неожиданный формат ответа от Assistant");
      }
    } else {
      throw new Error(`Run завершился со статусом: ${runStatus}`);
    }
  } catch (error) {
    console.error("❌ Ошибка при отправке сообщения (Tripwire):", error);
    throw error;
  }
}

/**
 * Получить историю сообщений из Supabase (Tripwire)
 */
export async function getChatHistory(userId?: string): Promise<ChatMessage[]> {
  try {
    if (!userId) {
      return [];
    }

    const supabaseMessages = await getSupabaseChatHistory(userId, 100);
    
    const chatMessages: ChatMessage[] = supabaseMessages.map((msg) => ({
      role: msg.role,
      content: msg.content,
      file_ids: [],
    }));

    return chatMessages;
  } catch (error) {
    console.error("❌ Ошибка при получении истории:", error);
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

