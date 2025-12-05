/**
 * Tripwire AI Curator Routes
 * API для AI-куратора (ИЗОЛИРОВАННАЯ БД)
 */

import express from 'express';
import * as tripwireAiController from '../../controllers/tripwire/tripwireAiController';

const router = express.Router();

/**
 * POST /api/tripwire/ai/chat
 * Отправить текстовое сообщение AI-куратору
 */
router.post('/chat', tripwireAiController.chat);

/**
 * GET /api/tripwire/ai/history
 * Получить историю чата
 */
router.get('/history', tripwireAiController.history);

/**
 * POST /api/tripwire/ai/voice
 * Отправить голосовое сообщение (TODO: Whisper API)
 */
router.post('/voice', tripwireAiController.voice);

/**
 * POST /api/tripwire/ai/file
 * Загрузить файл для анализа (TODO: Vision API)
 */
router.post('/file', tripwireAiController.file);

export default router;

