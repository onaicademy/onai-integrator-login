import { supabase } from '../config/supabase';

/**
 * Запускает очистку файлов старше 7 дней (вручную)
 * Вызывает SQL функцию cleanup_old_files_with_logging()
 */
export async function runManualCleanup() {
  try {
    console.log('[FileCleanup] 🗑️ Запускаем ручную очистку файлов...');

    // Вызываем SQL функцию напрямую
    const { data, error } = await supabase.rpc('cleanup_old_files_with_logging');

    if (error) {
      console.error('[FileCleanup] ❌ Ошибка очистки:', error);
      throw new Error(`Cleanup failed: ${error.message}`);
    }

    console.log('[FileCleanup] ✅ Очистка завершена');
    return { success: true, message: 'Cleanup completed successfully' };
  } catch (error: any) {
    console.error('[FileCleanup] ❌ Критическая ошибка:', error);
    throw error;
  }
}

/**
 * Получает статистику по файлам для очистки
 */
export async function getCleanupStats() {
  try {
    console.log('[FileCleanup] 📊 Получаем статистику файлов...');

    // Файлы старше 7 дней (будут удалены)
    const { data: oldFiles, error: oldError } = await supabase
      .from('file_uploads')
      .select('id, file_size')
      .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (oldError) {
      throw new Error(`Failed to get old files: ${oldError.message}`);
    }

    // Все файлы
    const { count: totalCount, error: totalError } = await supabase
      .from('file_uploads')
      .select('*', { count: 'exact', head: true });

    if (totalError) {
      throw new Error(`Failed to get total count: ${totalError.message}`);
    }

    const oldFilesCount = oldFiles?.length || 0;
    const oldFilesSize = oldFiles?.reduce((sum, f) => sum + (f.file_size || 0), 0) || 0;
    const oldFilesSizeMB = Math.round(oldFilesSize / 1024 / 1024 * 100) / 100;

    console.log('[FileCleanup] ✅ Статистика получена:', {
      total: totalCount,
      toDelete: oldFilesCount,
      sizeToDeleteMB: oldFilesSizeMB,
    });

    return {
      totalFiles: totalCount || 0,
      filesToDelete: oldFilesCount,
      sizeToDeleteMB: oldFilesSizeMB,
    };
  } catch (error: any) {
    console.error('[FileCleanup] ❌ Ошибка получения статистики:', error);
    throw error;
  }
}

/**
 * Получает историю выполнения очисток
 */
export async function getCleanupHistory(limit: number = 20) {
  try {
    console.log('[FileCleanup] 📜 Получаем историю очисток...');

    const { data, error } = await supabase
      .from('file_cleanup_logs')
      .select('*')
      .order('executed_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get cleanup history: ${error.message}`);
    }

    console.log(`[FileCleanup] ✅ Получено ${data?.length || 0} записей истории`);
    return data || [];
  } catch (error: any) {
    console.error('[FileCleanup] ❌ Ошибка получения истории:', error);
    throw error;
  }
}


