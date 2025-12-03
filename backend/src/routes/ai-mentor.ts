/**
 * AI MENTOR ROUTES
 * Роуты для управления AI-наставником и ручного запуска проверок
 */

import { Router, Request, Response } from 'express';
import { triggerManualMotivationCheck, triggerManualDailyReport, triggerManualWeeklyReport } from '../services/aiMentorScheduler';

const router = Router();

/**
 * POST /api/ai-mentor/trigger/daily
 * Ручной запуск ежедневного отчета администратору (для тестирования)
 */
router.post('/trigger/daily', async (req: Request, res: Response) => {
  try {
    console.log('🧪 [AI Mentor API] Manual trigger: daily report');

    // Запускаем генерацию отчета асинхронно (не блокируем ответ)
    triggerManualDailyReport().catch(err => {
      console.error('❌ [AI Mentor API] Error in manual daily report:', err);
    });

    res.json({
      success: true,
      message: 'Генерация ежедневного отчета запущена в фоне',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ [AI Mentor API] Error triggering daily report:', error);
    res.status(500).json({
      error: 'Ошибка запуска ежедневного отчета',
      details: error.message,
    });
  }
});

/**
 * POST /api/ai-mentor/trigger/weekly
 * Ручной запуск еженедельного отчета (для тестирования)
 */
router.post('/trigger/weekly', async (req: Request, res: Response) => {
  try {
    console.log('🧪 [AI Mentor API] Manual trigger: weekly report');

    // Запускаем генерацию отчета асинхронно (не блокируем ответ)
    triggerManualWeeklyReport().catch(err => {
      console.error('❌ [AI Mentor API] Error in manual weekly report:', err);
    });

    res.json({
      success: true,
      message: 'Генерация еженедельного отчета запущена в фоне',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ [AI Mentor API] Error triggering weekly report:', error);
    res.status(500).json({
      error: 'Ошибка запуска еженедельного отчета',
      details: error.message,
    });
  }
});

/**
 * GET /api/ai-mentor/status
 * Получить статус AI-наставника
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const assistantId = process.env.OPENAI_ASSISTANT_MENTOR_ID || '';
    const isConfigured = !!assistantId;

    res.json({
      success: true,
      status: isConfigured ? 'active' : 'not_configured',
      assistant_id: isConfigured ? assistantId : null,
      features: {
        daily_motivation_to_students: isConfigured,
        weekly_reports: isConfigured,
        telegram_notifications: !!process.env.TELEGRAM_MENTOR_BOT_TOKEN,
      },
      schedule: {
        daily_motivation: '9:00 AM каждый день Almaty time (3:00 AM UTC) - отправка студентам',
        weekly_report: 'Monday 9:00 AM Almaty time (3:00 AM UTC)',
      },
      description: 'AI-Наставник отправляет персональные мотивационные сообщения КАЖДОМУ студенту с подключенным Telegram',
    });
  } catch (error: any) {
    console.error('❌ [AI Mentor API] Error getting status:', error);
    res.status(500).json({
      error: 'Ошибка получения статуса AI-наставника',
      details: error.message,
    });
  }
});

export default router;

