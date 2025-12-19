/**
 * 🔍 ПРОВЕРКА ВСЕХ СИСТЕМ
 * - Backend API
 * - Groq AI
 * - Telegram Bot
 * - AmoCRM API
 * - Facebook Ads API
 * - Database
 * - Scheduler
 */

import axios from 'axios';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(process.cwd(), 'env.env') });

const API_URL = 'http://localhost:3000';
const BOT_TOKEN = '8560431175:AAF_ZYiQqPAVruJoqASd-HQ0uXohRZd6h9I';
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const AMOCRM_TOKEN = process.env.AMOCRM_ACCESS_TOKEN;
const FB_TOKEN = process.env.FACEBOOK_ADS_TOKEN;

console.log('🔍 ПРОВЕРКА ВСЕХ СИСТЕМ\n');
console.log('═'.repeat(60));

async function checkSystem(name: string, checkFn: () => Promise<boolean>): Promise<boolean> {
  try {
    const result = await checkFn();
    console.log(`${result ? '✅' : '❌'} ${name}`);
    return result;
  } catch (error: any) {
    console.log(`❌ ${name} - ${error.message}`);
    return false;
  }
}

async function main() {
  const results: Record<string, boolean> = {};

  // 1. Backend API
  results.backend = await checkSystem('Backend API', async () => {
    const res = await axios.get(`${API_URL}/api/health`);
    return res.data.status === 'ok';
  });

  // 2. Groq AI
  results.groq = await checkSystem('Groq AI', async () => {
    if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY не найден');
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` }
    });
    return res.ok;
  });

  // 3. Telegram Bot
  results.telegram = await checkSystem('Telegram Bot', async () => {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
    const data = await res.json();
    return data.ok;
  });

  // 4. AmoCRM API
  results.amocrm = await checkSystem('AmoCRM API', async () => {
    if (!AMOCRM_TOKEN) throw new Error('AMOCRM_TOKEN не найден');
    const res = await axios.get('https://onaiagencykz.amocrm.ru/api/v4/account', {
      headers: { 'Authorization': `Bearer ${AMOCRM_TOKEN}` }
    });
    return res.status === 200;
  });

  // 5. Facebook Ads API
  results.facebook = await checkSystem('Facebook Ads API', async () => {
    if (!FB_TOKEN) throw new Error('FB_TOKEN не найден');
    const res = await fetch(`https://graph.facebook.com/v21.0/me?access_token=${FB_TOKEN}`);
    const data = await res.json();
    return !data.error;
  });

  // 6. Traffic Analytics API
  results.analytics = await checkSystem('Traffic Analytics API', async () => {
    const res = await axios.get(`${API_URL}/api/traffic/combined-analytics?preset=today`);
    return res.data && res.data.teams && res.data.totals;
  });

  // 7. Scheduler Config
  results.scheduler = await checkSystem('Scheduler Config', async () => {
    const fs = require('fs');
    const schedulerFile = join(__dirname, 'src/services/telegramScheduler.ts');
    const content = fs.readFileSync(schedulerFile, 'utf-8');
    
    const has10 = content.includes("cron.schedule('0 10 * * *'");
    const has16 = content.includes("cron.schedule('0 16 * * *'");
    const has22 = content.includes("cron.schedule('0 22 * * *'");
    const hasWeekly = content.includes("cron.schedule('0 10 * * 1'");
    const hasTimezone = content.includes("timezone: 'Asia/Almaty'");
    const hasGroqReports = content.includes('trafficGroqReports');
    
    return has10 && has16 && has22 && hasWeekly && hasTimezone && hasGroqReports;
  });

  console.log('\n' + '═'.repeat(60));
  console.log('📊 ИТОГИ ПРОВЕРКИ\n');

  const total = Object.keys(results).length;
  const passed = Object.values(results).filter(Boolean).length;
  const failed = total - passed;

  console.log(`✅ Работает: ${passed}/${total}`);
  console.log(`❌ Не работает: ${failed}/${total}\n`);

  if (failed > 0) {
    console.log('🔴 ПРОБЛЕМЫ:\n');
    Object.entries(results).forEach(([name, ok]) => {
      if (!ok) console.log(`   ❌ ${name}`);
    });
    console.log('');
  }

  console.log('═'.repeat(60));
  console.log('📅 РАСПИСАНИЕ ОТЧЕТОВ (Asia/Almaty UTC+5)\n');
  console.log('   🌅 10:00 - Вчерашний отчет (AI)');
  console.log('   📊 16:00 - Текущий статус (AI)');
  console.log('   🌙 22:00 - Дневной отчет (AI + задачи)');
  console.log('   📅 Пн 10:00 - Недельный отчет (AI + KPI +10%)\n');
  console.log('═'.repeat(60));

  if (passed === total) {
    console.log('\n🎉 ВСЕ СИСТЕМЫ РАБОТАЮТ! ГОТОВО К ПРОДАКШНУ!\n');
  } else {
    console.log('\n⚠️  ЕСТЬ ПРОБЛЕМЫ! НУЖНО ИСПРАВИТЬ!\n');
    process.exit(1);
  }
}

main();
