/**
 * Tripwire Course Completion Service
 * Проверяет завершение курса и обновляет статус пользователя
 */

import { adminSupabase } from '../config/supabase';

const TRIPWIRE_COURSE_ID = 13;
const REQUIRED_MODULES = 3;

/**
 * Проверяет завершил ли студент Tripwire курс (3 модуля)
 * Вызывается после завершения каждого урока
 */
export async function checkTripwireCompletion(userId: string): Promise<void> {
  try {
    console.log('🔍 [TripwireCompletion] Проверка завершения курса для user:', userId);

    // 1. Получаем все модули Tripwire курса
    const { data: modules, error: modulesError } = await adminSupabase
      .from('modules')
      .select('id')
      .eq('course_id', TRIPWIRE_COURSE_ID)
      .eq('is_archived', false)
      .order('order_index', { ascending: true });

    if (modulesError || !modules) {
      console.error('❌ [TripwireCompletion] Ошибка получения модулей:', modulesError);
      return;
    }

    console.log(`📚 [TripwireCompletion] Всего модулей в курсе: ${modules.length}`);

    if (modules.length !== REQUIRED_MODULES) {
      console.warn(`⚠️ [TripwireCompletion] Ожидалось ${REQUIRED_MODULES} модулей, найдено ${modules.length}`);
    }

    // 2. Для каждого модуля проверяем завершены ли ВСЕ уроки
    let completedModulesCount = 0;

    for (const module of modules) {
      const { data: lessons, error: lessonsError } = await adminSupabase
        .from('lessons')
        .select('id')
        .eq('module_id', module.id)
        .eq('is_archived', false);

      if (lessonsError || !lessons || lessons.length === 0) {
        console.log(`⏭️ [TripwireCompletion] Модуль ${module.id}: нет уроков или ошибка`);
        continue;
      }

      // Проверяем прогресс по всем урокам модуля
      const lessonIds = lessons.map(l => l.id);
      const { data: progress, error: progressError } = await adminSupabase
        .from('tripwire_progress')
        .select('lesson_id, is_completed')
        .eq('tripwire_user_id', userId)
        .in('lesson_id', lessonIds);

      if (progressError) {
        console.error(`❌ [TripwireCompletion] Ошибка получения прогресса для модуля ${module.id}:`, progressError);
        continue;
      }

      const completedLessons = progress?.filter(p => p.is_completed) || [];
      const allLessonsCompleted = completedLessons.length === lessons.length;

      console.log(`📖 [TripwireCompletion] Модуль ${module.id}: ${completedLessons.length}/${lessons.length} уроков завершено`);

      if (allLessonsCompleted) {
        completedModulesCount++;
      }
    }

    console.log(`✅ [TripwireCompletion] Завершено модулей: ${completedModulesCount}/${REQUIRED_MODULES}`);

    // 3. Если все 3 модуля завершены → обновляем статус
    if (completedModulesCount >= REQUIRED_MODULES) {
      console.log('🎉 [TripwireCompletion] Студент завершил весь курс! Обновляем статус...');

      const { error: updateError } = await adminSupabase
        .from('tripwire_users')
        .update({
          status: 'completed',
          modules_completed: REQUIRED_MODULES,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('❌ [TripwireCompletion] Ошибка обновления статуса:', updateError);
        return;
      }

      console.log('✅ [TripwireCompletion] Статус обновлен на "completed"');

      // 4. Логируем в sales_activity_log
      const { data: tripwireUser, error: userError } = await adminSupabase
        .from('tripwire_users')
        .select('granted_by, full_name, email')
        .eq('user_id', userId)
        .single();

      if (!userError && tripwireUser) {
        await adminSupabase.from('sales_activity_log').insert({
          manager_id: tripwireUser.granted_by,
          action_type: 'course_completed',
          target_user_id: userId,
          details: {
            full_name: tripwireUser.full_name,
            email: tripwireUser.email,
            completed_modules: REQUIRED_MODULES
          }
        });

        console.log('📝 [TripwireCompletion] Активность залогирована');
      }
    } else {
      console.log(`⏳ [TripwireCompletion] Курс еще не завершен (${completedModulesCount}/${REQUIRED_MODULES})`);
    }
  } catch (error: any) {
    console.error('❌ [TripwireCompletion] Неожиданная ошибка:', error);
  }
}

