/**
 * Tripwire Certificate Service
 * Сервис для генерации и выдачи сертификатов
 * ✅ ИСПОЛЬЗУЕТ TRIPWIRE DB (pjmvxecykysfrzppdcto)
 */

import { tripwireAdminSupabase as supabase } from '../../config/supabase-tripwire';
import { certificatePDFService } from './certificatePDFService';
import { v4 as uuidv4 } from 'uuid';

/**
 * Транслитерация кириллицы в латиницу для путей файлов
 */
function transliterate(text: string): string {
  const map: { [key: string]: string } = {
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'E',
    'Ж': 'ZH', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
    'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
    'Ф': 'F', 'Х': 'KH', 'Ц': 'TS', 'Ч': 'CH', 'Ш': 'SH', 'Щ': 'SHCH',
    'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'YU', 'Я': 'YA',
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
  };
  
  return text.split('').map(char => map[char] || char).join('');
}

interface Certificate {
  id: string;
  user_id: string;
  certificate_number: string;
  full_name: string;
  issued_at: string;
  pdf_url?: string;
  storage_path?: string;
  metadata?: any;
}

/**
 * Проверить, завершил ли пользователь все 3 модуля Tripwire
 */
async function hasCompletedAllModules(userId: string): Promise<boolean> {
  try {
    console.log('🎓 [Tripwire CertificateService] Проверяем завершение модулей для:', userId);
    
    // Модули Tripwire: 16, 17, 18
    const tripwireModules = [16, 17, 18];
    
    // 🔥 ВАЖНО: userId это auth.users.id, и tripwire_progress.tripwire_user_id тоже ссылается на auth.users.id!
    // Считаем сколько уникальных модулей завершено пользователем
    const { data: progress, error: progressError } = await supabase
      .from('tripwire_progress')
      .select('module_id, is_completed')
      .eq('tripwire_user_id', userId)
      .in('module_id', tripwireModules)
      .eq('is_completed', true);
    
    console.log('🔍 [DEBUG] Progress data:', progress);
    console.log('🔍 [DEBUG] Progress error:', progressError);
    
    if (progressError) {
      console.error('❌ [Tripwire CertificateService] Ошибка получения прогресса:', progressError);
      return false;
    }
    
    // Считаем уникальные завершенные модули
    const completedModuleIds = new Set(progress?.map(p => p.module_id) || []);
    const allCompleted = completedModuleIds.size === 3;
    
    console.log(`📊 [Tripwire CertificateService] Завершено ${completedModuleIds.size}/3 модулей:`, Array.from(completedModuleIds));
    console.log(`🔍 [DEBUG] allCompleted = ${allCompleted}`);
    
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
    // ВРЕМЕННО ОТКЛЮЧЕНО - ВСЕГДА ГЕНЕРИРУЕМ НОВЫЙ ДЛЯ ТЕСТИРОВАНИЯ
    const { data: existingCert, error: checkError } = await supabase
      .from('certificates')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(); // ✅ Возвращает null если сертификата нет
    
    if (existingCert) {
      console.log('⚠️ [Tripwire CertificateService] Найден старый сертификат, удаляем для регенерации...');
      await supabase.from('certificates').delete().eq('user_id', userId);
    }
    
    // 2. Проверяем, завершил ли пользователь все модули
    const hasCompleted = await hasCompletedAllModules(userId);
    if (!hasCompleted) {
      console.log('⚠️ [Certificate] User has not completed all modules yet');
      throw new Error('User has not completed all modules');
    }
    console.log('✅ [Certificate] User has completed all modules!');
    
    // 3. Получаем имя пользователя
    let studentName = fullName || 'Tripwire Student';
    if (!fullName) {
      const { data: tripwireUser } = await supabase
        .from('tripwire_users')
        .select('full_name')
        .eq('user_id', userId)
        .single();
      
      studentName = tripwireUser?.full_name || 'Tripwire Student';
    }
    
    // 4. Генерируем уникальный номер сертификата (ASCII-safe!)
    const timestamp = Date.now().toString().slice(-6);
    // 🔥 FIX: Используем userId вместо имени (избегаем кириллицу в filename)
    const userIdShort = userId.slice(0, 8).toUpperCase(); // Первые 8 символов UUID
    const certificateNumber = `TW-USER-${userIdShort}-${timestamp}`;
    
    // 5. Генерируем PDF сертификата
    console.log('📄 [Certificate] Generating PDF...');
    const pdfBuffer = await certificatePDFService.generatePDF({
      userName: studentName,
      courseTitle: '"Интегратор 3.0 Экспресс-курс"',
      completionDate: new Date().toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
      certificateNumber,
    });
    
    // 6. Загружаем PDF в Supabase Storage
    console.log('📦 [Certificate] Uploading to storage...');
    // ✅ CRITICAL FIX: Используем только UUID в имени файла (БЕЗ certificateNumber с кириллицей)
    const fileId = uuidv4();
    const fileName = `cert-${fileId}.pdf`;
    const storagePath = `${userId}/${fileName}`; // ✅ Упрощенный путь БЕЗ вложенных папок
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('tripwire-certificates')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: true, // Перезаписываем если существует
      });
    
    if (uploadError) {
      console.error('❌ [Certificate] Storage upload failed:', uploadError);
      throw new Error(`Failed to upload certificate to storage: ${uploadError.message}`);
    }
    
    console.log('✅ [Certificate] Uploaded to storage:', uploadData?.path);
    
    // 7. Получаем публичную ссылку
    const { data: urlData } = supabase.storage
      .from('tripwire-certificates')
      .getPublicUrl(storagePath);
    
    if (!urlData?.publicUrl) {
      throw new Error('Failed to get public URL for certificate');
    }
    
    const certificateUrl = urlData.publicUrl;
    console.log('🔗 [Certificate] Public URL:', certificateUrl);
    
    // 8. Сохраняем сертификат в БД
    const { data: newCert, error: insertError } = await supabase
      .from('certificates')
      .insert({
        user_id: userId,
        certificate_number: certificateNumber,
        full_name: studentName,
        pdf_url: certificateUrl,
        issued_at: new Date().toISOString(),
        metadata: { storage_path: storagePath },
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ [Tripwire CertificateService] Ошибка выдачи сертификата:', insertError);
      throw new Error(`Failed to issue certificate: ${insertError.message}`);
    }
    
    // 9. Обновляем профиль пользователя
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
      .from('certificates')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(); // ✅ Возвращает null если сертификата нет
    
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

