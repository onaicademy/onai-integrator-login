import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: './backend/env.env' });

const LANDING_URL = process.env.LANDING_SUPABASE_URL!;
const LANDING_KEY = process.env.LANDING_SUPABASE_SERVICE_KEY!;
const WHAPI_API_URL = process.env.WHAPI_API_URL || 'https://gate.whapi.cloud';
const WHAPI_TOKEN = process.env.WHAPI_TOKEN!;

const landing = createClient(LANDING_URL, LANDING_KEY);

const MESSAGE = `Привет! Сегодня в 20:00 финальный эфир 🔥

Расскажу как мы создали платформу за $20,000 и что ты можешь из этого взять

Жду тебя → https://start.bizon365.ru/room/196985/rejUuP-7-x`;

const TEST_PATTERNS = [
  /тест/i, /test/i, /онлайн/i, /axios/i, /optimization/i,
  /777.*777/, /888.*777/, /999.*888/, /^77777/, /^77002/, /^77003/, /^77004/,
];

function isTestLead(name: string, phone: string, email?: string): boolean {
  if (!name || !phone) return true;
  const fullText = `${name} ${email || ''}`;
  if (TEST_PATTERNS.some(pattern => pattern.test(fullText))) return true;
  const cleanPhone = phone.replace(/\D/g, '');
  if (TEST_PATTERNS.some(pattern => pattern.test(cleanPhone))) return true;
  return false;
}

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('8')) cleaned = '7' + cleaned.substring(1);
  return cleaned;
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
      body: JSON.stringify({ to: normalized, body: message }),
    });
    const data = await response.json();
    if (!response.ok) return { sent: false, error: data.message || `HTTP ${response.status}` };
    return { sent: true, id: data.id };
  } catch (error: any) {
    return { sent: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 ====== РАССЫЛКА НА ЭФИР 20:00 ======\n');
  
  const { data: allLeads } = await landing
    .from('landing_leads')
    .select('*')
    .not('phone', 'is', null)
    .ilike('source', '%express%');
  
  const realLeads = allLeads?.filter(lead => !isTestLead(lead.name || '', lead.phone, lead.email)) || [];
  
  const uniquePhones = new Map();
  realLeads.forEach(lead => {
    const cleanPhone = lead.phone.replace(/\D/g, '');
    if (!uniquePhones.has(cleanPhone)) uniquePhones.set(cleanPhone, lead);
  });
  
  const recipients = Array.from(uniquePhones.values());
  console.log(`📊 Получателей: ${recipients.length}\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  let success = 0, failed = 0;
  
  for (const [index, recipient] of recipients.entries()) {
    console.log(`[${index + 1}/${recipients.length}] ${recipient.name} (${recipient.phone})`);
    const result = await sendWhatsApp(recipient.phone, MESSAGE);
    
    if (result.sent) {
      console.log(`✅ Отправлено!\n`);
      success++;
    } else {
      console.log(`❌ Ошибка: ${result.error}\n`);
      failed++;
    }
    
    if (index < recipients.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 ИТОГО WhatsApp:');
  console.log(`✅ Успешно: ${success}`);
  console.log(`❌ Ошибок: ${failed}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main();

