/**
 * Отправка email с уже известными паролями
 * БЕЗ сброса пароля в базе данных
 */

import { sendWelcomeEmail } from '../src/services/emailService';

// ✅ ПОЛЬЗОВАТЕЛИ С УЖЕ ИЗМЕНЕННЫМИ ПАРОЛЯМИ
const USERS_WITH_PASSWORDS = [
  {
    email: 'khaltekeshev2004@gmail.com',
    name: 'Альтекешев Хабибулла Шаймерденулы',
    password: 'ii7kfVU7DEBk', // Пароль уже изменен в предыдущем запуске
  },
  {
    email: 'aslanumarov@mail.ru',
    name: 'Умаров Аслан',
    password: '72nt73kye9fz', // Пароль уже изменен в предыдущем запуске
  },
];

async function sendEmails() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  📧 SEND WELCOME EMAILS (Passwords Already Changed)       ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log(`RESEND_API_KEY: ${process.env.RESEND_API_KEY?.substring(0, 10)}...`);
  console.log(`RESEND_FROM_EMAIL: ${process.env.RESEND_FROM_EMAIL || 'NOT SET'}\n`);

  let successCount = 0;
  let failCount = 0;

  for (const user of USERS_WITH_PASSWORDS) {
    console.log(`\n📧 Sending email to: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Password: ${'*'.repeat(user.password.length)}`);

    const emailSent = await sendWelcomeEmail({
      toEmail: user.email,
      name: user.name,
      password: user.password,
    });

    if (emailSent) {
      console.log(`   ✅ Email sent successfully`);
      successCount++;
    } else {
      console.log(`   ❌ Email sending failed`);
      failCount++;
    }

    // Задержка между отправками
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n' + '═'.repeat(60));
  console.log('📊 RESULTS:');
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log('═'.repeat(60));
}

sendEmails()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
