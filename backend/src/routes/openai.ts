import { Router } from 'express';
import * as openaiController from '../controllers/openaiController';
import { upload } from '../controllers/openaiController';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

// Все роуты защищены JWT аутентификацией
router.use(authenticateJWT);

/**
 * GET /api/openai/assistants
 * Получение списка доступных ассистентов
 */
router.get('/assistants', openaiController.getAvailableAssistants);

/**
 * POST /api/openai/threads
 * Создание нового Thread
 */
router.post('/threads', openaiController.createThread);

/**
 * POST /api/openai/threads/:threadId/messages
 * Создание сообщения в Thread
 */
router.post('/threads/:threadId/messages', openaiController.createMessage);

/**
 * GET /api/openai/threads/:threadId/messages
 * Получение сообщений из Thread
 */
router.get('/threads/:threadId/messages', openaiController.getMessages);

/**
 * POST /api/openai/threads/:threadId/runs
 * Создание Run для Thread
 */
router.post('/threads/:threadId/runs', openaiController.createRun);

/**
 * GET /api/openai/threads/:threadId/runs/:runId
 * Получение статуса Run
 */
router.get('/threads/:threadId/runs/:runId', openaiController.getRun);

/**
 * POST /api/openai/audio/transcriptions
 * Транскрипция аудио через Whisper (для микрофона AI-куратора)
 */
router.post('/audio/transcriptions', upload.single('audio'), openaiController.transcribeAudio);

export default router;

