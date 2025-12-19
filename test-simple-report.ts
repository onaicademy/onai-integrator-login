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
  console.log('🤖 Генерирую УПРОЩЕННЫЙ AI-отчет...\n');
  
  const data = await axios.get(`${API_URL}/api/traffic/combined-analytics?preset=24h`).then(r => r.data);
  const teams = [...data.teams].sort((a: any, b: any) => b.roas - a.roas);
  
  let prompt = `Напиши короткий отчет за вчера.\n\n`;
  prompt += `ДАННЫЕ:\n`;
  prompt += `Потратили: $${data.totals.spend.toFixed(0)}\n`;
  prompt += `Заработали: ₸${Math.round(data.totals.revenue).toLocaleString()}\n`;
  prompt += `Продажи: ${data.totals.sales} шт\n`;
  prompt += `ROAS: ${data.totals.roas.toFixed(2)}x\n\n`;
  prompt += `КОМАНДЫ:\n`;
  teams.forEach((t: any) => prompt += `${t.team}: ROAS ${t.roas.toFixed(2)}x, ${t.sales} продаж, CPA $${t.cpa.toFixed(0)}\n`);
  
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `Ты пишешь отчеты для таргетологов.

ПРАВИЛА:
- Короткие предложения (5-7 слов)
- Простые слова
- Без запятых где не нужно
- Максимум 10-12 строк

СТРУКТУРА:
1. Сколько потратили и заработали (1 строка)
2. ROAS общий (1 строка)
3. Каждая команда отдельно (кто молодец, кто подтянись)
4. Что делать дальше (конкретно)

ТОН: Прямой и честный
ЭМОДЗИ: 🏆 Kenesary, ⚔️ Arystan, 🎯 Muha, 🚀 Traf4
ЯЗЫК: Русский`
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: 800,
  });
  
  const report = response.choices[0]?.message?.content || 'Ошибка';
  
  console.log('📤 Отправляю упрощенный отчет...\n');
  console.log(report);
  console.log('\n');
  
  await sendToTopic(report);
  console.log('✅ ОТПРАВЛЕНО!\n');
  console.log('📱 Проверь: https://t.me/c/3443946081/7\n');
}

main();
