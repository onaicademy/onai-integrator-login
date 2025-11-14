import { supabase } from '../config/supabase';

/**
 * =====================================================
 * СОХРАНЕНИЕ СООБЩЕНИЙ AI-КУРАТОРА
 * =====================================================
 */

/**
 * Получить или создать Thread для AI-куратора
 */
export async function getOrCreateCuratorThread(userId: string) {
  try {
    console.log(`[Supabase] Getting curator thread for user: ${userId}`);
    console.log(`[Supabase] Supabase URL: ${process.env.SUPABASE_URL}`);
    console.log(`[Supabase] Service key length: ${process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0} chars`);

    // Ищем активный thread
    const { data: existingThread, error: fetchError } = await supabase
      .from('ai_curator_threads')
      .select('*')
      .eq('user_id', userId)
      .eq('is_archived', false)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error(`[Supabase] ❌ Error fetching thread:`, fetchError);
    }

    if (existingThread && !fetchError) {
      console.log(`✅ Found existing thread: ${existingThread.id}`);
      return existingThread;
    }

    // Создаём новый thread
    console.log(`🆕 Creating new curator thread for user: ${userId}`);
    const { data: newThread, error: insertError } = await supabase
      .from('ai_curator_threads')
      .insert({
        user_id: userId,
        openai_thread_id: null, // OpenAI thread создаётся отдельно
        title: 'Новая беседа с AI-куратором',
        is_archived: false,
        message_count: 0,
        last_message_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) throw insertError;

    console.log(`✅ Created new thread: ${newThread.id}`);
    return newThread;
  } catch (error: any) {
    console.error('[Supabase] Error in getOrCreateCuratorThread:', error);
    throw new Error(`Failed to get or create curator thread: ${error.message}`);
  }
}

/**
 * Сохранить сообщение AI-куратора
 */
export async function saveCuratorMessage(
  threadId: string,
  userId: string,
  role: 'user' | 'assistant',
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
) {
  try {
    console.log(`[Supabase] Saving curator message: threadId=${threadId}, role=${role}`);

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

    console.log(`✅ Message saved: ${message.id}`);

    // Обновляем статистику thread
    await updateCuratorThreadStats(threadId);

    return message;
  } catch (error: any) {
    console.error('[Supabase] Error in saveCuratorMessage:', error);
    throw new Error(`Failed to save curator message: ${error.message}`);
  }
}

/**
 * Обновить статистику thread
 */
async function updateCuratorThreadStats(threadId: string) {
  try {
    const { data: messages } = await supabase
      .from('ai_curator_messages')
      .select('id')
      .eq('thread_id', threadId);

    const messageCount = messages?.length || 0;

    await supabase
      .from('ai_curator_threads')
      .update({
        message_count: messageCount,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', threadId);

    console.log(`✅ Thread stats updated: ${messageCount} messages`);
  } catch (error) {
    console.error('[Supabase] Error updating thread stats:', error);
  }
}

/**
 * Сохранить пару сообщений (user + assistant) для AI-куратора
 */
export async function saveCuratorMessagePair(
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
) {
  try {
    console.log(`[Supabase] Saving curator message pair for user: ${userId}`);

    // Получаем или создаём thread
    const thread = await getOrCreateCuratorThread(userId);

    // Сохраняем сообщение пользователя
    const userMsg = await saveCuratorMessage(thread.id, userId, 'user', userMessage, {
      is_voice_message: options?.is_voice_message,
      transcription_text: options?.transcription_text,
    });

    // Сохраняем ответ AI
    const aiMsg = await saveCuratorMessage(thread.id, userId, 'assistant', aiMessage, {
      response_time_ms: options?.response_time_ms,
      token_count: options?.token_count,
      model_used: options?.model_used,
      openai_message_id: options?.openai_message_id,
      openai_run_id: options?.openai_run_id,
    });

    console.log(`✅ Message pair saved successfully`);

    return { userMsg, aiMsg, threadId: thread.id };
  } catch (error: any) {
    console.error('[Supabase] Error in saveCuratorMessagePair:', error);
    throw new Error(`Failed to save curator message pair: ${error.message}`);
  }
}

/**
 * =====================================================
 * СОХРАНЕНИЕ СООБЩЕНИЙ AI-АНАЛИТИКА
 * =====================================================
 */

/**
 * Получить или создать Thread для AI-аналитика
 */
export async function getOrCreateAnalystThread(userId: string) {
  try {
    console.log(`[Supabase] Getting analyst thread for user: ${userId}`);

    // Ищем активный thread
    const { data: existingThread, error: fetchError } = await supabase
      .from('ai_analyst_threads')
      .select('*')
      .eq('user_id', userId)
      .eq('is_archived', false)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (existingThread && !fetchError) {
      console.log(`✅ Found existing analyst thread: ${existingThread.id}`);
      return existingThread;
    }

    // Создаём новый thread
    console.log(`🆕 Creating new analyst thread for user: ${userId}`);
    const { data: newThread, error: insertError } = await supabase
      .from('ai_analyst_threads')
      .insert({
        user_id: userId,
        openai_thread_id: null,
        title: 'Новая беседа с AI-аналитиком',
        is_archived: false,
        message_count: 0,
        last_message_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) throw insertError;

    console.log(`✅ Created new analyst thread: ${newThread.id}`);
    return newThread;
  } catch (error: any) {
    console.error('[Supabase] Error in getOrCreateAnalystThread:', error);
    throw new Error(`Failed to get or create analyst thread: ${error.message}`);
  }
}

/**
 * Сохранить сообщение AI-аналитика
 */
export async function saveAnalystMessage(
  threadId: string,
  userId: string,
  role: 'user' | 'assistant',
  content: string,
  options?: {
    openai_message_id?: string;
    openai_run_id?: string;
    response_time_ms?: number;
    token_count?: number;
    model_used?: string;
  }
) {
  try {
    console.log(`[Supabase] Saving analyst message: threadId=${threadId}, role=${role}`);

    const { data: message, error } = await supabase
      .from('ai_analyst_messages')
      .insert({
        thread_id: threadId,
        user_id: userId,
        role,
        content,
        openai_message_id: options?.openai_message_id,
        openai_run_id: options?.openai_run_id,
        response_time_ms: options?.response_time_ms,
        token_count: options?.token_count,
        model_used: options?.model_used,
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Analyst message saved: ${message.id}`);

    // Обновляем статистику thread
    await updateAnalystThreadStats(threadId);

    return message;
  } catch (error: any) {
    console.error('[Supabase] Error in saveAnalystMessage:', error);
    throw new Error(`Failed to save analyst message: ${error.message}`);
  }
}

/**
 * Обновить статистику analyst thread
 */
async function updateAnalystThreadStats(threadId: string) {
  try {
    const { data: messages } = await supabase
      .from('ai_analyst_messages')
      .select('id')
      .eq('thread_id', threadId);

    const messageCount = messages?.length || 0;

    await supabase
      .from('ai_analyst_threads')
      .update({
        message_count: messageCount,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', threadId);

    console.log(`✅ Analyst thread stats updated: ${messageCount} messages`);
  } catch (error) {
    console.error('[Supabase] Error updating analyst thread stats:', error);
  }
}

/**
 * Сохранить пару сообщений (user + assistant) для AI-аналитика
 */
export async function saveAnalystMessagePair(
  userId: string,
  userMessage: string,
  aiMessage: string,
  options?: {
    response_time_ms?: number;
    token_count?: number;
    model_used?: string;
    openai_message_id?: string;
    openai_run_id?: string;
  }
) {
  try {
    console.log(`[Supabase] Saving analyst message pair for user: ${userId}`);

    // Получаем или создаём thread
    const thread = await getOrCreateAnalystThread(userId);

    // Сохраняем сообщение пользователя
    const userMsg = await saveAnalystMessage(thread.id, userId, 'user', userMessage);

    // Сохраняем ответ AI
    const aiMsg = await saveAnalystMessage(thread.id, userId, 'assistant', aiMessage, {
      response_time_ms: options?.response_time_ms,
      token_count: options?.token_count,
      model_used: options?.model_used,
      openai_message_id: options?.openai_message_id,
      openai_run_id: options?.openai_run_id,
    });

    console.log(`✅ Analyst message pair saved successfully`);

    return { userMsg, aiMsg, threadId: thread.id };
  } catch (error: any) {
    console.error('[Supabase] Error in saveAnalystMessagePair:', error);
    throw new Error(`Failed to save analyst message pair: ${error.message}`);
  }
}

/**
 * =====================================================
 * СОХРАНЕНИЕ СООБЩЕНИЙ AI-НАСТАВНИКА (TELEGRAM)
 * =====================================================
 */

/**
 * Получить или создать Thread для AI-наставника
 */
export async function getOrCreateMentorThread(userId: string, telegramUserId?: string) {
  try {
    console.log(`[Supabase] Getting mentor thread for user: ${userId}`);

    // Ищем активный thread
    const { data: existingThread, error: fetchError } = await supabase
      .from('ai_mentor_threads')
      .select('*')
      .eq('user_id', userId)
      .eq('is_archived', false)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (existingThread && !fetchError) {
      console.log(`✅ Found existing mentor thread: ${existingThread.id}`);
      return existingThread;
    }

    // Создаём новый thread
    console.log(`🆕 Creating new mentor thread for user: ${userId}`);
    const { data: newThread, error: insertError } = await supabase
      .from('ai_mentor_threads')
      .insert({
        user_id: userId,
        telegram_user_id: telegramUserId || null,
        openai_thread_id: null,
        title: 'Новая беседа с AI-наставником',
        is_archived: false,
        message_count: 0,
        last_message_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) throw insertError;

    console.log(`✅ Created new mentor thread: ${newThread.id}`);
    return newThread;
  } catch (error: any) {
    console.error('[Supabase] Error in getOrCreateMentorThread:', error);
    throw new Error(`Failed to get or create mentor thread: ${error.message}`);
  }
}

/**
 * Сохранить сообщение AI-наставника (Telegram)
 */
export async function saveMentorMessage(
  threadId: string,
  userId: string,
  role: 'user' | 'assistant',
  content: string,
  options?: {
    openai_message_id?: string;
    openai_run_id?: string;
    telegram_message_id?: string;
    response_time_ms?: number;
    token_count?: number;
    model_used?: string;
  }
) {
  try {
    console.log(`[Supabase] Saving mentor message: threadId=${threadId}, role=${role}`);

    const { data: message, error } = await supabase
      .from('ai_mentor_messages')
      .insert({
        thread_id: threadId,
        user_id: userId,
        role,
        content,
        openai_message_id: options?.openai_message_id,
        openai_run_id: options?.openai_run_id,
        telegram_message_id: options?.telegram_message_id,
        response_time_ms: options?.response_time_ms,
        token_count: options?.token_count,
        model_used: options?.model_used,
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Mentor message saved: ${message.id}`);

    // Обновляем статистику thread
    await updateMentorThreadStats(threadId);

    return message;
  } catch (error: any) {
    console.error('[Supabase] Error in saveMentorMessage:', error);
    throw new Error(`Failed to save mentor message: ${error.message}`);
  }
}

/**
 * Обновить статистику mentor thread
 */
async function updateMentorThreadStats(threadId: string) {
  try {
    const { data: messages } = await supabase
      .from('ai_mentor_messages')
      .select('id')
      .eq('thread_id', threadId);

    const messageCount = messages?.length || 0;

    await supabase
      .from('ai_mentor_threads')
      .update({
        message_count: messageCount,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', threadId);

    console.log(`✅ Mentor thread stats updated: ${messageCount} messages`);
  } catch (error) {
    console.error('[Supabase] Error updating mentor thread stats:', error);
  }
}

/**
 * Сохранить пару сообщений (user + assistant) для AI-наставника
 */
export async function saveMentorMessagePair(
  userId: string,
  userMessage: string,
  aiMessage: string,
  options?: {
    telegram_user_id?: string;
    telegram_message_id?: string;
    response_time_ms?: number;
    token_count?: number;
    model_used?: string;
    openai_message_id?: string;
    openai_run_id?: string;
  }
) {
  try {
    console.log(`[Supabase] Saving mentor message pair for user: ${userId}`);

    // Получаем или создаём thread
    const thread = await getOrCreateMentorThread(userId, options?.telegram_user_id);

    // Сохраняем сообщение пользователя
    const userMsg = await saveMentorMessage(thread.id, userId, 'user', userMessage, {
      telegram_message_id: options?.telegram_message_id,
    });

    // Сохраняем ответ AI
    const aiMsg = await saveMentorMessage(thread.id, userId, 'assistant', aiMessage, {
      response_time_ms: options?.response_time_ms,
      token_count: options?.token_count,
      model_used: options?.model_used,
      openai_message_id: options?.openai_message_id,
      openai_run_id: options?.openai_run_id,
    });

    console.log(`✅ Mentor message pair saved successfully`);

    return { userMsg, aiMsg, threadId: thread.id };
  } catch (error: any) {
    console.error('[Supabase] Error in saveMentorMessagePair:', error);
    throw new Error(`Failed to save mentor message pair: ${error.message}`);
  }
}

