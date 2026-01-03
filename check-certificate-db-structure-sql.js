#!/usr/bin/env node
/**
 * 📋 ПРОВЕРКА СТРУКТУРЫ БД ДЛЯ ГЕНЕРАЦИИ СЕРТИФИКАТОВ TRIPWIRE (через прямой SQL)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

const TRIPWIRE_SUPABASE_URL = process.env.TRIPWIRE_SUPABASE_URL;
const TRIPWIRE_SERVICE_ROLE_KEY = process.env.TRIPWIRE_SERVICE_ROLE_KEY;

if (!TRIPWIRE_SUPABASE_URL || !TRIPWIRE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Tripwire Supabase credentials!');
  process.exit(1);
}

const supabase = createClient(TRIPWIRE_SUPABASE_URL, TRIPWIRE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('\n╔═══════════════════════════════════════════════════════════════╗');
console.log('║  ПРОВЕРКА СТРУКТУРЫ БД ДЛЯ ГЕНЕРАЦИИ СЕРТИФИКАТОВ (SQL)       ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

// Проверка структуры таблицы certificates через RPC
console.log('1️⃣  СТРУКТУРА ТАБЛИЦЫ CERTIFICATES:\n');

const checkTableSQL = `
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'certificates'
ORDER BY ordinal_position;
`;

try {
  const { data: columns, error } = await supabase.rpc('exec_sql', { sql_query: checkTableSQL });

  if (error) {
    console.error('❌ Ошибка при выполнении SQL запроса:', error.message);
    console.log('\n⚠️  Попробуем проверить наличие таблицы напрямую:\n');

    // Альтернативная проверка через простой SELECT
    const { data: testData, error: testError } = await supabase
      .from('certificates')
      .select('*')
      .limit(1);

    if (testError) {
      console.error('❌ Таблица certificates НЕ СУЩЕСТВУЕТ:', testError.message);
    } else {
      console.log('✅ Таблица certificates СУЩЕСТВУЕТ и доступна');

      if (testData && testData.length > 0) {
        console.log('\nПример данных (первая запись):');
        console.log(JSON.stringify(testData[0], null, 2));

        console.log('\nПоля в таблице:');
        Object.keys(testData[0]).forEach(field => {
          console.log(`  - ${field}`);
        });
      }
    }
  } else {
    console.log('✅ Структура таблицы получена:\n');
    console.table(columns);
  }
} catch (err) {
  console.error('❌ Исключение:', err.message);
}

// Проверка RLS
console.log('\n2️⃣  RLS POLICIES ДЛЯ CERTIFICATES:\n');

const checkRLSSQL = `
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'certificates';
`;

try {
  const { data: policies, error } = await supabase.rpc('exec_sql', { sql_query: checkRLSSQL });

  if (error) {
    console.error('❌ Ошибка при проверке RLS:', error.message);
    console.log('\n⚠️  RPC функция exec_sql не существует. Проверим статус RLS напрямую:\n');

    // Попробуем через информационную схему
    const { data: tableInfo, error: infoError } = await supabase
      .from('certificates')
      .select('*')
      .limit(0);

    if (!infoError) {
      console.log('✅ Таблица certificates доступна через service_role_key');
      console.log('   Это означает, что либо RLS отключен, либо service_role обходит RLS');
    }
  } else if (!policies || policies.length === 0) {
    console.log('⚠️  RLS policies не найдены');
    console.log('   Таблица может быть полностью открыта или RLS отключен');
  } else {
    console.log('✅ Найдены RLS policies:\n');
    console.table(policies);
  }
} catch (err) {
  console.error('❌ Исключение:', err.message);
}

// Проверка наличия необходимых полей в tripwire_user_profile
console.log('\n3️⃣  ПРОВЕРКА ПОЛЕЙ В TRIPWIRE_USER_PROFILE:\n');

try {
  const { data: profileFields, error } = await supabase
    .from('tripwire_user_profile')
    .select('certificate_issued, certificate_url')
    .limit(1);

  if (error) {
    console.error('❌ Ошибка:', error.message);
    if (error.message.includes('certificate_issued') || error.message.includes('certificate_url')) {
      console.log('\n⚠️  КРИТИЧНО: Поля certificate_issued или certificate_url ОТСУТСТВУЮТ!');
      console.log('\nДобавьте их миграцией:');
      console.log('  ALTER TABLE tripwire_user_profile ADD COLUMN IF NOT EXISTS certificate_issued BOOLEAN DEFAULT FALSE;');
      console.log('  ALTER TABLE tripwire_user_profile ADD COLUMN IF NOT EXISTS certificate_url TEXT;');
    }
  } else {
    console.log('✅ Поля certificate_issued и certificate_url существуют в tripwire_user_profile');
  }
} catch (err) {
  console.error('❌ Исключение:', err.message);
}

// Проверка студента palonin348@roratu.com
console.log('\n4️⃣  ДИАГНОСТИКА СТУДЕНТА palonin348@roratu.com:\n');

try {
  const { data: user, error: userError } = await supabase
    .from('tripwire_users')
    .select('user_id, email, full_name')
    .eq('email', 'palonin348@roratu.com')
    .single();

  if (userError) {
    console.error('❌ Студент не найден:', userError.message);
  } else {
    console.log('✅ Студент:', user.full_name, '(' + user.email + ')');

    // Проверяем прогресс
    const { data: progress, error: progError } = await supabase
      .from('tripwire_progress')
      .select('module_id, is_completed')
      .eq('tripwire_user_id', user.user_id)
      .in('module_id', [16, 17, 18]);

    if (progError) {
      console.error('❌ Ошибка при получении прогресса:', progError.message);
    } else {
      const completed = progress?.filter(p => p.is_completed).length || 0;
      console.log(`\n📊 Прогресс: ${completed}/3 модулей завершено`);

      progress?.forEach(p => {
        console.log(`   Модуль ${p.module_id}: ${p.is_completed ? '✅' : '❌'}`);
      });

      if (completed === 3) {
        console.log('\n✅ СТУДЕНТ ДОЛЖЕН ПОЛУЧИТЬ СЕРТИФИКАТ!');

        // Проверяем, есть ли сертификат
        const { data: cert, error: certError } = await supabase
          .from('certificates')
          .select('certificate_number, issued_at, pdf_url')
          .eq('user_id', user.user_id)
          .single();

        if (certError) {
          if (certError.code === 'PGRST116') {
            console.log('⚠️  Сертификат ОТСУТСТВУЕТ в таблице certificates');
          } else {
            console.error('❌ Ошибка при проверке сертификата:', certError.message);
          }
        } else {
          console.log('✅ Сертификат существует:');
          console.log('   №:', cert.certificate_number);
          console.log('   Выдан:', cert.issued_at);
          console.log('   PDF URL:', cert.pdf_url || '❌ отсутствует');
        }

        // Проверяем профиль
        const { data: profile, error: profError } = await supabase
          .from('tripwire_user_profile')
          .select('certificate_issued, certificate_url')
          .eq('user_id', user.user_id)
          .single();

        if (profError) {
          console.error('❌ Ошибка при получении профиля:', profError.message);
        } else {
          console.log('\n📋 Профиль:');
          console.log('   certificate_issued:', profile.certificate_issued ? '✅ true' : '❌ false');
          console.log('   certificate_url:', profile.certificate_url || '❌ отсутствует');
        }
      }
    }
  }
} catch (err) {
  console.error('❌ Исключение:', err.message);
}

console.log('\n═══════════════════════════════════════════════════════════════\n');
console.log('📋 ВЫВОДЫ:\n');
console.log('Если студент завершил 3/3 модуля, но сертификат НЕ выдан:');
console.log('  1. Проверьте код генерации сертификатов');
console.log('  2. Проверьте логи backend (триггер завершения модулей)');
console.log('  3. Убедитесь, что tripwireAdminSupabase используется для записи\n');
console.log('═══════════════════════════════════════════════════════════════\n');
