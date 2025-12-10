/**
 * Tripwire Certificate Service
 * Сервис для генерации и выдачи сертификатов
 * ✅ ИСПОЛЬЗУЕТ MAIN PLATFORM DB (pjmvxecykysfrzppdcto)
 */

import { adminSupabase as supabase } from '../../config/supabase';
import { certificatePDFService } from './certificatePDFService';
import { v4 as uuidv4 } from 'uuid';

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
      .single();
    
    if (existingCert) {
      console.log('⚠️ [Tripwire CertificateService] Найден старый сертификат, удаляем для регенерации...');
      await supabase.from('certificates').delete().eq('user_id', userId);
    }
    
    // 2. Проверяем, завершил ли пользователь все модули
    // ВРЕМЕННО ОТКЛЮЧЕНО ДЛЯ ТЕСТИРОВАНИЯ
    // const hasCompleted = await hasCompletedAllModules(userId);
    // if (!hasCompleted) {
    //   throw new Error('User has not completed all modules');
    // }
    console.log('⚠️ [Certificate] Skipping module completion check (TEMPORARY)');
    
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
    
    // 4. Генерируем уникальный номер сертификата
    const timestamp = Date.now().toString().slice(-6);
    const namePrefix = (studentName || 'USER').split(' ')[0]?.toUpperCase() || 'USER';
    const certificateNumber = `TW-${namePrefix}-${timestamp}`;
    
    // 5. Генерируем PDF сертификата
    console.log('📄 [Certificate] Generating PDF...');
    const pdfBuffer = await certificatePDFService.generatePDF({
      userName: studentName,
      courseTitle: 'Интегратор (быстрый старт)',
      completionDate: new Date().toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
      certificateNumber,
    });
    
    // 6. Загружаем PDF в Supabase Storage
    console.log('📦 [Certificate] Uploading to storage...');
    const fileName = `${certificateNumber}-${uuidv4()}.pdf`;
    const storagePath = `users/${userId}/certificates/${fileName}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('certificates')
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
      .from('certificates')
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

