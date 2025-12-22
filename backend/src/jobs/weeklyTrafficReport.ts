/**
 * Weekly Traffic Report
 * Runs every Monday at 08:10 Almaty (02:10 UTC)
 * Sends weekly performance summary with smart recommendations
 */

import cron from 'node-cron';
import { supabase } from '../config/supabase';
import { calculateROI } from '../services/roiCalculator';
import { sendAdminMessage } from '../services/telegramService';

export function startWeeklyTrafficReport() {
  // Run every Monday at 08:10 Almaty (02:10 UTC)
  cron.schedule('10 2 * * 1', async () => {
    try {
      console.log('[Monday 08:10 Almaty] Generating weekly traffic report...');
      
      const { startDate, endDate } = getLastWeekRange();
      
      const { data: teams } = await supabase
        .from('traffic_teams')
        .select('*')
        .eq('active', true);
      
      if (!teams || teams.length === 0) {
        console.log('[Weekly Report] No active teams found');
        return;
      }
      
      // Get stats for last week
      const reports = await Promise.all(
        teams.map(async (team) => {
          const stats = await calculateROI(team.id, startDate, endDate);
          
          // Get previous week for comparison
          const { startDate: prevStart, endDate: prevEnd } = getPreviousWeekRange();
          const prevStats = await calculateROI(team.id, prevStart, prevEnd);
          
          const roiChange = stats.roi_percent - prevStats.roi_percent;
          
          return {
            name: team.name,
            profit_kzt: stats.profit_kzt,
            spend_kzt: stats.spend_kzt,
            roi: stats.roi_percent,
            roi_change: roiChange
          };
        })
      );
      
      reports.sort((a, b) => b.roi - a.roi);
      
      const message = formatWeeklyReportKZT(reports, startDate, endDate);
      
      // Send to Telegram
      if (process.env.TELEGRAM_ADMIN_CHAT_ID) {
        await sendAdminMessage(
          process.env.TELEGRAM_ADMIN_CHAT_ID,
          message,
          'Markdown'
        );
      }
      
      console.log('✅ Weekly traffic report sent');
    } catch (error: any) {
      console.error('❌ Weekly report error:', error);
    }
  });
  
  console.log('✅ Weekly traffic report scheduled (Monday 08:10 Almaty / 02:10 UTC)');
}

// ENHANCEMENT: Generate smart recommendations
function generateRecommendations(reports: any[]): string {
  const recommendations: string[] = [];
  
  // High performer → increase budget
  const topTeam = reports[0];
  if (topTeam && topTeam.roi > 400) {
    const increase = Math.round(topTeam.spend_kzt * 0.2);
    recommendations.push(`• Увеличь бюджет *${topTeam.name}* на 20% (+₸${increase.toLocaleString()})`);
  }
  
  // Low performer → review targeting
  const lowPerformers = reports.filter(r => r.roi < 250);
  lowPerformers.forEach(r => {
    recommendations.push(`• Пересмотри таргетинг *${r.name}* (ROI падает)`);
  });
  
  // ROI declining → test new creatives
  const declining = reports.filter(r => r.roi_change < -10);
  declining.forEach(r => {
    recommendations.push(`• Протестируй новые креативы для *${r.name}* (ROI упал на ${Math.abs(r.roi_change).toFixed(0)}%)`);
  });
  
  return recommendations.length > 0 
    ? recommendations.join('\n') 
    : '• Все команды показывают стабильные результаты';
}

function formatWeeklyReportKZT(
  reports: any[],
  startDate: string,
  endDate: string
): string {
  const start = new Date(startDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  const end = new Date(endDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  
  let message = `📅 *ЕЖЕНЕДЕЛЬНЫЙ ОТЧЕТ* | ${start} - ${end}\n\n`;
  message += `🏆 *ТОП КОМАНДЫ ЗА НЕДЕЛЮ:*\n\n`;
  
  reports.slice(0, 5).forEach((r, i) => {
    const trend = r.roi_change > 0 ? `📈 +${r.roi_change.toFixed(0)}%` : 
                  r.roi_change < 0 ? `📉 ${r.roi_change.toFixed(0)}%` : '➡️ stable';
    message += `${i + 1}. *${r.name}:* ₸${r.profit_kzt.toLocaleString()} (ROI: ${r.roi.toFixed(0)}%) ${trend}\n`;
  });
  
  const totalProfit = reports.reduce((sum, r) => sum + r.profit_kzt, 0);
  const avgROI = reports.reduce((sum, r) => sum + r.roi, 0) / reports.length;
  
  message += `\n💰 *ИТОГО ЗА НЕДЕЛЮ:*\n`;
  message += `Прибыль: +₸${totalProfit.toLocaleString()}\n`;
  message += `Средний ROI: ${avgROI.toFixed(0)}%\n`;
  
  const bestTeam = reports[0];
  if (bestTeam) {
    message += `Лучший результат: *${bestTeam.name}* (ROI: ${bestTeam.roi.toFixed(0)}%)\n\n`;
  }
  
  // ENHANCEMENT: Add recommendations
  message += `⚡ *РЕКОМЕНДАЦИИ:*\n${generateRecommendations(reports)}`;
  
  return message;
}

function getLastWeekRange() {
  const today = new Date();
  const lastMonday = new Date(today);
  lastMonday.setDate(today.getDate() - today.getDay() - 6);
  
  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);
  
  return {
    startDate: lastMonday.toLocaleDateString('en-CA'),
    endDate: lastSunday.toLocaleDateString('en-CA')
  };
}

function getPreviousWeekRange() {
  const { startDate } = getLastWeekRange();
  const start = new Date(startDate);
  start.setDate(start.getDate() - 7);
  
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  
  return {
    startDate: start.toLocaleDateString('en-CA'),
    endDate: end.toLocaleDateString('en-CA')
  };
}
