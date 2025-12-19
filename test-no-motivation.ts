import axios from 'axios';
import Groq from 'groq-sdk';

const API_URL = 'http://localhost:3000';
const BOT_TOKEN = '8560431175:AAF_ZYiQqPAVruJoqASd-HQ0uXohRZd6h9I';
const CHAT_ID = -1003443946081;
const THREAD_ID = 7;
const GROQ_API_KEY = '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';

const groq = new Groq({ apiKey: GROQ_API_KEY });

function getRoasEmoji(roas: number): string {
  if (roas >= 2.5) return '🔥';
  if (roas >= 1.5) return '🟢';
  if (roas >= 1.0) return '🟡';
  if (roas >= 0.5) return '🟠';
  return '🔴';
}

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
  console.log('✅ ТЕСТ БЕЗ СЛОВА "МОТИВАЦИЯ"\n');
  
  const data = await axios.get(`${API_URL}/api/traffic/combined-analytics?preset=today`).then(r => r.data);
  const teams = [...data.teams].sort((a: any, b: any) => b.roas - a.roas);
  const rate = 450;
  
  let prompt = `Создай ВЕЧЕРНИЙ ОТЧЕТ.\n\n`;
  prompt += `ДАННЫЕ:\n`;
  prompt += `Траты: $${data.totals.spend.toFixed(0)} (₸${Math.round(data.totals.spend * rate).toLocaleString()})\n`;
  prompt += `Доход: ₸${Math.round(data.totals.revenue).toLocaleString()} ($${Math.round(data.totals.revenue / rate)})\n`;
  prompt += `Продажи: ${data.totals.sales} шт | ROAS: ${data.totals.roas.toFixed(2)}x ${getRoasEmoji(data.totals.roas)}\n\n`;
  
  prompt += `КОМАНДЫ:\n`;
  teams.forEach((t: any) => {
    const emoji = getRoasEmoji(t.roas);
    const cpaKzt = Math.round(t.cpa * rate);
    prompt += `${t.team}: ROAS ${t.roas.toFixed(2)}x ${emoji} | ${t.sales} продаж | CPA $${t.cpa.toFixed(0)} (₸${cpaKzt.toLocaleString()})\n`;
  });
  
  prompt += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  prompt += `ЗАДАЧА:\n`;
  prompt += `1. Общий итог дня\n`;
  prompt += `2. Для каждой команды - оценка и задача на завтра\n`;
  prompt += `3. Финальный абзац поддержки (БЕЗ ЗАГОЛОВКА "МОТИВАЦИЯ"!)\n`;
  
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `Ты пишешь отчеты для таргетологов.

СТРУКТУРА:
*🌙 ВЕЧЕРНИЙ ОТЧЕТ*

*💰 ИТОГ*
[итоги дня]

*🏆 КОМАНДЫ*
• *Команда* [эмодзи]
  ROAS *X.Xx* | *XX продаж* | CPA *$XX* (*₸XX,XXX*)
  Оценка: [оценка]
  Завтра: [задача]

[Финальный абзац БЕЗ заголовка]

ВАЖНО:
- НЕ пиши заголовок "МОТИВАЦИЯ" или "🎯 МОТИВАЦИЯ"
- Просто добавь абзац поддержки в конце без заголовка
- Короткие предложения
- $ И ₸ везде`
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
  
  console.log('\n📄 ОТЧЕТ БЕЗ "МОТИВАЦИЯ":\n');
  console.log('═'.repeat(60));
  console.log(report);
  console.log('═'.repeat(60));
  console.log('\n📤 Отправляю...\n');
  
  await sendToTopic(report);
  
  console.log('✅ ОТПРАВЛЕНО!\n');
  console.log('📱 Проверь: https://t.me/c/3443946081/7\n');
  console.log('🔥 Проверка: слова "МОТИВАЦИЯ" НЕТ в отчете!\n');
}

main();
