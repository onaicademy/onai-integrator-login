/**
 * Telegram Routes
 */

import { Router } from 'express';
import * as telegramController from '../controllers/telegramController';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

// Все роуты защищены JWT аутентификацией
router.use(authenticateJWT);

/**
 * POST /api/telegram/mentor/send
 * Отправить сообщение студенту через Mentor бота
 * 
 * Body:
 * - chatId: string (Telegram chat ID студента)
 * - message?: string (текст сообщения) ИЛИ
 * - template?: string (название шаблона)
 * - templateData?: object (данные для шаблона)
 */
router.post('/mentor/send', telegramController.sendMentorNotification);

/**
 * POST /api/telegram/admin/send
 * Отправить сообщение администратору через Admin бота
 * 
 * Body:
 * - chatId?: string (опционально, если не указан - использует TELEGRAM_ADMIN_CHAT_ID)
 * - message?: string (текст сообщения) ИЛИ
 * - template?: string (название шаблона)
 * - templateData?: object (данные для шаблона)
 */
router.post('/admin/send', telegramController.sendAdminNotification);

/**
 * GET /api/telegram/templates
 * Получить список доступных шаблонов сообщений
 */
router.get('/templates', telegramController.getTemplates);

export default router;

