import { supabase } from '../config/supabase';

/**
 * Проверить завершён ли онбординг
 */
export async function checkOnboardingStatus(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('onboarding_completed')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[Onboarding] Ошибка проверки статуса:', error);
      return false;
    }

    return data?.onboarding_completed || false;
  } catch (error: any) {
    console.error('[Onboarding] Exception:', error.message);
    return false;
  }
}

/**
 * Сохранить ответы онбординга
 */
export async function saveOnboardingResponses(
  userId: string,
  responses: Record<string, any>
) {
  try {
    console.log('[Onboarding] Сохраняем ответы для user:', userId);

    // 1. Сохраняем ответы в таблицу
    const { error: insertError } = await supabase
      .from('user_onboarding_responses')
      .upsert({
        user_id: userId,
        responses: responses,
        completed_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (insertError) {
      throw new Error(`Failed to save responses: ${insertError.message}`);
    }

    console.log('[Onboarding] ✅ Ответы сохранены');

    // 2. Устанавливаем флаг onboarding_completed = true
    const { error: updateError } = await supabase
      .from('users')
      .update({ onboarding_completed: true })
      .eq('id', userId);

    if (updateError) {
      throw new Error(`Failed to update user: ${updateError.message}`);
    }

    console.log('[Onboarding] ✅ Флаг onboarding_completed установлен');

    return { success: true };
  } catch (error: any) {
    console.error('[Onboarding] ❌ Ошибка:', error.message);
    throw error;
  }
}

/**
 * Получить ответы онбординга пользователя (для аналитики)
 */
export async function getOnboardingResponses(userId: string) {
  try {
    const { data, error } = await supabase
      .from('user_onboarding_responses')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get responses: ${error.message}`);
    }

    return data;
  } catch (error: any) {
    console.error('[Onboarding] ❌ Ошибка получения ответов:', error.message);
    throw error;
  }
}

/**
 * Получить все ответы онбординга (только для админов)
 */
export async function getAllOnboardingResponses() {
  try {
    const { data, error } = await supabase
      .from('user_onboarding_responses')
      .select(`
        *,
        users:user_id (
          email,
          full_name,
          created_at
        )
      `)
      .order('completed_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get all responses: ${error.message}`);
    }

    return data;
  } catch (error: any) {
    console.error('[Onboarding] ❌ Ошибка получения всех ответов:', error.message);
    throw error;
  }
}

