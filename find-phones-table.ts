import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: './backend/env.env' });

const TRIPWIRE_URL = process.env.TRIPWIRE_SUPABASE_URL!;
const TRIPWIRE_KEY = process.env.TRIPWIRE_SERVICE_ROLE_KEY!;

const tripwire = createClient(TRIPWIRE_URL, TRIPWIRE_KEY);

async function findPhones() {
  console.log('🔍 Ищем таблицы с телефонами в Tripwire БД...\n');
  
  // Список возможных таблиц
  const tables = [
    'tripwire_leads',
    'leads',
    'contacts',
    'applications',
    'registrations',
    'tripwire_contacts',
    'student_contacts',
    'users'
  ];
  
  for (const table of tables) {
    try {
      console.log(`Проверяю таблицу: ${table}...`);
      const { data, error } = await tripwire
        .from(table)
        .select('*')
        .limit(1);
      
      if (!error && data && data.length > 0) {
        console.log(`✅ Таблица ${table} существует!`);
        console.log('Поля:', Object.keys(data[0]).join(', '));
        
        // Проверяем есть ли phone
        if (Object.keys(data[0]).some(k => k.toLowerCase().includes('phone'))) {
          console.log('🎯 НАЙДЕНО ПОЛЕ С ТЕЛЕФОНОМ!\n');
          console.log('Пример записи:');
          console.log(JSON.stringify(data[0], null, 2));
        }
        console.log('');
      }
    } catch (e) {
      // Таблица не существует
    }
  }
  
  // Проверим users из основной БД
  console.log('\n📋 Проверяю таблицу users (основная auth.users)...');
  const { data: usersData } = await tripwire
    .from('users')
    .select('*')
    .limit(1);
    
  if (usersData?.[0]) {
    console.log('Поля в users:', Object.keys(usersData[0]).join(', '));
  }
}

findPhones();
