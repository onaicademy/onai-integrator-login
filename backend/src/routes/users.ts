import express from 'express';
import * as userController from '../controllers/userController';
import * as profileController from '../controllers/profileController';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

// POST /api/users/sync - синхронизировать пользователя (не требует auth для первого входа)
router.post('/sync', userController.syncUser);

// POST /api/profiles/update-last-login - обновить время последнего входа
router.post('/profiles/update-last-login', authMiddleware, userController.updateLastLogin);

// GET /api/users/:userId/profile - получить полный профиль пользователя с игрофикацией
router.get('/:userId/profile', profileController.getProfile);

// POST /api/users/notify-email-change - отправить уведомление о смене email
router.post('/notify-email-change', authMiddleware, userController.notifyEmailChange);

// POST /api/users/notify-password-change - отправить уведомление о смене пароля
router.post('/notify-password-change', authMiddleware, userController.notifyPasswordChange);

// 🔥 BACKEND-FIRST: Обновление через Admin API (обходит rate limits)
// POST /api/users/update-email - обновить email
router.post('/update-email', authMiddleware, userController.updateEmail);

// POST /api/users/update-password - обновить пароль
router.post('/update-password', authMiddleware, userController.updatePassword);

export default router;

