import { api } from '@/utils/apiClient';
import { getAuthToken } from '@/utils/apiClient';
import { getUserAchievementsForAI, formatAchievementsForAI } from './achievements-api';
import { getAuthToken } from '@/utils/apiClient';
import { logTokenUsage, logWhisperUsage } from './token-tracker';
import {
  getChatHistory as getSupabaseChatHistory,
  type ChatMessage as SupabaseChatMessage,
} from './supabase-chat';
import { detectConflicts } from './conflict-detector';

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
 * Тип AI-ассистента
 */
export type AssistantType = 'curator' | 'mentor' | 'analyst';

/**
 * Получить или создать OpenAI Assistant
 * ⚠️ DEPRECATED - теперь Backend управляет Assistant IDs
 * Используйте параметр assistantType в sendMessageToAI()
 */
export async function getAIAssistant(): Promise<string> {
  console.warn("⚠️ getAIAssistant() deprecated. Use assistantType parameter instead.");
  // Для обратной совместимости возвращаем 'curator' как дефолтный тип
  return "curator";
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
    const response = await api.post<{ id: string }>('/api/openai/threads', {});
    
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
 * Обработать файл через Backend API
 * Возвращает проанализированное содержимое (для изображений) или извлечённый текст (для PDF/DOCX)
 * 
 * НОВАЯ АРХИТЕКТУРА:
 * - Передаёт userId и threadId в FormData
 * - Backend загружает файл в Supabase Storage
 * - Backend сохраняет metadata в БД
 * - Возвращает fileUrl + extractedText
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
    console.log(`📎 [processFile] Получен файл:`, {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      userId: userId || 'N/A',
      threadId: threadId || 'N/A',
    });

    // ✅ КРИТИЧЕСКИ ВАЖНО: проверяем что файл НЕ ПУСТОЙ
    if (!file || file.size === 0) {
      throw new Error(`Файл ${file?.name || 'Unknown'} пустой или поврежден!`);
    }

    // ✅ Получаем userId если не передан
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        userId = user.id;
        console.log('📎 [processFile] Получен userId из Supabase Auth:', userId);
      } else {
        throw new Error('Не удалось получить userId. Авторизуйтесь заново.');
      }
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId); // ✅ НОВОЕ: передаём userId!
    
    if (threadId) {
      formData.append('threadId', threadId); // ✅ НОВОЕ: передаём threadId!
    }
    
    if (userQuestion) {
      formData.append('userQuestion', userQuestion);
    }

    console.log(`📎 [processFile] FormData создан, файл добавлен`);
    console.log(`📎 [processFile] Отправляем на Backend: /api/files/process`);

    // ✅ НЕ устанавливаем Content-Type вручную!
    // Браузер автоматически добавит "multipart/form-data; boundary=..."
    const response = await api.post('/api/files/process', formData);

    console.log('✅ Файл обработан:', response);

    // ✅ НОВАЯ СТРУКТУРА ОТВЕТА от Backend
    if (response.success && response.file) {
      const { fileUrl, extractedText, fileId, fileType } = response.file;
      
      // Определяем тип по MIME type
      const isImage = fileType?.startsWith('image/');
      
      return {
        type: isImage ? 'image' : 'text',
        content: extractedText || '',
        analysis: isImage ? extractedText : undefined,
        fileUrl: fileUrl, // ✅ НОВОЕ: URL файла в Supabase Storage
        fileId: fileId,   // ✅ НОВОЕ: ID записи в БД
      };
    }

    // ✅ СОВМЕСТИМОСТЬ со старым форматом ответа (если Backend ещё не обновлён)
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
 * Отправить сообщение AI-ассистенту
 */
export async function sendMessageToAI(
  message: string,
  attachments?: Array<{ file?: File; name: string; type: string }>,
  userId?: string,
  assistantType: AssistantType = 'curator' // ✅ Новый параметр!
): Promise<string> {
  try {
    const startTime = Date.now();

    // Получаем или создаём Thread
    const threadId = await getOrCreateThread();

    console.log(`🤖 Используем ${assistantType} assistant`);

    // Обработка файлов (если есть)
    let finalMessage = message;
    if (attachments && attachments.length > 0) {
      console.log(`📎 [sendMessageToAI] Получено ${attachments.length} файл(ов)`);
      console.log(`📎 [sendMessageToAI] Детали attachments:`, attachments.map(att => ({
        name: att.name,
        type: att.type,
        hasFile: !!att.file,
        fileSize: att.file?.size || 0,
      })));
      
      for (const attachment of attachments) {
        console.log(`📎 [sendMessageToAI] Обрабатываем файл: ${attachment.name}`);
        
        if (attachment.file) {
          try {
            console.log(`📎 [sendMessageToAI] Вызываем processFile для ${attachment.name}`);
            // ✅ НОВОЕ: передаём userId и threadId
            const processed = await processFile(attachment.file, message, userId, threadId);
            
            console.log(`📎 [sendMessageToAI] ✅ Файл обработан. Результат:`, {
              type: processed.type,
              contentLength: processed.content?.length || 0,
              hasAnalysis: !!processed.analysis,
              fileUrl: processed.fileUrl,
            });
            
            if (processed.type === 'image') {
              // Для изображений добавляем анализ к сообщению
              finalMessage = message 
                ? `${message}\n\n[Анализ изображения: ${processed.analysis}]`
                : `[Анализ изображения: ${processed.analysis}]`;
              console.log(`📎 [sendMessageToAI] Добавлен анализ изображения к сообщению`);
            } else {
              // Для текстовых файлов добавляем извлечённый текст
              const textPreview = processed.content ? processed.content.substring(0, 100) : 'ПУСТО';
              console.log(`📎 [sendMessageToAI] Извлечённый текст (первые 100 символов): "${textPreview}..."`);
              
              finalMessage = message
                ? `${message}\n\n[Содержимое документа "${attachment.name}":\n${processed.content}]`
                : `[Содержимое документа "${attachment.name}":\n${processed.content}]`;
              
              console.log(`📎 [sendMessageToAI] ✅ Текст добавлен к сообщению. Длина finalMessage: ${finalMessage.length}`);
            }
          } catch (error) {
            console.error(`❌ Не удалось обработать файл ${attachment.name}:`, error);
          }
        } else {
          console.warn(`⚠️ [sendMessageToAI] У attachment "${attachment.name}" отсутствует файл!`);
        }
      }
    }
    
    console.log(`📤 [sendMessageToAI] Итоговое сообщение для OpenAI (длина: ${finalMessage.length}):`, 
      finalMessage.length > 200 ? finalMessage.substring(0, 200) + '...' : finalMessage);

    // Добавляем сообщение в thread через Backend
    console.log("💬 Добавляем сообщение в Thread через Backend...");
    await api.post(`/api/openai/threads/${threadId}/messages`, {
      content: finalMessage,
      role: 'user',
    });

    // Запускаем Run через Backend
    console.log("🔄 Запускаем Run через Backend...");
    console.log(`📍 Thread ID: ${threadId}`);
    
    const runResponse = await api.post<{ id: string; status: string }>(
      `/api/openai/threads/${threadId}/runs`,
      {
        assistant_type: assistantType, // ✅ Передаём ТИП, а не ID!
        temperature: 0.4,
        top_p: 0.8,
      }
    );
    
    const runId = runResponse.id;
    console.log("✅ Run запущен:", runId);
    console.log(`📍 Run ID: ${runId}`);

    // Polling: ожидаем завершения Run
    let runStatus = runResponse.status;
    let pollCount = 0;
    const maxPolls = 60; // 30 секунд (60 * 500ms)
    let tokenUsage: any = null; // Сохраняем usage для логирования

    while (runStatus === "queued" || runStatus === "in_progress" || runStatus === "requires_action") {
      if (pollCount >= maxPolls) {
        throw new Error("Превышено время ожидания ответа от AI");
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
      
      // Логируем параметры перед запросом
      console.log(`🔍 Проверка Run статуса: thread=${threadId}, run=${runId}`);
      
      const statusResponse = await api.get<{ status: string; usage?: any }>(
        `/api/openai/threads/${threadId}/runs/${runId}`
      );
      
      runStatus = statusResponse.status;
      
      // Сохраняем usage если есть
      if (statusResponse.usage) {
        tokenUsage = statusResponse.usage;
      }
      
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
      // Получаем финальный Run объект с usage данными
      console.log("📊 Получаем финальный Run для usage данных...");
      const finalRunResponse = await api.get<{ usage?: any }>(
        `/api/openai/threads/${threadId}/runs/${runId}`
      );
      
      if (finalRunResponse.usage) {
        tokenUsage = finalRunResponse.usage;
        console.log("✅ Usage данные получены:", tokenUsage);
      } else {
        console.warn("⚠️ Usage данные не найдены в финальном Run");
      }

      // Получаем последнее сообщение через Backend
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
        console.log("✅ Получен ответ от Assistant (длина:", responseText.length, "символов)");

        // Сохраняем диалог в Supabase через Backend API (если userId передан)
        if (userId) {
          console.log("💾 Сохраняем диалог в Supabase через Backend API...");
          try {
            await api.post('/api/supabase/curator/messages', {
              userId,
              userMessage: message,
              aiMessage: responseText,
              options: {
                response_time_ms: responseTime,
                model_used: 'gpt-4o',
                openai_message_id: assistantMessage.id,
                openai_run_id: runId,
              },
            });
            console.log("✅ Диалог сохранён в Supabase через Backend");

            // Логируем использование токенов (если есть данные)
            if (tokenUsage && userId) {
              console.log("📊 Логируем токены:", tokenUsage);
              console.log("📍 User ID:", userId);
              console.log("📍 Assistant Type:", assistantType);
              try {
                await api.post('/api/tokens/log', {
                  userId,
                  assistantType: assistantType, // ✅ Используем переданный тип!
                  promptTokens: tokenUsage.prompt_tokens || 0,
                  completionTokens: tokenUsage.completion_tokens || 0,
                  totalTokens: tokenUsage.total_tokens || 0,
                  modelUsed: 'gpt-4o',
                  openaiThreadId: threadId,
                  openaiMessageId: assistantMessage.id,
                  openaiRunId: runId,
                });
                console.log("✅ Токены залогированы успешно");
              } catch (tokenError: any) {
                console.error("⚠️ Не удалось залогировать токены:", tokenError);
                console.error("⚠️ Детали ошибки:", tokenError.message);
                // Не блокируем выполнение
              }
            } else {
              console.warn("⚠️ Пропускаем логирование токенов:", {
                hasTokenUsage: !!tokenUsage,
                hasUserId: !!userId,
              });
            }

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
          } catch (saveError) {
            console.error("⚠️ Не удалось сохранить в Supabase (не критично):", saveError);
            // Не блокируем ответ, если не удалось сохранить
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
 */
export async function transcribeAudioToText(audioBlob: Blob, userId?: string, threadId?: string): Promise<string> {
  try {
    console.log("🎙️ === НАЧАЛО ТРАНСКРИПЦИИ ===");
    console.log("📊 Размер аудио:", audioBlob.size, "байт");
    console.log("📊 Тип аудио:", audioBlob.type);

    // КРИТИЧЕСКАЯ ПРОВЕРКА: размер файла
    if (audioBlob.size === 0) {
      console.error("❌ Аудио файл пустой (0 байт)");
      throw new Error("Аудио файл пустой. Попробуйте записать ещё раз.");
    }

    if (audioBlob.size < 100) {
      console.error("❌ Аудио файл слишком маленький:", audioBlob.size, "байт");
      throw new Error("Аудио слишком короткое. Говорите минимум 1 секунду.");
    }

    // Определяем расширение файла
    const fileExtension = audioBlob.type.includes('webm') ? 'webm' : 
                         audioBlob.type.includes('mp4') ? 'mp4' :
                         audioBlob.type.includes('ogg') ? 'ogg' : 'webm';

    console.log("📝 Используем расширение файла:", fileExtension);

    // Вычисляем длительность аудио (примерная оценка)
    const audioDurationSeconds = await getAudioDuration(audioBlob);
    console.log("⏱️ Длительность аудио:", audioDurationSeconds, "секунд");

    // Создаём FormData для отправки на Backend
    const formData = new FormData();
    const audioFile = new File([audioBlob], `recording.${fileExtension}`, {
      type: audioBlob.type,
    });
    formData.append('audio', audioFile);
    formData.append('language', 'ru');
    formData.append('duration', audioDurationSeconds.toString());
    formData.append('prompt', 'Это голосовое сообщение студента на русском языке для AI-куратора образовательной платформы.');

    console.log("📤 Отправляем в Backend Whisper API...");

    // Получаем токен и базовый URL
    const token = getAuthToken();
    if (!token) {
      throw new Error("Отсутствует JWT токен. Авторизуйтесь заново.");
    }

    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    // Отправляем на Backend
    const response = await fetch(`${baseUrl}/api/openai/audio/transcriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || `API error: ${response.status}`);
    }

    const result = await response.json();
    const transcriptionText = result.text;

    // КРИТИЧЕСКАЯ ПРОВЕРКА: результат не пустой
    if (!transcriptionText || transcriptionText.trim().length === 0) {
      console.error("❌ Backend вернул пустой текст");
      throw new Error("Не удалось распознать речь. Попробуйте говорить громче и чётче.");
    }

    // Логируем использование Whisper
    try {
      await logWhisperUsage(audioDurationSeconds, { userId, threadId });
      console.log(`💰 Whisper логирован: ${audioDurationSeconds}s`);
    } catch (logError) {
      console.error('⚠️ Ошибка логирования Whisper:', logError);
      // Не прерываем работу
    }

    console.log("✅ === ТРАНСКРИПЦИЯ УСПЕШНА ===");
    console.log("✅ Распознанный текст:", transcriptionText);
    return transcriptionText;
  } catch (error: any) {
    console.error("❌ === ОШИБКА ТРАНСКРИПЦИИ ===");
    console.error("❌ Ошибка:", error);

    // Более понятные сообщения об ошибках
    if (error?.message?.includes("Invalid file format")) {
      throw new Error("Неподдерживаемый формат аудио. Попробуйте ещё раз.");
    } else if (error?.message?.includes("API key")) {
      throw new Error("Ошибка настройки AI. Обратитесь к администратору.");
    } else if (error?.message?.includes("network") || error?.message?.includes("fetch")) {
      throw new Error("Ошибка сети. Проверьте подключение к интернету.");
    } else if (error?.status === 429) {
      throw new Error("Слишком много запросов. Подождите немного и попробуйте снова.");
    } else if (error?.status === 401) {
      throw new Error("Ошибка авторизации AI. Обратитесь к администратору.");
    } else if (error.message) {
      // Пробрасываем наше понятное сообщение
      throw error;
    } else {
      throw new Error("Не удалось распознать речь. Попробуйте говорить громче и чётче.");
    }
  }
}

/**
 * Получить длительность аудио из Blob
 */
async function getAudioDuration(audioBlob: Blob): Promise<number> {
  return new Promise((resolve) => {
    try {
      const audio = new Audio();
      const url = URL.createObjectURL(audioBlob);

      audio.addEventListener('loadedmetadata', () => {
        URL.revokeObjectURL(url);
        resolve(Math.ceil(audio.duration)); // Округляем вверх до секунд
      });

      audio.addEventListener('error', () => {
        URL.revokeObjectURL(url);
        // Если не удалось получить длительность, оцениваем по размеру файла
        // Примерно 1 МБ = 90 секунд для WebM
        const estimatedDuration = Math.ceil(audioBlob.size / 1024 / 1024 * 90);
        resolve(estimatedDuration);
      });

      audio.src = url;
    } catch (error) {
      // Фоллбэк: оцениваем по размеру
      const estimatedDuration = Math.ceil(audioBlob.size / 1024 / 1024 * 90);
      resolve(estimatedDuration);
    }
  });
}

