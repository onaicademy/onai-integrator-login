import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: './backend/env.env' });

const LANDING_URL = process.env.LANDING_SUPABASE_URL!;
const LANDING_KEY = process.env.LANDING_SUPABASE_SERVICE_KEY!;

const landing = createClient(LANDING_URL, LANDING_KEY);

async function checkLeads() {
  console.log('🔍 Проверяем landing_leads...\n');
  
  // Получим несколько примеров
  const { data, error } = await landing
    .from('landing_leads')
    .select('*')
    .not('phone', 'is', null)
    .limit(5);
  
  if (error) {
    console.error('Ошибка:', error);
    return;
  }
  
  console.log('📋 Поля в таблице:');
  if (data?.[0]) {
    Object.keys(data[0]).forEach(key => {
      console.log(`  - ${key}`);
    });
  }
  
  console.log('\n📱 Примеры записей:\n');
  data?.forEach((lead, i) => {
    console.log(`${i+1}. ${lead.name} - ${lead.phone}`);
    console.log(`   Email: ${lead.email || 'нет'}`);
    console.log(`   Поля:`, Object.keys(lead).filter(k => lead[k]).join(', '));
    console.log('');
  });
  
  // Посчитаем всего лидов с телефонами
  const { count } = await landing
    .from('landing_leads')
    .select('*', { count: 'exact', head: true })
    .not('phone', 'is', null);
    
  console.log(`📊 Всего лидов с телефонами: ${count}\n`);
}

checkLeads();
