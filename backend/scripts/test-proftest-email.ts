/**
 * 🧪 ТЕСТОВАЯ ОТПРАВКА EMAIL ДЛЯ ПРОФТЕСТА
 * Проверяет отправку email через Resend API с шаблоном профтест
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { Resend } from 'resend';
import { generateProftestResultEmail } from '../src/templates/proftest-result-email.js';

// Загружаем .env из backend/env.env
dotenv.config({ path: path.join(__dirname, '..', 'env.env') });

async function testProftestEmail() {
  console.log('\n🧪 ===== ТЕСТ ОТПРАВКИ PROFTEST EMAIL =====\n');

  // Проверка RESEND API KEY
  const resendKey = process.env.RESEND_API_KEY;
  
  console.log('📧 RESEND API KEY:');
  console.log('   Key exists:', !!resendKey);
  console.log('   Key prefix:', resendKey?.substring(0, 10) || 'NOT SET');
  console.log('   Key length:', resendKey?.length || 0);
  console.log('   Valid format:', resendKey?.startsWith('re_') ? 'YES' : 'NO');
  console.log('');

  if (!resendKey || !resendKey.startsWith('re_')) {
    console.error('❌ ОШИБКА: RESEND_API_KEY не настроен правильно!');
    console.error('❌ Текущее значение выглядит как тестовое/placeholder');
    console.error('');
    console.error('💡 Как получить настоящий ключ:');
    console.error('   1. Зарегистрируйтесь на https://resend.com');
    console.error('   2. Создайте API ключ в панели управления');
    console.error('   3. Добавьте в backend/env.env:');
    console.error('      RESEND_API_KEY=re_ВАШИ_НАСТОЯЩИЕ_ДАННЫЕ');
    console.error('');
    console.error('⚠️ С текущим ключом отправка НЕ БУДЕТ РАБОТАТЬ');
    console.error('');
    
    // Все равно пробуем отправить для демонстрации ошибки
    console.log('⚡ Попытка отправки с текущим ключом (ожидается ошибка)...\n');
  }

  // Тестовые данные
  const testEmail = 'smmmcwin@gmail.com'; // Email пользователя
  const testName = 'Тест Пользователь';
  const testProductUrl = 'https://expresscourse.onai.academy/expresscourse?utm_source=proftest_email_test';

  console.log('📨 Отправка тестового письма...');
  console.log('   TO:', testEmail);
  console.log('   FROM: OnAI Academy <noreply@onai.academy>');
  console.log('   NAME:', testName);
  console.log('   PRODUCT URL:', testProductUrl);
  console.log('');

  try {
    // Инициализируем Resend
    const resend = new Resend(resendKey);
    
    // Генерируем HTML шаблон
    const htmlContent = generateProftestResultEmail(testName, testProductUrl);
    
    console.log('📄 HTML шаблон сгенерирован (' + htmlContent.length + ' символов)');
    console.log('');
    
    // Отправляем email
    const { data, error } = await resend.emails.send({
      from: 'OnAI Academy <noreply@onai.academy>',
      to: testEmail,
      subject: '🎯 Тест пройден! Получите доступ к продукту',
      html: htmlContent,
    });

    if (error) {
      console.error('❌ RESEND API ОШИБКА:');
      console.error('   Error:', error);
      console.error('   Message:', error.message || 'Unknown error');
      console.error('');
      
      if (error.message?.includes('API key') || error.message?.includes('authentication')) {
        console.error('💡 Проблема с API ключом!');
        console.error('   Получите настоящий ключ на https://resend.com/api-keys');
      }
      
      process.exit(1);
    }

    console.log('✅ ПИСЬМО УСПЕШНО ОТПРАВЛЕНО!');
    console.log('');
    console.log('📬 Детали отправки:');
    console.log('   Email ID:', data?.id);
    console.log('   Получатель:', testEmail);
    console.log('');
    console.log('💡 Проверьте почту (включая спам-папку)');
    console.log('');
    console.log('🎉 Тест пройден! Email сервис работает корректно.');

  } catch (exception: any) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА ПРИ ОТПРАВКЕ:');
    console.error('');
    console.error('Exception:', exception);
    console.error('Message:', exception.message);
    console.error('Name:', exception.name);
    console.error('');
    
    if (exception.message?.includes('unauthorized') || exception.message?.includes('401')) {
      console.error('💡 Ошибка авторизации - неправильный API ключ!');
      console.error('   Проверьте RESEND_API_KEY в backend/env.env');
    }
    
    process.exit(1);
  }
}

// Запускаем тест
testProftestEmail().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
