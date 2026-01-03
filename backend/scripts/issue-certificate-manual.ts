#!/usr/bin/env ts-node
/**
 * 🎓 РУЧНАЯ ВЫДАЧА СЕРТИФИКАТА
 *
 * Скрипт для выдачи сертификата студенту, завершившему все модули
 *
 * Usage:
 *   npx ts-node backend/scripts/issue-certificate-manual.ts <user_id>
 *   npx ts-node backend/scripts/issue-certificate-manual.ts e494b82e-c635-486e-bad5-28886b37bd6b
 */

import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

import { issueCertificate, getUserCertificate, canIssueCertificate } from '../src/services/tripwire/tripwireCertificateService';
import { tripwireAdminSupabase as supabase } from '../src/config/supabase-tripwire';

const userId = process.argv[2];

if (!userId) {
  console.error('❌ Ошибка: Не указан user_id');
  console.error('\nИспользование:');
  console.error('  npx ts-node backend/scripts/issue-certificate-manual.ts <user_id>');
  console.error('\nПример:');
  console.error('  npx ts-node backend/scripts/issue-certificate-manual.ts e494b82e-c635-486e-bad5-28886b37bd6b');
  process.exit(1);
}

async function main() {
  try {
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  🎓 РУЧНАЯ ВЫДАЧА СЕРТИФИКАТА TRIPWIRE                        ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    console.log('User ID:', userId);

    // 1. Получаем информацию о студенте
    console.log('\n1️⃣  Получаем информацию о студенте...\n');

    const { data: user, error: userError } = await supabase
      .from('tripwire_users')
      .select('user_id, email, full_name')
      .eq('user_id', userId)
      .single();

    if (userError) {
      console.error('❌ Ошибка:', userError.message);
      console.error('\nВозможные причины:');
      console.error('  - Неверный user_id');
      console.error('  - Студент не существует в базе данных');
      process.exit(1);
    }

    console.log('✅ Студент найден:');
    console.log('   Email:', user.email);
    console.log('   ФИО:', user.full_name || 'Не указано');

    // 2. Проверяем прогресс
    console.log('\n2️⃣  Проверяем прогресс по модулям...\n');

    const { data: progress, error: progressError } = await supabase
      .from('tripwire_progress')
      .select('module_id, is_completed')
      .eq('tripwire_user_id', userId)
      .in('module_id', [16, 17, 18]);

    if (progressError) {
      console.error('❌ Ошибка при получении прогресса:', progressError.message);
      process.exit(1);
    }

    const completedModules = progress?.filter(p => p.is_completed) || [];

    console.log('📊 Прогресс:');
    console.log(`   Модуль 16: ${progress?.find(p => p.module_id === 16)?.is_completed ? '✅ Завершен' : '❌ Не завершен'}`);
    console.log(`   Модуль 17: ${progress?.find(p => p.module_id === 17)?.is_completed ? '✅ Завершен' : '❌ Не завершен'}`);
    console.log(`   Модуль 18: ${progress?.find(p => p.module_id === 18)?.is_completed ? '✅ Завершен' : '❌ Не завершен'}`);
    console.log(`\n   Завершено: ${completedModules.length}/3 модулей`);

    if (completedModules.length !== 3) {
      console.error('\n❌ Ошибка: Студент НЕ завершил все 3 модуля!');
      console.error('   Сертификат можно выдать только после завершения всех модулей.');
      process.exit(1);
    }

    console.log('\n✅ Студент завершил все модули!');

    // 3. Проверяем, не выдан ли уже сертификат
    console.log('\n3️⃣  Проверяем, не выдан ли уже сертификат...\n');

    const existingCert = await getUserCertificate(userId);

    if (existingCert) {
      console.log('⚠️  Сертификат УЖЕ ВЫДАН:');
      console.log('   Certificate Number:', existingCert.certificate_number);
      console.log('   Issued At:', new Date(existingCert.issued_at).toLocaleString('ru-RU'));
      console.log('   PDF URL:', existingCert.pdf_url);

      console.log('\nДействия:');
      console.log('  1. Удалить существующий сертификат');
      console.log('  2. Сгенерировать новый');
      console.log('  3. Отменить (exit)\n');

      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise<string>(resolve => {
        rl.question('Выберите действие (1/2/3): ', (ans: string) => {
          rl.close();
          resolve(ans);
        });
      });

      if (answer === '1') {
        console.log('\n🗑️  Удаляем старый сертификат...');
        await supabase.from('certificates').delete().eq('user_id', userId);
        console.log('✅ Старый сертификат удалён');
      } else if (answer === '3') {
        console.log('\n❌ Отменено пользователем');
        process.exit(0);
      }
    }

    // 4. Проверяем возможность выдачи
    console.log('\n4️⃣  Проверяем возможность выдачи сертификата...\n');

    const checkResult = await canIssueCertificate(userId);

    if (!checkResult.canIssue) {
      console.error('❌ Невозможно выдать сертификат:', checkResult.reason);
      process.exit(1);
    }

    console.log('✅ Проверка пройдена, можно выдавать сертификат!');

    // 5. Выдаём сертификат
    console.log('\n5️⃣  Выдаём сертификат...\n');

    const certificate = await issueCertificate(userId, user.full_name);

    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ СЕРТИФИКАТ УСПЕШНО ВЫДАН!                                 ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    console.log('📋 Детали сертификата:\n');
    console.log('   Certificate ID:', certificate.id);
    console.log('   Certificate Number:', certificate.certificate_number);
    console.log('   Full Name:', certificate.full_name);
    console.log('   Issued At:', new Date(certificate.issued_at).toLocaleString('ru-RU'));
    console.log('   PDF URL:', certificate.pdf_url);

    // 6. Проверяем обновление профиля
    console.log('\n6️⃣  Проверяем обновление профиля...\n');

    const { data: profile, error: profileError } = await supabase
      .from('tripwire_user_profile')
      .select('certificate_issued, certificate_url')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.error('⚠️  Ошибка при проверке профиля:', profileError.message);
    } else {
      console.log('✅ Профиль обновлён:');
      console.log(`   certificate_issued: ${profile.certificate_issued ? '✅ true' : '❌ false'}`);
      console.log(`   certificate_url: ${profile.certificate_url || '❌ отсутствует'}`);
    }

    console.log('\n═══════════════════════════════════════════════════════════════\n');
    console.log('✅ Готово! Студент может скачать сертификат по ссылке выше.\n');
  } catch (error: any) {
    console.error('\n❌ Ошибка:', error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

main();
