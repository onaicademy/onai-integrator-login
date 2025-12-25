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
async function fetchAnalytics(preset: string = 'yesterday'): Promise<AnalyticsData | null> {
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
  const data = await fetchAnalytics('yesterday');
  if (!data) return '❌ Не удалось загрузить данные';
  
  const rankedTeams = [...data.teams].sort((a, b) => b.roas - a.roas);
  
  let report = '🌅 *ОТЧЕТ ЗА ВЧЕРА*\n';
  report += `━━━━━━━━━━━━━━━━━━\n\n`;
  
  // Общие показатели
  report += `💰 *ИТОГИ:*\n`;
  report += `Затраты: ${formatMoney(data.totals.spend, 'USD')} | Доход: ${formatMoney(data.totals.revenue, 'KZT')}\n`;
  report += `Продажи: ${data.totals.sales} шт | ROAS: ${data.totals.roas.toFixed(2)}x ${getRoasEmoji(data.totals.roas)}\n\n`;
  
  // Рейтинг команд
  report += `🏆 *РЕЙТИНГ:*\n`;
  rankedTeams.forEach((team, idx) => {
    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '⭐';
    const emoji = TEAM_EMOJI[team.team] || '📊';
    report += `${medal} ${emoji} ${team.team}: ROAS ${team.roas.toFixed(2)}x | ${team.sales} продаж | CPA ${formatMoney(team.cpa, 'USD')}\n`;
  });
  
  // Лидер
  const topTeam = rankedTeams[0];
  report += `\n━━━━━━━━━━━━━━━━━━\n`;
  report += `🔥 Лидер: *${topTeam.team}* (ROAS ${topTeam.roas.toFixed(2)}x)\n`;
  
  return report;
}

// 📊 ОТЧЕТ ТЕКУЩИЙ СТАТУС (16:00)
export async function generateCurrentStatusReport(): Promise<string> {
  const data = await fetchAnalytics('today');
  if (!data) return '❌ Не удалось загрузить данные';
  
  const rankedTeams = [...data.teams].sort((a, b) => b.roas - a.roas);
  
  let report = '📊 *ОБЕДЕННЫЙ СТАТУС*\n';
  report += `🕐 ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}\n`;
  report += `━━━━━━━━━━━━━━━━━━\n\n`;
  
  // Общие показатели
  report += `💰 *СЕЙЧАС:*\n`;
  report += `Затраты: ${formatMoney(data.totals.spend, 'USD')} | Доход: ${formatMoney(data.totals.revenue, 'KZT')}\n`;
  report += `Продажи: ${data.totals.sales} шт | ROAS: ${data.totals.roas.toFixed(2)}x ${getRoasEmoji(data.totals.roas)}\n\n`;
  
  // Команды
  report += `📈 *КОМАНДЫ:*\n`;
  rankedTeams.forEach((team, idx) => {
    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '⭐';
    const emoji = TEAM_EMOJI[team.team] || '📊';
    report += `${medal} ${emoji} ${team.team}: ROAS ${team.roas.toFixed(2)}x | ${team.sales} продаж | CTR ${formatPercent(team.ctr)}\n`;
  });
  
  return report;
}

// 🌙 ДНЕВНОЙ ОТЧЕТ (22:00)
export async function generateDailyReport(): Promise<string> {
  const data = await fetchAnalytics('today');
  if (!data) return '❌ Не удалось загрузить данные';
  
  const rankedTeams = [...data.teams].sort((a, b) => b.roas - a.roas);
  
  let report = '🌙 *ВЕЧЕРНИЙ ОТЧЕТ*\n';
  report += `📅 ${new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}\n`;
  report += `━━━━━━━━━━━━━━━━━━\n\n`;
  
  // Общие показатели
  report += `💰 *ИТОГИ:*\n`;
  report += `Затраты: ${formatMoney(data.totals.spend, 'USD')} | Доход: ${formatMoney(data.totals.revenue, 'KZT')}\n`;
  report += `Продажи: ${data.totals.sales} шт | ROAS: ${data.totals.roas.toFixed(2)}x ${getRoasEmoji(data.totals.roas)}\n\n`;
  
  // 🏆 ТОПЫ
  const salesLeader = [...rankedTeams].sort((a, b) => b.sales - a.sales)[0];
  const ctrLeader = [...rankedTeams].sort((a, b) => b.ctr - a.ctr)[0];
  const videoLeader = rankedTeams.find(t => t.videoMetrics && t.videoMetrics.completionRate > 0);
  
  report += `🏆 *ЛИДЕРЫ ДНЯ:*\n`;
  report += `• Продажи: ${TEAM_EMOJI[salesLeader.team]} ${salesLeader.team} (${salesLeader.sales} шт)\n`;
  if (videoLeader && videoLeader.videoMetrics) {
    report += `• Видео: ${TEAM_EMOJI[videoLeader.team]} ${videoLeader.team} (${videoLeader.videoMetrics.completionRate.toFixed(1)}% досмотров)\n`;
  }
  report += `• CTR: ${TEAM_EMOJI[ctrLeader.team]} ${ctrLeader.team} (${formatPercent(ctrLeader.ctr)})\n\n`;
  
  // 📊 РЕЙТИНГ
  report += `📊 *РЕЙТИНГ:*\n`;
  rankedTeams.forEach((team, idx) => {
    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '⭐';
    const emoji = TEAM_EMOJI[team.team] || '📊';
    report += `${medal} ${emoji} ${team.team}: ROAS ${team.roas.toFixed(2)}x | ${team.sales} продаж | CPA ${formatMoney(team.cpa, 'USD')}\n`;
  });
  
  // 💬 ВЫВОД
  report += `\n━━━━━━━━━━━━━━━━━━\n`;
  report += `💬 *ВЫВОД:*\n`;
  
  if (data.totals.roas >= 2) {
    report += `ROAS ${data.totals.roas.toFixed(2)}x - отличная эффективность. ${salesLeader.team} лидирует с ${salesLeader.sales} продажами.`;
  } else if (data.totals.roas >= 1) {
    report += `ROAS ${data.totals.roas.toFixed(2)}x - прибыльно, но есть потенциал. ${salesLeader.team} ведет с ${salesLeader.sales} продажами.`;
  } else {
    report += `ROAS ${data.totals.roas.toFixed(2)}x - требуется оптимизация креативов. ${salesLeader.team} показывает лучший результат (${salesLeader.sales} продаж).`;
  }
  
  return report;
}

// 📅 НЕДЕЛЬНЫЙ ОТЧЕТ (понедельник 10:00)
export async function generateWeeklyReport(): Promise<string> {
  const data = await fetchAnalytics('7d');
  if (!data) return '❌ Не удалось загрузить данные';
  
  const rankedTeams = [...data.teams].sort((a, b) => b.roas - a.roas);
  
  let report = '📅 *НЕДЕЛЬНЫЙ ОТЧЕТ*\n';
  report += `🗓️ Неделя: ${new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}\n`;
  report += `━━━━━━━━━━━━━━━━━━\n\n`;
  
  // Общие показатели
  report += `💰 *ИТОГИ:*\n`;
  report += `Затраты: ${formatMoney(data.totals.spend, 'USD')} | Доход: ${formatMoney(data.totals.revenue, 'KZT')}\n`;
  report += `Продажи: ${data.totals.sales} шт | ROAS: ${data.totals.roas.toFixed(2)}x ${getRoasEmoji(data.totals.roas)}\n\n`;
  
  // 🏆 РЕЙТИНГ
  report += `🏆 *РЕЙТИНГ:*\n`;
  rankedTeams.forEach((team, idx) => {
    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '⭐';
    const emoji = TEAM_EMOJI[team.team] || '📊';
    report += `${medal} ${emoji} ${team.team}: ROAS ${team.roas.toFixed(2)}x | ${team.sales} продаж | ${formatMoney(team.revenue, 'KZT')}\n`;
  });
  
  // 💬 БЛАГОДАРНОСТЬ
  report += `\n━━━━━━━━━━━━━━━━━━\n`;
  report += `💬 *МОТИВАЦИЯ:*\n`;
  
  const topTeam = rankedTeams[0];
  
  if (topTeam.roas >= 3) {
    report += `🔥 ${topTeam.team} - ROAS ${topTeam.roas.toFixed(2)}x, ${topTeam.sales} продаж. Невероятный результат!`;
  } else if (topTeam.roas >= 2) {
    report += `🎉 ${topTeam.team} - ROAS ${topTeam.roas.toFixed(2)}x, ${topTeam.sales} продаж. Отличная эффективность!`;
  } else if (topTeam.roas >= 1) {
    report += `👏 ${topTeam.team} - ROAS ${topTeam.roas.toFixed(2)}x, ${topTeam.sales} продаж. Прибыльно, есть куда расти!`;
  } else {
    report += `💪 ${topTeam.team} лидирует с ${topTeam.sales} продажами. Есть над чем работать!`;
  }
  
  report += `\n\n🚀 Новая неделя - новые возможности! Вперед!`;
  
  return report;
}

// Экспорт функций
export default {
  generateYesterdayReport,
  generateCurrentStatusReport,
  generateDailyReport,
  generateWeeklyReport,
};
