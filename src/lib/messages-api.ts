/**
 * API для работы с сообщениями между студентами
 * Создано: 7 ноября 2025
 */

import { supabase } from "./supabase";

// ========================
// ТИПЫ
// ========================

export interface Chat {
  id: string;
  user1_id: string;
  user2_id: string;
  last_message_at: string | null;
  last_message_text: string | null;
  last_message_from: string | null;
  unread_count_user1: number;
  unread_count_user2: number;
  created_at: string;
  updated_at: string;
  // Расширенные данные
  other_user?: {
    id: string;
    email: string;
    name: string;
    avatar?: string;
  };
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  message_type: 'text' | 'voice' | 'image' | 'file';
  content: string;
  attachment_url: string | null;
  attachment_type: string | null;
  attachment_name: string | null;
  attachment_size: number | null;
  is_read: boolean;
  read_at: string | null;
  is_edited: boolean;
  edited_at: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  reply_to_message_id: string | null;
  created_at: string;
  updated_at: string;
}

// ========================
// ЧАТЫ
// ========================

/**
 * Получить все чаты текущего пользователя
 */
export async function getMyChats(userId: string): Promise<Chat[]> {
  try {
    const { data, error } = await supabase
      .from('student_private_chats')
      .select(`
        *,
        user1:user1_id(id, email, raw_user_meta_data),
        user2:user2_id(id, email, raw_user_meta_data)
      `)
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error loading chats:', error);
      return [];
    }

    // Преобразуем данные, добавляя информацию о собеседнике
    return (data || []).map((chat: any) => {
      const isUser1 = chat.user1_id === userId;
      const otherUser = isUser1 ? chat.user2 : chat.user1;
      
      return {
        ...chat,
        other_user: {
          id: otherUser.id,
          email: otherUser.email,
          name: otherUser.raw_user_meta_data?.full_name || otherUser.email,
          avatar: otherUser.raw_user_meta_data?.avatar_url,
        },
      };
    });
  } catch (error) {
    console.error('Exception loading chats:', error);
    return [];
  }
}

/**
 * Создать или получить чат между двумя студентами
 */
export async function getOrCreateChat(user1Id: string, user2Id: string): Promise<Chat | null> {
  try {
    // Сначала ищем существующий чат
    const { data: existing, error: searchError } = await supabase
      .from('student_private_chats')
      .select('*')
      .or(
        `and(user1_id.eq.${user1Id},user2_id.eq.${user2Id}),and(user1_id.eq.${user2Id},user2_id.eq.${user1Id})`
      )
      .single();

    if (searchError && searchError.code !== 'PGRST116') {
      console.error('Error searching for chat:', searchError);
    }

    if (existing) {
      return existing;
    }

    // Создаём новый чат
    const { data: newChat, error: createError } = await supabase
      .from('student_private_chats')
      .insert({
        user1_id: user1Id,
        user2_id: user2Id,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating chat:', createError);
      return null;
    }

    return newChat;
  } catch (error) {
    console.error('Exception in getOrCreateChat:', error);
    return null;
  }
}

// ========================
// СООБЩЕНИЯ
// ========================

/**
 * Получить все сообщения конкретного чата
 */
export async function getChatMessages(chatId: string): Promise<Message[]> {
  try {
    const { data, error } = await supabase
      .from('student_private_messages')
      .select('*')
      .eq('chat_id', chatId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Exception loading messages:', error);
    return [];
  }
}

/**
 * Отправить текстовое сообщение
 */
export async function sendTextMessage(
  chatId: string,
  senderId: string,
  content: string
): Promise<Message | null> {
  try {
    const { data, error } = await supabase
      .from('student_private_messages')
      .insert({
        chat_id: chatId,
        sender_id: senderId,
        message_type: 'text',
        content: content,
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      return null;
    }

    // Обновляем last_message в чате
    await updateChatLastMessage(chatId, senderId, content);

    return data;
  } catch (error) {
    console.error('Exception sending message:', error);
    return null;
  }
}

/**
 * Загрузить голосовое сообщение
 */
export async function uploadVoiceMessage(
  chatId: string,
  senderId: string,
  audioBlob: Blob,
  duration: number
): Promise<Message | null> {
  try {
    // 1. Загружаем аудио в Storage
    const timestamp = Date.now();
    const fileName = `${senderId}/${timestamp}.webm`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('student-messages')
      .upload(fileName, audioBlob, {
        contentType: 'audio/webm',
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading voice:', uploadError);
      throw uploadError;
    }

    // 2. Получаем публичный URL
    const { data: urlData } = supabase.storage
      .from('student-messages')
      .getPublicUrl(fileName);

    if (!urlData.publicUrl) {
      throw new Error('Failed to get public URL for voice message');
    }

    // 3. Сохраняем сообщение в БД
    const contentText = `Голосовое сообщение (${duration} сек)`;
    
    const { data, error } = await supabase
      .from('student_private_messages')
      .insert({
        chat_id: chatId,
        sender_id: senderId,
        message_type: 'voice',
        content: contentText,
        attachment_url: urlData.publicUrl,
        attachment_type: 'audio/webm',
        attachment_size: audioBlob.size,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving voice message:', error);
      // Пытаемся удалить загруженный файл если сохранение не удалось
      await supabase.storage.from('student-messages').remove([fileName]);
      return null;
    }

    // Обновляем last_message в чате
    await updateChatLastMessage(chatId, senderId, '🎤 Голосовое сообщение');

    return data;
  } catch (error) {
    console.error('Exception uploading voice message:', error);
    return null;
  }
}

/**
 * Загрузить файл (изображение, документ)
 */
export async function uploadFileMessage(
  chatId: string,
  senderId: string,
  file: File,
  messageType: 'image' | 'file'
): Promise<Message | null> {
  try {
    // 1. Загружаем файл в Storage
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const fileName = `${senderId}/${timestamp}.${fileExt}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('student-messages')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      throw uploadError;
    }

    // 2. Получаем публичный URL
    const { data: urlData } = supabase.storage
      .from('student-messages')
      .getPublicUrl(fileName);

    if (!urlData.publicUrl) {
      throw new Error('Failed to get public URL for file');
    }

    // 3. Сохраняем сообщение в БД
    const contentText = messageType === 'image' 
      ? '📷 Изображение' 
      : `📎 ${file.name}`;
    
    const { data, error } = await supabase
      .from('student_private_messages')
      .insert({
        chat_id: chatId,
        sender_id: senderId,
        message_type: messageType,
        content: contentText,
        attachment_url: urlData.publicUrl,
        attachment_type: file.type,
        attachment_name: file.name,
        attachment_size: file.size,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving file message:', error);
      // Пытаемся удалить загруженный файл если сохранение не удалось
      await supabase.storage.from('student-messages').remove([fileName]);
      return null;
    }

    // Обновляем last_message в чате
    await updateChatLastMessage(chatId, senderId, contentText);

    return data;
  } catch (error) {
    console.error('Exception uploading file message:', error);
    return null;
  }
}

/**
 * Пометить сообщения как прочитанные
 */
export async function markMessagesAsRead(chatId: string, userId: string): Promise<void> {
  try {
    await supabase
      .from('student_private_messages')
      .update({ 
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('chat_id', chatId)
      .eq('is_read', false)
      .neq('sender_id', userId);

    // Обнуляем счётчик непрочитанных
    const { data: chat } = await supabase
      .from('student_private_chats')
      .select('user1_id, user2_id')
      .eq('id', chatId)
      .single();

    if (chat) {
      const isUser1 = chat.user1_id === userId;
      await supabase
        .from('student_private_chats')
        .update({
          [isUser1 ? 'unread_count_user1' : 'unread_count_user2']: 0,
        })
        .eq('id', chatId);
    }
  } catch (error) {
    console.error('Exception marking messages as read:', error);
  }
}

// ========================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ========================

/**
 * Обновить последнее сообщение в чате
 */
async function updateChatLastMessage(
  chatId: string,
  senderId: string,
  messageText: string
): Promise<void> {
  try {
    // Увеличиваем счётчик непрочитанных для получателя
    const { data: chat } = await supabase
      .from('student_private_chats')
      .select('user1_id, user2_id, unread_count_user1, unread_count_user2')
      .eq('id', chatId)
      .single();

    if (chat) {
      const isUser1Sender = chat.user1_id === senderId;
      const updates: any = {
        last_message_at: new Date().toISOString(),
        last_message_text: messageText,
        last_message_from: senderId,
        updated_at: new Date().toISOString(),
      };

      // Увеличиваем счётчик для получателя
      if (isUser1Sender) {
        updates.unread_count_user2 = (chat.unread_count_user2 || 0) + 1;
      } else {
        updates.unread_count_user1 = (chat.unread_count_user1 || 0) + 1;
      }

      await supabase
        .from('student_private_chats')
        .update(updates)
        .eq('id', chatId);
    }
  } catch (error) {
    console.error('Exception updating chat last message:', error);
  }
}

/**
 * Подписаться на новые сообщения в чате (real-time)
 */
export function subscribeToMessages(
  chatId: string,
  onNewMessage: (message: Message) => void
) {
  const channel = supabase
    .channel(`chat:${chatId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'student_private_messages',
        filter: `chat_id=eq.${chatId}`,
      },
      (payload) => {
        onNewMessage(payload.new as Message);
      }
    )
    .subscribe();

  return () => {
    channel.unsubscribe();
  };
}

/**
 * Получить список всех студентов (для начала нового чата)
 */
export async function getAllStudents(currentUserId: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, email')
      .neq('id', currentUserId)
      .order('full_name');

    if (error) {
      console.error('Error loading students:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Exception loading students:', error);
    return [];
  }
}

