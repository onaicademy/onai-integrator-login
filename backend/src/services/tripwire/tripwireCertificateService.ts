/**
 * Tripwire Certificate Service
 * Сервис для генерации и выдачи сертификатов
 * ИЗОЛИРОВАННЫЙ для Tripwire DB
 */

import { tripwireAdminSupabase as supabase } from '../../config/supabase-tripwire';

interface Certificate {
  id: string;
  user_id: string;
  certificate_url: string;
  issued_at: string;
  full_name: string;
}

/**
 * Проверить, завершил ли пользователь все 3 модуля Tripwire
 */
async function hasCompletedAllModules(userId: string): Promise<boolean> {
  try {
    console.log('🎓 [Tripwire CertificateService] Проверяем завершение модулей для:', userId);
    
    // Модули Tripwire: 16, 17, 18
    const tripwireModules = [16, 17, 18];
    
    // Получаем все уроки этих модулей
    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('id')
      .in('module_id', tripwireModules);
    
    if (lessonsError || !lessons || lessons.length === 0) {
      console.error('❌ [Tripwire CertificateService] Ошибка получения уроков:', lessonsError);
      return false;
    }
    
    const lessonIds = lessons.map(l => l.id);
    console.log('📚 [Tripwire CertificateService] Уроков в модулях:', lessonIds.length);
    
    // Проверяем прогресс пользователя по всем урокам
    const { data: progress, error: progressError } = await supabase
      .from('tripwire_progress')
      .select('lesson_id, is_completed')
      .eq('tripwire_user_id', userId)
      .in('lesson_id', lessonIds);
    
    if (progressError) {
      console.error('❌ [Tripwire CertificateService] Ошибка получения прогресса:', progressError);
      return false;
    }
    
    // Считаем завершенные уроки
    const completedLessons = progress?.filter(p => p.is_completed) || [];
    const allCompleted = completedLessons.length === lessonIds.length;
    
    console.log(`📊 [Tripwire CertificateService] Завершено ${completedLessons.length}/${lessonIds.length} уроков`);
    
    return allCompleted;
  } catch (error: any) {
    console.error('❌ [Tripwire CertificateService] Ошибка hasCompletedAllModules:', error);
    return false;
  }
}

/**
 * Выдать сертификат пользователю
 */
export async function issueCertificate(userId: string, fullName?: string): Promise<Certificate> {
  try {
    console.log('🎓 [Tripwire CertificateService] Запрос на выдачу сертификата для:', userId);
    
    // 1. Проверяем, не выдан ли уже сертификат
    const { data: existingCert, error: checkError } = await supabase
      .from('tripwire_certificates')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (existingCert) {
      console.log('✅ [Tripwire CertificateService] Сертификат уже выдан');
      return existingCert as Certificate;
    }
    
    // 2. Проверяем, завершил ли пользователь все модули
    const hasCompleted = await hasCompletedAllModules(userId);
    
    if (!hasCompleted) {
      throw new Error('User has not completed all modules');
    }
    
    // 3. Получаем имя пользователя
    let studentName = fullName;
    if (!studentName) {
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      studentName = userData?.user?.user_metadata?.full_name || userData?.user?.email || 'Tripwire Student';
    }
    
    // 4. Генерируем mock certificate URL (TODO: заменить на реальную генерацию PDF)
    const certificateUrl = `https://certificates.onai.academy/tripwire/${userId}.pdf`;
    
    // 5. Сохраняем сертификат в БД
    const { data: newCert, error: insertError } = await supabase
      .from('tripwire_certificates')
      .insert({
        user_id: userId,
        certificate_url: certificateUrl,
        full_name: studentName,
        issued_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ [Tripwire CertificateService] Ошибка выдачи сертификата:', insertError);
      throw new Error(`Failed to issue certificate: ${insertError.message}`);
    }
    
    // 6. Обновляем профиль пользователя
    await supabase
      .from('tripwire_user_profile')
      .update({ 
        certificate_issued: true,
        certificate_url: certificateUrl,
        modules_completed: 3,
        completion_percentage: 100
      })
      .eq('user_id', userId);
    
    console.log('✅ [Tripwire CertificateService] Сертификат выдан:', newCert.id);
    return newCert as Certificate;
  } catch (error: any) {
    console.error('❌ [Tripwire CertificateService] Ошибка:', error);
    throw error;
  }
}

/**
 * Получить сертификат пользователя
 */
export async function getUserCertificate(userId: string): Promise<Certificate | null> {
  try {
    console.log('🎓 [Tripwire CertificateService] Получаем сертификат для:', userId);
    
    const { data, error } = await supabase
      .from('tripwire_certificates')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // Certificate not found
        console.log('ℹ️ [Tripwire CertificateService] Сертификат не найден');
        return null;
      }
      console.error('❌ [Tripwire CertificateService] Ошибка:', error);
      throw new Error(`Failed to fetch certificate: ${error.message}`);
    }
    
    console.log('✅ [Tripwire CertificateService] Сертификат найден');
    return data as Certificate;
  } catch (error: any) {
    console.error('❌ [Tripwire CertificateService] Ошибка:', error);
    throw error;
  }
}

/**
 * Проверить, может ли пользователь получить сертификат
 */
export async function canIssueCertificate(userId: string): Promise<{ canIssue: boolean; reason?: string }> {
  try {
    console.log('🎓 [Tripwire CertificateService] Проверяем возможность выдачи сертификата для:', userId);
    
    // Проверяем, не выдан ли уже
    const existingCert = await getUserCertificate(userId);
    if (existingCert) {
      return { canIssue: false, reason: 'Certificate already issued' };
    }
    
    // Проверяем завершение модулей
    const hasCompleted = await hasCompletedAllModules(userId);
    if (!hasCompleted) {
      return { canIssue: false, reason: 'Not all modules completed' };
    }
    
    return { canIssue: true };
  } catch (error: any) {
    console.error('❌ [Tripwire CertificateService] Ошибка:', error);
    return { canIssue: false, reason: error.message };
  }
}

