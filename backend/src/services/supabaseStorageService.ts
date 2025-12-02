/**
 * Supabase Storage Service
 * Управление загрузкой файлов в Supabase Storage
 */

import { supabase } from '../config/supabase';

/**
 * Загрузить файл в Supabase Storage
 * 
 * @param userId - UUID пользователя
 * @param filename - Оригинальное имя файла
 * @param buffer - Buffer с содержимым файла
 * @param contentType - MIME type файла
 * @returns { path: string, url: string } - Path в Storage и Public URL
 */
export async function uploadToStorage(
  userId: string,
  filename: string,
  buffer: Buffer,
  contentType: string
): Promise<{ path: string; url: string }> {
  try {
    console.log('[StorageService] 📤 Загружаем файл в Storage:', {
      userId,
      filename,
      size: buffer.length,
      contentType,
    });

    // Создаём уникальный path: {userId}/{timestamp}-{filename}
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_'); // Убираем спецсимволы
    const filePath = `${userId}/${timestamp}-${sanitizedFilename}`;

    console.log('[StorageService] 📁 File path:', filePath);

    // Загружаем файл в bucket 'user-files'
    const { data, error } = await supabase.storage
      .from('user-files')
      .upload(filePath, buffer, {
        contentType: contentType,
        cacheControl: '3600', // Кэш на 1 час
        upsert: false,        // Не перезаписывать существующие файлы
      });

    if (error) {
      console.error('[StorageService] ❌ Ошибка загрузки в Storage:', error);
      throw new Error(`Failed to upload file to Storage: ${error.message}`);
    }

    console.log('[StorageService] ✅ Файл загружен:', data.path);

    // Получаем public URL
    // Т.к. bucket private, используем getPublicUrl (будет возвращать signed URL при необходимости)
    const { data: urlData } = supabase.storage
      .from('user-files')
      .getPublicUrl(filePath);

    console.log('[StorageService] 🔗 Public URL:', urlData.publicUrl);

    return {
      path: data.path,
      url: urlData.publicUrl,
    };
  } catch (error: any) {
    console.error('[StorageService] ❌ Критическая ошибка:', error);
    throw error;
  }
}

/**
 * Получить signed URL для приватного файла
 * 
 * @param filePath - Path файла в Storage
 * @param expiresIn - Время жизни URL в секундах (default: 3600 = 1 час)
 * @returns signedUrl - Подписанный URL
 */
export async function getSignedUrl(
  filePath: string,
  expiresIn: number = 3600
): Promise<string> {
  try {
    const { data, error } = await supabase.storage
      .from('user-files')
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      throw new Error(`Failed to create signed URL: ${error.message}`);
    }

    return data.signedUrl;
  } catch (error: any) {
    console.error('[StorageService] ❌ Ошибка создания signed URL:', error);
    throw error;
  }
}

/**
 * Удалить файл из Storage
 * 
 * @param filePath - Path файла в Storage
 */
export async function deleteFromStorage(filePath: string): Promise<void> {
  try {
    console.log('[StorageService] 🗑️ Удаляем файл:', filePath);

    const { error } = await supabase.storage
      .from('user-files')
      .remove([filePath]);

    if (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }

    console.log('[StorageService] ✅ Файл удалён');
  } catch (error: any) {
    console.error('[StorageService] ❌ Ошибка удаления:', error);
    throw error;
  }
}

/**
 * Проверить существует ли файл
 * 
 * @param filePath - Path файла в Storage
 * @returns boolean - true если файл существует
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.storage
      .from('user-files')
      .list(filePath.split('/')[0], {
        search: filePath.split('/')[1],
      });

    if (error) {
      return false;
    }

    return data.length > 0;
  } catch (error) {
    return false;
  }
}

