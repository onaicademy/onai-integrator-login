/**
 * Отправка email правильному студенту: bakkee24@gmail.com (не 26!)
 */

import { createClient } from '@supabase/supabase-js';
import { sendWelcomeEmail } from '../src/services/emailService';
import * as crypto from 'crypto';

const TRIPWIRE_URL = 'https://pjmvxecykysfrzppdcto.supabase.co';
const TRIPWIRE_SERVICE_KEY = process.env.TRIPWIRE_SERVICE_ROLE_KEY || '';

const tripwireSupabase = createClient(TRIPWIRE_URL, TRIPWIRE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const STUDENT = {
  email: 'bakkee24@gmail.com', // ПРАВИЛЬНЫЙ email
  full_name: 'Букешев Досжан Бейбытекович',
};

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(crypto.randomInt(0, chars.length));
  }
  return password;
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  📧 ОТПРАВКА EMAIL: bakkee24@gmail.com                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log(`Студент: ${STUDENT.full_name}`);
  console.log(`Email: ${STUDENT.email}\n`);

  // 1. Найти пользователя
  console.log('[1/4] Поиск пользователя...');
  const { data: { users }, error } = await tripwireSupabase.auth.admin.listUsers();

  if (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }

  const user = users?.find(u => u.email === STUDENT.email);

  if (!user) {
    console.error(`❌ Пользователь не найден: ${STUDENT.email}`);
    process.exit(1);
  }

  console.log(`✅ Найден (ID: ${user.id})\n`);

  // 2. Генерация пароля
  console.log('[2/4] Генерация пароля...');
  const password = generatePassword();
  console.log(`✅ Новый пароль: ${password}\n`);

  // 3. Обновление пароля
  console.log('[3/4] Обновление пароля в базе...');
  const { error: updateError } = await tripwireSupabase.auth.admin.updateUserById(
    user.id,
    { password }
  );

  if (updateError) {
    console.error('❌ Ошибка обновления:', updateError);
    process.exit(1);
  }

  console.log(`✅ Пароль обновлён\n`);

  // 4. Отправка email
  console.log('[4/4] Отправка приветственного письма...');
  const sent = await sendWelcomeEmail({
    toEmail: STUDENT.email,
    name: STUDENT.full_name,
    password,
  });

  if (!sent) {
    console.error(`❌ Ошибка отправки email`);
    console.error(`⚠️  ПАРОЛЬ УЖЕ ИЗМЕНЁН: ${password}`);
    console.error(`⚠️  Отправьте пароль вручную!`);
    process.exit(1);
  }

  console.log(`✅ Email отправлен на ${STUDENT.email}\n`);

  console.log('═'.repeat(60));
  console.log('🎉 ВСЁ ГОТОВО!');
  console.log(`   Студент: ${STUDENT.full_name}`);
  console.log(`   Email: ${STUDENT.email}`);
  console.log(`   Пароль изменён и отправлен!`);
  console.log('═'.repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Ошибка:', err);
    process.exit(1);
  });
