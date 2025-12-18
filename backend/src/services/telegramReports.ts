import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:3000';

interface TeamData {
  team: string;
  spend: number;
  revenue: number;
  roas: number;
  sales: number;
  cpa: number;
  ctr: number;
  impressions: number;
  clicks: number;
  videoMetrics?: {
    plays: number;
    completions: number;
    completionRate: number;
    avgWatchTime: number;
  } | null;
  topVideoCreatives?: Array<{
    name: string;
    plays: number;
    completions: number;
    completionRate: string;
    avgWatchTime: string;
    ctr?: string;
  }>;
}

interface AnalyticsData {
  teams: TeamData[];
  totals: {
    spend: number;
    revenue: number;
    roas: number;
    sales: number;
  };
  exchangeRate?: {
    usd: number;
    kzt: number;
    rate: number;
    date: string;
  };
}

// Эмодзи для команд
const TEAM_EMOJI: Record<string, string> = {
  'Kenesary': '🏆',
  'Arystan': '⚔️',
  'Muha': '🎯',
  'Traf4': '🚀',
};

// Получить данные из API
async function fetchAnalytics(preset: string = '24h'): Promise<AnalyticsData | null> {
  try {
    const response = await axios.get(`${API_URL}/api/traffic/combined-analytics?preset=${preset}`);
    return response.data;
  } catch (error) {
    console.error('❌ Ошибка загрузки аналитики:', error);
    return null;
  }
}

// Форматирование числа
function formatNumber(num: number): string {
  return num.toLocaleString('ru-RU');
}

// Форматирование валюты
function formatMoney(num: number, currency: 'USD' | 'KZT' = 'USD'): string {
  if (currency === 'USD') {
    return `$${num.toFixed(0)}`;
  }
  return `₸${formatNumber(Math.round(num))}`;
}

// Форматирование процента
function formatPercent(num: number): string {
  return `${num.toFixed(2)}%`;
}

// Получить эмодзи для ROAS
function getRoasEmoji(roas: number): string {
  if (roas >= 2) return '🟢';
  if (roas >= 1) return '🟡';
  return '🔴';
}

// 🌅 ОТЧЕТ ЗА ВЧЕРА (10:00)
export async function generateYesterdayReport(): Promise<string> {
  const data = await fetchAnalytics('24h');
  if (!data) return '❌ Не удалось загрузить данные';
  
  const rankedTeams = [...data.teams].sort((a, b) => b.roas - a.roas);
  
  let report = '🌅 *ДОБРОЕ УТРО, КОМАНДА!*\n\n';
  report += '📊 *ОТЧЕТ ЗА ВЧЕРА*\n';
  report += `━━━━━━━━━━━━━━━━━━\n\n`;
  
  // Общие показатели
  report += `💰 *ОБЩИЕ РЕЗУЛЬТАТЫ:*\n`;
  report += `• Затраты: ${formatMoney(data.totals.spend, 'USD')}\n`;
  report += `• Доход: ${formatMoney(data.totals.revenue, 'KZT')}\n`;
  report += `• Продажи: ${data.totals.sales} шт\n`;
  report += `• ROAS: ${data.totals.roas.toFixed(2)}x ${getRoasEmoji(data.totals.roas)}\n\n`;
  
  // Рейтинг команд
  report += `🏆 *РЕЙТИНГ КОМАНД:*\n\n`;
  rankedTeams.forEach((team, idx) => {
    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '⭐';
    const emoji = TEAM_EMOJI[team.team] || '📊';
    report += `${medal} ${emoji} *${team.team}*\n`;
    report += `   └ ROAS: ${team.roas.toFixed(2)}x ${getRoasEmoji(team.roas)} | Продажи: ${team.sales} | CPA: ${formatMoney(team.cpa, 'USD')}\n\n`;
  });
  
  // Мотивация
  const topTeam = rankedTeams[0];
  report += `━━━━━━━━━━━━━━━━━━\n`;
  report += `🔥 *Лидер дня - ${topTeam.team}!*\n`;
  report += `Отличная работа, продолжайте в том же духе! 💪\n`;
  
  return report;
}

// 📊 ОТЧЕТ ТЕКУЩИЙ СТАТУС (16:00)
export async function generateCurrentStatusReport(): Promise<string> {
  const data = await fetchAnalytics('today');
  if (!data) return '❌ Не удалось загрузить данные';
  
  const rankedTeams = [...data.teams].sort((a, b) => b.roas - a.roas);
  
  let report = '📊 *ТЕКУЩИЙ СТАТУС - СЕРЕДИНА ДНЯ*\n\n';
  report += `🕐 Данные на ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}\n`;
  report += `━━━━━━━━━━━━━━━━━━\n\n`;
  
  // Общие показатели
  report += `💰 *НА ДАННЫЙ МОМЕНТ:*\n`;
  report += `• Затраты: ${formatMoney(data.totals.spend, 'USD')}\n`;
  report += `• Доход: ${formatMoney(data.totals.revenue, 'KZT')}\n`;
  report += `• Продажи: ${data.totals.sales} шт\n`;
  report += `• ROAS: ${data.totals.roas.toFixed(2)}x ${getRoasEmoji(data.totals.roas)}\n\n`;
  
  // Команды
  report += `📈 *СТАТУС КОМАНД:*\n\n`;
  rankedTeams.forEach((team, idx) => {
    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '⭐';
    const emoji = TEAM_EMOJI[team.team] || '📊';
    report += `${medal} ${emoji} *${team.team}*\n`;
    report += `   └ ROAS: ${team.roas.toFixed(2)}x | Продажи: ${team.sales} | CTR: ${formatPercent(team.ctr)}\n\n`;
  });
  
  report += `━━━━━━━━━━━━━━━━━━\n`;
  report += `⚡ Еще половина дня впереди!\nУсилим результаты к вечеру! 💪\n`;
  
  return report;
}

// 🌙 ДНЕВНОЙ ОТЧЕТ (22:00)
export async function generateDailyReport(): Promise<string> {
  const data = await fetchAnalytics('today');
  if (!data) return '❌ Не удалось загрузить данные';
  
  const rankedTeams = [...data.teams].sort((a, b) => b.roas - a.roas);
  
  let report = '🌙 *ДНЕВНОЙ ОТЧЕТ*\n\n';
  report += `📅 ${new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}\n`;
  report += `━━━━━━━━━━━━━━━━━━\n\n`;
  
  // Общие показатели
  report += `💰 *ИТОГИ ДНЯ:*\n`;
  report += `• Затраты: ${formatMoney(data.totals.spend, 'USD')}\n`;
  report += `• Доход: ${formatMoney(data.totals.revenue, 'KZT')}\n`;
  report += `• Продажи: ${data.totals.sales} шт\n`;
  report += `• ROAS: ${data.totals.roas.toFixed(2)}x ${getRoasEmoji(data.totals.roas)}\n\n`;
  
  // 🏆 РЕЙТИНГ ПО ПРОДАЖАМ
  const salesLeader = [...rankedTeams].sort((a, b) => b.sales - a.sales)[0];
  report += `🏆 *ЛУЧШИЙ ПО ПРОДАЖАМ:*\n`;
  report += `${TEAM_EMOJI[salesLeader.team]} *${salesLeader.team}* - ${salesLeader.sales} продаж\n\n`;
  
  // 🎬 ЛУЧШАЯ ВОВЛЕЧЕННОСТЬ КРЕАТИВОВ
  const videoLeader = rankedTeams.find(t => t.videoMetrics && t.videoMetrics.completionRate > 0);
  if (videoLeader && videoLeader.videoMetrics) {
    report += `🎬 *ЛУЧШАЯ ВОВЛЕЧЕННОСТЬ:*\n`;
    report += `${TEAM_EMOJI[videoLeader.team]} *${videoLeader.team}* - ${videoLeader.videoMetrics.completionRate.toFixed(1)}% досмотров\n\n`;
  }
  
  // 🖱️ ЛУЧШАЯ КЛИКАБЕЛЬНОСТЬ
  const ctrLeader = [...rankedTeams].sort((a, b) => b.ctr - a.ctr)[0];
  report += `🖱️ *ЛУЧШАЯ КЛИКАБЕЛЬНОСТЬ:*\n`;
  report += `${TEAM_EMOJI[ctrLeader.team]} *${ctrLeader.team}* - ${formatPercent(ctrLeader.ctr)} CTR\n\n`;
  
  // 📊 ОБЩИЙ РЕЙТИНГ
  report += `━━━━━━━━━━━━━━━━━━\n`;
  report += `📊 *ОБЩИЙ РЕЙТИНГ:*\n\n`;
  rankedTeams.forEach((team, idx) => {
    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '⭐';
    const emoji = TEAM_EMOJI[team.team] || '📊';
    const status = team.roas >= 2 ? 'ОТЛИЧНО' : team.roas >= 1 ? 'ХОРОШО' : 'ТРЕБУЕТ УЛУЧШЕНИЯ';
    report += `${medal} ${emoji} *${team.team}* - ${status}\n`;
    report += `   └ ROAS: ${team.roas.toFixed(2)}x | Продажи: ${team.sales} | CPA: ${formatMoney(team.cpa, 'USD')}\n\n`;
  });
  
  // 💬 ОБЩИЙ ВЫВОД
  report += `━━━━━━━━━━━━━━━━━━\n`;
  report += `💬 *ВЫВОД:*\n`;
  
  if (data.totals.roas >= 2) {
    report += `🟢 Отличный день! ROAS ${data.totals.roas.toFixed(2)}x показывает, что команды работают эффективно. ${salesLeader.team} лидирует по продажам (${salesLeader.sales} шт). Продолжаем в том же духе!\n`;
  } else if (data.totals.roas >= 1) {
    report += `🟡 Прибыльный день! ROAS ${data.totals.roas.toFixed(2)}x показывает положительную динамику. ${salesLeader.team} ведет по продажам (${salesLeader.sales} шт). Есть потенциал для улучшения!\n`;
  } else {
    report += `🔴 День требует работы. ROAS ${data.totals.roas.toFixed(2)}x ниже целевого. Нужно проанализировать креативы и таргетинг. ${salesLeader.team} показывает лучшие результаты (${salesLeader.sales} продаж).\n`;
  }
  
  report += `\n🔥 Завтра новый день - новые возможности! 💪`;
  
  return report;
}

// 📅 НЕДЕЛЬНЫЙ ОТЧЕТ (воскресенье)
export async function generateWeeklyReport(): Promise<string> {
  const data = await fetchAnalytics('7d');
  if (!data) return '❌ Не удалось загрузить данные';
  
  const rankedTeams = [...data.teams].sort((a, b) => b.roas - a.roas);
  
  let report = '📅 *НЕДЕЛЬНЫЙ ОТЧЕТ*\n\n';
  report += `🗓️ ${new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}\n`;
  report += `━━━━━━━━━━━━━━━━━━\n\n`;
  
  // Общие показатели
  report += `💰 *ИТОГИ НЕДЕЛИ:*\n`;
  report += `• Затраты: ${formatMoney(data.totals.spend, 'USD')}\n`;
  report += `• Доход: ${formatMoney(data.totals.revenue, 'KZT')}\n`;
  report += `• Продажи: ${data.totals.sales} шт\n`;
  report += `• ROAS: ${data.totals.roas.toFixed(2)}x ${getRoasEmoji(data.totals.roas)}\n\n`;
  
  // 🏆 РЕЙТИНГ
  report += `🏆 *РЕЙТИНГ НЕДЕЛИ:*\n\n`;
  rankedTeams.forEach((team, idx) => {
    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '⭐';
    const emoji = TEAM_EMOJI[team.team] || '📊';
    report += `${medal} ${emoji} *${team.team}*\n`;
    report += `   └ ROAS: ${team.roas.toFixed(2)}x | Продажи: ${team.sales} | Доход: ${formatMoney(team.revenue, 'KZT')}\n\n`;
  });
  
  // 💬 БЛАГОДАРНОСТЬ И МОТИВАЦИЯ
  report += `━━━━━━━━━━━━━━━━━━\n`;
  report += `💬 *СПАСИБО КОМАНДЕ!*\n\n`;
  
  const topTeam = rankedTeams[0];
  const secondTeam = rankedTeams[1];
  
  if (topTeam.roas >= 3) {
    report += `🔥 *${topTeam.team}* - невероятная работа! ROAS ${topTeam.roas.toFixed(2)}x и ${topTeam.sales} продаж - это просто огонь! 🏆\n\n`;
  } else if (topTeam.roas >= 2) {
    report += `🎉 *${topTeam.team}* - отличные результаты! ROAS ${topTeam.roas.toFixed(2)}x показывает вашу эффективность. Так держать! 💪\n\n`;
  } else if (topTeam.roas >= 1) {
    report += `👏 *${topTeam.team}* - хорошая работа! ROAS ${topTeam.roas.toFixed(2)}x - прибыльно, но есть куда расти. Вы молодцы! 🚀\n\n`;
  }
  
  if (secondTeam && secondTeam.roas >= 1) {
    report += `🥈 *${secondTeam.team}* - вы тоже на высоте! ROAS ${secondTeam.roas.toFixed(2)}x - отличная динамика! 🔥\n\n`;
  }
  
  // Мотивация для всех
  report += `━━━━━━━━━━━━━━━━━━\n`;
  report += `🌟 *ВСЕ КОМАНДЫ МОЛОДЦЫ!*\n\n`;
  
  if (data.totals.roas >= 2) {
    report += `Мы достигли отличных результатов! Неделя была продуктивной, команды показали свою эффективность. Продолжаем в том же духе!\n\n`;
  } else if (data.totals.roas >= 1) {
    report += `Мы на правильном пути! Неделя была прибыльной, но есть потенциал для роста. Давайте на следующей неделе покажем еще лучшие результаты!\n\n`;
  } else {
    report += `Неделя была сложной, но мы извлекли уроки. Каждая команда показала свои сильные стороны. На следующей неделе улучшим результаты!\n\n`;
  }
  
  report += `🚀 *Следующая неделя - новые вершины!*\n`;
  report += `💪 Вместе мы сильнее! Верим в каждого из вас!\n\n`;
  report += `━━━━━━━━━━━━━━━━━━\n`;
  report += `Отличных выходных, команда! 🎉`;
  
  return report;
}

// Экспорт функций
export default {
  generateYesterdayReport,
  generateCurrentStatusReport,
  generateDailyReport,
  generateWeeklyReport,
};
