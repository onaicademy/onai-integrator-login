/**
 * Telegram Controller - обработка API запросов для отправки Telegram сообщений
 */

import { Request, Response } from 'express';
import * as telegramService from '../services/telegramService';

/**
 * POST /api/telegram/mentor/send
 * Отправить сообщение студенту через Mentor бота
 */
export async function sendMentorNotification(req: Request, res: Response) {
  try {
    const { chatId, message, template, templateData } = req.body;

    if (!chatId) {
      return res.status(400).json({
        error: 'Missing chatId in request body',
      });
    }

    let messageText = message;

    // Если указан шаблон - используем его
    if (template && templateData) {
      const templates = telegramService.MENTOR_TEMPLATES as any;
      if (templates[template]) {
        messageText = templates[template](...Object.values(templateData));
      } else {
        return res.status(400).json({
          error: `Unknown template: ${template}`,
          availableTemplates: Object.keys(telegramService.MENTOR_TEMPLATES),
        });
      }
    }

    if (!messageText) {
      return res.status(400).json({
        error: 'Missing message or template in request body',
      });
    }

    const success = await telegramService.sendMentorMessage(chatId, messageText);

    res.json({
      success,
      chatId,
      sentAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Error in sendMentorNotification:', error.message);
    res.status(500).json({
      error: 'Failed to send Telegram message',
      message: error.message,
    });
  }
}

/**
 * POST /api/telegram/admin/send
 * Отправить сообщение администратору через Admin бота
 */
export async function sendAdminNotification(req: Request, res: Response) {
  try {
    const { chatId, message, template, templateData } = req.body;

    let messageText = message;

    // Если указан шаблон - используем его
    if (template && templateData) {
      const templates = telegramService.ADMIN_TEMPLATES as any;
      if (templates[template]) {
        messageText = templates[template](templateData);
      } else {
        return res.status(400).json({
          error: `Unknown template: ${template}`,
          availableTemplates: Object.keys(telegramService.ADMIN_TEMPLATES),
        });
      }
    }

    if (!messageText) {
      return res.status(400).json({
        error: 'Missing message or template in request body',
      });
    }

    let success: boolean;

    if (chatId) {
      // Отправить конкретному чату
      success = await telegramService.sendAdminMessage(chatId, messageText);
    } else {
      // Отправить администратору по умолчанию (из TELEGRAM_ADMIN_CHAT_ID)
      success = await telegramService.sendAdminNotification(messageText);
    }

    res.json({
      success,
      chatId: chatId || 'default',
      sentAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Error in sendAdminNotification:', error.message);
    res.status(500).json({
      error: 'Failed to send Telegram message',
      message: error.message,
    });
  }
}

/**
 * GET /api/telegram/templates
 * Получить список доступных шаблонов сообщений
 */
export async function getTemplates(req: Request, res: Response) {
  try {
    res.json({
      mentor: {
        templates: Object.keys(telegramService.MENTOR_TEMPLATES),
        examples: {
          motivation: 'motivation(name: string, progress: number)',
          reminder: 'reminder(name: string, daysInactive: number)',
          help: 'help(name: string, lessonName: string)',
          achievement: 'achievement(name: string, achievementName: string)',
          streak: 'streak(name: string, days: number)',
          warning: 'warning(name: string)',
        },
      },
      admin: {
        templates: Object.keys(telegramService.ADMIN_TEMPLATES),
        examples: {
          dailyReport: 'dailyReport({ activeStudents, completedLessons, newRegistrations })',
          weeklyReport: 'weeklyReport({ totalStudents, activePercentage, avgProgress, topCourse })',
          alert: 'alert(message: string)',
        },
      },
    });
  } catch (error: any) {
    console.error('❌ Error in getTemplates:', error.message);
    res.status(500).json({
      error: 'Failed to get templates',
      message: error.message,
    });
  }
}

