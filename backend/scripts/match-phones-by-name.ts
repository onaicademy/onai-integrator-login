import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../env.env') });

const landingSupabase = createClient(
  process.env.LANDING_SUPABASE_URL!,
  process.env.LANDING_SUPABASE_SERVICE_KEY!
);

const tripwireSupabase = createClient(
  process.env.TRIPWIRE_SUPABASE_URL!,
  process.env.TRIPWIRE_SERVICE_ROLE_KEY!
);

const EXCLUDED_EMAILS = [
  'test.student.tripwire@test.com',
  'smmmcwin@gmail.com',
  'rakhat@onaiacademy.kz',
  'amina@onaiacademy.kz',
  'aselya@onaiacademy.kz',
  'ayaulym@onaiacademy.kz',
];

// Функция нормализации имени
function normalizeName(name: string | null): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^а-яёa-z\s]/gi, '');
}

(async () => {
  console.log('🔍 СОПОСТАВЛЕНИЕ ПО ИМЕНИ И EMAIL');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // 1. Студенты Tripwire
  const { data: tripwireStudents } = await tripwireSupabase
    .from('tripwire_users')
    .select('email, full_name')
    .not('email', 'in', `(${EXCLUDED_EMAILS.map(e => `"${e}"`).join(',')})`);
  
  console.log('👥 Студентов Tripwire:', tripwireStudents?.length || 0);
  
  // 2. Лиды с телефонами из landing_leads
  const { data: allLeads } = await landingSupabase
    .from('landing_leads')
    .select('email, phone, name')
    .not('phone', 'is', null);
  
  console.log('📱 Лидов с телефонами:', allLeads?.length || 0);
  
  // 3. Сопоставление по email (как раньше)
  const matchedByEmail = new Map<string, string>();
  tripwireStudents?.forEach(student => {
    const lead = allLeads?.find(l => 
      l.email?.toLowerCase().trim() === student.email?.toLowerCase().trim()
    );
    if (lead && lead.phone) {
      matchedByEmail.set(student.email, lead.phone);
    }
  });
  
  console.log('✅ Сопоставлено по EMAIL:', matchedByEmail.size);
  
  // 4. Сопоставление по имени для оставшихся
  const matchedByName = new Map<string, { phone: string; leadName: string }>();
  tripwireStudents?.forEach(student => {
    // Пропускаем если уже нашли по email
    if (matchedByEmail.has(student.email)) return;
    
    const studentName = normalizeName(student.full_name);
    if (!studentName) return;
    
    const lead = allLeads?.find(l => {
      const leadName = normalizeName(l.name);
      if (!leadName) return false;
      
      // Попробуем найти полное совпадение или частичное
      return leadName === studentName || 
             studentName.includes(leadName) || 
             leadName.includes(studentName);
    });
    
    if (lead && lead.phone) {
      matchedByName.set(student.email, { 
        phone: lead.phone, 
        leadName: lead.name || 'unknown' 
      });
    }
  });
  
  console.log('✅ Сопоставлено по ИМЕНИ:', matchedByName.size);
  console.log('✅ ВСЕГО с телефонами:', matchedByEmail.size + matchedByName.size);
  
  // 5. Студенты БЕЗ телефонов
  const studentsWithoutPhones = tripwireStudents?.filter(student => 
    !matchedByEmail.has(student.email) && !matchedByName.has(student.email)
  ) || [];
  
  console.log('❌ БЕЗ телефонов:', studentsWithoutPhones.length);
  
  // 6. Примеры сопоставления по имени
  if (matchedByName.size > 0) {
    console.log('\n📝 Примеры сопоставления по ИМЕНИ (первые 10):');
    let count = 0;
    for (const [email, { phone, leadName }] of matchedByName.entries()) {
      if (count >= 10) break;
      const student = tripwireStudents?.find(s => s.email === email);
      console.log(`  ${count + 1}. Student: "${student?.full_name}"`);
      console.log(`     Lead: "${leadName}"`);
      console.log(`     Phone: ${phone}`);
      console.log(`     Email: ${email}\n`);
      count++;
    }
  }
  
  // 7. Примеры студентов БЕЗ телефонов
  if (studentsWithoutPhones.length > 0) {
    console.log('\n❌ Студенты БЕЗ телефонов (первые 10):');
    studentsWithoutPhones.slice(0, 10).forEach((student, idx) => {
      console.log(`  ${idx + 1}. ${student.full_name || 'нет имени'} (${student.email})`);
    });
  }
})();
