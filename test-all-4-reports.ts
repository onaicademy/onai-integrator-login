/**
 * 🎯 ГЕНЕРАЦИЯ И ОТПРАВКА ВСЕХ 4 ОТЧЕТОВ
 * 
 * 1. 🌅 10:00 - Вчерашний отчет
 * 2. 📊 16:00 - Текущий статус
 * 3. 🌙 22:00 - Дневной отчет
 * 4. 📅 Понедельник 10:00 - Недельный отчет
 * 
 * Запуск: npx tsx test-all-4-reports.ts
 */

import axios from 'axios';

const API_URL = 'http://localhost:3000';
const BOT_TOKEN = '8560431175:AAF_ZYiQqPAVruJoqASd-HQ0uXohRZd6h9I';
const CHAT_ID = -1003443946081;
const THREAD_ID = 7;

console.log('🎯 ГЕНЕРАЦИЯ ВСЕХ 4 ОТЧЕТОВ\n');
console.log('=' .repeat(60));

async function sendToTopic(message: string) {
  const res = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        message_thread_id: THREAD_ID,
        text: message,
        parse_mode: 'Markdown',
      }),
    }
  );
  
  const data = await res.json();
  
  if (!data.ok) {
    throw new Error(`Telegram API error: ${data.description}`);
  }
  
  return data.result.message_id;
}

async function generateReport(preset: string) {
  try {
    const response = await axios.get(`${API_URL}/api/traffic/combined-analytics?preset=${preset}`);
    return response.data;
  } catch (error: any) {
    console.error(`❌ Ошибка загрузки данных (${preset}):`, error.message);
    return null;
  }
}

// 🌅 ОТЧЕТ #1 - За вчера (10:00)
async function generateYesterdayReport() {
  const data = await generateReport('24h');
  if (!data) return '❌ Данные недоступны';
  
  const rankedTeams = [...data.teams].sort((a: any, b: any) => b.roas - a.roas);
  const topTeam = rankedTeams[0];
  
  let report = '🌅 *ОТЧЕТ ЗА ВЧЕРА*\n';
  report += `━━━━━━━━━━━━━━━━━━\n\n`;
  report += `💰 *ИТОГИ:*\n`;
  report += `Затраты: $${data.totals.spend.toFixed(0)} | Доход: ₸${Math.round(data.totals.revenue).toLocaleString()}\n`;
  report += `Продажи: ${data.totals.sales} шт | ROAS: ${data.totals.roas.toFixed(2)}x\n\n`;
  report += `🏆 *РЕЙТИНГ:*\n`;
  
  rankedTeams.forEach((team: any, idx: number) => {
    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '⭐';
    report += `${medal} ${team.team}: ROAS ${team.roas.toFixed(2)}x | ${team.sales} продаж\n`;
  });
  
  report += `\n🔥 Лидер: *${topTeam.team}* (ROAS ${topTeam.roas.toFixed(2)}x)`;
  
  return report;
}

// 📊 ОТЧЕТ #2 - Текущий статус (16:00)
async function generateCurrentStatusReport() {
  const data = await generateReport('today');
  if (!data) return '❌ Данные недоступны';
  
  const rankedTeams = [...data.teams].sort((a: any, b: any) => b.roas - a.roas);
  
  let report = '📊 *ОБЕДЕННЫЙ СТАТУС*\n';
  report += `🕐 ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}\n`;
  report += `━━━━━━━━━━━━━━━━━━\n\n`;
  report += `💰 *СЕЙЧАС:*\n`;
  report += `Затраты: $${data.totals.spend.toFixed(0)} | Доход: ₸${Math.round(data.totals.revenue).toLocaleString()}\n`;
  report += `Продажи: ${data.totals.sales} шт | ROAS: ${data.totals.roas.toFixed(2)}x\n\n`;
  report += `📈 *КОМАНДЫ:*\n`;
  
  rankedTeams.forEach((team: any, idx: number) => {
    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '⭐';
    report += `${medal} ${team.team}: ROAS ${team.roas.toFixed(2)}x | ${team.sales} продаж\n`;
  });
  
  return report;
}

// 🌙 ОТЧЕТ #3 - Дневной (22:00)
async function generateDailyReport() {
  const data = await generateReport('today');
  if (!data) return '❌ Данные недоступны';
  
  const rankedTeams = [...data.teams].sort((a: any, b: any) => b.roas - a.roas);
  const salesLeader = [...rankedTeams].sort((a: any, b: any) => b.sales - a.sales)[0];
  
  let report = '🌙 *ВЕЧЕРНИЙ ОТЧЕТ*\n';
  report += `📅 ${new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}\n`;
  report += `━━━━━━━━━━━━━━━━━━\n\n`;
  report += `💰 *ИТОГИ:*\n`;
  report += `Затраты: $${data.totals.spend.toFixed(0)} | Доход: ₸${Math.round(data.totals.revenue).toLocaleString()}\n`;
  report += `Продажи: ${data.totals.sales} шт | ROAS: ${data.totals.roas.toFixed(2)}x\n\n`;
  report += `🏆 *ЛИДЕРЫ ДНЯ:*\n`;
  report += `• Продажи: ${salesLeader.team} (${salesLeader.sales} шт)\n\n`;
  report += `📊 *РЕЙТИНГ:*\n`;
  
  rankedTeams.forEach((team: any, idx: number) => {
    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '⭐';
    report += `${medal} ${team.team}: ROAS ${team.roas.toFixed(2)}x | ${team.sales} продаж\n`;
  });
  
  report += `\n💬 *ВЫВОД:*\n`;
  if (data.totals.roas >= 2) {
    report += `ROAS ${data.totals.roas.toFixed(2)}x - отличная эффективность!`;
  } else if (data.totals.roas >= 1) {
    report += `ROAS ${data.totals.roas.toFixed(2)}x - прибыльно, есть потенциал.`;
  } else {
    report += `ROAS ${data.totals.roas.toFixed(2)}x - требуется оптимизация.`;
  }
  
  return report;
}

// 📅 ОТЧЕТ #4 - Недельный (понедельник 10:00)
async function generateWeeklyReport() {
  const data = await generateReport('7d');
  if (!data) return '❌ Данные недоступны';
  
  const rankedTeams = [...data.teams].sort((a: any, b: any) => b.roas - a.roas);
  const topTeam = rankedTeams[0];
  
  let report = '📅 *НЕДЕЛЬНЫЙ ОТЧЕТ*\n';
  report += `🗓️ ${new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}\n`;
  report += `━━━━━━━━━━━━━━━━━━\n\n`;
  report += `💰 *ИТОГИ:*\n`;
  report += `Затраты: $${data.totals.spend.toFixed(0)} | Доход: ₸${Math.round(data.totals.revenue).toLocaleString()}\n`;
  report += `Продажи: ${data.totals.sales} шт | ROAS: ${data.totals.roas.toFixed(2)}x\n\n`;
  report += `🏆 *РЕЙТИНГ:*\n`;
  
  rankedTeams.forEach((team: any, idx: number) => {
    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '⭐';
    report += `${medal} ${team.team}: ROAS ${team.roas.toFixed(2)}x | ${team.sales} продаж\n`;
  });
  
  report += `\n💬 *МОТИВАЦИЯ:*\n`;
  if (topTeam.roas >= 3) {
    report += `🔥 ${topTeam.team} - ROAS ${topTeam.roas.toFixed(2)}x. Невероятный результат!`;
  } else if (topTeam.roas >= 2) {
    report += `🎉 ${topTeam.team} - ROAS ${topTeam.roas.toFixed(2)}x. Отличная эффективность!`;
  } else {
    report += `👏 ${topTeam.team} лидирует с ${topTeam.sales} продажами. Вперед!`;
  }
  
  report += `\n\n🚀 Новая неделя - новые возможности!`;
  
  return report;
}

async function main() {
  try {
    // ОТЧЕТ #1
    console.log('\n📝 1/4: Генерирую вчерашний отчет (10:00)...');
    const report1 = await generateYesterdayReport();
    console.log('📤 Отправляю в топик...');
    await sendToTopic(report1);
    console.log('✅ Отправлен!\n');
    await new Promise(r => setTimeout(r, 1000));
    
    // ОТЧЕТ #2
    console.log('📝 2/4: Генерирую текущий статус (16:00)...');
    const report2 = await generateCurrentStatusReport();
    console.log('📤 Отправляю в топик...');
    await sendToTopic(report2);
    console.log('✅ Отправлен!\n');
    await new Promise(r => setTimeout(r, 1000));
    
    // ОТЧЕТ #3
    console.log('📝 3/4: Генерирую дневной отчет (22:00)...');
    const report3 = await generateDailyReport();
    console.log('📤 Отправляю в топик...');
    await sendToTopic(report3);
    console.log('✅ Отправлен!\n');
    await new Promise(r => setTimeout(r, 1000));
    
    // ОТЧЕТ #4
    console.log('📝 4/4: Генерирую недельный отчет (Пн 10:00)...');
    const report4 = await generateWeeklyReport();
    console.log('📤 Отправляю в топик...');
    await sendToTopic(report4);
    console.log('✅ Отправлен!\n');
    
    console.log('=' .repeat(60));
    console.log('\n🎉 ВСЕ 4 ОТЧЕТА ОТПРАВЛЕНЫ!\n');
    console.log('📱 Проверь топик: https://t.me/c/3443946081/7\n');
    console.log('✅ Проверь корректность промптов и форматирования!\n');
    
  } catch (error: any) {
    console.error('\n❌ Ошибка:', error.message);
    process.exit(1);
  }
}

main();


