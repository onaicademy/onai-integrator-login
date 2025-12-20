/**
 * 🧪 ТЕСТ МАССОВОЙ РАССЫЛКИ
 * 
 * Отправляет тестовое EMAIL + SMS на указанный контакт
 */

import { Resend } from 'resend';
import dotenv from 'dotenv';
import path from 'path';
import { universalBroadcastEmail } from '../src/templates/universalBroadcastEmail';
import { sendSMS } from '../src/services/mobizon-simple';

dotenv.config({ path: path.join(__dirname, '../env.env') });

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = 'onAI Academy <notifications@onai.academy>';

// 🎯 ТЕСТОВЫЕ ДАННЫЕ (ИЗМЕНИ ЭТО!)
const TEST_EMAIL = 'smmmcwin@gmail.com'; // твой email
const TEST_PHONE = '+77056698824'; // твой номер (с +7 или без)
const TEST_NAME = 'Александр';

// 📧 EMAIL данные
const EMAIL_SUBJECT = '🧪 ТЕСТ: Массовая рассылка работает!';
const EMAIL_MESSAGE = `Привет!

Это тестовое письмо для проверки системы массовых рассылок onAI Academy.

Если ты видишь это письмо — значит EMAIL рассылка работает корректно! ✅

Письмо оформлено в фирменном стиле и адаптировано под тёмную/светлую тему.

Всё готово к боевому использованию! 🚀`;

// 📱 SMS данные
const SHORT_LINK = 'onai.academy/l/test123';
const SMS_MESSAGE = `TEST massovoy rassylki onAI! Rabotaet: {SHORT_LINK}`;

const testBroadcast = async () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 ТЕСТОВАЯ МАССОВАЯ РАССЫЛКА');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (!RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY не найден');
    process.exit(1);
  }

  const resend = new Resend(RESEND_API_KEY);

  try {
    // 1️⃣ Отправка EMAIL
    console.log('📧 ТЕСТ EMAIL РАССЫЛКИ');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📤 Получатель: ${TEST_EMAIL}`);
    console.log(`📝 Тема: ${EMAIL_SUBJECT}`);
    console.log(`📄 Текст: ${EMAIL_MESSAGE.substring(0, 50)}...`);
    console.log('');

    const emailHtml = universalBroadcastEmail({
      recipientName: TEST_NAME,
      recipientEmail: TEST_EMAIL,
      subject: EMAIL_SUBJECT,
      message: EMAIL_MESSAGE,
    });

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: FROM_EMAIL,
      to: TEST_EMAIL,
      subject: EMAIL_SUBJECT,
      html: emailHtml,
    });

    if (emailError) {
      console.error('❌ Ошибка EMAIL:', emailError);
    } else {
      console.log('✅ EMAIL отправлен успешно!');
      console.log(`📧 ID письма: ${emailData?.id}`);
    }

    console.log('');

    // 2️⃣ Отправка SMS
    console.log('📱 ТЕСТ SMS РАССЫЛКИ');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📤 Получатель: ${TEST_PHONE}`);
    
    const smsText = SMS_MESSAGE.replace(/{SHORT_LINK}/g, SHORT_LINK);
    console.log(`📝 Текст: "${smsText}"`);
    console.log(`📏 Длина: ${smsText.length} символов`);
    console.log('');

    if (smsText.length > 70) {
      console.warn(`⚠️  ВНИМАНИЕ: SMS длиннее 70 символов (${smsText.length})`);
      console.warn('   Это может увеличить стоимость!\n');
    }

    const smsSuccess = await sendSMS({
      recipient: TEST_PHONE,
      text: smsText,
    });

    if (smsSuccess) {
      console.log('✅ SMS отправлен успешно!');
    } else {
      console.error('❌ Ошибка отправки SMS');
    }

    console.log('');

    // 3️⃣ Итоги
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 ИТОГИ ТЕСТА:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📧 EMAIL: ${emailError ? '❌ Ошибка' : '✅ Отправлен'}`);
    console.log(`📱 SMS: ${smsSuccess ? '✅ Отправлен' : '❌ Ошибка'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (!emailError && smsSuccess) {
      console.log('🎉 ВСЕ ТЕСТЫ ПРОШЛИ УСПЕШНО!');
      console.log('\n✅ Система массовых рассылок готова к использованию!');
      console.log('🌐 URL: https://onai.academy/integrator/admin/mass-broadcast\n');
    } else {
      console.log('⚠️  Некоторые тесты не прошли. Проверь ошибки выше.');
    }

  } catch (error: any) {
    console.error('❌ Критическая ошибка:', error.message);
    process.exit(1);
  }
};

testBroadcast();



