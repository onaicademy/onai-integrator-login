/**
 * Скрипт для сброса паролей и отправки приветственных писем
 * Работает с Tripwire Supabase
 *
 * USAGE:
 * 1. Заполните массив USERS_TO_RESET данными из скриншота
 * 2. Запустите: npx ts-node scripts/reset-and-send-emails.ts
 */

import { createClient } from '@supabase/supabase-js';
import { sendWelcomeEmail } from '../src/services/emailService';
import * as crypto from 'crypto';

// Tripwire Supabase credentials
const TRIPWIRE_URL = process.env.TRIPWIRE_SUPABASE_URL || 'https://pjmvxecykysfrzppdcto.supabase.co';
const TRIPWIRE_SERVICE_KEY = process.env.TRIPWIRE_SERVICE_ROLE_KEY || '';

if (!TRIPWIRE_SERVICE_KEY || TRIPWIRE_SERVICE_KEY.length < 50) {
  console.error('❌ ERROR: TRIPWIRE_SERVICE_ROLE_KEY not configured');
  console.error('Please set it in env.env or as environment variable');
  process.exit(1);
}

const tripwireSupabase = createClient(TRIPWIRE_URL, TRIPWIRE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// ✅ СПИСОК СТУДЕНТОВ ДЛЯ СБРОСА ПАРОЛЯ
const USERS_TO_RESET = [
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

async function resetPasswordAndSendEmail(email: string, fullName: string) {
  console.log(`\n📧 Processing: ${fullName} (${email})`);

  try {
    // 1. Проверяем существует ли пользователь в Tripwire Auth
    const { data: { users }, error: listError } = await tripwireSupabase.auth.admin.listUsers();

    if (listError) {
      throw new Error(`Failed to list users: ${listError.message}`);
    }

    const user = users?.find(u => u.email === email);

    if (!user) {
      console.error(`   ❌ User not found in Tripwire Auth: ${email}`);
      return false;
    }

    console.log(`   ✅ User found in Tripwire Auth (ID: ${user.id})`);

    // 2. Генерируем новый временный пароль
    const newPassword = generatePassword();
    console.log(`   🔑 Generated new password: ${newPassword}`);

    // 3. Обновляем пароль через Admin API
    const { error: updateError } = await tripwireSupabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      throw new Error(`Failed to update password: ${updateError.message}`);
    }

    console.log(`   ✅ Password updated in Tripwire Auth`);

    // 4. Отправляем приветственное письмо с новым паролем
    console.log(`   📧 Sending welcome email...`);

    const emailSent = await sendWelcomeEmail({
      toEmail: email,
      name: fullName,
      password: newPassword,
    });

    if (emailSent) {
      console.log(`   ✅ Welcome email sent successfully to ${email}`);
      return true;
    } else {
      console.error(`   ❌ Failed to send email to ${email}`);
      console.error(`   ⚠️  PASSWORD WAS CHANGED TO: ${newPassword}`);
      console.error(`   ⚠️  Please save this password and send it manually!`);
      return false;
    }

  } catch (error: any) {
    console.error(`   ❌ Error processing ${email}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🔄 RESET PASSWORDS & SEND WELCOME EMAILS                 ║');
  console.log('║  Tripwire Supabase Database                                ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log(`📋 Users to process: ${USERS_TO_RESET.length}\n`);

  let successCount = 0;
  let failCount = 0;

  for (const user of USERS_TO_RESET) {
    const success = await resetPasswordAndSendEmail(user.email, user.full_name);

    if (success) {
      successCount++;
    } else {
      failCount++;
    }

    // Задержка между операциями
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n' + '═'.repeat(60));
  console.log('📊 FINAL RESULTS:');
  console.log(`   ✅ Successfully processed: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log('═'.repeat(60));

  if (failCount > 0) {
    console.log('\n⚠️  WARNING: Some emails failed to send.');
    console.log('Check the logs above for passwords that were changed but not emailed.');
  }
}

// Запуск
main()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
