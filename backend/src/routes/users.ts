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

export default router;

