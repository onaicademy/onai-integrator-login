import OpenAI from "openai";
import { getUserAchievementsForAI, formatAchievementsForAI } from './achievements-api';
import { logTokenUsage, logWhisperUsage } from './token-tracker';
import {
  getChatHistory as getSupabaseChatHistory,
  saveMessagePair,
  getOrCreateThread as getSupabaseThread,
  type ChatMessage as SupabaseChatMessage,
} from './supabase-chat';
import { detectConflicts } from './conflict-detector';

// Инициализация OpenAI клиента
let openai: OpenAI | null = null;

const initOpenAI = () => {
  if (!openai) {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    console.log("🔑 API Key check:", apiKey ? "✅ Found" : "❌ Not found");
    
    if (!apiKey) {
      throw new Error("VITE_OPENAI_API_KEY не найден в .env файле!");
    }

    openai = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true,
    });
  }
  return openai;
};

// ID ассистента (будет создан при первом использовании или использовать существующий)
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
 */
export async function getAIAssistant(): Promise<string> {
  try {
    const client = initOpenAI();

    // Проверяем сохранённый ID ассистента
    const savedAssistantId = localStorage.getItem(ASSISTANT_ID_KEY);

    if (savedAssistantId) {
      try {
        // Проверяем что ассистент существует и обновляем инструкции
        const existingAssistant = await client.beta.assistants.retrieve(savedAssistantId);
        console.log("✅ Используем существующий Assistant:", savedAssistantId);
        
        // Обновляем инструкции для поддержки изображений (если нужно)
        // Это гарантирует, что Assistant знает о возможности анализа изображений
        return savedAssistantId;
      } catch (error) {
        console.log("⚠️ Сохранённый Assistant не найден, создаём новый");
        localStorage.removeItem(ASSISTANT_ID_KEY);
      }
    }

    // Создаём нового ассистента
    console.log("🔄 Создаём нового Assistant...");
    const assistant = await client.beta.assistants.create({
      name: "onAI Academy AI-куратор",
      instructions: `Ты AI-куратор образовательной платформы onAI Academy в Казахстане.

🎯 ГЛАВНОЕ ПРАВИЛО: КРАТКОСТЬ!
- Ответы МАКСИМУМ 100 символов (2-3 предложения)
- Если нужно больше - разбивай на части
- Студент может задать follow-up вопросы

ТВОЯ РОЛЬ:
- Помогаешь студентам изучать AI и программирование
- Отвечаешь на вопросы по курсам КРАТКО
- Анализируешь код и находишь ошибки ЛАКОНИЧНО
- Объясняешь сложные концепции ПРОСТЫМИ словами
- Даёшь практические советы БЕЗ воды

СТИЛЬ ОБЩЕНИЯ:
- Дружелюбный и неформальный (можно "бро", "чувак")
- Энергичный и мотивирующий
- КОНКРЕТНЫЙ и ПРАКТИЧНЫЙ (главное!)
- С эмодзи когда уместно 🚀 (но в меру!)
- На русском языке
- БЕЗ ДЛИННЫХ СПИСКОВ - только самое важное

ФОРМАТ ОТВЕТА:
- 1-2 предложения с главной мыслью
- Если нужно перечисление - максимум 3 пункта
- Используй markdown: **жирный**, *курсив*, \`код\`
- Если вопрос сложный - скажи "Могу объяснить подробнее?"

ПРИМЕРЫ ОТВЕТОВ:

Вопрос: "Что такое gradient descent?"
❌ ПЛОХО: "Gradient descent это алгоритм оптимизации, который используется в машинном обучении для минимизации функции потерь..."
✅ ХОРОШО: "**Gradient descent** - спуск по склону функции ошибки к минимуму. Как идёшь вниз с горы по самому крутому пути. Могу объяснить математику?"

Вопрос: "Найди ошибку в коде"
❌ ПЛОХО: "Я проанализировал твой код и нашёл несколько проблем. Во-первых, на строке 15..."
✅ ХОРОШО: "**Строка 15**: опечатка \`pirnt\` → должно \`print\`. Это \`NameError\`. Исправь! 🔧"

ВОЗМОЖНОСТИ:
- Читаешь и анализируешь файлы (PDF, изображения)
- Анализируешь изображения и извлекаешь из них текст (OCR) - ВАЖНО: ты МОЖЕШЬ видеть изображения!
- Находишь ошибки в коде на скриншотах
- Объясняешь материалы из PDF лекций (кратко!)
- Пишешь и выполняешь код (Python)
- Видишь и понимаешь содержимое изображений (скриншоты, диаграммы, схемы)
- 📊 ПОЛУЧАЕШЬ ДОСТИЖЕНИЯ УЧЕНИКА через функцию get_user_achievements (используй когда нужно мотивировать или дать персональные советы)

ВАЖНО ДЛЯ ИЗОБРАЖЕНИЙ:
- Когда тебе отправляют изображение, ты ДОЛЖЕН его проанализировать
- Извлекай весь текст из изображения (OCR)
- Описывай что видишь на изображении
- Если это код - найди ошибки и объясни
- Если это диаграмма - объясни структуру

ОГРАНИЧЕНИЯ:
- Не делаешь домашки за студентов - только направление
- Не даёшь прямых ответов на тесты
- ВСЕГДА отвечаешь кратко - максимум 100 символов!

📊 ФУНКЦИЯ get_user_achievements:
- Вызывай когда ученик спрашивает про прогресс, мотивацию, что делать дальше
- НЕ вызывай при обычных вопросах о материале
- После получения данных - дай КРАТКИЙ совет на основе его прогресса
- Фокусируйся на "достижениях дня" (бонус x2 XP!) и ближайших целях

Помни: Краткость - сестра таланта! 💪`,
      model: "gpt-4o",
      tools: [
        { type: "code_interpreter" }, 
        { type: "file_search" },
        {
          type: "function",
          function: {
            name: "get_user_achievements",
            description: "Получить достижения и прогресс конкретного ученика. Используй когда разговор про: мотивацию, прогресс, цели, что делать дальше, достижения.",
            parameters: {
              type: "object",
              properties: {
                user_id: {
                  type: "string",
                  description: "ID пользователя (передаётся автоматически)"
                }
              },
              required: []
            }
          }
        }
      ],
    });

    // Сохраняем ID ассистента
    localStorage.setItem(ASSISTANT_ID_KEY, assistant.id);
    console.log("✅ Создан новый Assistant:", assistant.id);

    return assistant.id;
  } catch (error) {
    console.error("❌ Ошибка при создании/получении Assistant:", error);
    throw error;
  }
}

/**
 * Получить или создать Thread для разговора
 */
export async function getOrCreateThread(): Promise<string> {
  try {
    const client = initOpenAI();

    // Проверяем сохранённый ID thread
    const savedThreadId = localStorage.getItem(THREAD_ID_KEY);

    if (savedThreadId) {
      try {
        // Проверяем что thread существует
        await client.beta.threads.retrieve(savedThreadId);
        console.log("✅ Используем существующий Thread:", savedThreadId);
        return savedThreadId;
      } catch (error) {
        console.log("⚠️ Сохранённый Thread не найден, создаём новый");
        localStorage.removeItem(THREAD_ID_KEY);
      }
    }

    // Создаём новый thread
    console.log("🔄 Создаём новый Thread...");
    const thread = await client.beta.threads.create();
    localStorage.setItem(THREAD_ID_KEY, thread.id);
    console.log("✅ Создан новый Thread:", thread.id);

    return thread.id;
  } catch (error) {
    console.error("❌ Ошибка при создании/получении Thread:", error);
    throw error;
  }
}

/**
 * Загрузить файл в OpenAI
 */
export async function uploadFile(file: File): Promise<string> {
  try {
    const client = initOpenAI();
    console.log("📤 Загружаем файл:", file.name);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("purpose", "assistants");

    // Используем fetch для загрузки файла
    const response = await fetch("https://api.openai.com/v1/files", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Ошибка загрузки файла");
    }

    const data = await response.json();
    console.log("✅ Файл загружен:", data.id);
    return data.id;
  } catch (error) {
    console.error("❌ Ошибка загрузки файла:", error);
    throw error;
  }
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
    const startTime = Date.now(); // Для измерения времени ответа
    const client = initOpenAI();

    // Получаем или создаём Assistant и Thread
    const assistantId = await getAIAssistant();
    const threadId = await getOrCreateThread();

    // Загружаем файлы параллельно если есть
    const fileIds: string[] = [];
    const imageFileIds: string[] = [];
    const documentFileIds: string[] = [];
    
    if (attachments && attachments.length > 0) {
      console.log("📤 Загружаем файлы параллельно...");
      const uploadPromises = attachments
        .filter(att => att.file)
        .map(att => uploadFile(att.file!));
      
      const uploadedFileIds = await Promise.all(uploadPromises);
      fileIds.push(...uploadedFileIds);
      console.log("✅ Файлы загружены:", fileIds.length);
      
      // Разделяем файлы на изображения и документы
      for (let i = 0; i < uploadedFileIds.length && i < attachments.length; i++) {
        const attachment = attachments[i];
        const isImage = attachment.type.startsWith('image/');
        
        if (isImage) {
          imageFileIds.push(uploadedFileIds[i]);
        } else {
          documentFileIds.push(uploadedFileIds[i]);
        }
      }
    }

    // Если есть документы (PDF и т.д.), обновляем Assistant с этими файлами через tool_resources
    if (documentFileIds.length > 0) {
      console.log("📎 Прикрепляем документы к Assistant через file_search...");
      try {
        await client.beta.assistants.update(assistantId, {
          tool_resources: {
            file_search: {
              vector_store_ids: [],
            },
          },
        });
        
        // Создаём vector store для файлов
        const vectorStore = await client.beta.vectorStores.create({
          name: `Files for thread ${threadId}`,
          file_ids: documentFileIds,
        });
        
        // Обновляем Assistant с vector store
        await client.beta.assistants.update(assistantId, {
          tool_resources: {
            file_search: {
              vector_store_ids: [vectorStore.id],
            },
          },
        });
        
        console.log("✅ Документы прикреплены к Assistant");
      } catch (error) {
        console.error("⚠️ Ошибка прикрепления документов к Assistant:", error);
      }
    }

    // Добавляем сообщение в thread
    console.log("💬 Добавляем сообщение в Thread...");
    
    // Формируем content с поддержкой файлов
    let content: any = message;
    
    // Если есть изображения, добавляем их в content
    if (imageFileIds.length > 0) {
      // Если сообщение пустое или только дефолтное, добавляем запрос на анализ изображения
      let textMessage = message.trim();
      if (!textMessage || textMessage === "Проанализируй файл" || textMessage === "📎 Прикреплён файл") {
        textMessage = "Проанализируй это изображение подробно. Опиши что на нём изображено, извлеки весь текст который видишь (если есть), объясни содержимое и ответь на вопросы по изображению. Если это скриншот кода - найди ошибки и объясни их. Если это диаграмма или схема - объясни её структуру.";
      }
      
      const contentParts: any[] = [
        {
          type: "text",
          text: textMessage,
        },
      ];
      
      // Добавляем изображения
      for (const fileId of imageFileIds) {
        contentParts.push({
          type: "image_file",
          image_file: {
            file_id: fileId,
          },
        });
      }
      
      content = contentParts;
      console.log("🖼️ Отправляем изображение(я) с запросом:", textMessage);
    }
    
    await client.beta.threads.messages.create(threadId, {
      role: "user",
      content: content,
    });

    // Запускаем Run с оптимизированными параметрами
    console.log("🔄 Запускаем Run...");
    const run = await client.beta.threads.runs.create(threadId, {
      assistant_id: assistantId,
      temperature: 0.4,  // Меньше фантазий
      top_p: 0.8,        // Более точные ответы
    });
    console.log("✅ Run запущен:", run.id);

    // Ожидаем завершения Run
    let runStatus = await client.beta.threads.runs.retrieve(threadId, run.id);
    console.log("📊 Статус Run:", runStatus.status);

    // Polling: проверяем статус каждые 500ms (оптимальный баланс между скоростью и нагрузкой)
    let pollCount = 0;
    const maxPolls = 60; // Максимум 30 секунд ожидания (60 * 500ms)
    
    while (runStatus.status === "queued" || runStatus.status === "in_progress" || runStatus.status === "requires_action") {
      if (pollCount >= maxPolls) {
        throw new Error("Превышено время ожидания ответа от AI");
      }
      
      // Обработка function calling
      if (runStatus.status === "requires_action" && runStatus.required_action?.type === "submit_tool_outputs") {
        console.log("🔧 AI запросил вызов функции");
        const toolCalls = runStatus.required_action.submit_tool_outputs.tool_calls;
        const toolOutputs = [];

        for (const toolCall of toolCalls) {
          if (toolCall.function.name === "get_user_achievements") {
            try {
              const effectiveUserId = userId || 'user-1';
              console.log("📊 Получаем достижения для пользователя:", effectiveUserId);
              
              const achievementsData = await getUserAchievementsForAI(effectiveUserId);
              const formattedData = formatAchievementsForAI(achievementsData);
              
              toolOutputs.push({
                tool_call_id: toolCall.id,
                output: formattedData
              });
              console.log("✅ Достижения получены и отправлены AI");
            } catch (error) {
              console.error("❌ Ошибка получения достижений:", error);
              toolOutputs.push({
                tool_call_id: toolCall.id,
                output: "Не удалось получить достижения. Продолжи без этих данных."
              });
            }
          }
        }

        // Отправляем результаты функций
        if (toolOutputs.length > 0) {
          runStatus = await client.beta.threads.runs.submitToolOutputs(threadId, run.id, {
            tool_outputs: toolOutputs
          });
          console.log("📤 Результаты функций отправлены");
        }
      }
      
      await new Promise((resolve) => setTimeout(resolve, 500));
      runStatus = await client.beta.threads.runs.retrieve(threadId, run.id);
      pollCount++;
      
      // Логируем только каждые 5 проверок (каждые 2.5 секунды) или при изменении статуса
      if (pollCount % 5 === 0 || runStatus.status !== "in_progress") {
        console.log(`📊 Статус Run (проверка ${pollCount}):`, runStatus.status);
      }
    }

    if (runStatus.status === "completed") {
      // Логируем использование токенов
      if (runStatus.usage) {
        try {
          const hasImages = imageFileIds.length > 0;
          await logTokenUsage({
            agentType: 'ai_curator',
            model: 'gpt-4o',
            operationType: hasImages ? 'image_analysis' : 'text_message',
            promptTokens: runStatus.usage.prompt_tokens || 0,
            completionTokens: runStatus.usage.completion_tokens || 0,
            userId: userId,
            threadId: threadId,
            requestId: run.id
          });
          console.log(`💰 Токены залогированы: ${runStatus.usage.prompt_tokens + runStatus.usage.completion_tokens} tokens`);
        } catch (logError) {
          console.error('⚠️ Ошибка логирования токенов:', logError);
          // Не прерываем работу, если логирование не удалось
        }
      }
      
      // Получаем только последнее сообщение от assistant (самое новое)
      const messages = await client.beta.threads.messages.list(threadId, {
        limit: 1, // Получаем только последнее сообщение для скорости
        order: "desc", // Сначала новые
      });

      // Берем первое сообщение (оно должно быть от assistant, так как мы только что получили ответ)
      let assistantMessage = messages.data[0];

      if (!assistantMessage || assistantMessage.role !== "assistant") {
        // Если не нашли, пробуем получить больше сообщений
        const allMessages = await client.beta.threads.messages.list(threadId, {
          limit: 5,
          order: "desc",
        });
        const foundMessage = allMessages.data.find(
          (msg) => msg.role === "assistant"
        );
        
        if (!foundMessage) {
          throw new Error("Не получен ответ от Assistant");
        }
        
        assistantMessage = foundMessage;
      }

      if (
        assistantMessage.content &&
        assistantMessage.content.length > 0 &&
        assistantMessage.content[0].type === "text"
      ) {
        const responseText = assistantMessage.content[0].text.value;
        const responseTime = Date.now() - startTime;
        console.log("✅ Получен ответ от Assistant (длина:", responseText.length, "символов)");
        
        // 💾 СОХРАНЯЕМ в Supabase (если userId передан)
        if (userId) {
          console.log("💾 Сохраняем диалог в Supabase...");
          await saveMessagePair(userId, message, responseText, {
            response_time_ms: responseTime,
            model_used: 'gpt-4o',
            openai_message_id: assistantMessage.id,
            openai_run_id: run.id,
          });
          console.log("✅ Диалог сохранён в Supabase");
          
          // 🔍 ОБНАРУЖИВАЕМ КОНФЛИКТЫ И ОШИБКИ БОТА
          console.log("🔍 Проверяем на конфликты...");
          const conflicts = await detectConflicts({
            userMessage: message,
            aiResponse: responseText,
            threadId,
            userId,
            responseTime,
            tokenCount: runStatus.usage?.total_tokens,
            model: 'gpt-4o',
          });
          
          if (conflicts.length > 0) {
            console.warn(`⚠️ Обнаружено конфликтов: ${conflicts.length}`);
            conflicts.forEach(c => console.warn(`  - ${c.type} (${c.severity}): ${c.detected_issue}`));
          } else {
            console.log("✅ Конфликтов не обнаружено");
          }
        }
        
        return responseText;
      } else {
        throw new Error("Неожиданный формат ответа от Assistant");
      }
    } else {
      throw new Error(`Run завершился со статусом: ${runStatus.status}`);
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
    // Если userId не передан, возвращаем пустой массив
    if (!userId) {
      console.warn("⚠️ getChatHistory: userId не передан");
      return [];
    }

    console.log("📜 Загружаем историю из Supabase для user:", userId);
    
    // Получаем сообщения из Supabase
    const supabaseMessages = await getSupabaseChatHistory(userId, 100);
    
    console.log(`✅ Загружено ${supabaseMessages.length} сообщений из Supabase`);

    // Преобразуем в формат ChatMessage
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
    const client = initOpenAI();
    console.log("🎙️ Транскрибируем аудио...");
    
    // Вычисляем длительность аудио (примерная оценка)
    const audioDurationSeconds = await getAudioDuration(audioBlob);
    
    // Конвертируем Blob в File
    const file = new File([audioBlob], "recording.webm", { 
      type: audioBlob.type 
    });

    const response = await client.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
      language: "ru", // Русский язык
      response_format: "text",
    });

    // Логируем использование Whisper
    try {
      await logWhisperUsage(audioDurationSeconds, { userId, threadId });
      console.log(`💰 Whisper логирован: ${audioDurationSeconds}s`);
    } catch (logError) {
      console.error('⚠️ Ошибка логирования Whisper:', logError);
      // Не прерываем работу
    }

    console.log("✅ Транскрипция получена:", response);
    return response as string;
  } catch (error) {
    console.error("❌ Ошибка транскрипции:", error);
    throw error;
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

