/**
 * Скрипт для сброса админ-аккаунта Tripwire
 * Email: smmmcwin@gmail.com
 * 
 * Что делает:
 * 1. Удаляет существующий сертификат
 * 2. Удаляет файл сертификата из Storage
 * 3. Устанавливает прогресс: все 3 модуля завершены
 * 4. Обновляет профиль: certificate_issued = false
 */

import { tripwireAdminSupabase } from '../src/config/supabase-tripwire';

const ADMIN_EMAIL = 'smmmcwin@gmail.com';

async function resetAdminAccount() {
  try {
    console.log('🔧 Сброс админ-аккаунта Tripwire:', ADMIN_EMAIL);
    
    // 1. Найти user_id по email
    const { data: tripwireUser, error: userError } = await tripwireAdminSupabase
      .from('tripwire_users')
      .select('id, user_id, email, full_name')
      .eq('email', ADMIN_EMAIL)
      .single();
    
    if (userError || !tripwireUser) {
      throw new Error(`User not found: ${ADMIN_EMAIL}`);
    }
    
    const userId = tripwireUser.user_id; // users.id (main user ID)
    const tripwireUserId = tripwireUser.id; // tripwire_users.id
    
    console.log('✅ User found:', { userId, tripwireUserId, email: ADMIN_EMAIL });
    
    // 2. Удалить сертификат из БД
    const { data: oldCert } = await tripwireAdminSupabase
      .from('certificates')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (oldCert) {
      console.log('🗑️ Deleting old certificate:', oldCert.id);
      
      // Удалить файл из Storage
      if (oldCert.metadata?.storage_path) {
        await tripwireAdminSupabase.storage
          .from('tripwire-certificates')
          .remove([oldCert.metadata.storage_path]);
        console.log('✅ Certificate file deleted from storage');
      }
      
      // Удалить запись из БД
      await tripwireAdminSupabase
        .from('certificates')
        .delete()
        .eq('user_id', userId);
      console.log('✅ Certificate record deleted from DB');
    } else {
      console.log('ℹ️ No existing certificate found');
    }
    
    // 3. Установить прогресс: все 3 модуля завершены
    console.log('📊 Setting progress: all 3 modules completed...');
    
    // Модули Tripwire: 16, 17, 18
    // Уроки: 67, 68, 69 (по одному на модуль)
    const progressData = [
      { module_id: 16, lesson_id: 67 },
      { module_id: 17, lesson_id: 68 },
      { module_id: 18, lesson_id: 69 },
    ];
    
    for (const { module_id, lesson_id } of progressData) {
      await tripwireAdminSupabase
        .from('tripwire_progress')
        .upsert({
          tripwire_user_id: userId, // CRITICAL: uses users.id
          module_id,
          lesson_id,
          is_completed: true,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'tripwire_user_id,lesson_id'
        });
      
      console.log(`✅ Progress set: Module ${module_id}, Lesson ${lesson_id}`);
    }
    
    // 4. Обновить профиль
    await tripwireAdminSupabase
      .from('tripwire_user_profile')
      .upsert({
        user_id: userId,
        modules_completed: 3,
        total_modules: 3,
        completion_percentage: 100,
        certificate_issued: false, // Reset to allow re-generation
        certificate_url: null,
      }, {
        onConflict: 'user_id'
      });
    
    console.log('✅ Profile updated: 3/3 modules, certificate_issued = false');
    
    console.log('\n✅ ADMIN ACCOUNT RESET COMPLETE!');
    console.log('📌 Next steps:');
    console.log('1. Login as admin: smmmcwin@gmail.com');
    console.log('2. Go to /integrator/profile');
    console.log('3. Click "Получить сертификат"');
    console.log('4. Test certificate generation');
    
  } catch (error) {
    console.error('❌ Error resetting admin account:', error);
    process.exit(1);
  }
}

resetAdminAccount();
