/**
 * AI MENTOR ROUTES
 * Роуты для управления AI-наставником и ручного запуска проверок
 */

import { Router, Request, Response } from 'express';
import { triggerManualMotivationCheck, triggerManualWeeklyReport } from '../services/aiMentorScheduler';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * POST /api/ai-mentor/trigger/daily
 * Ручной запуск ежедневной проверки мотивации студентов (для тестирования)
 */
router.post('/trigger/daily', authMiddleware, async (req: Request, res: Response) => {
  try {
    console.log('🧪 [AI Mentor API] Manual trigger: daily motivation check');

    // Проверяем, что пользователь - админ
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        error: 'Доступ запрещен. Требуется роль admin.',
      });
    }

    // Запускаем проверку асинхронно (не блокируем ответ)
    triggerManualMotivationCheck().catch(err => {
      console.error('❌ [AI Mentor API] Error in manual daily check:', err);
    });

    res.json({
      success: true,
      message: 'Ежедневная проверка мотивации запущена в фоне',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ [AI Mentor API] Error triggering daily check:', error);
    res.status(500).json({
      error: 'Ошибка запуска ежедневной проверки',
      details: error.message,
    });
  }
});

/**
 * POST /api/ai-mentor/trigger/weekly
 * Ручной запуск еженедельного отчета (для тестирования)
 */
router.post('/trigger/weekly', authMiddleware, async (req: Request, res: Response) => {
  try {
    console.log('🧪 [AI Mentor API] Manual trigger: weekly report');

    // Проверяем, что пользователь - админ
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        error: 'Доступ запрещен. Требуется роль admin.',
      });
    }

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
router.get('/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const assistantId = process.env.OPENAI_ASSISTANT_MENTOR_ID || '';
    const isConfigured = !!assistantId;

    res.json({
      success: true,
      status: isConfigured ? 'active' : 'not_configured',
      assistant_id: isConfigured ? assistantId : null,
      features: {
        daily_motivation: isConfigured,
        weekly_reports: isConfigured,
        telegram_notifications: !!process.env.TELEGRAM_MENTOR_BOT_TOKEN,
      },
      schedule: {
        daily: '8:00 AM Almaty time (2:00 AM UTC)',
        weekly: 'Monday 9:00 AM Almaty time (3:00 AM UTC)',
      },
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

