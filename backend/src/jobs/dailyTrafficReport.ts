/**
 * Daily Traffic Report
 * Runs at 08:05 Almaty (02:05 UTC) - 5 minutes after exchange rate fetch
 * Sends daily traffic performance report in KZT to Telegram
 */

import cron from 'node-cron';
import { supabase } from '../config/supabase';
import { getExchangeRateForDate } from '../services/exchangeRateService';
import { calculateROI } from '../services/roiCalculator';
import { sendAdminMessage } from '../services/telegramService';

export function startDailyTrafficReport() {
  // Run at 08:05 Almaty (02:05 UTC)
  cron.schedule('5 2 * * *', async () => {
    try {
      console.log('[08:05 Almaty] Generating daily traffic report...');
      
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Almaty' });
      const yesterday = getYesterdayDate();
      
      // Get today's exchange rate (already fetched at 08:00)
      const exchangeRate = await getExchangeRateForDate(today);
      
      // Get all active teams
      const { data: teams } = await supabase
        .from('traffic_teams')
        .select('*')
        .eq('active', true);
      
      if (!teams || teams.length === 0) {
        console.log('[Daily Report] No active teams found');
        return;
      }
      
      // Calculate yesterday's stats for each team
      const reports = await Promise.all(
        teams.map(async (team) => {
          const stats = await calculateROI(team.id, yesterday, yesterday);
          return {
            name: team.name,
            profit_kzt: stats.profit_kzt,
            roi: stats.roi_percent,
            spend_kzt: stats.spend_kzt
          };
        })
      );
      
      // Sort by ROI descending
      reports.sort((a, b) => b.roi - a.roi);
      
      // Format message
      const message = formatDailyReportKZT(reports, exchangeRate, yesterday);
      
      // Send to Telegram
      if (process.env.TELEGRAM_ADMIN_CHAT_ID) {
        await sendAdminMessage(
          process.env.TELEGRAM_ADMIN_CHAT_ID,
          message,
          'Markdown'
        );
      }
      
      console.log('✅ Daily traffic report sent');
    } catch (error: any) {
      console.error('❌ Daily report error:', error);
      
      // Send error alert
      if (process.env.TELEGRAM_ADMIN_CHAT_ID) {
        await sendAdminMessage(
          process.env.TELEGRAM_ADMIN_CHAT_ID,
          `❌ Ошибка ежедневного отчета: ${error.message}`,
          'Markdown'
        );
      }
    }
  });
  
  console.log('✅ Daily traffic report scheduled (08:05 Almaty / 02:05 UTC)');
}

function formatDailyReportKZT(
  reports: any[], 
  exchangeRate: number,
  date: string
): string {
  const dateFormatted = new Date(date).toLocaleDateString('ru-RU', { 
    day: 'numeric',
    month: 'long', 
    year: 'numeric'
  });
  
  let message = `📊 *ЕЖЕДНЕВНЫЙ ОТЧЕТ* | ${dateFormatted}\n`;
  message += `💱 Курс: 1 USD = ${exchangeRate.toFixed(2)} KZT\n\n`;
  message += `💰 *ROI ПО ТАРГЕТОЛОГАМ ВЧЕРА:*\n\n`;
  
  const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];
  
  reports.forEach((r, i) => {
    const emoji = emojis[i] || '▪️';
    const status = r.roi >= 300 ? '✅' : '⚠️';
    message += `${emoji} *${r.name}:* +₸${r.profit_kzt.toLocaleString()} | `;
    message += `ROI: ${r.roi.toFixed(0)}% | `;
    message += `Расходы: ₸${r.spend_kzt.toLocaleString()} ${status}\n`;
  });
  
  // Alerts for low performers
  const lowPerformers = reports.filter(r => r.roi < 300);
  if (lowPerformers.length > 0) {
    message += `\n⚠️ *ВНИМАНИЕ:*\n`;
    lowPerformers.forEach(r => {
      message += `🔴 ${r.name}: ROI ${r.roi.toFixed(0)}% (цель: 300%) - проверь таргетинг\n`;
    });
  }
  
  // Totals
  const totalProfit = reports.reduce((sum, r) => sum + r.profit_kzt, 0);
  const totalSpend = reports.reduce((sum, r) => sum + r.spend_kzt, 0);
  message += `\n📈 *ИТОГО ВЧЕРА:*\n`;
  message += `Прибыль: +₸${totalProfit.toLocaleString()}\n`;
  message += `Расходы: ₸${totalSpend.toLocaleString()}`;
  
  return message;
}

function getYesterdayDate(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toLocaleDateString('en-CA', { timeZone: 'Asia/Almaty' });
}
