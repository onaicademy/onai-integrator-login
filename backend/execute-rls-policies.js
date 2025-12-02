const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase credentials
const SUPABASE_URL = 'https://arqhkacellqbhjhbebfh.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFycWhrYWNlbGxxYmhqaGJlYmZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjE3ODU5NSwiZXhwIjoyMDc3NzU0NTk1fQ.wA_oRGKlN_Gt8l0PkWrO-rBT0gZgJdYlBu70zrjU7fE';

async function executeSQL() {
  console.log('🔄 Подключаюсь к Supabase...');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Читаем SQL файл
  const sqlFilePath = path.join(__dirname, '..', 'supabase_rls_policies_COMPLETE.sql');
  const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

  console.log('📝 SQL файл загружен, длина:', sqlContent.length);
  console.log('🚀 Выполняю SQL команды...\n');

  // Разбиваем на отдельные команды
  const commands = sqlContent
    .split(';')
    .map(cmd => cmd.trim())
    .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

  console.log(`📊 Найдено ${commands.length} SQL команд\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];
    if (cmd.length < 10) continue; // Пропускаем слишком короткие

    console.log(`\n[${i + 1}/${commands.length}] Выполняю команду...`);
    console.log(`📝 ${cmd.substring(0, 100)}...`);

    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: cmd + ';'
      });

      if (error) {
        console.error(`❌ Ошибка: ${error.message}`);
        errorCount++;
      } else {
        console.log(`✅ Успешно`);
        successCount++;
      }
    } catch (err) {
      console.error(`❌ Exception: ${err.message}`);
      errorCount++;
    }

    // Небольшая задержка между командами
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\n\n📊 ИТОГИ:`);
  console.log(`✅ Успешно: ${successCount}`);
  console.log(`❌ Ошибок: ${errorCount}`);
  console.log(`📝 Всего команд: ${commands.length}`);

  if (errorCount === 0) {
    console.log(`\n🎉 ВСЕ RLS ПОЛИТИКИ СОЗДАНЫ УСПЕШНО!`);
  } else {
    console.log(`\n⚠️ Есть ошибки. Некоторые политики могли не примениться.`);
  }
}

executeSQL().catch(err => {
  console.error('💥 Критическая ошибка:', err);
  process.exit(1);
});

