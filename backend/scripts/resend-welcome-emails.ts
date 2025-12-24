/**
 * Скрипт для повторной отправки приветственных писем студентам
 * Используется когда нужно вручную отправить email после создания аккаунта
 */

import { sendWelcomeEmail } from '../src/services/emailService';
import * as readline from 'readline';

interface StudentCredentials {
  email: string;
  name: string;
  password: string;
}

// ✅ СПИСОК СТУДЕНТОВ ДЛЯ ОТПРАВКИ
// Заполните данные вручную из скриншота или базы данных
const studentsToSend: StudentCredentials[] = [
  {
    email: 'bakkee26@gmail.com',
    name: 'Букешев Досжан Бейбытекович',
    password: '', // НУЖНО ЗАПОЛНИТЬ
  },
  {
    email: 'khaltekeshev2004@gmail.com',
    name: 'Альтекешев Хабибулла Шаймерденулы',
    password: '', // НУЖНО ЗАПОЛНИТЬ
  },
  {
    email: 'aslanumarov@mail.ru',
    name: 'Умаров Аслан',
    password: '', // НУЖНО ЗАПОЛНИТЬ
  },
];

async function confirmAndSend() {
  console.log('📧 RESEND WELCOME EMAILS SCRIPT');
  console.log('================================\n');

  // Проверяем что пароли заполнены
  const missingPasswords = studentsToSend.filter(s => !s.password);
  if (missingPasswords.length > 0) {
    console.error('❌ ERROR: Некоторые студенты не имеют пароля:');
    missingPasswords.forEach(s => console.error(`   - ${s.email} (${s.name})`));
    console.error('\nПожалуйста, заполните пароли в массиве studentsToSend[] и запустите снова.');
    process.exit(1);
  }

  console.log(`Будет отправлено ${studentsToSend.length} писем:\n`);
  studentsToSend.forEach((s, i) => {
    console.log(`${i + 1}. ${s.name}`);
    console.log(`   Email: ${s.email}`);
    console.log(`   Password: ${'*'.repeat(s.password.length)}\n`);
  });

  // Подтверждение
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise<void>((resolve) => {
    rl.question('Продолжить отправку? (yes/no): ', async (answer) => {
      rl.close();

      if (answer.toLowerCase() !== 'yes') {
        console.log('❌ Отправка отменена');
        process.exit(0);
      }

      console.log('\n📧 Начинаю отправку...\n');

      let successCount = 0;
      let failCount = 0;

      for (const student of studentsToSend) {
        console.log(`📧 Отправка письма для ${student.name}...`);

        const sent = await sendWelcomeEmail({
          toEmail: student.email,
          name: student.name,
          password: student.password,
        });

        if (sent) {
          console.log(`   ✅ Успешно отправлено на ${student.email}\n`);
          successCount++;
        } else {
          console.log(`   ❌ Ошибка отправки на ${student.email}\n`);
          failCount++;
        }

        // Небольшая задержка между отправками
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log('\n' + '='.repeat(50));
      console.log('📊 РЕЗУЛЬТАТ:');
      console.log(`   ✅ Успешно: ${successCount}`);
      console.log(`   ❌ Ошибок: ${failCount}`);
      console.log('='.repeat(50));

      resolve();
    });
  });
}

// Запуск
confirmAndSend()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
