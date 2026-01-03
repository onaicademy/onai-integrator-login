#!/usr/bin/env tsx
/**
 * Массовая выдача сертификатов всем студентам, которые завершили 3/3 модуля
 *
 * Использование:
 *   npx tsx scripts/issue-all-missing-certificates.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const TRIPWIRE_SUPABASE_URL = process.env.TRIPWIRE_SUPABASE_URL || '';
const TRIPWIRE_SERVICE_ROLE_KEY = process.env.TRIPWIRE_SERVICE_ROLE_KEY || '';

if (!TRIPWIRE_SUPABASE_URL || !TRIPWIRE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Tripwire Supabase credentials');
  process.exit(1);
}

const supabase = createClient(TRIPWIRE_SUPABASE_URL, TRIPWIRE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

interface Student {
  user_id: string;
  email: string;
  full_name: string;
}

async function issueForStudent(student: Student, index: number, total: number): Promise<boolean> {
  console.log(`\n━━━ [${index + 1}/${total}] ${student.full_name} ━━━`);
  console.log(`   Email: ${student.email}`);
  console.log(`   User ID: ${student.user_id}\n`);

  try {
    // Импортируем сервис
    const { issueCertificate } = await import('../src/services/tripwire/tripwireCertificateService');

    // Выдаём сертификат
    const certificate = await issueCertificate(student.user_id);

    console.log(`   ✅ Сертификат выдан!`);
    console.log(`   📋 Номер: ${certificate.certificate_number}`);
    console.log(`   🔗 URL: ${certificate.pdf_url}\n`);

    return true;
  } catch (error: any) {
    console.error(`   ❌ ОШИБКА: ${error.message}\n`);
    return false;
  }
}

async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎓 МАССОВАЯ ВЫДАЧА СЕРТИФИКАТОВ');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Получаем студентов без сертификатов
  const { data: profiles, error: profileError } = await supabase
    .from('tripwire_user_profile')
    .select('user_id, modules_completed, certificate_issued')
    .eq('modules_completed', 3)
    .eq('certificate_issued', false);

  if (profileError) {
    console.error('❌ Ошибка получения профилей:', profileError.message);
    process.exit(1);
  }

  if (!profiles || profiles.length === 0) {
    console.log('✅ Все студенты уже получили сертификаты!\n');
    return;
  }

  console.log(`📊 Найдено студентов: ${profiles.length}\n`);

  // 2. Получаем детали студентов
  const students: Student[] = [];

  for (const profile of profiles) {
    const { data: user, error: userError } = await supabase
      .from('tripwire_users')
      .select('email, full_name')
      .eq('user_id', profile.user_id)
      .maybeSingle();

    if (!userError && user) {
      // Проверяем прогресс
      const { data: progress } = await supabase
        .from('tripwire_progress')
        .select('module_id, is_completed')
        .eq('tripwire_user_id', profile.user_id)
        .eq('is_completed', true);

      const completedModules = new Set(progress?.map(p => p.module_id) || []);
      const allCompleted = completedModules.has(16) && completedModules.has(17) && completedModules.has(18);

      if (allCompleted) {
        students.push({
          user_id: profile.user_id,
          email: user.email,
          full_name: user.full_name,
        });
      }
    }
  }

  if (students.length === 0) {
    console.log('✅ Нет студентов, требующих выдачи сертификата\n');
    return;
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🚀 НАЧАЛО ВЫДАЧИ (${students.length} студентов)`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // 3. Выдаём сертификаты
  const results = {
    success: 0,
    failed: 0,
  };

  for (let i = 0; i < students.length; i++) {
    const success = await issueForStudent(students[i], i, students.length);
    if (success) {
      results.success++;
    } else {
      results.failed++;
    }

    // Небольшая пауза между запросами (чтобы не перегрузить Puppeteer)
    if (i < students.length - 1) {
      console.log('   ⏳ Пауза 3 секунды...\n');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  // 4. Итоги
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 ИТОГИ ВЫДАЧИ');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`   ✅ Успешно выдано: ${results.success}`);
  console.log(`   ❌ Ошибки: ${results.failed}`);
  console.log(`   📊 Всего обработано: ${students.length}\n`);

  if (results.failed > 0) {
    console.log('⚠️ Некоторые сертификаты не были выданы из-за ошибок.');
    console.log('   Проверьте логи выше и повторите для проблемных студентов.\n');
  } else {
    console.log('✅ Все сертификаты успешно выданы!\n');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch(err => {
  console.error('💥 Необработанная ошибка:', err);
  process.exit(1);
});
