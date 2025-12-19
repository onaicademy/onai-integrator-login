/**
 * 🔥 ТЕСТ ПРЕМИАЛЬНОГО ФОРМАТИРОВАНИЯ
 * 
 * - Обе валюты ($ и ₸)
 * - Жирный текст для важного
 * - Структурные отступы
 * - Легко читать
 */

import axios from 'axios';
import Groq from 'groq-sdk';

const API_URL = 'http://localhost:3000';
const BOT_TOKEN = '8560431175:AAF_ZYiQqPAVruJoqASd-HQ0uXohRZd6h9I';
const CHAT_ID = -1003443946081;
const THREAD_ID = 7;
const GROQ_API_KEY = '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';

const groq = new Groq({ apiKey: GROQ_API_KEY });

async function sendToTopic(message: string) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      message_thread_id: THREAD_ID,
      text: message,
      parse_mode: 'Markdown',
    }),
  });
  return res.json();
}

async function main() {
  console.log('🔥 ГЕНЕРИРУЮ ПРЕМИАЛЬНЫЙ ОТЧЕТ...\n');
  
  const data = await axios.get(`${API_URL}/api/traffic/combined-analytics?preset=today`).then(r => r.data);
  const teams = [...data.teams].sort((a: any, b: any) => b.roas - a.roas);
  const rate = 450;
  
  let prompt = `Создай премиальный отчет за сегодня.\n\n`;
  prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  prompt += `ДАННЫЕ:\n`;
  prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  prompt += `ОБЩИЕ ИТОГИ:\n`;
  prompt += `Затраты: $${data.totals.spend.toFixed(0)} (₸${Math.round(data.totals.spend * rate).toLocaleString()})\n`;
  prompt += `Доход: ₸${Math.round(data.totals.revenue).toLocaleString()} ($${Math.round(data.totals.revenue / rate)})\n`;
  prompt += `Продажи: ${data.totals.sales} шт\n`;
  prompt += `ROAS: ${data.totals.roas.toFixed(2)}x\n`;
  prompt += `Курс: 1$ = ${rate}₸\n\n`;
  prompt += `КОМАНДЫ:\n`;
  
  teams.forEach((t: any) => {
    const cpaKzt = Math.round(t.cpa * rate);
    const spendKzt = Math.round(t.spend * rate);
    prompt += `${t.team}:\n`;
    prompt += `  ROAS ${t.roas.toFixed(2)}x | ${t.sales} продаж\n`;
    prompt += `  CPA $${t.cpa.toFixed(0)} (₸${cpaKzt.toLocaleString()})\n`;
    prompt += `  Траты $${t.spend.toFixed(0)} (₸${spendKzt.toLocaleString()})\n\n`;
  });
  
  prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  prompt += `Сделай отчет ПРЕМИАЛЬНЫМ:\n`;
  prompt += `- Заголовки *жирным*\n`;
  prompt += `- Важные цифры *жирным*\n`;
  prompt += `- Команды *жирным*\n`;
  prompt += `- Пустые строки для отступов\n`;
  prompt += `- Группируй блоками\n`;
  prompt += `- ВСЕ цифры в $ И ₸\n`;
  
  console.log('🤖 Отправляю в Groq AI...');
  
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `Ты создаешь премиальные отчеты для таргетологов.

ФОРМАТИРОВАНИЕ:
- Заголовки: *ЖИРНЫМ*
- Важные цифры: *жирным* (ROAS, продажи, траты, доход)
- Названия команд: *жирным*
- Используй пустые строки между блоками
- Группируй информацию

ВАЛЮТЫ:
- ВСЕГДА указывай обе валюты
- Формат: *$XXX* (*₸XXX,XXX*)
- Курс: 1$ = 450₸

СТРУКТУРА:
*🌙 ВЕЧЕРНИЙ ОТЧЕТ*

*💰 ИТОГ*
Траты: *$XXX* (*₸XXX,XXX*)
Доход: *₸XXX,XXX* (*$XXX*)
ROAS: *X.Xx* 🟢

*🏆 КОМАНДЫ*
• *Kenesary* 🏆
  ROAS *X.Xx* | Продажи *XX шт*
  CPA *$XX* (*₸XX,XXX*)
  Статус: [оценка]

*🎯 ДЕЙСТВИЯ*
[конкретные задачи]

ЭМОДЗИ: 🏆 Kenesary, ⚔️ Arystan, 🎯 Muha, 🚀 Traf4
ЯЗЫК: Русский
СТИЛЬ: Короткие предложения, без воды`
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: 1200,
  });
  
  const report = response.choices[0]?.message?.content || 'Ошибка';
  
  console.log('\n📄 ПРЕМИАЛЬНЫЙ ОТЧЕТ:\n');
  console.log('═'.repeat(60));
  console.log(report);
  console.log('═'.repeat(60));
  console.log('\n📤 Отправляю в топик...\n');
  
  await sendToTopic(report);
  
  console.log('✅ ОТПРАВЛЕНО!\n');
  console.log('📱 Проверь: https://t.me/c/3443946081/7\n');
  console.log('🔥 Проверь:');
  console.log('   ✅ Обе валюты ($ и ₸)');
  console.log('   ✅ Жирный текст');
  console.log('   ✅ Структурные отступы');
  console.log('   ✅ Легко читать\n');
}

main();

