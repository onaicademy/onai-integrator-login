import cron from 'node-cron';
import { sendToAllChats } from './telegramBot';
import {
  generateYesterdayReport,
  generateCurrentStatusReport,
  generateDailyReport,
  generateWeeklyReport,
} from './telegramReports';

// 🌅 10:00 - Отчет за вчера
export function scheduleYesterdayReport() {
  // Каждый день в 10:00 (Asia/Almaty timezone - UTC+6)
  cron.schedule('0 10 * * *', async () => {
    console.log('🌅 [10:00] Генерация отчета за вчера...');
    try {
      const report = await generateYesterdayReport();
      await sendToAllChats(report, 'Markdown');
      console.log('✅ [10:00] Отчет за вчера отправлен');
    } catch (error) {
      console.error('❌ [10:00] Ошибка отправки отчета:', error);
    }
  }, {
    timezone: 'Asia/Almaty'
  });
  console.log('✅ Расписание 10:00 (вчерашний отчет) настроено');
}

// 📊 16:00 - Текущий статус
export function scheduleCurrentStatusReport() {
  // Каждый день в 16:00 (Asia/Almaty timezone)
  cron.schedule('0 16 * * *', async () => {
    console.log('📊 [16:00] Генерация текущего статуса...');
    try {
      const report = await generateCurrentStatusReport();
      await sendToAllChats(report, 'Markdown');
      console.log('✅ [16:00] Текущий статус отправлен');
    } catch (error) {
      console.error('❌ [16:00] Ошибка отправки статуса:', error);
    }
  }, {
    timezone: 'Asia/Almaty'
  });
  console.log('✅ Расписание 16:00 (текущий статус) настроено');
}

// 🌙 22:00 - Дневной отчет
export function scheduleDailyReport() {
  // Каждый день в 22:00 (Asia/Almaty timezone)
  cron.schedule('0 22 * * *', async () => {
    console.log('🌙 [22:00] Генерация дневного отчета...');
    try {
      const report = await generateDailyReport();
      await sendToAllChats(report, 'Markdown');
      console.log('✅ [22:00] Дневной отчет отправлен');
    } catch (error) {
      console.error('❌ [22:00] Ошибка отправки отчета:', error);
    }
  }, {
    timezone: 'Asia/Almaty'
  });
  console.log('✅ Расписание 22:00 (дневной отчет) настроено');
}

// 📅 Понедельник 10:00 - Недельный отчет
export function scheduleWeeklyReport() {
  // Каждый понедельник в 10:00 (Asia/Almaty timezone)
  cron.schedule('0 10 * * 1', async () => {
    console.log('📅 [Понедельник 10:00] Генерация недельного отчета...');
    try {
      const report = await generateWeeklyReport();
      await sendToAllChats(report, 'Markdown');
      console.log('✅ [Понедельник 10:00] Недельный отчет отправлен');
    } catch (error) {
      console.error('❌ [Понедельник 10:00] Ошибка отправки отчета:', error);
    }
  }, {
    timezone: 'Asia/Almaty'
  });
  console.log('✅ Расписание понедельник 10:00 (недельный отчет) настроено');
}

// Инициализация всех расписаний
export function initScheduler() {
  console.log('📅 Инициализация расписания отчетов...');
  
  scheduleYesterdayReport();
  scheduleCurrentStatusReport();
  scheduleDailyReport();
  scheduleWeeklyReport();
  
  console.log('✅ Все расписания настроены!');
  console.log('🕐 Отчеты:');
  console.log('   • 10:00 - Вчерашний отчет');
  console.log('   • 16:00 - Текущий статус');
  console.log('   • 22:00 - Дневной отчет');
  console.log('   • Пн 10:00 - Недельный отчет');
}

export default {
  initScheduler,
  scheduleYesterdayReport,
  scheduleCurrentStatusReport,
  scheduleDailyReport,
  scheduleWeeklyReport,
};
