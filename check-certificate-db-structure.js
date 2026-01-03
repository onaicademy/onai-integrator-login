#!/usr/bin/env node
/**
 * 📋 ПРОВЕРКА СТРУКТУРЫ БД ДЛЯ ГЕНЕРАЦИИ СЕРТИФИКАТОВ TRIPWIRE
 *
 * Проверяет:
 * 1. Таблицу certificates
 * 2. Таблицу tripwire_progress
 * 3. Таблицу tripwire_user_profile
 * 4. Storage bucket "tripwire-certificates"
 * 5. Прогресс студента palonin348@roratu.com
 * 6. RLS policies
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

const TRIPWIRE_SUPABASE_URL = process.env.TRIPWIRE_SUPABASE_URL;
const TRIPWIRE_SERVICE_ROLE_KEY = process.env.TRIPWIRE_SERVICE_ROLE_KEY;

if (!TRIPWIRE_SUPABASE_URL || !TRIPWIRE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Tripwire Supabase credentials!');
  console.error('   TRIPWIRE_SUPABASE_URL:', TRIPWIRE_SUPABASE_URL ? '✅' : '❌');
  console.error('   TRIPWIRE_SERVICE_ROLE_KEY:', TRIPWIRE_SERVICE_ROLE_KEY ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(TRIPWIRE_SUPABASE_URL, TRIPWIRE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('\n╔═══════════════════════════════════════════════════════════════╗');
console.log('║  ПРОВЕРКА СТРУКТУРЫ БД ДЛЯ ГЕНЕРАЦИИ СЕРТИФИКАТОВ TRIPWIRE    ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

console.log('📍 URL:', TRIPWIRE_SUPABASE_URL);
console.log('🔑 Service Role Key:', '***' + TRIPWIRE_SERVICE_ROLE_KEY.slice(-8));
console.log('');

// ═══════════════════════════════════════════════════════════════
// 1. ПРОВЕРКА ТАБЛИЦЫ CERTIFICATES
// ═══════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════');
console.log('1️⃣  ПРОВЕРКА ТАБЛИЦЫ CERTIFICATES');
console.log('═══════════════════════════════════════════════════════════════\n');

try {
  const { data: columns, error } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type, is_nullable')
    .eq('table_name', 'certificates')
    .order('ordinal_position');

  if (error) {
    console.error('❌ Ошибка при получении структуры таблицы certificates:', error.message);
  } else if (!columns || columns.length === 0) {
    console.error('❌ Таблица certificates НЕ СУЩЕСТВУЕТ!');
  } else {
    console.log('✅ Таблица certificates существует\n');
    console.log('Столбцы:');
    console.table(columns);
  }
} catch (err) {
  console.error('❌ Исключение при проверке таблицы certificates:', err.message);
}

// ═══════════════════════════════════════════════════════════════
// 2. ПРОВЕРКА СУЩЕСТВУЮЩИХ СЕРТИФИКАТОВ
// ═══════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('2️⃣  ПРОВЕРКА СУЩЕСТВУЮЩИХ СЕРТИФИКАТОВ');
console.log('═══════════════════════════════════════════════════════════════\n');

try {
  const { data: certs, error, count } = await supabase
    .from('certificates')
    .select('id, user_id, certificate_number, full_name, issued_at, pdf_url', { count: 'exact' })
    .limit(5);

  if (error) {
    console.error('❌ Ошибка при получении сертификатов:', error.message);
  } else {
    console.log(`✅ Всего сертификатов в БД: ${count || 0}`);

    if (certs && certs.length > 0) {
      console.log('\nПримеры сертификатов (первые 5):');
      console.table(certs.map(c => ({
        certificate_number: c.certificate_number,
        full_name: c.full_name,
        issued_at: c.issued_at ? new Date(c.issued_at).toLocaleString('ru-RU') : 'N/A',
        has_pdf: c.pdf_url ? '✅' : '❌'
      })));
    } else {
      console.log('\n⚠️  Сертификаты в БД отсутствуют');
    }
  }
} catch (err) {
  console.error('❌ Исключение при проверке сертификатов:', err.message);
}

// ═══════════════════════════════════════════════════════════════
// 3. ПРОВЕРКА ПРОГРЕССА СТУДЕНТА palonin348@roratu.com
// ═══════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('3️⃣  ПРОВЕРКА ПРОГРЕССА СТУДЕНТА palonin348@roratu.com');
console.log('═══════════════════════════════════════════════════════════════\n');

try {
  // Сначала найдем user_id
  const { data: users, error: userError } = await supabase
    .from('tripwire_users')
    .select('user_id, email, full_name')
    .eq('email', 'palonin348@roratu.com')
    .single();

  if (userError) {
    console.error('❌ Студент не найден:', userError.message);
  } else if (!users) {
    console.error('❌ Студент palonin348@roratu.com НЕ СУЩЕСТВУЕТ в tripwire_users!');
  } else {
    console.log('✅ Студент найден:');
    console.log('   User ID:', users.user_id);
    console.log('   Email:', users.email);
    console.log('   ФИО:', users.full_name || 'Не указано');

    // Проверяем прогресс по модулям
    const { data: progress, error: progressError } = await supabase
      .from('tripwire_progress')
      .select('module_id, is_completed')
      .eq('tripwire_user_id', users.user_id)
      .in('module_id', [16, 17, 18]);

    if (progressError) {
      console.error('\n❌ Ошибка при получении прогресса:', progressError.message);
    } else {
      const completedModules = progress?.filter(p => p.is_completed) || [];
      console.log('\n📊 Прогресс по модулям:');
      console.log(`   Модуль 16: ${progress?.find(p => p.module_id === 16)?.is_completed ? '✅ Завершен' : '❌ Не завершен'}`);
      console.log(`   Модуль 17: ${progress?.find(p => p.module_id === 17)?.is_completed ? '✅ Завершен' : '❌ Не завершен'}`);
      console.log(`   Модуль 18: ${progress?.find(p => p.module_id === 18)?.is_completed ? '✅ Завершен' : '❌ Не завершен'}`);
      console.log(`\n   Завершено модулей: ${completedModules.length}/3`);

      if (completedModules.length === 3) {
        console.log('   ✅ Студент ЗАВЕРШИЛ ВСЕ 3 МОДУЛЯ! Должен получить сертификат.');
      } else {
        console.log('   ⚠️  Студент НЕ завершил все модули.');
      }
    }

    // Проверяем профиль
    const { data: profile, error: profileError } = await supabase
      .from('tripwire_user_profile')
      .select('certificate_issued, certificate_url')
      .eq('user_id', users.user_id)
      .single();

    if (profileError) {
      console.error('\n❌ Ошибка при получении профиля:', profileError.message);
    } else if (!profile) {
      console.error('\n❌ Профиль студента НЕ СУЩЕСТВУЕТ!');
    } else {
      console.log('\n📋 Профиль студента:');
      console.log(`   certificate_issued: ${profile.certificate_issued ? '✅ true' : '❌ false'}`);
      console.log(`   certificate_url: ${profile.certificate_url || '❌ отсутствует'}`);
    }

    // Проверяем сертификат в таблице certificates
    const { data: studentCert, error: certError } = await supabase
      .from('certificates')
      .select('*')
      .eq('user_id', users.user_id)
      .single();

    if (certError && certError.code !== 'PGRST116') {
      console.error('\n❌ Ошибка при получении сертификата:', certError.message);
    } else if (!studentCert) {
      console.log('\n⚠️  Сертификат в таблице certificates ОТСУТСТВУЕТ');
    } else {
      console.log('\n✅ Сертификат существует в таблице certificates:');
      console.log('   Certificate Number:', studentCert.certificate_number);
      console.log('   Issued At:', studentCert.issued_at ? new Date(studentCert.issued_at).toLocaleString('ru-RU') : 'N/A');
      console.log('   PDF URL:', studentCert.pdf_url || '❌ отсутствует');
    }
  }
} catch (err) {
  console.error('❌ Исключение при проверке студента:', err.message);
}

// ═══════════════════════════════════════════════════════════════
// 4. ПРОВЕРКА STORAGE BUCKET
// ═══════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('4️⃣  ПРОВЕРКА STORAGE BUCKET "tripwire-certificates"');
console.log('═══════════════════════════════════════════════════════════════\n');

try {
  const { data: buckets, error } = await supabase
    .storage
    .listBuckets();

  if (error) {
    console.error('❌ Ошибка при получении списка buckets:', error.message);
  } else {
    const certBucket = buckets?.find(b => b.name === 'tripwire-certificates');

    if (certBucket) {
      console.log('✅ Storage bucket "tripwire-certificates" существует');
      console.log('   ID:', certBucket.id);
      console.log('   Public:', certBucket.public ? '✅ true' : '❌ false');
      console.log('   Created At:', new Date(certBucket.created_at).toLocaleString('ru-RU'));

      // Проверяем файлы в bucket
      const { data: files, error: filesError } = await supabase
        .storage
        .from('tripwire-certificates')
        .list('', { limit: 5 });

      if (filesError) {
        console.error('\n❌ Ошибка при получении файлов из bucket:', filesError.message);
      } else {
        console.log(`\n📂 Файлов в bucket: ${files?.length || 0}`);

        if (files && files.length > 0) {
          console.log('\nПримеры файлов (первые 5):');
          console.table(files.map(f => ({
            name: f.name,
            size: `${(f.metadata?.size / 1024).toFixed(2)} KB`,
            created: new Date(f.created_at).toLocaleString('ru-RU')
          })));
        }
      }
    } else {
      console.error('❌ Storage bucket "tripwire-certificates" НЕ СУЩЕСТВУЕТ!');
      console.log('\n⚠️  Необходимо создать bucket:');
      console.log('   1. Перейти в Supabase Dashboard → Storage');
      console.log('   2. Создать новый bucket "tripwire-certificates"');
      console.log('   3. Установить Public = true');
    }
  }
} catch (err) {
  console.error('❌ Исключение при проверке Storage:', err.message);
}

// ═══════════════════════════════════════════════════════════════
// 5. ПРОВЕРКА RLS POLICIES
// ═══════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('5️⃣  ПРОВЕРКА RLS POLICIES ДЛЯ ТАБЛИЦЫ CERTIFICATES');
console.log('═══════════════════════════════════════════════════════════════\n');

try {
  const { data: policies, error } = await supabase
    .from('pg_policies')
    .select('policyname, permissive, roles, cmd, qual')
    .eq('tablename', 'certificates');

  if (error) {
    console.error('❌ Ошибка при получении RLS policies:', error.message);
  } else if (!policies || policies.length === 0) {
    console.log('⚠️  RLS policies НЕ НАСТРОЕНЫ для таблицы certificates');
    console.log('   Это может БЛОКИРОВАТЬ запись сертификатов!\n');
    console.log('   Рекомендуется:');
    console.log('   1. Отключить RLS: ALTER TABLE certificates DISABLE ROW LEVEL SECURITY;');
    console.log('   2. Или создать policy для service_role');
  } else {
    console.log(`✅ Найдено ${policies.length} RLS policies:\n`);
    console.table(policies.map(p => ({
      name: p.policyname,
      permissive: p.permissive,
      roles: p.roles?.join(', ') || 'N/A',
      command: p.cmd,
    })));
  }
} catch (err) {
  console.error('❌ Исключение при проверке RLS policies:', err.message);
}

// ═══════════════════════════════════════════════════════════════
// 6. ФИНАЛЬНЫЙ ОТЧЕТ
// ═══════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('📋 ФИНАЛЬНЫЙ ОТЧЕТ');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('Проверьте результаты выше и убедитесь:');
console.log('  ✅ Таблица certificates существует с правильными полями');
console.log('  ✅ Storage bucket tripwire-certificates настроен (public)');
console.log('  ✅ Студент palonin348@roratu.com завершил 3/3 модуля');
console.log('  ✅ RLS policies не блокируют запись сертификатов');
console.log('  ✅ Поля certificate_issued и certificate_url существуют в tripwire_user_profile\n');

console.log('Если что-то НЕ так - проверьте миграции в:');
console.log('  📂 /Users/miso/onai-integrator-login/supabase/migrations/\n');

console.log('═══════════════════════════════════════════════════════════════\n');
