import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: './backend/env.env' });

const TRIPWIRE_URL = process.env.TRIPWIRE_SUPABASE_URL!;
const TRIPWIRE_KEY = process.env.TRIPWIRE_SERVICE_ROLE_KEY!;
const LANDING_URL = process.env.LANDING_SUPABASE_URL!;
const LANDING_KEY = process.env.LANDING_SUPABASE_SERVICE_KEY!;
const WHAPI_API_URL = process.env.WHAPI_API_URL || 'https://gate.whapi.cloud';
const WHAPI_TOKEN = process.env.WHAPI_TOKEN!;

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

const MESSAGE = `Приветствую! это Александр с onAI Academy.

Как успехи на нашем экспресс-курсе? 
Всё получается, есть вопросы?

Пишите, если что-то непонятно - помогу разобраться!`;

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('8')) {
    cleaned = '7' + cleaned.substring(1);
  }
  return '+' + cleaned;
}

async function sendWhatsApp(phone: string, message: string) {
  const normalized = normalizePhone(phone);
  
  try {
    const response = await fetch(`${WHAPI_API_URL}/messages/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WHAPI_TOKEN}`,
      },
      body: JSON.stringify({
        to: normalized,
        body: message,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { sent: false, error: data.message || `HTTP ${response.status}` };
    }

    return { sent: true, id: data.id };
  } catch (error: any) {
    return { sent: false, error: error.message };
  }
}

async function main() {
  console.log('📱 ====== МАССОВАЯ РАССЫЛКА WHATSAPP ======\n');
  console.log('📝 Сообщение:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(MESSAGE);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Получаем студентов
  const { data: students } = await tripwire
    .from('tripwire_users')
    .select('email, full_name');
  
  const filtered = students?.filter(s => !EXCLUDED.includes(s.email)) || [];
  
  // Получаем телефоны
  const { data: leads } = await landing
    .from('landing_leads')
    .select('email, phone, name')
    .not('phone', 'is', null);
  
  const phoneMap = new Map();
  filtered.forEach(s => {
    const lead = leads?.find(l => l.email?.toLowerCase() === s.email?.toLowerCase());
    if (lead?.phone) phoneMap.set(s.email, { phone: lead.phone, name: s.full_name });
  });
  
  const recipients: any[] = [];
  phoneMap.forEach((value, email) => {
    recipients.push({
      email,
      name: value.name,
      phone: value.phone,
    });
  });
  
  console.log(`📊 Всего получателей: ${recipients.length}\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  let success = 0;
  let failed = 0;
  
  for (const [index, recipient] of recipients.entries()) {
    console.log(`[${index + 1}/${recipients.length}] ${recipient.name} (${recipient.phone})`);
    
    const result = await sendWhatsApp(recipient.phone, MESSAGE);
    
    if (result.sent) {
      console.log(`✅ Отправлено! ID: ${result.id}\n`);
      success++;
    } else {
      console.log(`❌ Ошибка: ${result.error}\n`);
      failed++;
    }
    
    // Задержка 1.5 сек
    if (index < recipients.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 ИТОГО:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Успешно: ${success}`);
  console.log(`❌ Ошибок: ${failed}`);
  console.log(`📱 Всего: ${recipients.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('🎉 Рассылка завершена!\n');
}

main();





