// Быстрый тест для zankachidix.ai@gmail.com
import amoCrmService from './backend/src/services/amoCrmService.js';

const email = 'zankachidix.ai@gmail.com';

console.log('\n🧪 Тестирование amoCRM для', email, '\n');

try {
  // Тест 1: Найти сделку
  console.log('1️⃣ Поиск сделки...');
  const leadId = await amoCrmService.findLeadIdByEmail(email);
  
  if (!leadId) {
    console.error('❌ Сделка не найдена!');
    console.log('💡 Проверьте:');
    console.log('   - Email в amoCRM совпадает точно');
    console.log('   - Сделка в воронке "onAI Academy"');
    process.exit(1);
  }
  
  console.log(`✅ Найдена сделка: ID ${leadId}\n`);
  
  // Тест 2-4: Обновить для каждого урока
  for (const lessonNumber of [1, 2, 3]) {
    console.log(`${lessonNumber + 1}️⃣ Обновление для Урока ${lessonNumber}...`);
    await amoCrmService.onLessonCompleted(email, lessonNumber);
    console.log(`✅ Урок ${lessonNumber} обработан\n`);
  }
  
  console.log('🎉 Проверка завершена!');
  console.log('📊 Теперь проверьте amoCRM - сделка должна быть на этапе "ПРОШЕЛ 3Й УРОК"');
  
} catch (error) {
  console.error('❌ Ошибка:', error.message);
  console.error(error);
  process.exit(1);
}




















