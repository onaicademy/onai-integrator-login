/**
 * Ручное тестирование интеграции amoCRM для пользователя zankachidix.ai@gmail.com
 * 
 * Запуск: node backend/test-amocrm-manual.js
 */

const path = require('path');
const dotenv = require('dotenv');

// Загрузить .env из backend папки
dotenv.config({ path: path.resolve(__dirname, 'backend/.env') });

// Импорт сервиса
const amoCrmService = require('./backend/src/services/amoCrmService');
const { adminSupabase } = require('./backend/src/config/supabase');

const TEST_EMAIL = 'zankachidix.ai@gmail.com';

async function testUser() {
  console.log('========================================');
  console.log('🧪 ТЕСТИРОВАНИЕ ИНТЕГРАЦИИ AMOCRM');
  console.log('========================================\n');

  console.log(`📧 Тестовый пользователь: ${TEST_EMAIL}\n`);

  // ========================================
  // ШАГ 1: Проверка пользователя в БД
  // ========================================
  console.log('='.repeat(60));
  console.log('ШАГ 1: Проверка пользователя в БД');
  console.log('='.repeat(60));

  const { data: users, error: userError } = await adminSupabase
    .from('users')
    .select(`
      id,
      email,
      created_at,
      tripwire_users (
        id,
        tripwire_user_profile (
          full_name,
          modules_completed
        )
      )
    `)
    .eq('email', TEST_EMAIL);

  if (userError || !users || users.length === 0) {
    console.error(`❌ Пользователь ${TEST_EMAIL} не найден в БД!`);
    console.error('Ошибка:', userError);
    return;
  }

  const user = users[0];
  const tripwireUserId = user.tripwire_users?.[0]?.id;
  const fullName = user.tripwire_users?.[0]?.tripwire_user_profile?.[0]?.full_name || 'Не указано';
  const modulesCompleted = user.tripwire_users?.[0]?.tripwire_user_profile?.[0]?.modules_completed || 0;

  console.log(`✅ Пользователь найден в БД:`);
  console.log(`   - ID: ${user.id}`);
  console.log(`   - Email: ${user.email}`);
  console.log(`   - Имя: ${fullName}`);
  console.log(`   - Модулей завершено: ${modulesCompleted}`);
  console.log(`   - Tripwire User ID: ${tripwireUserId}`);
  console.log(`   - Зарегистрирован: ${new Date(user.created_at).toLocaleString('ru-RU')}\n`);

  // ========================================
  // ШАГ 2: Проверка прогресса по Tripwire урокам
  // ========================================
  console.log('='.repeat(60));
  console.log('ШАГ 2: Проверка прогресса по Tripwire урокам (67, 68, 69)');
  console.log('='.repeat(60));

  const { data: progress, error: progressError } = await adminSupabase
    .from('tripwire_progress')
    .select(`
      lesson_id,
      is_completed,
      completed_at,
      video_progress_percent,
      lessons (
        title,
        module_id
      )
    `)
    .eq('tripwire_user_id', user.id)
    .in('lesson_id', [67, 68, 69])
    .order('lesson_id');

  if (progressError) {
    console.error('❌ Ошибка получения прогресса:', progressError);
  }

  if (!progress || progress.length === 0) {
    console.log('⚠️  Tripwire уроки (67, 68, 69) не найдены в прогрессе');
    console.log('💡 Возможно, пользователь ещё не начинал эти уроки\n');
  } else {
    console.log(`✅ Найдено ${progress.length} Tripwire урока(ов) в прогрессе:\n`);
    
    progress.forEach((p) => {
      const lessonNumber = p.lesson_id === 67 ? 1 : p.lesson_id === 68 ? 2 : 3;
      console.log(`📚 Урок ${lessonNumber} (lesson_id: ${p.lesson_id})`);
      console.log(`   - Название: ${p.lessons[0]?.title || 'Не указано'}`);
      console.log(`   - Модуль: ${p.lessons[0]?.module_id || 'Не указано'}`);
      console.log(`   - Завершён: ${p.is_completed ? '✅ Да' : '❌ Нет'}`);
      console.log(`   - Прогресс: ${p.video_progress_percent || 0}%`);
      if (p.completed_at) {
        console.log(`   - Дата завершения: ${new Date(p.completed_at).toLocaleString('ru-RU')}`);
      }
      console.log('');
    });
  }

  // ========================================
  // ШАГ 3: Проверка сделки в amoCRM
  // ========================================
  console.log('='.repeat(60));
  console.log('ШАГ 3: Поиск сделки в amoCRM');
  console.log('='.repeat(60));

  console.log(`🔍 Ищем сделку для email: ${TEST_EMAIL}\n`);

  const leadId = await amoCrmService.findLeadIdByEmail(TEST_EMAIL);

  if (!leadId) {
    console.error(`❌ Сделка для ${TEST_EMAIL} не найдена в amoCRM!`);
    console.error('💡 Возможные причины:');
    console.error('   1. Email в amoCRM отличается (опечатка, регистр)');
    console.error('   2. Контакт не создан в amoCRM');
    console.error('   3. Сделка не в воронке "onAI Academy"');
    console.error('\n📚 См. AMOCRM_TESTING_PLAN.md → "Частые проблемы"\n');
    return;
  }

  console.log(`✅ Сделка найдена! ID: ${leadId}\n`);

  // ========================================
  // ШАГ 4: Ручное обновление сделки для каждого завершённого урока
  // ========================================
  console.log('='.repeat(60));
  console.log('ШАГ 4: Ручное обновление сделки в amoCRM');
  console.log('='.repeat(60));

  if (!progress || progress.length === 0) {
    console.log('⚠️  Нет завершённых Tripwire уроков для обновления\n');
    return;
  }

  const completedLessons = progress.filter(p => p.is_completed);

  if (completedLessons.length === 0) {
    console.log('⚠️  Нет завершённых Tripwire уроков\n');
    console.log('💡 Попросите пользователя завершить уроки, затем повторите тест\n');
    return;
  }

  console.log(`📝 Найдено ${completedLessons.length} завершённых урока(ов)\n`);

  // Обрабатываем каждый завершённый урок
  for (const lesson of completedLessons) {
    const lessonNumber = lesson.lesson_id === 67 ? 1 : lesson.lesson_id === 68 ? 2 : 3;
    
    console.log(`\n🚀 Обрабатываем Урок ${lessonNumber} (lesson_id: ${lesson.lesson_id})`);
    console.log('─'.repeat(60));
    
    try {
      // Вызываем функцию, которую использует платформа
      await amoCrmService.onLessonCompleted(TEST_EMAIL, lessonNumber);
      
      console.log(`✅ Урок ${lessonNumber} обработан успешно!`);
    } catch (error) {
      console.error(`❌ Ошибка при обработке урока ${lessonNumber}:`, error.message);
    }
  }

  // ========================================
  // ШАГ 5: Итоговая сводка
  // ========================================
  console.log('\n' + '='.repeat(60));
  console.log('🎉 ТЕСТИРОВАНИЕ ЗАВЕРШЕНО');
  console.log('='.repeat(60));

  console.log(`\n📊 Итоговая сводка:`);
  console.log(`   - Пользователь: ${TEST_EMAIL}`);
  console.log(`   - Сделка в amoCRM: ${leadId ? `✅ ID ${leadId}` : '❌ Не найдена'}`);
  console.log(`   - Завершённых уроков: ${completedLessons.length}/3`);
  console.log(`   - Обновлений отправлено: ${completedLessons.length}`);

  console.log(`\n💡 Следующие шаги:`);
  console.log(`   1. Откройте amoCRM`);
  console.log(`   2. Найдите сделку ID: ${leadId}`);
  console.log(`   3. Проверьте, что сделка на правильном этапе:`);
  
  completedLessons.forEach((lesson) => {
    const lessonNumber = lesson.lesson_id === 67 ? 1 : lesson.lesson_id === 68 ? 2 : 3;
    const expectedStage = lessonNumber === 1 ? 'ПРОШЕЛ ПЕРВЫЙ УРОК' 
                        : lessonNumber === 2 ? 'ПРОШЕЛ ВТОРОЙ УРОК'
                        : 'ПРОШЕЛ 3Й УРОК';
    console.log(`      - Урок ${lessonNumber} → "${expectedStage}"`);
  });

  console.log(`\n✅ Если сделка переместилась → интеграция работает!\n`);
}

// Запуск
console.log('\n⏳ Запуск теста...\n');

testUser()
  .then(() => {
    console.log('✅ Тест завершён успешно\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Произошла ошибка:', error);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  });




















