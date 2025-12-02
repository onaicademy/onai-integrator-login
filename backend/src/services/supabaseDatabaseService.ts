/**
 * Supabase Database Service
 * Управление metadata файлов в таблице file_uploads
 */

import { supabase } from '../config/supabase';

interface FileMetadata {
  userId: string;
  threadId?: string;
  filename: string;
  filePath: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  extractedText?: string;
  processingStatus: 'pending' | 'completed' | 'failed';
  errorMessage?: string;
}

/**
 * Сохранить metadata файла в БД
 * 
 * @param metadata - Metadata файла
 * @returns Созданная запись из БД
 */
export async function saveFileMetadata(metadata: FileMetadata) {
  try {
    console.log('[DatabaseService] 💾 Сохраняем metadata в БД:', {
      userId: metadata.userId,
      filename: metadata.filename,
      status: metadata.processingStatus,
    });

    const { data, error } = await supabase
      .from('file_uploads')
      .insert([{
        user_id: metadata.userId,
        thread_id: metadata.threadId || null,
        filename: metadata.filename,
        file_path: metadata.filePath,
        file_url: metadata.fileUrl,
        file_size: metadata.fileSize,
        file_type: metadata.fileType,
        extracted_text: metadata.extractedText || null,
        processing_status: metadata.processingStatus,
        error_message: metadata.errorMessage || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) {
      console.error('[DatabaseService] ❌ Ошибка сохранения metadata:', error);
      throw new Error(`Failed to save file metadata: ${error.message}`);
    }

    console.log('[DatabaseService] ✅ Metadata сохранена, ID:', data.id);
    return data;
  } catch (error: any) {
    console.error('[DatabaseService] ❌ Критическая ошибка:', error);
    throw error;
  }
}

/**
 * Получить файлы пользователя
 * 
 * @param userId - UUID пользователя
 * @param limit - Максимальное количество записей (default: 50)
 * @returns Массив файлов
 */
export async function getUserFiles(userId: string, limit: number = 50) {
  try {
    const { data, error } = await supabase
      .from('file_uploads')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get user files: ${error.message}`);
    }

    return data;
  } catch (error: any) {
    console.error('[DatabaseService] ❌ Ошибка получения файлов:', error);
    throw error;
  }
}

/**
 * Получить файлы по thread_id
 * 
 * @param threadId - OpenAI thread ID
 * @returns Массив файлов
 */
export async function getThreadFiles(threadId: string) {
  try {
    const { data, error } = await supabase
      .from('file_uploads')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get thread files: ${error.message}`);
    }

    return data;
  } catch (error: any) {
    console.error('[DatabaseService] ❌ Ошибка получения файлов thread:', error);
    throw error;
  }
}

/**
 * Обновить статус обработки файла
 * 
 * @param fileId - ID записи в file_uploads
 * @param status - Новый статус
 * @param errorMessage - Сообщение об ошибке (опционально)
 */
export async function updateFileStatus(
  fileId: number,
  status: 'pending' | 'completed' | 'failed',
  errorMessage?: string
) {
  try {
    const { error } = await supabase
      .from('file_uploads')
      .update({
        processing_status: status,
        error_message: errorMessage || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', fileId);

    if (error) {
      throw new Error(`Failed to update file status: ${error.message}`);
    }

    console.log('[DatabaseService] ✅ Статус обновлён:', { fileId, status });
  } catch (error: any) {
    console.error('[DatabaseService] ❌ Ошибка обновления статуса:', error);
    throw error;
  }
}

/**
 * Удалить запись о файле из БД
 * 
 * @param fileId - ID записи в file_uploads
 */
export async function deleteFileMetadata(fileId: number) {
  try {
    const { error } = await supabase
      .from('file_uploads')
      .delete()
      .eq('id', fileId);

    if (error) {
      throw new Error(`Failed to delete file metadata: ${error.message}`);
    }

    console.log('[DatabaseService] ✅ Metadata удалена:', fileId);
  } catch (error: any) {
    console.error('[DatabaseService] ❌ Ошибка удаления metadata:', error);
    throw error;
  }
}

/**
 * Получить статистику по файлам пользователя
 * 
 * @param userId - UUID пользователя
 * @returns Статистика
 */
export async function getUserFileStats(userId: string) {
  try {
    const { data, error } = await supabase
      .from('file_uploads')
      .select('file_size, file_type, processing_status')
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to get file stats: ${error.message}`);
    }

    const stats = {
      totalFiles: data.length,
      totalSize: data.reduce((sum, file) => sum + file.file_size, 0),
      byType: {} as Record<string, number>,
      byStatus: {
        completed: data.filter(f => f.processing_status === 'completed').length,
        failed: data.filter(f => f.processing_status === 'failed').length,
        pending: data.filter(f => f.processing_status === 'pending').length,
      },
    };

    // Группировка по типам
    data.forEach(file => {
      const type = file.file_type.split('/')[0]; // 'application', 'image', etc.
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    });

    return stats;
  } catch (error: any) {
    console.error('[DatabaseService] ❌ Ошибка получения статистики:', error);
    throw error;
  }
}

