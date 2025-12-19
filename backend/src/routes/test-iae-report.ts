import { Router, Request, Response } from 'express';
import { sendIAEReport } from '../services/iaeAgentBot.js';

const router = Router();

/**
 * 🧪 TEST ENDPOINT: Отправка тестового отчета IAE Agent Bot
 * GET /api/test/iae-report
 */
router.get('/iae-report', async (req: Request, res: Response) => {
  try {
    const testReport = `🧪 **ТЕСТОВЫЙ ОТЧЕТ IAE AGENT**

📊 **Статус системы:** ✅ Все работает

🔥 **Проверки:**
- ✅ Telegram Bot подключен
- ✅ Поддержка Topics работает
- ✅ Отправка в правильный топик

⏰ **Время:** ${new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Almaty' })}

🤖 Powered by Groq AI`;

    console.log('🧪 [TEST] Sending test IAE report...');
    const successCount = await sendIAEReport(testReport, 'test-report');
    
    res.json({
      success: true,
      message: 'Test report sent',
      successCount,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ [TEST] Error sending test report:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 🧪 TEST ENDPOINT: Отправка тестового отчета Traffic Command Bot
 * GET /api/test/traffic-report
 */
router.get('/traffic-report', async (req: Request, res: Response) => {
  try {
    const { sendToAllChats } = await import('../services/telegramBot.js');
    
    const testReport = `🧪 **ТЕСТОВЫЙ ОТЧЕТ TRAFFIC COMMAND**

📊 **Статус системы:** ✅ Все работает

🔥 **Проверки:**
- ✅ Telegram Bot подключен
- ✅ Поддержка Topics работает
- ✅ Отправка в правильный топик

⏰ **Время:** ${new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Almaty' })}

🎯 Traffic Command Dashboard`;

    console.log('🧪 [TEST] Sending test Traffic report...');
    const results = await sendToAllChats(testReport, 'Markdown');
    
    res.json({
      success: true,
      message: 'Test report sent',
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ [TEST] Error sending test report:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
