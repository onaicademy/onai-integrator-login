/**
 * 📧 Отправить приветственный email для icekvup@gmail.com
 */

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../env.env') });

// Импортируем emailService ПОСЛЕ загрузки env
import { sendWelcomeEmail } from '../src/services/emailService';

async function sendEmail() {
  console.log('📧 ОТПРАВКА ПРИВЕТСТВЕННОГО EMAIL\n');
  console.log('='.repeat(80));

  const params = {
    toEmail: 'icekvup@gmail.com',
    name: 'Ермек Тестовый',
    password: 'Test123456!'
  };

  console.log('📧 Email: ' + params.toEmail);
  console.log('👤 Имя: ' + params.name);
  console.log('🔑 Пароль: ' + params.password);
  console.log('='.repeat(80));

  try {
    console.log('\n📤 Отправка email...');
    const sent = await sendWelcomeEmail(params);

    if (sent) {
      console.log('✅ EMAIL УСПЕШНО ОТПРАВЛЕН!');
      console.log('\n📬 Проверьте почту: icekvup@gmail.com');
      console.log('   (Также проверьте папку СПАМ!)');
    } else {
      console.log('⚠️  Email не был отправлен (возможно RESEND_API_KEY не настроен)');
    }

  } catch (error: any) {
    console.error('❌ Ошибка отправки email:', error.message);
    throw error;
  }
}

sendEmail()
  .then(() => {
    console.log('\n✅ ГОТОВО!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ ОШИБКА:', error);
    process.exit(1);
  });
