import cron from 'node-cron';
import { runIAEAgent } from './iaeAgentService.js';
import { sendIAEReport } from './iaeAgentBot.js';

// 🌅 10:00 - Daily Report (за вчера)
export function scheduleIAEDailyReport() {
  // Каждый день в 10:00 (Asia/Almaty timezone - UTC+6)
  cron.schedule('0 10 * * *', async () => {
    console.log('\n🌅 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🌅 [IAE 10:00] Генерация отчета за вчера...');
    console.log('🌅 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    try {
      const result = await runIAEAgent('daily', 'yesterday');
      const sentCount = await sendIAEReport(result.telegramReport, result.reportData.id);
      
      console.log(`\n✅ [IAE 10:00] Отчет за вчера отправлен в ${sentCount} чатов`);
      console.log(`   Health Score: ${result.aiAnalysis.healthScore}/100`);
      console.log(`   Status: ${result.validation.healthy ? '✅ Healthy' : '⚠️ Has issues'}`);
    } catch (error: any) {
      console.error('❌ [IAE 10:00] Ошибка отправки отчета:', error.message);
    }
  }, {
    timezone: 'Asia/Almaty'
  });
  
  console.log('✅ [IAE Scheduler] 10:00 Daily Report scheduled');
}

// 📊 16:00 - Current Status
export function scheduleIAECurrentStatus() {
  // Каждый день в 16:00 (Asia/Almaty timezone)
  cron.schedule('0 16 * * *', async () => {
    console.log('\n📊 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 [IAE 16:00] Генерация текущего статуса...');
    console.log('📊 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    try {
      const result = await runIAEAgent('current', 'today');
      const sentCount = await sendIAEReport(result.telegramReport, result.reportData.id);
      
      console.log(`\n✅ [IAE 16:00] Текущий статус отправлен в ${sentCount} чатов`);
      console.log(`   Health Score: ${result.aiAnalysis.healthScore}/100`);
      console.log(`   Status: ${result.validation.healthy ? '✅ Healthy' : '⚠️ Has issues'}`);
    } catch (error: any) {
      console.error('❌ [IAE 16:00] Ошибка отправки статуса:', error.message);
    }
  }, {
    timezone: 'Asia/Almaty'
  });
  
  console.log('✅ [IAE Scheduler] 16:00 Current Status scheduled');
}

// 📅 1-го числа в 10:00 - Monthly Report
export function scheduleIAEMonthlyReport() {
  // 1-го числа каждого месяца в 10:00 (Asia/Almaty timezone)
  cron.schedule('0 10 1 * *', async () => {
    console.log('\n📅 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📅 [IAE 1st] Генерация месячного отчета...');
    console.log('📅 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    try {
      const result = await runIAEAgent('monthly', 'last_month');
      const sentCount = await sendIAEReport(result.telegramReport, result.reportData.id);
      
      console.log(`\n✅ [IAE 1st] Месячный отчет отправлен в ${sentCount} чатов`);
      console.log(`   Health Score: ${result.aiAnalysis.healthScore}/100`);
      console.log(`   Status: ${result.validation.healthy ? '✅ Healthy' : '⚠️ Has issues'}`);
    } catch (error: any) {
      console.error('❌ [IAE 1st] Ошибка отправки месячного отчета:', error.message);
    }
  }, {
    timezone: 'Asia/Almaty'
  });
  
  console.log('✅ [IAE Scheduler] 1st Monthly Report scheduled');
}

// 🔍 Каждый час - Health Check
export function scheduleIAEHealthCheck() {
  // Каждый час
  cron.schedule('0 * * * *', async () => {
    const hour = new Date().getHours();
    console.log(`\n🔍 [IAE ${hour}:00] Health check...`);
    
    try {
      const result = await runIAEAgent('health_check', 'current');
      
      console.log(`   Health Score: ${result.aiAnalysis.healthScore}/100`);
      console.log(`   Issues: ${result.validation.issues.length}`);
      console.log(`   Anomalies: ${result.validation.anomalies.length}`);
      
      // Отправляем только если есть критические проблемы
      if (!result.validation.healthy) {
        const criticalIssues = result.validation.issues.filter(i => i.severity === 'critical').length;
        
        console.log(`⚠️ [IAE ${hour}:00] КРИТИЧЕСКИЕ ПРОБЛЕМЫ ОБНАРУЖЕНЫ! Отправляем alert...`);
        const sentCount = await sendIAEReport(result.telegramReport, result.reportData.id);
        console.log(`✅ [IAE ${hour}:00] Alert отправлен в ${sentCount} чатов`);
      } else {
        console.log(`✅ [IAE ${hour}:00] Всё в порядке (Health: ${result.aiAnalysis.healthScore}/100)`);
      }
    } catch (error: any) {
      console.error(`❌ [IAE ${hour}:00] Ошибка health check:`, error.message);
    }
  });
  
  console.log('✅ [IAE Scheduler] Hourly Health Check scheduled');
}

// 🚀 Start all IAE schedulers
export function startIAESchedulers() {
  console.log('\n🚀 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 [IAE] Starting IAE Agent Schedulers...');
  console.log('🚀 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  scheduleIAEDailyReport();
  scheduleIAECurrentStatus();
  scheduleIAEMonthlyReport();
  scheduleIAEHealthCheck();
  
  console.log('\n✅ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ [IAE] All schedulers started successfully!');
  console.log('✅ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('📅 Schedule:');
  console.log('   🌅 10:00 - Daily Report (yesterday)');
  console.log('   📊 16:00 - Current Status (today)');
  console.log('   📅 1st 10:00 - Monthly Report (last month)');
  console.log('   🔍 Every hour - Health Check (alerts only)');
  console.log('');
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 [IAE Scheduler] Received SIGTERM, stopping schedulers...');
});

process.on('SIGINT', () => {
  console.log('🛑 [IAE Scheduler] Received SIGINT, stopping schedulers...');
});
