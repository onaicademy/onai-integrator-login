import { createClient } from '@supabase/supabase-js';

const trafficClient = createClient(
  'https://oetodaexnjcunklkdlkv.supabase.co',
  process.env.SUPABASE_TRAFFIC_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ldG9kYWV4bmpjdW5rbGtkbGt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyMTc2OTMsImV4cCI6MjA4MTc5MzY5M30.isG3OnecdTr7nKecQGtCxQIRCZcrdiZggvKa7DaFtjg'
);

console.log('🔍 Проверка неправильных таблиц (leads vs traffic_leads)...\n');

// Проверка старой таблицы "leads"
const { data: oldLeads, error: oldError, count: oldCount } = await trafficClient
  .from('leads')
  .select('*', { count: 'exact', head: false })
  .limit(5);

if (!oldError) {
  console.log(`✅ Таблица "leads" найдена: ${oldCount} записей`);
  if (oldLeads && oldLeads.length > 0) {
    console.log('   Примеры данных:');
    oldLeads.forEach(lead => {
      console.log(`   - ${lead.name} | ${lead.phone} | ${lead.source}`);
    });
  }
  console.log('\n⚠️  ДАННЫЕ БЫЛИ МИГРИРОВАНЫ В НЕПРАВИЛЬНУЮ ТАБЛИЦУ!');
  console.log('   Нужно переместить из "leads" → "traffic_leads"');
} else {
  console.log(`❌ Таблица "leads" не существует или пуста: ${oldError.message}`);
}

// Проверка правильной таблицы
const { count: correctCount } = await trafficClient
  .from('traffic_leads')
  .select('*', { count: 'exact', head: true });

console.log(`\n✅ Таблица "traffic_leads" (правильная): ${correctCount || 0} записей`);

console.log('\n═══════════════════════════════════════════════════════');
console.log('📊 ДИАГНОСТИКА');
console.log('═══════════════════════════════════════════════════════');
console.log(`Данные в "leads" (СТАРАЯ): ${oldCount || 0}`);
console.log(`Данные в "traffic_leads" (ПРАВИЛЬНАЯ): ${correctCount || 0}`);

if (oldCount && oldCount > 0 && (!correctCount || correctCount === 0)) {
  console.log('\n🔧 РЕШЕНИЕ: Переместить данные из "leads" в "traffic_leads"');
}
