import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: './backend/env.env' });

const TRIPWIRE_URL = process.env.TRIPWIRE_SUPABASE_URL!;
const TRIPWIRE_KEY = process.env.TRIPWIRE_SERVICE_ROLE_KEY!;
const LANDING_URL = process.env.LANDING_SUPABASE_URL!;
const LANDING_KEY = process.env.LANDING_SUPABASE_SERVICE_KEY!;

const tripwire = createClient(TRIPWIRE_URL, TRIPWIRE_KEY);
const landing = createClient(LANDING_URL, LANDING_KEY);

const EXCLUDED = [
  'test.student.tripwire@test.com',
  'smmmcwin@gmail.com',
  'rakhat@onaiacademy.kz',
  'amina@onaiacademy.kz',
  'aselya@onaiacademy.kz',
  'ayaulym@onaiacademy.kz',
];

async function getStudentsWithPhones() {
  console.log('📊 Получаем студентов из Tripwire...\n');
  
  const { data: students, error: studErr } = await tripwire
    .from('tripwire_users')
    .select('email, full_name');
  
  if (studErr) {
    console.error('Ошибка:', studErr);
    return;
  }
  
  const filtered = students?.filter(s => !EXCLUDED.includes(s.email)) || [];
  console.log(`✅ Всего студентов: ${students?.length}`);
  console.log(`✅ После фильтрации: ${filtered.length}\n`);
  
  console.log('📱 Получаем телефоны из landing_leads...\n');
  
  const { data: leads, error: leadsErr } = await landing
    .from('landing_leads')
    .select('email, phone, name')
    .not('phone', 'is', null);
  
  if (leadsErr) {
    console.error('Ошибка:', leadsErr);
    return;
  }
  
  console.log(`✅ Лидов с телефонами: ${leads?.length}\n`);
  
  const phoneMap = new Map();
  
  // Сопоставление по email
  filtered.forEach(s => {
    const lead = leads?.find(l => l.email?.toLowerCase() === s.email?.toLowerCase());
    if (lead?.phone) phoneMap.set(s.email, { phone: lead.phone, name: s.full_name });
  });
  
  console.log(`✅ Сопоставлено: ${phoneMap.size}\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const result: any[] = [];
  phoneMap.forEach((value, email) => {
    result.push({
      email,
      name: value.name,
      phone: value.phone,
    });
    console.log(`📱 ${value.name} (${value.phone})`);
  });
  
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`\n📊 ИТОГО: ${result.length} студентов с телефонами\n`);
  
  return result;
}

getStudentsWithPhones();

