import cron from 'node-cron';
import { sendToAllChats } from './telegramBot';
// 🤖 AI-POWERED REPORTS (with Groq)
import {
  generateYesterdayReportAI,
  generateCurrentStatusReportAI,
  generateDailyReportAI,
  generateWeeklyReportAI,
} from './trafficGroqReports';

// 🌅 10:00 - Отчет за вчера (с AI-анализом)
export function scheduleYesterdayReport() {
  // Каждый день в 10:00 (Asia/Almaty timezone - UTC+6)
  cron.schedule('0 10 * * *', async () => {
    console.log('🌅 [10:00] Генерация AI-отчета за вчера...');
    try {
      const report = await generateYesterdayReportAI();
      await sendToAllChats(report, 'Markdown');
      console.log('✅ [10:00] AI-отчет за вчера отправлен');
    } catch (error) {
      console.error('❌ [10:00] Ошибка отправки AI-отчета:', error);
    }
  }, {
    timezone: 'Asia/Almaty'
  });
  console.log('✅ Расписание 10:00 (AI вчерашний отчет) настроено');
}

// 📊 16:00 - Текущий статус (с AI-анализом)
export function scheduleCurrentStatusReport() {
  // Каждый день в 16:00 (Asia/Almaty timezone)
  cron.schedule('0 16 * * *', async () => {
    console.log('📊 [16:00] Генерация AI-статуса...');
    try {
      const report = await generateCurrentStatusReportAI();
      await sendToAllChats(report, 'Markdown');
      console.log('✅ [16:00] AI-статус отправлен');
    } catch (error) {
      console.error('❌ [16:00] Ошибка отправки AI-статуса:', error);
    }
  }, {
    timezone: 'Asia/Almaty'
  });
  console.log('✅ Расписание 16:00 (AI текущий статус) настроено');
}

// 🌙 22:00 - Дневной отчет (с AI-анализом и KPI)
export function scheduleDailyReport() {
  // Каждый день в 22:00 (Asia/Almaty timezone)
  cron.schedule('0 22 * * *', async () => {
    console.log('🌙 [22:00] Генерация AI дневного отчета...');
    try {
      const report = await generateDailyReportAI();
      await sendToAllChats(report, 'Markdown');
      console.log('✅ [22:00] AI дневной отчет отправлен');
    } catch (error) {
      console.error('❌ [22:00] Ошибка отправки AI-отчета:', error);
    }
  }, {
    timezone: 'Asia/Almaty'
  });
  console.log('✅ Расписание 22:00 (AI дневной отчет) настроено');
}

// 📅 Понедельник 10:00 - Недельный отчет (с AI-анализом и новыми KPI +10%)
export function scheduleWeeklyReport() {
  // Каждый понедельник в 10:00 (Asia/Almaty timezone)
  cron.schedule('0 10 * * 1', async () => {
    console.log('📅 [Понедельник 10:00] Генерация AI недельного отчета с новыми KPI...');
    try {
      const report = await generateWeeklyReportAI();
      await sendToAllChats(report, 'Markdown');
      console.log('✅ [Понедельник 10:00] AI недельный отчет отправлен (KPI +10%)');
    } catch (error) {
      console.error('❌ [Понедельник 10:00] Ошибка отправки AI-отчета:', error);
    }
  }, {
    timezone: 'Asia/Almaty'
  });
  console.log('✅ Расписание понедельник 10:00 (AI недельный отчет с KPI) настроено');
}

// Инициализация всех расписаний
export function initScheduler() {
  console.log('📅 Инициализация AI-расписания отчетов...');
  console.log('🤖 Используется Groq AI (llama-3.3-70b-versatile)');
  
  scheduleYesterdayReport();
  scheduleCurrentStatusReport();
  scheduleDailyReport();
  scheduleWeeklyReport();
  
  console.log('✅ Все AI-расписания настроены!');
  console.log('🕐 AI-отчеты:');
  console.log('   • 🌅 10:00 - AI отчет за вчера (мотивация)');
  console.log('   • 📊 16:00 - AI текущий статус (корректировки)');
  console.log('   • 🌙 22:00 - AI дневной отчет (итоги + задачи на завтра)');
  console.log('   • 📅 Пн 10:00 - AI недельный отчет (новые KPI +10%)');
}

export default {
  initScheduler,
  scheduleYesterdayReport,
  scheduleCurrentStatusReport,
  scheduleDailyReport,
  scheduleWeeklyReport,
};
