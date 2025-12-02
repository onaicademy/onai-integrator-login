import express from 'express';
import * as diagnosticsController from '../controllers/diagnosticsController';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

// GET /api/diagnostics/database - проверить состояние БД
router.get('/database', authMiddleware, diagnosticsController.checkDatabase);

export default router;

