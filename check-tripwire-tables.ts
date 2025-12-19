import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: './backend/env.env' });

const TRIPWIRE_URL = process.env.TRIPWIRE_SUPABASE_URL!;
const TRIPWIRE_KEY = process.env.TRIPWIRE_SERVICE_ROLE_KEY!;

const tripwire = createClient(TRIPWIRE_URL, TRIPWIRE_KEY);

async function checkTables() {
  console.log('🔍 Проверяем структуру tripwire_users...\n');
  
  const { data, error } = await tripwire
    .from('tripwire_users')
    .select('*')
    .limit(3);
  
  if (error) {
    console.error('Ошибка:', error);
    return;
  }
  
  console.log('Пример записи из tripwire_users:');
  console.log(JSON.stringify(data?.[0], null, 2));
  
  // Проверим есть ли поле phone
  console.log('\n📊 Поля в таблице:');
  if (data?.[0]) {
    Object.keys(data[0]).forEach(key => {
      console.log(`  - ${key}`);
    });
  }
}

checkTables();
