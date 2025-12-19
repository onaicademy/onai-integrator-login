/**
 * 🤖 ТЕСТ GROQ AI ОТЧЕТОВ
 * 
 * Генерирует все 4 AI-отчета с мотивацией и отправляет в топик
 * - Анализ через Groq AI
 * - Мотивация для таргетологов
 * - Автоматический расчет KPI
 * 
 * Запуск: npx tsx test-groq-ai-reports.ts
 */

import axios from 'axios';
import Groq from 'groq-sdk';

const API_URL = 'http://localhost:3000';
const BOT_TOKEN = '8560431175:AAF_ZYiQqPAVruJoqASd-HQ0uXohRZd6h9I';
const CHAT_ID = -1003443946081;
const THREAD_ID = 7;
const GROQ_API_KEY = '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';

const groq = new Groq({ apiKey: GROQ_API_KEY });

console.log('🤖 ТЕСТИРОВАНИЕ GROQ AI ОТЧЕТОВ\n');
console.log('=' .repeat(60));
console.log('🔥 Groq AI будет анализировать данные и генерировать мотивацию!\n');

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

async function fetchAnalytics(preset: string) {
  try {
    const response = await axios.get(`${API_URL}/api/traffic/combined-analytics?preset=${preset}`);
    return response.data;
  } catch (error: any) {
    console.error(`❌ Ошибка загрузки данных:`, error.message);
    return null;
  }
}

async function generateAIReport(data: any, reportType: string): Promise<string> {
  const rankedTeams = [...data.teams].sort((a: any, b: any) => b.roas - a.roas);
  
  const config: any = {
    '10:00': {
      title: '🌅 ОТЧЕТ ЗА ВЧЕРА',
      focus: 'Анализ результатов за вчера, выделение лидеров, мотивация на новый день',
      tone: 'Энергичный, мотивирующий'
    },
    '16:00': {
      title: '📊 ОБЕДЕННЫЙ СТАТУС',
      focus: 'Текущее состояние, промежуточные результаты, корректировки',
      tone: 'Деловой, с акцентом на возможности'
    },
    '22:00': {
      title: '🌙 ВЕЧЕРНИЙ ОТЧЕТ',
      focus: 'Итоги дня, достижения, задачи на завтра',
      tone: 'Подводящий итоги, с благодарностью'
    },
    'weekly': {
      title: '📅 НЕДЕЛЬНЫЙ ОТЧЕТ',
      focus: 'Итоги недели, топ команд, новые KPI (+10%), мотивация',
      tone: 'Торжественный, вдохновляющий'
    }
  };
  
  const cfg = config[reportType];
  
  // Построить промпт
  let prompt = `${cfg.title}\n\n`;
  prompt += `Фокус: ${cfg.focus}\n`;
  prompt += `Тон: ${cfg.tone}\n\n`;
  prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  prompt += `📊 ДАННЫЕ:\n`;
  prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  prompt += `💰 ОБЩИЕ ИТОГИ:\n`;
  prompt += `- Затраты: $${data.totals.spend.toFixed(0)}\n`;
  prompt += `- Доход: ₸${Math.round(data.totals.revenue).toLocaleString()}\n`;
  prompt += `- Продажи: ${data.totals.sales} шт\n`;
  prompt += `- ROAS: ${data.totals.roas.toFixed(2)}x\n\n`;
  prompt += `👥 РЕЗУЛЬТАТЫ КОМАНД:\n\n`;
  
  rankedTeams.forEach((team: any, idx: number) => {
    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '⭐';
    prompt += `${medal} ${team.team}:\n`;
    prompt += `   - ROAS: ${team.roas.toFixed(2)}x\n`;
    prompt += `   - Продажи: ${team.sales} шт\n`;
    prompt += `   - CPA: $${team.cpa.toFixed(0)}\n`;
    prompt += `   - CTR: ${team.ctr.toFixed(2)}%\n\n`;
  });
  
  prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  prompt += `🎯 ТВОЯ ЗАДАЧА:\n`;
  prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  if (reportType === 'weekly') {
    prompt += `1. Подведи итоги недели (2-3 предложения)\n`;
    prompt += `2. Отметь лучшую команду\n`;
    prompt += `3. РАССЧИТАЙ новые KPI на следующую неделю (+10% от текущих):\n`;
    prompt += `   Для каждой команды укажи:\n`;
    prompt += `   - Цель продаж (текущие + 10%)\n`;
    prompt += `   - Целевой ROAS (текущий + 10%)\n`;
    prompt += `4. Дай мотивацию каждой команде\n`;
  } else {
    prompt += `1. Оцени результаты (1-2 предложения)\n`;
    prompt += `2. Отметь лучшую команду\n`;
    prompt += `3. Дай мотивацию и рекомендации\n`;
  }
  
  prompt += `\nФОРМАТ: Markdown, макс 15 строк, конкретные цифры\n`;
  prompt += `ЭМОДЗИ для команд: 🏆 Kenesary, ⚔️ Arystan, 🎯 Muha, 🚀 Traf4\n`;
  
  console.log(`🤖 Отправляю промпт в Groq AI...`);
  
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `Ты - мотивационный аналитик для команды таргетологов onAI Academy.

ПРАВИЛА:
- Пиши КРАТКО (макс 15 строк)
- Называй цифры: ROAS, продажи, CPA
- Давай КОНКРЕТНУЮ мотивацию каждой команде
- Если ROAS < 1.0 - пиши что нужно СРОЧНО оптимизировать
- Если ROAS >= 2.0 - хвали и мотивируй масштабировать
- Формат: Markdown
- Язык: Русский`
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: 1500,
  });
  
  return response.choices[0]?.message?.content || 'Ошибка генерации';
}

async function main() {
  try {
    console.log('\n📝 1/4: Генерирую AI вчерашний отчет (10:00)...');
    const data1 = await fetchAnalytics('24h');
    if (!data1) throw new Error('Нет данных');
    const report1 = await generateAIReport(data1, '10:00');
    console.log('📤 Отправляю в топик...');
    await sendToTopic(report1);
    console.log('✅ Отправлен!\n');
    await new Promise(r => setTimeout(r, 2000));
    
    console.log('📝 2/4: Генерирую AI текущий статус (16:00)...');
    const data2 = await fetchAnalytics('today');
    if (!data2) throw new Error('Нет данных');
    const report2 = await generateAIReport(data2, '16:00');
    console.log('📤 Отправляю в топик...');
    await sendToTopic(report2);
    console.log('✅ Отправлен!\n');
    await new Promise(r => setTimeout(r, 2000));
    
    console.log('📝 3/4: Генерирую AI дневной отчет (22:00)...');
    const data3 = await fetchAnalytics('today');
    if (!data3) throw new Error('Нет данных');
    const report3 = await generateAIReport(data3, '22:00');
    console.log('📤 Отправляю в топик...');
    await sendToTopic(report3);
    console.log('✅ Отправлен!\n');
    await new Promise(r => setTimeout(r, 2000));
    
    console.log('📝 4/4: Генерирую AI недельный отчет с KPI (Пн 10:00)...');
    const data4 = await fetchAnalytics('7d');
    if (!data4) throw new Error('Нет данных');
    const report4 = await generateAIReport(data4, 'weekly');
    console.log('📤 Отправляю в топик...');
    await sendToTopic(report4);
    console.log('✅ Отправлен!\n');
    
    console.log('=' .repeat(60));
    console.log('\n🎉 ВСЕ 4 AI-ОТЧЕТА ОТПРАВЛЕНЫ!\n');
    console.log('🤖 Groq AI провел анализ и сгенерировал мотивацию!\n');
    console.log('📱 Проверь топик: https://t.me/c/3443946081/7\n');
    console.log('✅ Проверь качество AI-анализа и мотивации!\n');
    
  } catch (error: any) {
    console.error('\n❌ Ошибка:', error.message);
    process.exit(1);
  }
}

main();

