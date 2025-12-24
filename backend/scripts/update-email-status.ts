/**
 * Обновление статуса welcome_email_sent для трёх студентов
 *
 * Эти студенты уже получили письма через скрипты:
 * - final-send-to-3-users.ts
 * - resend-with-correct-link.ts
 *
 * Но поле welcome_email_sent в базе не было обновлено,
 * поэтому в UI показывается красный крестик вместо зелёной галочки.
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: './env.env' });

import { createClient } from '@supabase/supabase-js';

const TRIPWIRE_URL = process.env.TRIPWIRE_SUPABASE_URL || 'https://pjmvxecykysfrzppdcto.supabase.co';
const TRIPWIRE_SERVICE_KEY = process.env.TRIPWIRE_SERVICE_ROLE_KEY || '';

if (!TRIPWIRE_SERVICE_KEY || TRIPWIRE_SERVICE_KEY.length < 50) {
  console.error('❌ ERROR: TRIPWIRE_SERVICE_ROLE_KEY not configured');
  process.exit(1);
}

const tripwireSupabase = createClient(TRIPWIRE_URL, TRIPWIRE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Три студента, которые уже получили письма
const STUDENT_EMAILS = [
  'bakkee24@gmail.com',
  'khaltekeshev2004@gmail.com',
  'aslanumarov@mail.ru',
];

async function updateEmailStatus() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ✉️  ОБНОВЛЕНИЕ СТАТУСА EMAIL В БАЗЕ ДАННЫХ                ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log(`📋 Студентов для обновления: ${STUDENT_EMAILS.length}\n`);

  // 1. Проверяем текущий статус
  console.log('[1/3] Проверка текущего статуса в базе...\n');

  const { data: currentUsers, error: fetchError } = await tripwireSupabase
    .from('tripwire_users')
    .select('user_id, email, full_name, welcome_email_sent, welcome_email_sent_at')
    .in('email', STUDENT_EMAILS);

  if (fetchError) {
    console.error('❌ Ошибка получения данных:', fetchError);
    process.exit(1);
  }

  if (!currentUsers || currentUsers.length === 0) {
    console.error('❌ Пользователи не найдены в tripwire_users');
    process.exit(1);
  }

  console.log('Текущий статус:');
  currentUsers.forEach(user => {
    const status = user.welcome_email_sent ? '✅ true' : '❌ false';
    console.log(`  ${user.email}`);
    console.log(`    Имя: ${user.full_name}`);
    console.log(`    welcome_email_sent: ${status}`);
    console.log(`    welcome_email_sent_at: ${user.welcome_email_sent_at || 'не установлено'}`);
    console.log('');
  });

  // 2. Обновляем статус
  console.log('[2/3] Обновление статуса в базе...\n');

  const now = new Date().toISOString();
  const { data: updatedUsers, error: updateError } = await tripwireSupabase
    .from('tripwire_users')
    .update({
      welcome_email_sent: true,
      welcome_email_sent_at: now
    })
    .in('email', STUDENT_EMAILS)
    .select('email, full_name, welcome_email_sent, welcome_email_sent_at');

  if (updateError) {
    console.error('❌ Ошибка обновления:', updateError);
    process.exit(1);
  }

  console.log(`✅ Обновлено записей: ${updatedUsers?.length || 0}\n`);

  // 3. Проверяем результат
  console.log('[3/3] Проверка обновлённого статуса...\n');

  const { data: verifyUsers, error: verifyError } = await tripwireSupabase
    .from('tripwire_users')
    .select('user_id, email, full_name, welcome_email_sent, welcome_email_sent_at')
    .in('email', STUDENT_EMAILS);

  if (verifyError) {
    console.error('❌ Ошибка проверки:', verifyError);
    process.exit(1);
  }

  console.log('Обновлённый статус:');
  verifyUsers?.forEach(user => {
    const status = user.welcome_email_sent ? '✅ true' : '❌ false';
    console.log(`  ${user.email}`);
    console.log(`    Имя: ${user.full_name}`);
    console.log(`    welcome_email_sent: ${status}`);
    console.log(`    welcome_email_sent_at: ${user.welcome_email_sent_at}`);
    console.log('');
  });

  // Финальный отчёт
  console.log('═'.repeat(60));
  console.log('📊 ИТОГОВЫЙ ОТЧЁТ');
  console.log('═'.repeat(60));

  const allUpdated = verifyUsers?.every(u => u.welcome_email_sent === true);

  if (allUpdated && verifyUsers?.length === STUDENT_EMAILS.length) {
    console.log('\n✅ ВСЁ ГОТОВО!');
    console.log(`   Обновлено статусов: ${verifyUsers.length}/${STUDENT_EMAILS.length}`);
    console.log('   Теперь в UI должны отображаться зелёные галочки ✓');
    console.log('\n💡 Обновите страницу: https://onai.academy/integrator/sales-manager');
  } else {
    console.log('\n⚠️  ВНИМАНИЕ: Не все записи обновлены!');
    console.log(`   Обновлено: ${verifyUsers?.filter(u => u.welcome_email_sent).length}/${STUDENT_EMAILS.length}`);
  }

  console.log('═'.repeat(60));
}

updateEmailStatus()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА:', error);
    process.exit(1);
  });
