import * as dotenv from 'dotenv';

dotenv.config({ path: './backend/env.env' });

const WHAPI_API_URL = process.env.WHAPI_API_URL || 'https://gate.whapi.cloud';
const WHAPI_TOKEN = process.env.WHAPI_TOKEN!;

async function testWhapi() {
  console.log('🔍 Проверка Whapi API\n');
  console.log(`API URL: ${WHAPI_API_URL}`);
  console.log(`Token: ${WHAPI_TOKEN?.substring(0, 15)}...`);
  console.log('');
  
  // 1. Проверка здоровья API
  console.log('1️⃣ Проверяем health endpoint...');
  try {
    const health = await fetch(`${WHAPI_API_URL}/health`, {
      headers: { 'Authorization': `Bearer ${WHAPI_TOKEN}` }
    });
    console.log(`Status: ${health.status}`);
    const healthData = await health.json();
    console.log('Response:', JSON.stringify(healthData, null, 2));
  } catch (e: any) {
    console.error('Ошибка:', e.message);
  }
  
  console.log('\n2️⃣ Пробуем отправить тестовое сообщение...');
  try {
    const testPhone = '+77001234567'; // Тестовый номер
    const response = await fetch(`${WHAPI_API_URL}/messages/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WHAPI_TOKEN}`,
      },
      body: JSON.stringify({
        to: testPhone,
        body: 'Test message',
      }),
    });
    
    console.log(`Status: ${response.status}`);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (e: any) {
    console.error('Ошибка:', e.message);
  }
}

testWhapi();
