/**
 * Финальный скрипт для отправки приветственных писем трём студентам
 *
 * ЗАДАЧА:
 * 1. Сбросить пароли для всех трёх пользователей
 * 2. Отправить им welcome email с новыми паролями
 * 3. Проверить что всё прошло успешно
 */

import { createClient } from '@supabase/supabase-js';
import { sendWelcomeEmail } from '../src/services/emailService';
import * as crypto from 'crypto';

// Tripwire Supabase credentials
const TRIPWIRE_URL = process.env.TRIPWIRE_SUPABASE_URL || 'https://pjmvxecykysfrzppdcto.supabase.co';
const TRIPWIRE_SERVICE_KEY = process.env.TRIPWIRE_SERVICE_ROLE_KEY || '';

if (!TRIPWIRE_SERVICE_KEY || TRIPWIRE_SERVICE_KEY.length < 50) {
  console.error('❌ ERROR: TRIPWIRE_SERVICE_ROLE_KEY not configured');
  process.exit(1);
}

const tripwireSupabase = createClient(TRIPWIRE_URL, TRIPWIRE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// ✅ ТРИ СТУДЕНТА ДЛЯ ОБРАБОТКИ
const STUDENTS = [
  {
    email: 'bakkee26@gmail.com',
    full_name: 'Букешев Досжан Бейбытекович',
  },
  {
    email: 'khaltekeshev2004@gmail.com',
    full_name: 'Альтекешев Хабибулла Шаймерденулы',
  },
  {
    email: 'aslanumarov@mail.ru',
    full_name: 'Умаров Аслан',
  },
];

/**
 * Генерирует безопасный временный пароль
 */
function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(crypto.randomInt(0, chars.length));
  }
  return password;
}

async function processStudent(email: string, fullName: string) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📧 ОБРАБОТКА: ${fullName}`);
  console.log(`   Email: ${email}`);
  console.log('═'.repeat(60));

  try {
    // 1. Ищем пользователя в Tripwire Auth
    console.log('\n[1/4] Поиск пользователя в Tripwire Auth...');
    const { data: { users }, error: listError } = await tripwireSupabase.auth.admin.listUsers();

    if (listError) {
      throw new Error(`Ошибка получения списка пользователей: ${listError.message}`);
    }

    const user = users?.find(u => u.email === email);

    if (!user) {
      console.error(`   ❌ Пользователь НЕ НАЙДЕН в Tripwire Auth`);
      console.error(`   ℹ️  Возможно нужно сначала создать аккаунт через sales-manager`);
      return {
        success: false,
        email,
        error: 'User not found in Tripwire Auth'
      };
    }

    console.log(`   ✅ Пользователь найден (ID: ${user.id})`);

    // 2. Генерируем новый пароль
    console.log('\n[2/4] Генерация нового пароля...');
    const newPassword = generatePassword();
    console.log(`   ✅ Новый пароль: ${newPassword}`);

    // 3. Обновляем пароль в Tripwire Auth
    console.log('\n[3/4] Обновление пароля в базе данных...');
    const { error: updateError } = await tripwireSupabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      throw new Error(`Ошибка обновления пароля: ${updateError.message}`);
    }

    console.log(`   ✅ Пароль успешно обновлён в Tripwire Auth`);

    // 4. Отправляем приветственное письмо
    console.log('\n[4/4] Отправка приветственного письма...');
    const emailSent = await sendWelcomeEmail({
      toEmail: email,
      name: fullName,
      password: newPassword,
    });

    if (!emailSent) {
      console.error(`   ❌ ОШИБКА отправки email`);
      console.error(`   ⚠️  ВАЖНО: Пароль УЖЕ ИЗМЕНЁН в базе на: ${newPassword}`);
      console.error(`   ⚠️  Необходимо ВРУЧНУЮ отправить пароль студенту!`);
      return {
        success: false,
        email,
        password: newPassword,
        passwordChanged: true,
        emailSent: false,
        error: 'Email sending failed'
      };
    }

    console.log(`   ✅ Email успешно отправлен на ${email}`);
    console.log('\n✅ ВСЁ ГОТОВО! Студент получит письмо с доступами.');

    return {
      success: true,
      email,
      password: newPassword,
      passwordChanged: true,
      emailSent: true
    };

  } catch (error: any) {
    console.error(`\n❌ ОШИБКА при обработке ${email}:`);
    console.error(`   ${error.message}`);
    return {
      success: false,
      email,
      error: error.message
    };
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🚀 ФИНАЛЬНАЯ ОТПРАВКА EMAIL ТРЁМ СТУДЕНТАМ               ║');
  console.log('║  Tripwire Supabase + Resend (Verified Domain)             ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  console.log(`\n📋 Всего студентов: ${STUDENTS.length}`);
  console.log(`📧 FROM адрес: ${process.env.RESEND_FROM_EMAIL || 'platform@onai.academy'}`);
  console.log(`🔑 RESEND API Key: ${process.env.RESEND_API_KEY?.substring(0, 15)}...`);
  console.log(`🗄️  Tripwire URL: ${TRIPWIRE_URL}`);

  const results = [];

  for (let i = 0; i < STUDENTS.length; i++) {
    const student = STUDENTS[i];
    console.log(`\n\n[${i + 1}/${STUDENTS.length}] ════════════════════════════════════════════════`);

    const result = await processStudent(student.email, student.full_name);
    results.push(result);

    // Пауза между отправками
    if (i < STUDENTS.length - 1) {
      console.log('\n⏳ Пауза 3 секунды перед следующим студентом...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  // Итоговый отчёт
  console.log('\n\n' + '═'.repeat(70));
  console.log('📊 ФИНАЛЬНЫЙ ОТЧЁТ');
  console.log('═'.repeat(70));

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const passwordsChanged = results.filter(r => r.passwordChanged);
  const emailsSent = results.filter(r => r.emailSent);

  console.log(`\n✅ Успешно обработано: ${successful.length}/${STUDENTS.length}`);
  console.log(`🔑 Паролей изменено: ${passwordsChanged.length}/${STUDENTS.length}`);
  console.log(`📧 Email отправлено: ${emailsSent.length}/${STUDENTS.length}`);

  if (failed.length > 0) {
    console.log(`\n❌ Ошибки (${failed.length}):`);
    failed.forEach(result => {
      console.log(`\n   📧 ${result.email}`);
      console.log(`      Ошибка: ${result.error}`);
      if (result.password) {
        console.log(`      ⚠️  НОВЫЙ ПАРОЛЬ (сохраните!): ${result.password}`);
      }
    });
  }

  if (successful.length > 0) {
    console.log(`\n✅ Успешно обработаны:`);
    successful.forEach(result => {
      console.log(`   ✓ ${result.email} (пароль изменён и email отправлен)`);
    });
  }

  console.log('\n' + '═'.repeat(70));
  console.log('🎉 СКРИПТ ЗАВЕРШЁН');
  console.log('═'.repeat(70));

  if (failed.length > 0) {
    console.log('\n⚠️  ВНИМАНИЕ: Есть ошибки! Проверьте логи выше.');
    process.exit(1);
  } else {
    console.log('\n✅ ВСЁ ОТЛИЧНО! Все студенты получат письма с доступами.');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА:', error);
  process.exit(1);
});
