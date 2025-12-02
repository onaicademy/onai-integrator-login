// Проверка таблицы ai_token_usage
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: __dirname + '/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTokenTable() {
  try {
    console.log('🔍 Проверяем таблицу ai_token_usage...\n');

    // Получаем все записи
    const { data, error, count } = await supabase
      .from('ai_token_usage')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('❌ Ошибка запроса:', error.message);
      return;
    }

    console.log(`📊 Всего записей в таблице: ${count || 0}\n`);

    if (data && data.length > 0) {
      console.log('📝 Последние 5 записей:\n');
      data.forEach((row, index) => {
        console.log(`${index + 1}. User: ${row.user_id}`);
        console.log(`   Assistant: ${row.assistant_type}`);
        console.log(`   Model: ${row.model}`);
        console.log(`   Tokens: ${row.total_tokens} (prompt: ${row.prompt_tokens}, completion: ${row.completion_tokens})`);
        console.log(`   Cost: $${row.total_cost_usd}`);
        console.log(`   Created: ${row.created_at}\n`);
      });
    } else {
      console.log('⚠️  Таблица ПУСТАЯ! Данных нет.\n');
      console.log('💡 Решение:');
      console.log('   1. Напиши сообщение AI-Куратору в профиле');
      console.log('   2. Дождись ответа');
      console.log('   3. Снова проверь таблицу - должна появиться запись\n');
    }

    // Проверяем статистику по ассистентам
    const { data: statsByAssistant } = await supabase
      .from('ai_token_usage')
      .select('assistant_type, total_tokens, total_cost_usd')
      .order('assistant_type');

    if (statsByAssistant && statsByAssistant.length > 0) {
      console.log('📊 Статистика по ассистентам:');
      const grouped = statsByAssistant.reduce((acc, row) => {
        if (!acc[row.assistant_type]) {
          acc[row.assistant_type] = { tokens: 0, cost: 0, count: 0 };
        }
        acc[row.assistant_type].tokens += row.total_tokens;
        acc[row.assistant_type].cost += row.total_cost_usd;
        acc[row.assistant_type].count += 1;
        return acc;
      }, {});

      Object.entries(grouped).forEach(([type, stats]) => {
        console.log(`   ${type}: ${stats.count} запросов, ${stats.tokens} токенов, $${stats.cost.toFixed(4)}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

checkTokenTable();

