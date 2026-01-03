#!/usr/bin/env tsx
/**
 * Финальная верификация всех выданных сертификатов
 *
 * Использование:
 *   npx tsx scripts/final-certificate-verification.ts
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

async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 ФИНАЛЬНАЯ ВЕРИФИКАЦИЯ СЕРТИФИКАТОВ');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Статистика по сертификатам
  console.log('1️⃣ Общая статистика по сертификатам\n');

  const { data: certificates, error: certError } = await supabase
    .from('certificates')
    .select('id, user_id, certificate_number, full_name, issued_at, pdf_url');

  if (certError) {
    console.error('❌ Ошибка:', certError.message);
    return;
  }

  console.log(`   📋 Всего выдано сертификатов: ${certificates?.length || 0}\n`);

  if (certificates && certificates.length > 0) {
    console.log('   Список сертификатов:');
    certificates.forEach((cert, index) => {
      const date = new Date(cert.issued_at).toLocaleString('ru-RU');
      console.log(`   ${index + 1}. ${cert.full_name}`);
      console.log(`      Номер: ${cert.certificate_number}`);
      console.log(`      Дата: ${date}`);
      console.log(`      URL: ${cert.pdf_url}`);
      console.log('');
    });
  }

  // 2. Проверка соответствия профилей
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('2️⃣ Проверка синхронизации профилей\n');

  const { data: profiles, error: profileError } = await supabase
    .from('tripwire_user_profile')
    .select('user_id, certificate_issued, certificate_url, modules_completed, completion_percentage')
    .eq('modules_completed', 3);

  if (profileError) {
    console.error('❌ Ошибка:', profileError.message);
    return;
  }

  const profilesWithCerts = profiles?.filter(p => p.certificate_issued) || [];
  const profilesWithoutCerts = profiles?.filter(p => !p.certificate_issued) || [];

  console.log(`   ✅ Профилей с сертификатом: ${profilesWithCerts.length}`);
  console.log(`   ❌ Профилей БЕЗ сертификата: ${profilesWithoutCerts.length}\n`);

  if (profilesWithoutCerts.length > 0) {
    console.log('   ⚠️ Студенты с 3/3 модулями БЕЗ сертификата:');
    for (const profile of profilesWithoutCerts) {
      const { data: user } = await supabase
        .from('tripwire_users')
        .select('email, full_name')
        .eq('user_id', profile.user_id)
        .maybeSingle();

      if (user) {
        console.log(`      - ${user.full_name} (${user.email})`);
      }
    }
    console.log('');
  }

  // 3. Проверка Storage
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('3️⃣ Проверка файлов в Storage\n');

  let totalFiles = 0;
  let totalSize = 0;

  if (certificates) {
    for (const cert of certificates) {
      const userIdPath = cert.user_id;
      const { data: files, error: filesError } = await supabase
        .storage
        .from('tripwire-certificates')
        .list(userIdPath);

      if (!filesError && files && files.length > 0) {
        totalFiles += files.length;
        files.forEach(file => {
          totalSize += file.metadata?.size || 0;
        });
      }
    }

    const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
    console.log(`   📦 Всего файлов в Storage: ${totalFiles}`);
    console.log(`   💾 Общий размер: ${totalSizeMB} MB\n`);
  }

  // 4. Проверка доступности URL
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('4️⃣ Проверка доступности PDF URL\n');

  let accessibleUrls = 0;
  let brokenUrls = 0;

  if (certificates) {
    for (const cert of certificates) {
      try {
        const response = await fetch(cert.pdf_url, { method: 'HEAD' });
        if (response.ok) {
          accessibleUrls++;
        } else {
          brokenUrls++;
          console.log(`   ❌ Недоступен: ${cert.certificate_number} (${response.status})`);
        }
      } catch (error) {
        brokenUrls++;
        console.log(`   ❌ Ошибка: ${cert.certificate_number}`);
      }
    }

    console.log(`   ✅ Доступных URL: ${accessibleUrls}`);
    console.log(`   ❌ Недоступных URL: ${brokenUrls}\n`);
  }

  // 5. SQL запросы для ручной проверки
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('5️⃣ SQL запросы для ручной проверки в Supabase\n');

  console.log('-- Все сертификаты с информацией о студентах');
  console.log(`SELECT
  c.id,
  c.certificate_number,
  c.full_name,
  c.issued_at,
  tu.email,
  tup.modules_completed,
  tup.completion_percentage,
  c.pdf_url
FROM certificates c
JOIN tripwire_users tu ON tu.user_id = c.user_id
JOIN tripwire_user_profile tup ON tup.user_id = c.user_id
ORDER BY c.issued_at DESC;`);

  console.log('\n\n-- Студенты с 3/3 модулями БЕЗ сертификата');
  console.log(`SELECT
  tup.user_id,
  tu.email,
  tu.full_name,
  tup.modules_completed,
  tup.certificate_issued
FROM tripwire_user_profile tup
JOIN tripwire_users tu ON tu.user_id = tup.user_id
WHERE tup.modules_completed = 3
  AND tup.certificate_issued = false;`);

  console.log('\n\n-- Проверка файлов в Storage');
  console.log(`SELECT
  name,
  id,
  created_at,
  (metadata->>'size')::bigint / 1024 as size_kb
FROM storage.objects
WHERE bucket_id = 'tripwire-certificates'
ORDER BY created_at DESC;`);

  console.log('\n');

  // 6. Итоговый статус
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 ИТОГОВЫЙ СТАТУС');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const allChecks = {
    'Сертификаты выданы': (certificates?.length || 0) > 0,
    'Профили синхронизированы': profilesWithoutCerts.length === 0,
    'Файлы в Storage': totalFiles === (certificates?.length || 0),
    'URL доступны': brokenUrls === 0,
  };

  let allPassed = true;
  Object.entries(allChecks).forEach(([check, passed]) => {
    console.log(`   ${passed ? '✅' : '❌'} ${check}`);
    if (!passed) allPassed = false;
  });

  console.log('');
  if (allPassed) {
    console.log('✅ ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ!');
    console.log('   Автоматическая выдача сертификатов работает корректно.\n');
  } else {
    console.log('⚠️ НАЙДЕНЫ ПРОБЛЕМЫ!');
    console.log('   Требуется дополнительная диагностика.\n');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch(err => {
  console.error('💥 Ошибка:', err);
  process.exit(1);
});
