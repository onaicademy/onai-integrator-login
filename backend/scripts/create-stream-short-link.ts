/**
 * 🔗 СОЗДАНИЕ КОРОТКОЙ ССЫЛКИ для SMS рассылки о переносе эфира
 */

import { createShortLink } from '../src/services/urlShortener';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../env.env') });

const createStreamShortLink = async () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔗 СОЗДАНИЕ КОРОТКОЙ ССЫЛКИ ДЛЯ SMS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const originalUrl = 'https://expresscourse.onai.academy';
    
    console.log(`📎 Оригинальная ссылка: ${originalUrl}`);
    console.log(`📏 Длина: ${originalUrl.length} символов\n`);

    // Создаём короткую ссылку
    const shortCode = await createShortLink({
      originalUrl,
      campaign: 'stream_postponed_dec_2025',
      source: 'sms',
      expiresInDays: 30, // Истекает через 30 дней
    });

    if (!shortCode) {
      console.error('❌ Не удалось создать короткую ссылку');
      process.exit(1);
    }

    const shortUrl = `onai.academy/l/${shortCode}`;
    const fullShortUrl = `https://${shortUrl}`;

    console.log('✅ Короткая ссылка создана!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 ДЕТАЛИ:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🔑 Короткий код: ${shortCode}`);
    console.log(`🔗 Короткая ссылка: ${shortUrl}`);
    console.log(`🌐 Полная ссылка: ${fullShortUrl}`);
    console.log(`📏 Длина для SMS: ${shortUrl.length} символов`);
    console.log(`💾 Экономия: ${originalUrl.length - shortUrl.length} символов`);
    console.log(`📅 Истекает через: 30 дней`);
    console.log(`📊 Кампания: stream_postponed_dec_2025`);
    console.log(`📱 Источник: sms\n`);

    // Пример SMS с короткой ссылкой
    const smsText = `Эфир 20 декабря в 20:00! Успей пройти модули ${shortUrl}`;
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📱 SMS С КОРОТКОЙ ССЫЛКОЙ:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`"${smsText}"`);
    console.log(`\n📏 Длина SMS: ${smsText.length} символов`);
    console.log(`✅ ${smsText.length <= 70 ? 'В пределах лимита (70 символов)!' : '⚠️ Превышает лимит!'}\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ГОТОВО! Используй эту ссылку в SMS рассылке!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📋 NEXT STEP:');
    console.log('1. Скопируй короткую ссылку: ' + shortUrl);
    console.log('2. Запусти массовую рассылку: npx tsx scripts/send-stream-postponed-mass.ts');
    console.log('3. Отслеживай клики в админке: https://expresscourse.onai.academy/admin/short-links\n');

  } catch (error: any) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
};

createStreamShortLink();
