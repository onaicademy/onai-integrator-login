/**
 * Tripwire Materials Service
 * Сервис для получения материалов к урокам (PDFs, links)
 * ИЗОЛИРОВАННЫЙ для Tripwire DB
 */

import { tripwireAdminSupabase as supabase } from '../../config/supabase-tripwire';

interface LessonMaterial {
  id: string;
  lesson_id: number;
  title: string;
  filename: string;
  file_url: string;
  file_type: string; // 'pdf', 'docx', 'link', etc.
  file_size_bytes: number | null;
  created_at: string;
}

/**
 * Получить все материалы для урока
 */
export async function getLessonMaterials(lessonId: number): Promise<LessonMaterial[]> {
  try {
    console.log('📚 [Tripwire MaterialsService] Получаем материалы для урока:', lessonId);

    const { data, error } = await supabase
      .from('lesson_materials')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('created_at', { ascending: true });

    if (error) {
      // ✅ GRACEFUL: Если таблица не существует - возвращаем пустой массив
      if (error.message?.includes('schema cache') || 
          error.code === 'PGRST205' || 
          error.message?.includes("Could not find the table")) {
        console.log('ℹ️ [Tripwire MaterialsService] Таблица lesson_materials не существует, возвращаем []');
        return [];
      }
      console.error('❌ [Tripwire MaterialsService] Ошибка:', error);
      throw new Error(`Failed to fetch materials: ${error.message}`);
    }

    console.log(`✅ [Tripwire MaterialsService] Найдено материалов: ${data?.length || 0}`);
    return (data || []) as LessonMaterial[];
  } catch (error: any) {
    console.error('❌ [Tripwire MaterialsService] Ошибка:', error);
    throw error;
  }
}

/**
 * Добавить материал к уроку (для админов)
 */
export async function addLessonMaterial(
  lessonId: number, 
  title: string, 
  filename: string,
  fileUrl: string,
  fileType: string,
  fileSizeBytes?: number
): Promise<LessonMaterial> {
  try {
    console.log('📚 [Tripwire MaterialsService] Добавляем материал для урока:', lessonId);

    const { data, error } = await supabase
      .from('lesson_materials')
      .insert({
        lesson_id: lessonId,
        title: title,
        filename: filename,
        file_url: fileUrl,
        file_type: fileType,
        file_size_bytes: fileSizeBytes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ [Tripwire MaterialsService] Ошибка добавления:', error);
      throw new Error(`Failed to add material: ${error.message}`);
    }

    console.log('✅ [Tripwire MaterialsService] Материал добавлен:', data.id);
    return data as LessonMaterial;
  } catch (error: any) {
    console.error('❌ [Tripwire MaterialsService] Ошибка:', error);
    throw error;
  }
}

/**
 * Удалить материал (для админов)
 */
export async function deleteLessonMaterial(materialId: string): Promise<void> {
  try {
    console.log('📚 [Tripwire MaterialsService] Удаляем материал:', materialId);

    const { error } = await supabase
      .from('lesson_materials')
      .delete()
      .eq('id', materialId);

    if (error) {
      console.error('❌ [Tripwire MaterialsService] Ошибка удаления:', error);
      throw new Error(`Failed to delete material: ${error.message}`);
    }

    console.log('✅ [Tripwire MaterialsService] Материал удалён');
  } catch (error: any) {
    console.error('❌ [Tripwire MaterialsService] Ошибка:', error);
    throw error;
  }
}

