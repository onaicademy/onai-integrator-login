/**
 * 🤖 GROQ AI — PROFESSIONAL TRAFFIC ANALYTICS REPORTS
 * 
 * Model: llama-3.3-70b-versatile
 * 
 * Generates data-driven reports with:
 * - Full Facebook Ads metrics analysis (20+ data points)
 * - 4-stage funnel visualization (Impressions → Clicks → Leads → Sales)
 * - Team performance benchmarking
 * - Actionable recommendations (no fluff)
 * - KPI targets with growth calculations
 */

import Groq from 'groq-sdk';
import axios from 'axios';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const API_URL = process.env.API_URL || 'http://localhost:3000';

// 📊 Full Facebook Ads metrics interface
interface TeamData {
  team: string;
  // 💰 Spend & Revenue
  spend: number;           // USD
  spendKZT: number;        // KZT
  revenue: number;         // KZT
  // 📈 Performance
  roas: number;            // Revenue / Spend ratio
  sales: number;           // Completed purchases
  cpa: number;             // Cost Per Acquisition (USD)
  ctr: number;             // Click-Through Rate %
  // 📊 Reach & Frequency
  impressions: number;
  clicks: number;
  reach: number;           // Unique users reached
  leads: number;           // Lead form submissions
  // 🎬 Video Metrics
  videoMetrics?: {
    plays: number;         // Video starts
    thruplay: number;      // 15sec+ or complete views
    completions: number;   // 100% watched
    completionRate: number;
    thruplayRate: number;
    avgWatchTime: number;  // seconds
    retention: {
      '25%': number;
      '50%': number;
      '75%': number;
      '100%': number;
    };
  };
  // 🎯 Top creatives
  topVideoCreatives?: Array<{
    name: string;
    plays: number;
    thruplay: number;
    completions: number;
    completionRate: string;
    thruplayRate: string;
    avgWatchTime: string;
    ctr: string;
  }>;
  // 📋 Campaigns
  campaigns?: Array<{
    name: string;
    spend: number;
    clicks: number;
    impressions: number;
    videoPlays: number;
    videoCompletions: number;
  }>;
}

interface AnalyticsData {
  teams: TeamData[];
  totals: {
    spend: number;
    spendKZT: number;
    revenue: number;
    roas: number;
    sales: number;
    leads: number;
    impressions: number;
    clicks: number;
    reach: number;
  };
  exchangeRate?: {
    usdToKzt: number;
    updatedAt: string;
  };
  period?: {
    since: string;
    until: string;
    preset: string;
  };
}

// 📊 Получить данные из API
async function fetchAnalytics(preset: string = 'yesterday'): Promise<AnalyticsData | null> {
  try {
    const response = await axios.get(`${API_URL}/api/traffic/combined-analytics?preset=${preset}`);
    return response.data;
  } catch (error) {
    console.error('❌ Ошибка загрузки аналитики:', error);
    return null;
  }
}

// 🤖 Generate AI Report with Professional Analysis
async function generateAIReport(
  data: AnalyticsData,
  reportType: '10:00' | '16:00' | '22:00' | 'weekly',
  previousWeekData?: AnalyticsData
): Promise<string> {
  const reportConfig = {
    '10:00': {
      title: '🌅 DAILY PERFORMANCE REPORT',
      focus: 'Yesterday analysis, top performers, action items for today',
      tone: 'Data-driven, actionable'
    },
    '16:00': {
      title: '📊 MID-DAY STATUS UPDATE',
      focus: 'Current performance, pacing to goals, immediate optimizations',
      tone: 'Analytical, solution-oriented'
    },
    '22:00': {
      title: '🌙 END-OF-DAY SUMMARY',
      focus: 'Daily results, wins/losses, tomorrow priorities',
      tone: 'Summary, forward-looking'
    },
    'weekly': {
      title: '📅 WEEKLY PERFORMANCE REVIEW',
      focus: 'Week-over-week analysis, team rankings, next week KPIs (+10%)',
      tone: 'Strategic, goal-setting'
    }
  };

  const config = reportConfig[reportType];
  const prompt = buildGroqPrompt(data, config, reportType, previousWeekData);
  
  try {
    console.log(`🤖 [Groq] Generating ${reportType} report...`);
    
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are a Senior Performance Marketing Analyst generating executive reports for a traffic team.

═══════════════════════════════════════════════════
REPORT STRUCTURE (4-STAGE FUNNEL PYRAMID):
═══════════════════════════════════════════════════

ALWAYS include this visual funnel:

┌─────────────────────────────────────┐
│  👁 IMPRESSIONS: XXX,XXX          │ Stage 1
└─────────────────────────────────────┘
   ┌───────────────────────────────┐
   │  👆 CLICKS: X,XXX (CTR X.X%)   │ Stage 2
   └───────────────────────────────┘
      ┌─────────────────────────┐
      │  📥 LEADS: XXX (CR X.X%)  │ Stage 3
      └─────────────────────────┘
         ┌───────────────────┐
         │ 💰 SALES: XX (X.X%) │ Stage 4
         └───────────────────┘

═══════════════════════════════════════════════════
FACEBOOK METRICS TO ANALYZE:
═══════════════════════════════════════════════════

**Acquisition Metrics:**
- Spend ($USD / ₸KZT)
- Impressions & Reach
- Frequency (how often users see ads)
- CTR (benchmark: >1.5% = good, <0.8% = needs work)
- CPC (cost per click)
- CPM (cost per 1000 impressions)

**Engagement Metrics:**
- Video Plays (3-sec views)
- ThruPlay (15-sec or complete)
- Video Completion Rate (25%, 50%, 75%, 100%)
- Avg Watch Time

**Conversion Metrics:**
- Leads (form submissions)
- Sales (completed purchases)
- CPA (cost per acquisition)
- ROAS (return on ad spend)
- CPL (cost per lead)

═══════════════════════════════════════════════════
ANALYSIS FRAMEWORK (BE SPECIFIC!):
═══════════════════════════════════════════════════

1. **Funnel Bottleneck Analysis**
   - Where is the biggest drop-off?
   - Impressions→Clicks (CTR issue = creative problem)
   - Clicks→Leads (Landing page issue)
   - Leads→Sales (Offer/price issue)

2. **Video Performance Analysis**
   - ThruPlay rate <10% = Hook is weak (first 3 sec)
   - 25% retention <40% = Message unclear
   - Completion rate <5% = Video too long or boring

3. **Team Comparison**
   - Rank by ROAS (primary KPI)
   - Note best/worst CTR
   - Note best/worst CPA

4. **Actionable Recommendations**
   - ONLY give 2-3 specific actions per team
   - Format: "Do X to improve Y by Z%"
   - NO generic advice like "test more creatives"

═══════════════════════════════════════════════════
FORMATTING RULES:
═══════════════════════════════════════════════════

- Use *bold* for important numbers
- Currency: ALWAYS show both *$XXX* (*₸XXX,XXX*)
- Team emojis: 👑 Kenesary, ⚔️ Arystan, 🎯 Muha, 🚀 Traf4
- ROAS indicators: 🔥 >2.0x, 🟢 1.5-2.0x, 🟡 1.0-1.5x, 🟠 0.5-1.0x, 🔴 <0.5x
- Keep report under 20 lines
- Use Russian language
- NO fluff, NO generic statements

${reportType === 'weekly' ? `
**WEEKLY REPORT SPECIAL:**
- Calculate NEW KPI targets (+10% from current)
- Show week-over-week comparison
- Set specific goals: Sales target, ROAS target, Budget
` : ''}

${reportType === '22:00' ? `
**EVENING REPORT SPECIAL:**
- Summarize day's wins and challenges
- Give specific tasks for tomorrow
- Format: "[Team]: Do X tomorrow"
` : ''}`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.4, // Lower for more consistent, analytical output
      max_tokens: 2000,
    });
    
    const report = response.choices[0]?.message?.content || 'Report generation failed';
    console.log(`✅ [Groq] ${reportType} report generated`);
    return report;
    
  } catch (error: any) {
    console.error(`❌ [Groq] Error:`, error.message);
    return generateSimpleReport(data, config.title);
  }
}

// 📝 Построить промпт для Groq AI
function buildGroqPrompt(
  data: AnalyticsData,
  config: any,
  reportType: string,
  previousWeekData?: AnalyticsData
): string {
  const rankedTeams = [...data.teams].sort((a, b) => b.roas - a.roas);
  
  let prompt = `${config.title}\n\n`;
  prompt += `Фокус: ${config.focus}\n`;
  prompt += `Тон: ${config.tone}\n\n`;
  if (data.period?.since && data.period?.until) {
    prompt += `Период: ${data.period.since} → ${data.period.until} (${data.period.preset || 'custom'})\n\n`;
  }
  prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  prompt += `📊 ДАННЫЕ:\n`;
  prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  // Общие показатели (обе валюты!)
  const exchangeRate = data.exchangeRate?.usdToKzt || 450; // 1 USD = 450 KZT
  const spendKzt = Math.round(data.totals.spend * exchangeRate);
  const revenueUsd = Math.round(data.totals.revenue / exchangeRate);
  
  prompt += `💰 ОБЩИЕ ИТОГИ:\n`;
  prompt += `- Затраты: $${data.totals.spend.toFixed(0)} (₸${spendKzt.toLocaleString()})\n`;
  prompt += `- Доход: ₸${Math.round(data.totals.revenue).toLocaleString()} ($${revenueUsd})\n`;
  prompt += `- Продажи: ${data.totals.sales} шт\n`;
  prompt += `- ROAS: ${data.totals.roas.toFixed(2)}x ${getRoasEmoji(data.totals.roas)}\n`;
  prompt += `- Курс: 1$ = ${exchangeRate}₸\n\n`;
  
  // Детали по командам
  prompt += `👥 РЕЗУЛЬТАТЫ КОМАНД:\n\n`;
  
  rankedTeams.forEach((team, idx) => {
    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '⭐';
    const cpaKzt = Math.round(team.cpa * exchangeRate);
    const spendKzt = Math.round(team.spend * exchangeRate);
    
    prompt += `${medal} ${team.team}:\n`;
    prompt += `   - ROAS: ${team.roas.toFixed(2)}x ${getRoasEmoji(team.roas)}\n`;
    prompt += `   - Продажи: ${team.sales} шт\n`;
    prompt += `   - CPA: $${team.cpa.toFixed(0)} (₸${cpaKzt.toLocaleString()})\n`;
    prompt += `   - CTR: ${team.ctr.toFixed(2)}%\n`;
    prompt += `   - Траты: $${team.spend.toFixed(0)} (₸${spendKzt.toLocaleString()})\n\n`;
  });
  
  // Для недельного отчета: добавить данные прошлой недели
  if (reportType === 'weekly' && previousWeekData) {
    prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    prompt += `📈 ДИНАМИКА (прошлая неделя):\n`;
    prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    rankedTeams.forEach(team => {
      const prevTeam = previousWeekData.teams.find(t => t.team === team.team);
      if (prevTeam) {
        const roasChange = ((team.roas - prevTeam.roas) / prevTeam.roas * 100).toFixed(0);
        const salesChange = team.sales - prevTeam.sales;
        
        prompt += `${team.team}:\n`;
        prompt += `   - ROAS: ${prevTeam.roas.toFixed(2)}x → ${team.roas.toFixed(2)}x (${roasChange > '0' ? '+' : ''}${roasChange}%)\n`;
        prompt += `   - Продажи: ${prevTeam.sales} → ${team.sales} (${salesChange > 0 ? '+' : ''}${salesChange})\n\n`;
      }
    });
  }
  
  // Аномалии и проблемы
  const problems: string[] = [];
  const achievements: string[] = [];
  
  rankedTeams.forEach(team => {
    if (team.roas < 1.0) {
      problems.push(`${team.team}: ROAS ${team.roas.toFixed(2)}x - УБЫТОЧНО! Срочно оптимизировать`);
    }
    if (team.ctr < 0.5) {
      problems.push(`${team.team}: CTR ${team.ctr.toFixed(2)}% - очень низкий, нужны новые креативы`);
    }
    if (team.roas >= 3.0) {
      achievements.push(`${team.team}: ROAS ${team.roas.toFixed(2)}x - ОТЛИЧНЫЙ результат! Масштабировать!`);
    }
    if (team.sales >= 10 && team.roas >= 2.0) {
      achievements.push(`${team.team}: ${team.sales} продаж при ROAS ${team.roas.toFixed(2)}x - стабильная эффективность!`);
    }
  });
  
  if (problems.length > 0) {
    prompt += `\n⚠️ ТРЕБУЮТ ВНИМАНИЯ:\n`;
    problems.forEach(p => prompt += `- ${p}\n`);
  }
  
  if (achievements.length > 0) {
    prompt += `\n🔥 ДОСТИЖЕНИЯ:\n`;
    achievements.forEach(a => prompt += `- ${a}\n`);
  }
  
  prompt += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  prompt += `🎯 ТВОЯ ЗАДАЧА:\n`;
  prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  prompt += `Создай ПРЕМИАЛЬНЫЙ отчет:\n\n`;
  
  if (reportType === 'weekly') {
    prompt += `1. Итоги недели (2-3 предложения)\n`;
    prompt += `2. Лучшая команда и почему\n`;
    prompt += `3. *НОВЫЕ KPI НА НЕДЕЛЮ (+10%)*:\n`;
    prompt += `   Для КАЖДОЙ команды посчитай и напиши:\n`;
    prompt += `   • Продажи: *XX шт* (текущие +10%)\n`;
    prompt += `   • ROAS: *X.Xx* (текущий +10%)\n`;
    prompt += `   • Бюджет: *$XXX* (*₸XXX,XXX*) (текущий +10%)\n`;
    prompt += `4. Финальный абзац поддержки (БЕЗ заголовка)\n`;
  } else if (reportType === '22:00') {
    prompt += `1. Общий итог дня (2 предложения)\n`;
    prompt += `2. Для КАЖДОЙ команды напиши:\n`;
    prompt += `   • Оценку: "Отлично" / "Хорошо" / "Потенциал есть" / "Работаем над улучшением"\n`;
    prompt += `   • Что конкретно делать завтра\n`;
    prompt += `3. Финальный абзац поддержки (БЕЗ заголовка)\n`;
  } else if (reportType === '16:00') {
    prompt += `1. Текущее состояние (2 предложения)\n`;
    prompt += `2. Для КАЖДОЙ команды:\n`;
    prompt += `   • Идёт норм / Надо корректировать\n`;
    prompt += `   • Что сделать ДО КОНЦА ДНЯ\n`;
  } else { // 10:00
    prompt += `1. Вчерашние результаты (2 предложения)\n`;
    prompt += `2. Лидер и почему\n`;
    prompt += `3. Для КАЖДОЙ команды:\n`;
    prompt += `   • Оценка вчерашнего дня\n`;
    prompt += `   • Что делать сегодня\n`;
    prompt += `4. Финальный абзац (БЕЗ заголовка)\n`;
  }
  
  prompt += `\nФОРМАТ:\n`;
  prompt += `- Заголовки: *ЖИРНЫМ*\n`;
  prompt += `- Цифры: *жирным*\n`;
  prompt += `- Команды: *жирным*\n`;
  prompt += `- ВСЕ валюты: $ И ₸\n`;
  prompt += `- Пустые строки между блоками\n`;
  prompt += `- Максимум 18 строк\n`;
  prompt += `- БЕЗ ВОДЫ, КОНКРЕТНО\n`;
  
  return prompt;
}

// 🎨 Получить эмодзи для ROAS (ПРАВИЛЬНАЯ ЛОГИКА!)
function getRoasEmoji(roas: number): string {
  if (roas >= 2.5) return '🔥'; // Огонь!
  if (roas >= 1.5) return '🟢'; // Отлично
  if (roas >= 1.0) return '🟡'; // Окупаемость
  if (roas >= 0.5) return '🟠'; // Убыток, но не критичный
  return '🔴'; // Жопа!
}

// 📄 Простой отчет (fallback без AI)
function generateSimpleReport(data: AnalyticsData, title: string): string {
  const rankedTeams = [...data.teams].sort((a, b) => b.roas - a.roas);
  
  let report = `${title}\n`;
  report += `━━━━━━━━━━━━━━━━━━\n\n`;
  report += `💰 *ИТОГИ:*\n`;
  report += `Затраты: $${data.totals.spend.toFixed(0)} | Доход: ₸${Math.round(data.totals.revenue).toLocaleString()}\n`;
  report += `Продажи: ${data.totals.sales} шт | ROAS: ${data.totals.roas.toFixed(2)}x\n\n`;
  report += `🏆 *РЕЙТИНГ:*\n`;
  
  rankedTeams.forEach((team, idx) => {
    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '⭐';
    report += `${medal} ${team.team}: ROAS ${team.roas.toFixed(2)}x | ${team.sales} продаж\n`;
  });
  
  return report;
}

// ═══════════════════════════════════════════════════════════════
// 📤 ПУБЛИЧНЫЕ ФУНКЦИИ
// ═══════════════════════════════════════════════════════════════

// 🌅 10:00 - Вчерашний отчет
export async function generateYesterdayReportAI(): Promise<string> {
  const data = await fetchAnalytics('yesterday');
  if (!data) return '❌ Не удалось загрузить данные';
  
  return await generateAIReport(data, '10:00');
}

// 📊 16:00 - Текущий статус
export async function generateCurrentStatusReportAI(): Promise<string> {
  const data = await fetchAnalytics('today');
  if (!data) return '❌ Не удалось загрузить данные';
  
  return await generateAIReport(data, '16:00');
}

// 🌙 22:00 - Дневной отчет
export async function generateDailyReportAI(): Promise<string> {
  const data = await fetchAnalytics('today');
  if (!data) return '❌ Не удалось загрузить данные';
  
  return await generateAIReport(data, '22:00');
}

// 📅 Понедельник 10:00 - Недельный отчет с новыми KPI
export async function generateWeeklyReportAI(): Promise<string> {
  const thisWeek = await fetchAnalytics('7d');
  const previousWeek = await fetchAnalytics('14d'); // Для сравнения
  
  if (!thisWeek) return '❌ Не удалось загрузить данные';
  
  return await generateAIReport(thisWeek, 'weekly', previousWeek || undefined);
}

export default {
  generateYesterdayReportAI,
  generateCurrentStatusReportAI,
  generateDailyReportAI,
  generateWeeklyReportAI,
};
