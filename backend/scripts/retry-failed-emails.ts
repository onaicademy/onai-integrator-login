/**
 * 🔄 ПОВТОРНАЯ ОТПРАВКА для неудачных email
 */

import { Resend } from 'resend';
import dotenv from 'dotenv';
import path from 'path';
import { tripwireStreamPostponedEmail } from '../src/templates/tripwireStreamPostponedEmail';

dotenv.config({ path: path.join(__dirname, '../env.env') });

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = 'onAI Academy <notifications@onai.academy>';

// 📧 Email которые не отправились (из-за rate limit)
const FAILED_EMAILS = [
  'amina.utegenova04@gmail.com',
  'katya_15_8@mail.ru',
  'azizahasimova416@gmail.com',
  'gulnara.y.66.kz@gmail.com',
  'a.aubakirov@gmail.com',
  'romsvetnik@gmail.com',
  'pafnuchev.66@gmail.com',
  'zhaslaniskakov-72@mail.ru',
  'm.mankeyeva@gmail.com',
  'arafatbashiza@gmail.com',
  'irinadexkaimer@gmail.com',
  'aminokturlik@mail.ru',
  'alinapriteyeva@gmail.com',
  'timotul@gmail.com',
  'zhaniyaaaaaa@mail.ru',
  'azeha_awer@mail.ru',
  'alena-live2010@mail.ru',
];

const retryEmails = async () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔄 ПОВТОРНАЯ ОТПРАВКА EMAIL');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (!RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY не найден');
    process.exit(1);
  }

  const resend = new Resend(RESEND_API_KEY);

  console.log(`📧 Повторная отправка для ${FAILED_EMAILS.length} email`);
  console.log(`⏱️  Задержка: 600ms (чтобы не превысить rate limit 2 req/sec)\n`);

  let successCount = 0;
  let failCount = 0;

  for (const email of FAILED_EMAILS) {
    try {
      const emailHtml = tripwireStreamPostponedEmail({
        recipientName: 'Студент',
        recipientEmail: email,
      });

      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: '⚡ Важно: эфир переносится на субботу',
        html: emailHtml,
      });

      if (error) {
        console.error(`  ❌ ${email}: ${error.message}`);
        failCount++;
      } else {
        console.log(`  ✅ ${email} (ID: ${data?.id})`);
        successCount++;
      }

      // ⏱️ Задержка 600ms (чтобы уложиться в 2 req/sec = 1 req per 500ms + запас)
      await new Promise(resolve => setTimeout(resolve, 600));

    } catch (err: any) {
      console.error(`  ❌ ${email}: ${err.message}`);
      failCount++;
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 ИТОГО:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Успешно: ${successCount}`);
  console.log(`❌ Ошибок: ${failCount}`);
  console.log(`📧 Всего: ${FAILED_EMAILS.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (successCount === FAILED_EMAILS.length) {
    console.log('🎉 ВСЕ EMAIL ОТПРАВЛЕНЫ!');
  } else {
    console.log(`⚠️  Осталось неотправленных: ${failCount}`);
  }
};

retryEmails();
