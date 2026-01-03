#!/usr/bin/env tsx
/**
 * Верификация выданного сертификата
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const TRIPWIRE_SUPABASE_URL = process.env.TRIPWIRE_SUPABASE_URL || '';
const TRIPWIRE_SERVICE_ROLE_KEY = process.env.TRIPWIRE_SERVICE_ROLE_KEY || '';

const supabase = createClient(TRIPWIRE_SUPABASE_URL, TRIPWIRE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const STUDENT_USER_ID = 'e494b82e-c635-486e-bad5-28886b37bd6b';

async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ ВЕРИФИКАЦИЯ ВЫДАННОГО СЕРТИФИКАТА');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Проверка записи в таблице certificates
  console.log('1️⃣ Проверка таблицы certificates...\n');

  const { data: certificate, error: certError } = await supabase
    .from('certificates')
    .select('*')
    .eq('user_id', STUDENT_USER_ID)
    .single();

  if (certError) {
    console.error('❌ Ошибка:', certError.message);
    return;
  }

  if (!certificate) {
    console.error('❌ Сертификат НЕ НАЙДЕН!');
    return;
  }

  console.log('✅ Сертификат найден в базе данных:\n');
  console.log(`   ID: ${certificate.id}`);
  console.log(`   Certificate Number: ${certificate.certificate_number}`);
  console.log(`   Full Name: ${certificate.full_name}`);
  console.log(`   Issued At: ${certificate.issued_at}`);
  console.log(`   PDF URL: ${certificate.pdf_url}`);
  console.log('');

  // 2. Проверка профиля пользователя
  console.log('2️⃣ Проверка tripwire_user_profile...\n');

  const { data: profile, error: profileError } = await supabase
    .from('tripwire_user_profile')
    .select('certificate_issued, certificate_url, modules_completed, completion_percentage')
    .eq('user_id', STUDENT_USER_ID)
    .single();

  if (profileError) {
    console.error('❌ Ошибка:', profileError.message);
  } else {
    console.log('✅ Профиль обновлён:\n');
    console.log(`   Certificate Issued: ${profile.certificate_issued ? '✅ true' : '❌ false'}`);
    console.log(`   Certificate URL: ${profile.certificate_url || 'NOT SET'}`);
    console.log(`   Modules Completed: ${profile.modules_completed}/3`);
    console.log(`   Completion Percentage: ${profile.completion_percentage}%`);
    console.log('');
  }

  // 3. Проверка файла в Storage
  console.log('3️⃣ Проверка файла в Storage...\n');

  const fileName = certificate.pdf_url.split('/').pop();
  const storagePath = `${STUDENT_USER_ID}/${fileName}`;

  console.log(`   Путь к файлу: ${storagePath}\n`);

  const { data: fileData, error: fileError } = await supabase
    .storage
    .from('tripwire-certificates')
    .list(STUDENT_USER_ID);

  if (fileError) {
    console.error('❌ Ошибка проверки Storage:', fileError.message);
  } else if (fileData && fileData.length > 0) {
    console.log('✅ Файл найден в Storage:\n');
    fileData.forEach(file => {
      const sizeKB = ((file.metadata?.size || 0) / 1024).toFixed(2);
      console.log(`   - ${file.name}`);
      console.log(`     Размер: ${sizeKB} KB`);
      console.log(`     Создан: ${file.created_at}`);
    });
    console.log('');
  } else {
    console.log('⚠️ Файл НЕ НАЙДЕН в Storage\n');
  }

  // 4. Проверка доступности URL
  console.log('4️⃣ Проверка доступности PDF URL...\n');

  try {
    const response = await fetch(certificate.pdf_url, { method: 'HEAD' });

    if (response.ok) {
      const contentLength = response.headers.get('content-length');
      const contentType = response.headers.get('content-type');

      console.log('✅ PDF доступен по URL:\n');
      console.log(`   Status: ${response.status} ${response.statusText}`);
      console.log(`   Content-Type: ${contentType}`);
      console.log(`   Content-Length: ${contentLength ? `${(parseInt(contentLength) / 1024).toFixed(2)} KB` : 'Unknown'}`);
      console.log(`   URL: ${certificate.pdf_url}`);
      console.log('');
    } else {
      console.error(`❌ URL недоступен: ${response.status} ${response.statusText}\n`);
    }
  } catch (fetchError: any) {
    console.error('❌ Ошибка при проверке URL:', fetchError.message, '\n');
  }

  // 5. Итоговый статус
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 ИТОГОВЫЙ СТАТУС');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const checks = {
    'Запись в certificates': !!certificate,
    'Профиль обновлён (certificate_issued)': profile?.certificate_issued === true,
    'URL в профиле совпадает': profile?.certificate_url === certificate.pdf_url,
    'Модули завершены': profile?.modules_completed === 3,
    'Процент завершения': profile?.completion_percentage === 100
  };

  let allPassed = true;
  Object.entries(checks).forEach(([check, passed]) => {
    console.log(`   ${passed ? '✅' : '❌'} ${check}`);
    if (!passed) allPassed = false;
  });

  console.log('');
  if (allPassed) {
    console.log('✅ ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ! Сертификат успешно выдан.');
  } else {
    console.log('⚠️ Некоторые проверки не прошли. Требуется ручное вмешательство.');
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch(err => {
  console.error('💥 Ошибка:', err);
  process.exit(1);
});
