/**
 * 📧 МАССОВАЯ ОТПРАВКА: Email о доступе + инструкция очистки кэша
 * Отправляет email всем студентам Tripwire (кроме admin и sales)
 */

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import dotenv from 'dotenv';
import { generateCacheResetEmail } from '../src/templates/tripwireCacheResetEmail.js';

dotenv.config({ path: './env.env' });

const TRIPWIRE_SUPABASE_URL = 'https://pjmvxecykysfrzppdcto.supabase.co';
const TRIPWIRE_SERVICE_KEY = process.env.TRIPWIRE_SERVICE_ROLE_KEY!;
const RESEND_API_KEY = process.env.RESEND_API_KEY!;

// Исключаем этих пользователей
const EXCLUDED_EMAILS = [
  'smmmcwin@gmail.com',       // Admin (Alexander CEO)
  'rakhat@onaiacademy.kz',    // Sales Manager 1
  'amina@onaiacademy.kz',     // Sales Manager 2
  'aselya@onaiacademy.kz',    // Sales Manager 3
];

async function sendCacheResetEmails() {
  const supabase = createClient(TRIPWIRE_SUPABASE_URL, TRIPWIRE_SERVICE_KEY);
  const resend = new Resend(RESEND_API_KEY);

  console.log('\n📧 МАССОВАЯ ОТПРАВКА: Уведомление о доступе + очистка кэша\n');

  // 1. Получить всех студентов
  const { data: students, error } = await supabase
    .from('tripwire_users')
    .select('id, email, full_name')
    .not('email', 'in', `(${EXCLUDED_EMAILS.map(e => `"${e}"`).join(',')})`)
    .eq('user_id', null, { nullComparison: false }) // Только студенты с user_id
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Ошибка получения студентов:', error);
    process.exit(1);
  }

  if (!students || students.length === 0) {
    console.log('❌ Студенты не найдены!');
    process.exit(0);
  }

  console.log(`📊 Найдено студентов: ${students.length}`);
  console.log(`📤 Будет отправлено: ${students.length} emails\n`);

  // Подтверждение
  console.log('⚠️  ВНИМАНИЕ: Сейчас будет отправлено', students.length, 'emails!');
  console.log('Первые 5 получателей:');
  students.slice(0, 5).forEach(s => {
    console.log(`   - ${s.full_name} (${s.email})`);
  });
  console.log('');

  // Даём 5 секунд для прерывания (Ctrl+C)
  console.log('⏳ Начинаю через 5 секунд... (Ctrl+C для отмены)\n');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // 2. Отправка emails
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    console.log(`[${i + 1}/${students.length}] Отправка ${student.email}...`);

    try {
      const htmlContent = generateCacheResetEmail(student.full_name);

      const { data, error } = await resend.emails.send({
        from: 'OnAI Academy <noreply@onai.academy>',
        to: student.email,
        subject: '🚀 Доступ к AI Интегратор открыт! Инструкция по входу',
        html: htmlContent,
      });

      if (error) {
        console.error(`   ❌ Ошибка: ${error.message}`);
        errorCount++;
      } else {
        console.log(`   ✅ Отправлено (ID: ${data?.id})`);
        successCount++;
      }

      // Задержка между отправками (чтобы не превысить rate limit)
      if (i < students.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms между emails
      }

    } catch (err: any) {
      console.error(`   ❌ Ошибка: ${err.message}`);
      errorCount++;
    }
  }

  // 3. Итоги
  console.log('\n═══════════════════════════════════════════');
  console.log('✅ МАССОВАЯ ОТПРАВКА ЗАВЕРШЕНА!');
  console.log('═══════════════════════════════════════════\n');
  console.log(`📊 Статистика:`);
  console.log(`   • Всего студентов: ${students.length}`);
  console.log(`   • Успешно отправлено: ${successCount} ✅`);
  console.log(`   • Ошибок: ${errorCount} ❌`);
  console.log(`   • Успешность: ${Math.round((successCount / students.length) * 100)}%\n`);

  if (errorCount > 0) {
    console.log('⚠️  Были ошибки! Проверьте логи выше.');
  } else {
    console.log('🎉 Все emails отправлены успешно!');
  }
}

// Запуск
sendCacheResetEmails()
  .catch(error => {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА:', error);
    process.exit(1);
  });
