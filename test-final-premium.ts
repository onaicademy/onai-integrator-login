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
  console.log('🔥 ФИНАЛЬНЫЙ ПРЕМИАЛЬНЫЙ ОТЧЕТ (22:00)\n');
  
  const data = await axios.get(`${API_URL}/api/traffic/combined-analytics?preset=today`).then(r => r.data);
  const teams = [...data.teams].sort((a: any, b: any) => b.roas - a.roas);
  const rate = 450;
  
  let prompt = `Создай ФИНАЛЬНЫЙ ВЕЧЕРНИЙ ОТЧЕТ.\n\n`;
  prompt += `ДАННЫЕ:\n`;
  prompt += `Траты: $${data.totals.spend.toFixed(0)} (₸${Math.round(data.totals.spend * rate).toLocaleString()})\n`;
  prompt += `Доход: ₸${Math.round(data.totals.revenue).toLocaleString()} ($${Math.round(data.totals.revenue / rate)})\n`;
  prompt += `Продажи: ${data.totals.sales} шт | ROAS: ${data.totals.roas.toFixed(2)}x\n\n`;
  prompt += `КОМАНДЫ:\n`;
  teams.forEach((t: any) => {
    const cpaKzt = Math.round(t.cpa * rate);
    prompt += `${t.team}: ROAS ${t.roas.toFixed(2)}x | ${t.sales} продаж | CPA $${t.cpa.toFixed(0)} (₸${cpaKzt.toLocaleString()})\n`;
  });
  
  prompt += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  prompt += `ТРЕБОВАНИЯ:\n`;
  prompt += `1. Общий итог дня (2 предложения)\n`;
  prompt += `2. Для КАЖДОЙ команды напиши:\n`;
  prompt += `   - Оценку (Огонь/Норм/Слабо/Плохо)\n`;
  prompt += `   - Конкретную задачу на завтра\n`;
  prompt += `3. Мотивацию\n\n`;
  prompt += `ФОРМАТ: *жирные* заголовки, $ И ₸, пустые строки\n`;
  
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `Ты создаешь премиальные вечерние отчеты для таргетологов.

СТРУКТУРА:
*🌙 ВЕЧЕРНИЙ ОТЧЕТ*

*💰 ИТОГ*
Траты: *$XXX* (*₸XXX,XXX*)
Доход: *₸XXX,XXX* (*$XXX*)  
Продажи: *XX шт* | ROAS: *X.Xx* [эмодзи]

*🏆 КОМАНДЫ*

• *Kenesary* 🏆
  ROAS *X.Xx* | *XX продаж* | CPA *$XX* (*₸XX,XXX*)
  Оценка: [Огонь/Норм/Слабо/Плохо]
  Завтра: [конкретная задача]

• *Arystan* ⚔️
  ROAS *X.Xx* | *XX продаж* | CPA *$XX* (*₸XX,XXX*)
  Оценка: [Огонь/Норм/Слабо/Плохо]
  Завтра: [конкретная задача]

(и так для всех команд)

*🎯 МОТИВАЦИЯ*
[Конкретная мотивация на завтра]

ПРАВИЛА:
- ROAS >= 2.0 → Огонь! Масштабируй
- ROAS 1.0-2.0 → Норм, протестируй новое
- ROAS < 1.0 → Слабо/Плохо, меняй креативы СРОЧНО
- ВСЕ цифры в $ И ₸
- Жирным: заголовки, цифры, команды
- Короткие предложения
- БЕЗ ВОДЫ`
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: 1500,
  });
  
  const report = response.choices[0]?.message?.content || 'Ошибка';
  
  console.log('\n📄 ФИНАЛЬНЫЙ ПРЕМИАЛЬНЫЙ ОТЧЕТ:\n');
  console.log('═'.repeat(60));
  console.log(report);
  console.log('═'.repeat(60));
  console.log('\n📤 Отправляю...\n');
  
  await sendToTopic(report);
  
  console.log('✅ ОТПРАВЛЕНО! 🔥\n');
  console.log('📱 Проверь: https://t.me/c/3443946081/7\n');
}

main();
