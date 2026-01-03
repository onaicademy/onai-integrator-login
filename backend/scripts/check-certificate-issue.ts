#!/usr/bin/env tsx
/**
 * Проверка и выдача сертификата студенту Tripwire
 *
 * Использование:
 *   tsx scripts/check-certificate-issue.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Загружаем .env из корня проекта
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const TRIPWIRE_SUPABASE_URL = process.env.TRIPWIRE_SUPABASE_URL || '';
const TRIPWIRE_SERVICE_ROLE_KEY = process.env.TRIPWIRE_SERVICE_ROLE_KEY || '';

if (!TRIPWIRE_SUPABASE_URL || !TRIPWIRE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Tripwire Supabase credentials');
  console.error('   TRIPWIRE_SUPABASE_URL:', TRIPWIRE_SUPABASE_URL ? '✅ Set' : '❌ Missing');
  console.error('   TRIPWIRE_SERVICE_ROLE_KEY:', TRIPWIRE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing');
  process.exit(1);
}

// Создаём клиент с Service Role (обходит RLS)
const supabase = createClient(TRIPWIRE_SUPABASE_URL, TRIPWIRE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const STUDENT_EMAIL = 'palonin348@roratu.com';
const STUDENT_USER_ID = 'e494b82e-c635-486e-bad5-28886b37bd6b';

async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 ПРОВЕРКА СТАТУСА СЕРТИФИКАТА TRIPWIRE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`👤 Студент: ${STUDENT_EMAIL}`);
  console.log(`🆔 User ID: ${STUDENT_USER_ID}\n`);

  // ============================================
  // STEP 1: Проверяем прогресс студента
  // ============================================
  console.log('━━━ STEP 1: Проверка прогресса студента ━━━');

  const { data: userData, error: userError } = await supabase
    .from('tripwire_users')
    .select('user_id, email, full_name')
    .eq('email', STUDENT_EMAIL)
    .single();

  if (userError || !userData) {
    console.error('❌ Студент не найден:', userError?.message);
    process.exit(1);
  }

  console.log(`✅ Студент найден: ${userData.full_name}`);
  console.log(`   Email: ${userData.email}`);
  console.log(`   User ID: ${userData.user_id}\n`);

  // Проверяем прогресс по модулям
  const { data: progressData, error: progressError } = await supabase
    .from('tripwire_progress')
    .select('module_id, lesson_id, is_completed')
    .eq('tripwire_user_id', userData.user_id);

  if (progressError) {
    console.error('❌ Ошибка получения прогресса:', progressError.message);
  }

  // Подсчитываем завершённые модули
  const moduleProgress = {
    16: { lessons: [67], completed: 0 },      // Module 1
    17: { lessons: [68], completed: 0 },      // Module 2
    18: { lessons: [69], completed: 0 }       // Module 3
  };

  progressData?.forEach(p => {
    if (p.is_completed && moduleProgress[p.module_id as 16 | 17 | 18]) {
      moduleProgress[p.module_id as 16 | 17 | 18].completed++;
    }
  });

  console.log('📊 Прогресс по модулям:');
  let completedModulesCount = 0;
  Object.entries(moduleProgress).forEach(([moduleId, data]) => {
    const isComplete = data.completed >= data.lessons.length;
    if (isComplete) completedModulesCount++;
    console.log(`   Module ${moduleId}: ${data.completed}/${data.lessons.length} уроков ${isComplete ? '✅ ЗАВЕРШЁН' : '⏳'}`);
  });

  console.log(`\n   ИТОГО: ${completedModulesCount}/3 модулей завершено\n`);

  // Проверяем профиль
  const { data: profileData, error: profileError } = await supabase
    .from('tripwire_user_profile')
    .select('certificate_issued, certificate_url, modules_completed, completion_percentage')
    .eq('user_id', userData.user_id)
    .single();

  if (profileError) {
    console.error('⚠️ Профиль не найден:', profileError.message);
  } else {
    console.log('📋 Статус профиля:');
    console.log(`   Модулей завершено: ${profileData.modules_completed}/3`);
    console.log(`   Процент завершения: ${profileData.completion_percentage}%`);
    console.log(`   Сертификат выдан: ${profileData.certificate_issued ? '✅ ДА' : '❌ НЕТ'}`);
    if (profileData.certificate_url) {
      console.log(`   URL сертификата: ${profileData.certificate_url}`);
    }
    console.log('');
  }

  // ============================================
  // STEP 2: Проверяем существующий сертификат
  // ============================================
  console.log('━━━ STEP 2: Проверка существующего сертификата ━━━');

  const { data: existingCert, error: certError } = await supabase
    .from('certificates')
    .select('id, certificate_number, full_name, issued_at, pdf_url')
    .eq('user_id', userData.user_id)
    .maybeSingle();

  if (existingCert) {
    console.log('✅ Сертификат НАЙДЕН в базе данных:');
    console.log(`   ID: ${existingCert.id}`);
    console.log(`   Номер: ${existingCert.certificate_number}`);
    console.log(`   Студент: ${existingCert.full_name}`);
    console.log(`   Дата выдачи: ${existingCert.issued_at}`);
    console.log(`   URL: ${existingCert.pdf_url}\n`);
  } else {
    console.log('❌ Сертификат НЕ НАЙДЕН в таблице certificates\n');
  }

  // ============================================
  // STEP 3: Проверяем PDF в Storage
  // ============================================
  console.log('━━━ STEP 3: Проверка PDF в Storage ━━━');

  const { data: storageFiles, error: storageError } = await supabase
    .storage
    .from('tripwire-certificates')
    .list('', {
      search: userData.user_id.substring(0, 8) // Ищем по началу UUID
    });

  if (storageError) {
    console.error('⚠️ Ошибка проверки Storage:', storageError.message);
  } else if (storageFiles && storageFiles.length > 0) {
    console.log(`✅ Найдено ${storageFiles.length} файл(ов) в Storage:`);
    storageFiles.forEach(file => {
      console.log(`   - ${file.name} (${(file.metadata?.size || 0 / 1024).toFixed(2)} KB, ${file.created_at})`);
    });
    console.log('');
  } else {
    console.log('❌ PDF файлы НЕ НАЙДЕНЫ в Storage\n');
  }

  // ============================================
  // STEP 4: Решение - выдать сертификат?
  // ============================================
  console.log('━━━ STEP 4: Анализ и решение ━━━');

  const shouldIssueCertificate = (
    completedModulesCount === 3 &&
    !existingCert
  );

  if (shouldIssueCertificate) {
    console.log('🎓 РЕШЕНИЕ: Необходимо выдать сертификат!');
    console.log('   ✅ Все 3 модуля завершены');
    console.log('   ❌ Сертификат не выдан\n');

    console.log('🔄 Вызываем сервис выдачи сертификата...\n');

    try {
      // Динамический импорт сервиса
      const { issueCertificate } = await import('../src/services/tripwire/tripwireCertificateService');

      const certificate = await issueCertificate(userData.user_id);

      console.log('\n✅ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ СЕРТИФИКАТ УСПЕШНО ВЫДАН!');
      console.log('✅ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      console.log(`📋 Номер сертификата: ${certificate.certificate_number}`);
      console.log(`👤 Студент: ${certificate.full_name}`);
      console.log(`📅 Дата выдачи: ${certificate.issued_at}`);
      console.log(`🔗 URL: ${certificate.pdf_url}\n`);

      // Проверяем что профиль обновился
      const { data: updatedProfile } = await supabase
        .from('tripwire_user_profile')
        .select('certificate_issued, certificate_url')
        .eq('user_id', userData.user_id)
        .single();

      if (updatedProfile?.certificate_issued) {
        console.log('✅ Профиль обновлён: certificate_issued = true');
      } else {
        console.log('⚠️ Профиль НЕ обновился! Требуется ручное обновление');
      }

    } catch (issueError: any) {
      console.error('\n❌ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ ОШИБКА ПРИ ВЫДАЧЕ СЕРТИФИКАТА!');
      console.error('❌ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.error(`Сообщение: ${issueError.message}`);
      console.error(`Stack: ${issueError.stack}`);
      process.exit(1);
    }

  } else if (existingCert) {
    console.log('✅ РЕШЕНИЕ: Сертификат уже выдан');
    console.log(`   Номер: ${existingCert.certificate_number}`);
    console.log(`   URL: ${existingCert.pdf_url}\n`);
  } else {
    console.log('⏳ РЕШЕНИЕ: Сертификат пока не может быть выдан');
    console.log(`   Завершено модулей: ${completedModulesCount}/3`);
    console.log('   Студент должен завершить все модули\n');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ ПРОВЕРКА ЗАВЕРШЕНА');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch(err => {
  console.error('💥 Необработанная ошибка:', err);
  process.exit(1);
});
