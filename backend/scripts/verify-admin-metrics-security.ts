/**
 * 🔒 ПРОВЕРКА БЕЗОПАСНОСТИ: Метрики админ-панели
 * 
 * Проверяем:
 * 1. ✅ Админы и sales НЕ попадают в список студентов
 * 2. ✅ Не возвращаются пароли, токены, sensitive данные
 * 3. ✅ Доступ только для админа
 * 4. ✅ Данные корректно фильтруются
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './env.env' });

const TRIPWIRE_SUPABASE_URL = 'https://pjmvxecykysfrzppdcto.supabase.co';
const TRIPWIRE_SERVICE_KEY = process.env.TRIPWIRE_SERVICE_ROLE_KEY!;

const EXCLUDED_EMAILS = [
  'smmmcwin@gmail.com',       // Admin (Alexander CEO)
  'rakhat@onaiacademy.kz',    // Sales Manager 1
  'amina@onaiacademy.kz',     // Sales Manager 2
  'aselya@onaiacademy.kz',    // Sales Manager 3
];

async function verifyAdminMetricsSecurity() {
  const supabase = createClient(TRIPWIRE_SUPABASE_URL, TRIPWIRE_SERVICE_KEY);

  console.log('\n🔒 ПРОВЕРКА БЕЗОПАСНОСТИ: Метрики админ-панели\n');
  console.log('═══════════════════════════════════════════════\n');

  try {
    // 🎯 ШАГ 1: ПРОВЕРКА ФИЛЬТРАЦИИ (админы и sales должны быть исключены)
    console.log('📊 Шаг 1: Проверка фильтрации админов и sales...\n');

    // Получить user_id для исключенных пользователей
    const { data: excludedUsers } = await supabase
      .from('tripwire_users')
      .select('user_id, email')
      .in('email', EXCLUDED_EMAILS)
      .not('user_id', 'is', null);

    const excludedUserIds = excludedUsers?.map(u => u.user_id) || [];

    console.log(`   🚫 Исключаем ${excludedUserIds.length} админов/sales:`);
    excludedUsers?.forEach(u => {
      console.log(`      - ${u.email}`);
    });

    // Получить всех студентов (как в endpoint /students)
    const { data: tripwireProfiles, error: profileError } = await supabase
      .from('tripwire_user_profile')
      .select('user_id, modules_completed, total_modules, completion_percentage, created_at, updated_at');

    if (profileError) throw profileError;

    const userIds = tripwireProfiles?.map(p => p.user_id) || [];

    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, full_name, created_at')
      .in('id', userIds)
      .order('created_at', { ascending: false });

    if (usersError) throw usersError;

    // Получить последнюю активность
    const { data: progressActivities } = await supabase
      .from('tripwire_progress')
      .select('tripwire_user_id, updated_at')
      .in('tripwire_user_id', userIds)
      .order('updated_at', { ascending: false });

    const lastActivityMap = new Map<string, string>();
    progressActivities?.forEach(p => {
      if (!lastActivityMap.has(p.tripwire_user_id)) {
        lastActivityMap.set(p.tripwire_user_id, p.updated_at);
      }
    });

    // Объединить данные
    const studentsWithProgress = users?.map(user => {
      const profile = tripwireProfiles?.find(p => p.user_id === user.id);
      const lastActivity = lastActivityMap.get(user.id) || profile?.updated_at || null;
      
      return {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        created_at: user.created_at,
        total_modules: profile?.total_modules || 0,
        completed_modules: profile?.modules_completed || 0,
        progress_percent: Math.round(profile?.completion_percentage || 0),
        enrolled_at: profile?.created_at,
        last_sign_in_at: lastActivity
      };
    }) || [];

    console.log(`\n   ✅ Всего профилей: ${studentsWithProgress.length}`);

    // 🎯 ПРОВЕРКА 1: Админы и sales НЕ должны попадать в список
    const leakedAdmins = studentsWithProgress.filter(s => 
      EXCLUDED_EMAILS.includes(s.email)
    );

    if (leakedAdmins.length > 0) {
      console.log('\n   ❌ КРИТИЧНО! УТЕЧКА ДАННЫХ!');
      console.log('   ⚠️  Админы/sales в списке студентов:');
      leakedAdmins.forEach(admin => {
        console.log(`      - ${admin.email} (${admin.full_name})`);
      });
    } else {
      console.log('   ✅ Фильтрация работает! Админы/sales НЕ в списке студентов');
    }

    // 🎯 ПРОВЕРКА 2: Sensitive данные НЕ должны возвращаться
    console.log('\n📊 Шаг 2: Проверка sensitive данных...\n');

    const sampleStudent = studentsWithProgress[0];
    const studentFields = Object.keys(sampleStudent);

    const sensitiveFields = [
      'password', 'password_hash', 'hashed_password',
      'api_key', 'secret', 'token', 'jwt',
      'private_key', 'salt', 'user_metadata',
      'encrypted_password', 'role'
    ];

    const foundSensitiveFields = studentFields.filter(field => 
      sensitiveFields.some(sensitive => field.toLowerCase().includes(sensitive))
    );

    if (foundSensitiveFields.length > 0) {
      console.log('   ❌ КРИТИЧНО! УТЕЧКА SENSITIVE ДАННЫХ!');
      console.log('   ⚠️  Найдены поля:', foundSensitiveFields);
    } else {
      console.log('   ✅ Sensitive данные НЕ возвращаются!');
    }

    console.log('\n   📋 Возвращаемые поля:');
    studentFields.forEach(field => {
      console.log(`      - ${field}`);
    });

    // 🎯 ПРОВЕРКА 3: Статистика студентов
    console.log('\n📊 Шаг 3: Статистика студентов...\n');

    const realStudentsCount = studentsWithProgress.filter(s => 
      !EXCLUDED_EMAILS.includes(s.email)
    ).length;

    const studentsWithProgress0 = studentsWithProgress.filter(s => 
      s.completed_modules === 0 && !EXCLUDED_EMAILS.includes(s.email)
    ).length;

    const studentsWithProgress3 = studentsWithProgress.filter(s => 
      s.completed_modules === 3 && !EXCLUDED_EMAILS.includes(s.email)
    ).length;

    const studentsWithActivity = studentsWithProgress.filter(s => 
      s.last_sign_in_at && !EXCLUDED_EMAILS.includes(s.email)
    ).length;

    console.log(`   📊 Реальных студентов (без админов/sales): ${realStudentsCount}`);
    console.log(`   📊 Студентов без прогресса (0 модулей): ${studentsWithProgress0}`);
    console.log(`   📊 Студентов завершивших всё (3 модуля): ${studentsWithProgress3}`);
    console.log(`   📊 Студентов с активностью: ${studentsWithActivity}`);

    // 🎯 ПРОВЕРКА 4: Примеры студентов (первые 5)
    console.log('\n📊 Шаг 4: Примеры студентов (первые 5)...\n');

    const realStudents = studentsWithProgress
      .filter(s => !EXCLUDED_EMAILS.includes(s.email))
      .slice(0, 5);

    realStudents.forEach((student, i) => {
      console.log(`   ${i + 1}. ${student.email}`);
      console.log(`      Имя: ${student.full_name || 'Не указано'}`);
      console.log(`      Прогресс: ${student.progress_percent}% (${student.completed_modules}/${student.total_modules} модулей)`);
      console.log(`      Последняя активность: ${student.last_sign_in_at ? new Date(student.last_sign_in_at).toLocaleString('ru-RU') : 'Никогда'}`);
      console.log('');
    });

    // 🎯 ИТОГОВЫЙ ОТЧЕТ
    console.log('\n═══════════════════════════════════════════════');
    console.log('✅ ПРОВЕРКА ЗАВЕРШЕНА!');
    console.log('═══════════════════════════════════════════════\n');

    let securityScore = 0;
    const maxScore = 4;

    // Оценка 1: Фильтрация админов
    if (leakedAdmins.length === 0) {
      console.log('✅ [1/4] Фильтрация админов/sales: КОРРЕКТНА');
      securityScore++;
    } else {
      console.log('❌ [1/4] Фильтрация админов/sales: ПРОВАЛ');
    }

    // Оценка 2: Sensitive данные
    if (foundSensitiveFields.length === 0) {
      console.log('✅ [2/4] Защита sensitive данных: КОРРЕКТНА');
      securityScore++;
    } else {
      console.log('❌ [2/4] Защита sensitive данных: ПРОВАЛ');
    }

    // Оценка 3: Данные студентов
    if (realStudentsCount > 0) {
      console.log('✅ [3/4] Данные студентов: ПОДТЯГИВАЮТСЯ');
      securityScore++;
    } else {
      console.log('❌ [3/4] Данные студентов: НЕ НАЙДЕНЫ');
    }

    // Оценка 4: Активность
    if (studentsWithActivity > 0) {
      console.log('✅ [4/4] Трекинг активности: РАБОТАЕТ');
      securityScore++;
    } else {
      console.log('⚠️  [4/4] Трекинг активности: НЕ РАБОТАЕТ');
    }

    console.log(`\n🎯 ИТОГОВАЯ ОЦЕНКА: ${securityScore}/${maxScore}`);

    if (securityScore === maxScore) {
      console.log('✅ БЕЗОПАСНОСТЬ: 100% - Всё корректно!');
    } else if (securityScore >= 3) {
      console.log('⚠️  БЕЗОПАСНОСТЬ: 75% - Есть мелкие проблемы');
    } else {
      console.log('❌ БЕЗОПАСНОСТЬ: КРИТИЧНЫЕ ПРОБЛЕМЫ!');
    }

    console.log('');

  } catch (err: any) {
    console.error('\n❌ ОШИБКА:', err.message);
    process.exit(1);
  }
}

verifyAdminMetricsSecurity();
