// Тест подключения к Supabase
require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

console.log('🔍 Проверка Supabase подключения...\n');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('SUPABASE_URL:', supabaseUrl);
console.log('SUPABASE_SERVICE_ROLE_KEY (первые 20 символов):', supabaseKey?.substring(0, 20) + '...');
console.log('SUPABASE_SERVICE_ROLE_KEY (длина):', supabaseKey?.length);
console.log('');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY не установлены!');
  process.exit(1);
}

// Создаём клиент
const supabase = createClient(supabaseUrl, supabaseKey);

// Тестовый запрос к БД
async function testConnection() {
  try {
    console.log('🔄 Выполняю тестовый запрос к ai_curator_threads...');
    
    const { data, error } = await supabase
      .from('ai_curator_threads')
      .select('id')
      .limit(1);

    if (error) {
      console.error('❌ ОШИБКА Supabase:', error);
      console.error('');
      console.error('📋 Детали ошибки:');
      console.error('   message:', error.message);
      console.error('   details:', error.details);
      console.error('   hint:', error.hint);
      console.error('   code:', error.code);
      process.exit(1);
    }

    console.log('✅ ПОДКЛЮЧЕНИЕ УСПЕШНО!');
    console.log('✅ Supabase работает корректно!');
    console.log('');
    console.log('Данные из ai_curator_threads:', data);
    
  } catch (err) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА:', err.message);
    console.error(err);
    process.exit(1);
  }
}

testConnection();

