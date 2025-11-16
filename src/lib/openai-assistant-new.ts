import { api } from '@/utils/apiClient';
import { getUserAchievementsForAI, formatAchievementsForAI } from './achievements-api';
import { logTokenUsage, logWhisperUsage } from './token-tracker';
import {
  getChatHistory as getSupabaseChatHistory,
  saveMessagePair,
  type ChatMessage as SupabaseChatMessage,
} from './supabase-chat';
import { detectConflicts } from './conflict-detector';

// API базовый URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Локальное хранилище для ID Assistant и Thread
const ASSISTANT_ID_KEY = "openai_assistant_id";
const THREAD_ID_KEY = "openai_thread_id";

// Интерфейсы
export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  file_ids?: string[];
}

export interface AIAssistant {
  id: string;
  name: string;
  instructions: string;
  model: string;
}

/**
 * Получить или создать OpenAI Assistant
 * ⚠️ ЗАГЛУШКА - пока возвращаем hardcoded ID
 * TODO: Создать Backend endpoint для создания Assistant
 */
export async function getAIAssistant(): Promise<string> {
  try {
    // Проверяем сохранённый ID ассистента
    const savedAssistantId = localStorage.getItem(ASSISTANT_ID_KEY);

    if (savedAssistantId) {
      console.log("✅ Используем существующий Assistant:", savedAssistantId);
      return savedAssistantId;
    }

    // Если нет сохранённого, используем hardcoded (из вашего кода)
    const assistantId = "asst_yXgYOFAyVKkuc3XETz2IKxh8";
    localStorage.setItem(ASSISTANT_ID_KEY, assistantId);
    console.log("✅ Используем Assistant:", assistantId);

    return assistantId;
  } catch (error) {
    console.error("❌ Ошибка при получении Assistant:", error);
    throw error;
  }
}

/**
 * Получить или создать Thread для разговора
 * ⚠️ ВРЕМЕННАЯ РЕАЛИЗАЦИЯ - использует localStorage
 * TODO: Перенести хранение Thread ID в Backend/Supabase
 */
export async function getOrCreateThread(): Promise<string> {
  try {
    // Проверяем сохранённый ID thread
    const savedThreadId = localStorage.getItem(THREAD_ID_KEY);

    if (savedThreadId) {
      console.log("✅ Используем существующий Thread:", savedThreadId);
      return savedThreadId;
    }

    // Создаём новый thread через Backend API
    console.log("🔄 Создаём новый Thread через Backend...");
    const response = await api.post<{ id: string }>(`${API_BASE_URL}/api/openai/threads`, {});
    
    const threadId = response.id;
    localStorage.setItem(THREAD_ID_KEY, threadId);
    console.log("✅ Создан новый Thread:", threadId);

    return threadId;
  } catch (error) {
    console.error("❌ Ошибка при создании Thread:", error);
    throw error;
  }
}

/**
 * Загрузить файл в OpenAI
 * ⚠️ НЕ РЕАЛИЗОВАНО - требует Backend endpoint
 * TODO: Создать POST /api/openai/files для загрузки файлов
 */
export async function uploadFile(file: File): Promise<string> {
  console.warn("⚠️ uploadFile через Backend пока не реализован");
  throw new Error("Загрузка файлов временно недоступна");
}

/**
 * Отправить сообщение AI-ассистенту
 */
export async function sendMessageToAI(
  message: string,
  attachments?: Array<{ file?: File; name: string; type: string }>,
  userId?: string
): Promise<string> {
  try {
    const startTime = Date.now();

    // Получаем или создаём Assistant и Thread
    const assistantId = await getAIAssistant();
    const threadId = await getOrCreateThread();

    // TODO: Обработка файлов (пока не поддерживается)
    if (attachments && attachments.length > 0) {
      console.warn("⚠️ Загрузка файлов временно не поддерживается");
    }

    // Добавляем сообщение в thread через Backend
    console.log("💬 Добавляем сообщение в Thread через Backend...");
    await api.post(`${API_BASE_URL}/api/openai/threads/${threadId}/messages`, {
      content: message,
      role: 'user',
    });

    // Запускаем Run через Backend
    console.log("🔄 Запускаем Run через Backend...");
    const runResponse = await api.post<{ id: string; status: string }>(
      `${API_BASE_URL}/api/openai/threads/${threadId}/runs`,
      {
        assistant_id: assistantId,
        temperature: 0.4,
        top_p: 0.8,
      }
    );
    
    const runId = runResponse.id;
    console.log("✅ Run запущен:", runId);

    // Polling: ожидаем завершения Run
    let runStatus = runResponse.status;
    let pollCount = 0;
    const maxPolls = 60; // 30 секунд (60 * 500ms)

    while (runStatus === "queued" || runStatus === "in_progress" || runStatus === "requires_action") {
      if (pollCount >= maxPolls) {
        throw new Error("Превышено время ожидания ответа от AI");
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
      
      const statusResponse = await api.get<{ status: string; usage?: any }>(
        `${API_BASE_URL}/api/openai/threads/${threadId}/runs/${runId}`
      );
      
      runStatus = statusResponse.status;
      pollCount++;

      // TODO: Обработка function calling (requires_action)
      if (runStatus === "requires_action") {
        console.warn("⚠️ Function calling пока не поддерживается через Backend");
        break;
      }

      if (pollCount % 5 === 0) {
        console.log(`📊 Статус Run (проверка ${pollCount}):`, runStatus);
      }
    }

    if (runStatus === "completed") {
      // Получаем последнее сообщение через Backend
      const messagesResponse = await api.get<{ data: any[] }>(
        `${API_BASE_URL}/api/openai/threads/${threadId}/messages?limit=1&order=desc`
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
        console.log("✅ Получен ответ от Assistant (длина:", responseText.length, "символов)");

        // Сохраняем диалог в Supabase (если userId передан)
        if (userId) {
          console.log("💾 Сохраняем диалог в Supabase...");
          await saveMessagePair(userId, message, responseText, {
            response_time_ms: responseTime,
            model_used: 'gpt-4o',
            openai_message_id: assistantMessage.id,
            openai_run_id: runId,
          });
          console.log("✅ Диалог сохранён в Supabase");

          // Обнаруживаем конфликты
          console.log("🔍 Проверяем на конфликты...");
          const conflicts = await detectConflicts({
            userMessage: message,
            aiResponse: responseText,
            threadId,
            userId,
            responseTime,
            tokenCount: undefined, // TODO: получать из runStatus
            model: 'gpt-4o',
          });

          if (conflicts.length > 0) {
            console.warn(`⚠️ Обнаружено конфликтов: ${conflicts.length}`);
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
    console.error("❌ Ошибка при отправке сообщения:", error);
    throw error;
  }
}

/**
 * Получить историю сообщений из Supabase
 */
export async function getChatHistory(userId?: string): Promise<ChatMessage[]> {
  try {
    if (!userId) {
      console.warn("⚠️ getChatHistory: userId не передан");
      return [];
    }

    console.log("📜 Загружаем историю из Supabase для user:", userId);
    const supabaseMessages = await getSupabaseChatHistory(userId, 100);
    console.log(`✅ Загружено ${supabaseMessages.length} сообщений из Supabase`);

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
    console.log("🔄 Начата новая беседа");
  } catch (error) {
    console.error("❌ Ошибка при начале новой беседы:", error);
    throw error;
  }
}

/**
 * Транскрипция аудио через Whisper
 * ⚠️ НЕ РЕАЛИЗОВАНО - требует Backend endpoint
 * TODO: Создать POST /api/openai/audio/transcriptions для Whisper
 */
export async function transcribeAudioToText(audioBlob: Blob, userId?: string, threadId?: string): Promise<string> {
  console.warn("⚠️ Whisper транскрипция через Backend пока не реализована");
  throw new Error("Голосовые сообщения временно недоступны");
}

