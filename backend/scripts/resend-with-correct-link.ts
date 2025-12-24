/**
 * Повторная отправка email трём студентам с ПРАВИЛЬНОЙ ссылкой
 * /integrator/login вместо /tripwire/login
 */

import { sendWelcomeEmail } from '../src/services/emailService';

// ✅ Три студента с уже установленными паролями
const STUDENTS = [
  {
    email: 'bakkee24@gmail.com',
    name: 'Букешев Досжан Бейбытекович',
    password: 'aA3uiBjhtkuq',
  },
  {
    email: 'khaltekeshev2004@gmail.com',
    name: 'Альтекешев Хабибулла Шаймерденулы',
    password: 'pZtrd3kpCB44',
  },
  {
    email: 'aslanumarov@mail.ru',
    name: 'Умаров Аслан',
    password: 'CHGGjpJ3P2ug',
  },
];

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  📧 ПОВТОРНАЯ ОТПРАВКА EMAIL С ПРАВИЛЬНОЙ ССЫЛКОЙ         ║');
  console.log('║  Link: https://onai.academy/integrator/login              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log(`FROM: ${process.env.RESEND_FROM_EMAIL || 'platform@onai.academy'}`);
  console.log(`Студентов: ${STUDENTS.length}\n`);

  let successCount = 0;

  for (let i = 0; i < STUDENTS.length; i++) {
    const student = STUDENTS[i];
    console.log(`[${i + 1}/${STUDENTS.length}] ${student.name}`);
    console.log(`   Email: ${student.email}`);

    const sent = await sendWelcomeEmail({
      toEmail: student.email,
      name: student.name,
      password: student.password,
    });

    if (sent) {
      console.log(`   ✅ Отправлено\n`);
      successCount++;
    } else {
      console.log(`   ❌ Ошибка\n`);
    }

    // Пауза 2 секунды
    if (i < STUDENTS.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('═'.repeat(60));
  console.log(`✅ Успешно: ${successCount}/${STUDENTS.length}`);
  console.log('═'.repeat(60));

  if (successCount === STUDENTS.length) {
    console.log('\n🎉 ВСЕ СТУДЕНТЫ ПОЛУЧИЛИ EMAIL С ПРАВИЛЬНОЙ ССЫЛКОЙ!');
  }
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
