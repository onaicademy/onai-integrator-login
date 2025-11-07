/**
 * 💬 SUPABASE CHAT API
 * 
 * Работа с таблицами:
 * - ai_curator_threads (потоки чатов)
 * - ai_curator_messages (сообщения)
 * - ai_curator_attachments (файлы)
 * - ai_curator_metrics (метрики)
 */

import { supabase } from './supabase';

// ============================================
// ТИПЫ
// ============================================

export interface ChatThread {
  id: string;
  user_id: string;
  assistant_id?: string;
  thread_id?: string;
  title?: string;
  created_at: string;
  updated_at: string;
  last_message_at?: string;
  message_count: number;
  is_archived: boolean;
}

export interface ChatMessage {
  id: string;
  thread_id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  openai_message_id?: string;
  openai_run_id?: string;
  has_attachments: boolean;
  attachment_count: number;
  is_voice_message: boolean;
  transcription_text?: string;
  response_time_ms?: number;
  token_count?: number;
  model_used?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  topics?: string[];
  lesson_reference?: string;
  lesson_timestamp?: number;
  created_at: string;
  updated_at: string;
}

export interface ChatAttachment {
  id: string;
  message_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  openai_file_id?: string;
  storage_url?: string;
  thumbnail_url?: string;
  created_at: string;
}

// ============================================
// THREADS (Потоки чатов)
// ============================================

/**
 * Получить или создать поток чата для пользователя
 */
export async function getOrCreateThread(userId: string, assistantId?: string, threadId?: string): Promise<ChatThread> {
  try {
    // Проверяем существующий поток
    const { data: existingThread, error: fetchError } = await supabase
      .from('ai_curator_threads')
      .select('*')
      .eq('user_id', userId)
      .eq('is_archived', false)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) throw fetchError;

    // Если нашли - возвращаем
    if (existingThread) {
      console.log('✅ Найден существующий поток:', existingThread.id);
      return existingThread;
    }

    // Создаём новый поток
    console.log('🆕 Создаём новый поток для user:', userId);
    const { data: newThread, error: createError } = await supabase
      .from('ai_curator_threads')
      .insert({
        user_id: userId,
        assistant_id: assistantId,
        thread_id: threadId,
        title: 'Новый диалог',
        message_count: 0,
        is_archived: false,
      })
      .select()
      .single();

    if (createError) throw createError;
    console.log('✅ Создан новый поток:', newThread.id);
    
    return newThread;
  } catch (error: any) {
    console.error('❌ Ошибка getOrCreateThread:', error);
    throw new Error(`Не удалось создать поток: ${error.message}`);
  }
}

/**
 * Обновить thread после добавления сообщения
 */
export async function updateThreadStats(threadId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('ai_curator_threads')
      .update({
        updated_at: new Date().toISOString(),
        last_message_at: new Date().toISOString(),
      })
      .eq('id', threadId);

    if (error) throw error;
  } catch (error: any) {
    console.error('❌ Ошибка updateThreadStats:', error);
  }
}

// ============================================
// MESSAGES (Сообщения)
// ============================================

/**
 * Получить историю сообщений из Supabase
 */
export async function getChatHistory(userId: string, limit: number = 50): Promise<ChatMessage[]> {
  try {
    // Получаем активный поток пользователя
    const thread = await getOrCreateThread(userId);
    
    // Получаем сообщения
    const { data: messages, error } = await supabase
      .from('ai_curator_messages')
      .select('*')
      .eq('thread_id', thread.id)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;

    console.log(`✅ Загружено ${messages?.length || 0} сообщений из БД`);
    return messages || [];
  } catch (error: any) {
    console.error('❌ Ошибка getChatHistory:', error);
    // Возвращаем пустой массив при ошибке
    return [];
  }
}

/**
 * Сохранить сообщение в Supabase
 */
export async function saveMessage(
  userId: string,
  threadId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  options?: {
    openai_message_id?: string;
    openai_run_id?: string;
    is_voice_message?: boolean;
    transcription_text?: string;
    response_time_ms?: number;
    token_count?: number;
    model_used?: string;
  }
): Promise<ChatMessage | null> {
  try {
    const { data: message, error } = await supabase
      .from('ai_curator_messages')
      .insert({
        thread_id: threadId,
        user_id: userId,
        role,
        content,
        openai_message_id: options?.openai_message_id,
        openai_run_id: options?.openai_run_id,
        is_voice_message: options?.is_voice_message || false,
        transcription_text: options?.transcription_text,
        response_time_ms: options?.response_time_ms,
        token_count: options?.token_count,
        model_used: options?.model_used,
        has_attachments: false,
        attachment_count: 0,
      })
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Сообщение сохранено:', message.id);
    
    // Обновляем статистику потока
    await updateThreadStats(threadId);
    
    return message;
  } catch (error: any) {
    console.error('❌ Ошибка saveMessage:', error);
    return null;
  }
}

/**
 * Сохранить пару сообщений (юзер + AI)
 */
export async function saveMessagePair(
  userId: string,
  userMessage: string,
  aiMessage: string,
  options?: {
    is_voice_message?: boolean;
    transcription_text?: string;
    response_time_ms?: number;
    token_count?: number;
    model_used?: string;
    openai_message_id?: string;
    openai_run_id?: string;
  }
): Promise<{ userMsg: ChatMessage | null; aiMsg: ChatMessage | null }> {
  try {
    // Получаем или создаём поток
    const thread = await getOrCreateThread(userId);

    // Сохраняем сообщение пользователя
    const userMsg = await saveMessage(userId, thread.id, 'user', userMessage, {
      is_voice_message: options?.is_voice_message,
      transcription_text: options?.transcription_text,
    });

    // Сохраняем ответ AI
    const aiMsg = await saveMessage(userId, thread.id, 'assistant', aiMessage, {
      response_time_ms: options?.response_time_ms,
      token_count: options?.token_count,
      model_used: options?.model_used,
      openai_message_id: options?.openai_message_id,
      openai_run_id: options?.openai_run_id,
    });

    return { userMsg, aiMsg };
  } catch (error: any) {
    console.error('❌ Ошибка saveMessagePair:', error);
    return { userMsg: null, aiMsg: null };
  }
}

// ============================================
// ATTACHMENTS (Вложения)
// ============================================

/**
 * Сохранить вложение
 */
export async function saveAttachment(
  messageId: string,
  fileName: string,
  fileType: string,
  fileSize: number,
  options?: {
    openai_file_id?: string;
    storage_url?: string;
    thumbnail_url?: string;
  }
): Promise<ChatAttachment | null> {
  try {
    const { data: attachment, error } = await supabase
      .from('ai_curator_attachments')
      .insert({
        message_id: messageId,
        file_name: fileName,
        file_type: fileType,
        file_size: fileSize,
        openai_file_id: options?.openai_file_id,
        storage_url: options?.storage_url,
        thumbnail_url: options?.thumbnail_url,
      })
      .select()
      .single();

    if (error) throw error;

    // Обновляем счётчик вложений в сообщении
    await supabase
      .from('ai_curator_messages')
      .update({
        has_attachments: true,
        attachment_count: 1, // TODO: инкремент
      })
      .eq('id', messageId);

    console.log('✅ Вложение сохранено:', attachment.id);
    return attachment;
  } catch (error: any) {
    console.error('❌ Ошибка saveAttachment:', error);
    return null;
  }
}

/**
 * Получить вложения сообщения
 */
export async function getMessageAttachments(messageId: string): Promise<ChatAttachment[]> {
  try {
    const { data: attachments, error } = await supabase
      .from('ai_curator_attachments')
      .select('*')
      .eq('message_id', messageId);

    if (error) throw error;
    return attachments || [];
  } catch (error: any) {
    console.error('❌ Ошибка getMessageAttachments:', error);
    return [];
  }
}

// ============================================
// ADMIN (Для админ-панели)
// ============================================

/**
 * Получить все диалоги (для админов)
 */
export async function getAllThreadsForAdmin(limit: number = 100): Promise<any[]> {
  try {
    const { data: threads, error } = await supabase
      .from('ai_curator_threads')
      .select(`
        *,
        user:user_id (
          id,
          email,
          raw_user_meta_data
        )
      `)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return threads || [];
  } catch (error: any) {
    console.error('❌ Ошибка getAllThreadsForAdmin:', error);
    return [];
  }
}

/**
 * Получить сообщения конкретного диалога (для админов)
 */
export async function getThreadMessages(threadId: string): Promise<ChatMessage[]> {
  try {
    const { data: messages, error } = await supabase
      .from('ai_curator_messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return messages || [];
  } catch (error: any) {
    console.error('❌ Ошибка getThreadMessages:', error);
    return [];
  }
}

